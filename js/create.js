// Create Direct, Group, Public, Profile and Settings
let directSearchTimer=null;
let directSearchRequest=0;
let directProfileResults=new Map();

function directProfileToPerson(profile){
 const name=(profile.display_name||'').trim()||('@'+profile.username);
 return {
  id:profile.id,
  remoteUserId:profile.id,
  name,
  handle:'@'+profile.username,
  initials:initials(name),
  status:'mi.net user',
  bio:profile.bio||''
 };
}

function renderDirectSearchStatus(kind,text){
 const target=document.getElementById('directContacts');
 if(!target)return;

 target.innerHTML=`<div class="direct-search-state ${kind}">
  ${kind==='loading'?'<span class="direct-search-spinner"></span>':''}
  <strong>${esc(text)}</strong>
 </div>`;
}

async function renderDirectContacts(){
 const input=document.getElementById('directSearch');
 const target=document.getElementById('directContacts');
 if(!input||!target)return;

 const query=input.value.trim();
 const requestId=++directSearchRequest;

 renderDirectSearchStatus('loading',query?'Searching mi.net…':'Loading people…');

 if(typeof miSearchProfiles!=='function'){
  renderDirectSearchStatus('error','Supabase profile search is not available.');
  return;
 }

 const result=await miSearchProfiles(query,14);

 // Ignore an older network response if the user has already typed again.
 if(requestId!==directSearchRequest)return;

 if(!result.ok){
  directProfileResults.clear();
  renderDirectSearchStatus('error',result.message||'Could not search users.');
  return;
 }

 directProfileResults=new Map((result.profiles||[]).map(profile=>[profile.id,profile]));

 if(!result.profiles?.length){
  renderDirectSearchStatus(
   'empty',
   query?`No mi.net users found for “${query}”.`:'No other profiles found yet.'
  );
  return;
 }

 target.innerHTML=result.profiles.map(profile=>{
  const person=directProfileToPerson(profile);
  return `<button class="direct-profile-result" data-direct-profile="${profile.id}">
   ${A(person.initials)}
   <div class="copy">
    <strong>${esc(person.name)}</strong>
    <small>${esc(person.handle)}${person.bio?' · '+esc(person.bio):''}</small>
   </div>
   <span class="direct-profile-action">${svg('message')}</span>
  </button>`;
 }).join('');

 target.querySelectorAll('[data-direct-profile]').forEach(button=>{
  button.onclick=()=>{
   const profile=directProfileResults.get(button.dataset.directProfile);
   if(!profile)return;
   closeModal('directModal');
   ensureDirect(directProfileToPerson(profile));
  };
 });
}

function scheduleDirectSearch(){
 clearTimeout(directSearchTimer);
 directSearchTimer=setTimeout(renderDirectContacts,180);
}

function openDirectModal(){
 const input=document.getElementById('directSearch');
 input.value='';
 input.placeholder='Search @username or display name';
 input.setAttribute('autocomplete','off');
 input.setAttribute('autocapitalize','none');
 input.setAttribute('spellcheck','false');

 openModal('directModal');
 renderDirectContacts();
 setTimeout(()=>input.focus(),0);
}

document.getElementById('directSearch').oninput=scheduleDirectSearch;

let groupCreateSelected=new Map();
let groupCreateSearchTimer=null;
let groupCreateRequest=0;

function miRenderSelectedGroupMembers(){
 const target=document.getElementById('groupSelectedMembers');
 if(!target)return;

 const profiles=[...groupCreateSelected.values()];

 target.innerHTML=profiles.length
  ?profiles.map(profile=>{
    const name=(profile.display_name||'').trim()||('@'+profile.username);
    return `<button class="group-selected-chip" data-group-remove="${profile.id}" title="Remove">
     ${A(initials(name))}
     <span><strong>${esc(name)}</strong><small>@${esc(profile.username)}</small></span>
     <b>×</b>
    </button>`;
   }).join('')
  :`<div class="group-picker-empty">No members selected yet.</div>`;

 target.querySelectorAll('[data-group-remove]').forEach(button=>{
  button.onclick=()=>{
   groupCreateSelected.delete(button.dataset.groupRemove);
   miRenderSelectedGroupMembers();
   miRenderGroupCreateResults(document.getElementById('groupMemberSearch')?.value||'');
  };
 });
}

async function miRenderGroupCreateResults(query=''){
 const target=document.getElementById('groupMemberResults');
 if(!target)return;

 const requestId=++groupCreateRequest;

 target.innerHTML=`<div class="direct-search-state loading"><span class="direct-search-spinner"></span><strong>${query.trim()?'Searching mi.net…':'Loading people…'}</strong></div>`;

 if(typeof miSearchProfiles!=='function'){
  target.innerHTML=`<div class="direct-search-state error"><strong>Supabase profile search is unavailable.</strong></div>`;
  return;
 }

 const result=await miSearchProfiles(query.trim(),20);

 if(requestId!==groupCreateRequest)return;

 if(!result.ok){
  target.innerHTML=`<div class="direct-search-state error"><strong>${esc(result.message||'Could not load users.')}</strong></div>`;
  return;
 }

 if(!result.profiles?.length){
  target.innerHTML=`<div class="direct-search-state empty"><strong>No registered users found.</strong></div>`;
  return;
 }

 target.innerHTML=result.profiles.map(profile=>{
  const name=(profile.display_name||'').trim()||('@'+profile.username);
  const selected=groupCreateSelected.has(profile.id);

  return `<label class="group-create-person ${selected?'selected':''}">
   <input type="checkbox" value="${profile.id}" ${selected?'checked':''}>
   ${A(initials(name))}
   <span>
    <strong>${esc(name)}</strong>
    <small>@${esc(profile.username)}${profile.bio?' · '+esc(profile.bio):''}</small>
   </span>
  </label>`;
 }).join('');

 target.querySelectorAll('input[type="checkbox"]').forEach(input=>{
  input.onchange=()=>{
   const profile=result.profiles.find(item=>item.id===input.value);
   if(!profile)return;

   if(input.checked){
    if(groupCreateSelected.size>=99){
     input.checked=false;
     toast('Group limit is 100 members including you');
     return;
    }
    groupCreateSelected.set(profile.id,profile);
   }else{
    groupCreateSelected.delete(profile.id);
   }

   input.closest('.group-create-person')?.classList.toggle('selected',input.checked);
   miRenderSelectedGroupMembers();
  };
 });
}

function openGroupModal(){
 groupCreateSelected.clear();

 document.getElementById('groupName').value='';

 const container=document.getElementById('groupMembers');

 container.innerHTML=`
  <label class="field group-create-search">
   <span>Find registered users</span>
   <input id="groupMemberSearch" placeholder="@username or display name" autocomplete="off" autocapitalize="none" spellcheck="false">
  </label>

  <div class="group-create-layout">
   <section>
    <div class="sectionlabel" style="padding-left:0">Selected</div>
    <div class="group-selected-members" id="groupSelectedMembers"></div>
   </section>

   <section>
    <div class="sectionlabel" style="padding-left:0">People</div>
    <div class="group-member-results" id="groupMemberResults"></div>
   </section>
  </div>`;

 openModal('groupModal');
 miRenderSelectedGroupMembers();
 miRenderGroupCreateResults('');

 const search=document.getElementById('groupMemberSearch');
 search.oninput=()=>{
  clearTimeout(groupCreateSearchTimer);
  groupCreateSearchTimer=setTimeout(()=>miRenderGroupCreateResults(search.value),180);
 };
 setTimeout(()=>document.getElementById('groupName')?.focus(),0);
}

document.getElementById('saveGroup').onclick=async()=>{
 const name=document.getElementById('groupName').value.trim();
 const selected=[...groupCreateSelected.keys()];
 const button=document.getElementById('saveGroup');

 if(name.length<2)return toast('Group name must be at least 2 characters');
 if(name.length>64)return toast('Group name is too long');
 if(!selected.length)return toast('Choose at least one registered user');

 if(typeof miCreateRemoteGroup!=='function'){
  return toast('Realtime groups are not loaded');
 }

 button.disabled=true;
 const previous=button.textContent;
 button.textContent='Creating…';

 const result=await miCreateRemoteGroup(name,selected);

 button.disabled=false;
 button.textContent=previous;

 if(!result.ok){
  toast(result.message||'Could not create group');
  return;
 }

 closeModal('groupModal');
 nav('chats');
 openConv(result.conversation.id);
 toast('Group created');
};

document.getElementById('savePublic').onclick=()=>{
 let n=document.getElementById('pubName').value.trim(),a=document.getElementById('pubAddress').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g,''),d=document.getElementById('pubDesc').value.trim(),m=document.querySelector('[name=mode]:checked').value;
 if(!n||!a)return toast('Add a name and address');
 let c={id:id(),kind:'public',mode:m,name:'/'+a,handle:'mi.net/'+a,initials:initials(n),preview:'Public created',time:'now',unread:0,subtitle:'1 member',desc:d||n,joined:1,owner:true};
 if(m==='hybrid')c.posts=[{id:id(),t:'now',x:'Welcome to '+n+'.',r:0,l:0,liked:false,replies:[]}];else c.messages=[{id:id(),a:state.me.name,i:state.me.initials,t:'now',x:'Welcome to '+n+'.',own:1,reactions:0}];
 state.conversations.unshift(c);persist();closeModal('publicModal');nav('chats');openConv(c.id);toast('Public created')
};
function ensureUsernameErrorElement(){
 const input=document.getElementById('profileHandle');
 if(!input)return null;

 let error=document.getElementById('profileHandleError');
 if(error)return error;

 error=document.createElement('small');
 error.id='profileHandleError';
 error.className='field-error';
 error.hidden=true;
 error.setAttribute('aria-live','polite');
 input.insertAdjacentElement('afterend',error);
 input.setAttribute('aria-describedby','profileHandleError');
 return error;
}

function validateProfileUsername({report=false}={}){
 const input=document.getElementById('profileHandle');
 const error=ensureUsernameErrorElement();
 if(!input)return {ok:false,message:'Username field not found.'};

 const result=miCheckUsername(input.value);
 miSetUsernameValidation(input,result,error);

 if(report&&!result.ok)input.reportValidity();
 return result;
}

function openProfileEditor(){
 document.getElementById('profileName').value=state.me.name;
 document.getElementById('profileHandle').value=state.me.handle;
 document.getElementById('profileBio').value=state.me.bio;

 const handleInput=document.getElementById('profileHandle');

 // Username input is explicitly configured for an English/ASCII handle.
 handleInput.setAttribute('inputmode','text');
 handleInput.setAttribute('autocomplete','username');
 handleInput.setAttribute('autocapitalize','none');
 handleInput.setAttribute('spellcheck','false');
 handleInput.setAttribute('lang','en');
 handleInput.setAttribute('maxlength','25');

 handleInput.oninput=()=>validateProfileUsername();
 handleInput.onblur=()=>validateProfileUsername();

 ensureUsernameErrorElement();
 validateProfileUsername();
 openModal('profileModal');
}
document.getElementById('saveProfile').onclick=async()=>{
 const name=document.getElementById('profileName').value.trim();
 if(!name)return toast('Name is required');

 const usernameResult=validateProfileUsername({report:true});
 if(!usernameResult.ok){
  toast('Choose another username');
  return;
 }

 const button=document.getElementById('saveProfile');
 const originalText=button.textContent;
 button.disabled=true;
 button.textContent='Saving…';

 const bio=document.getElementById('profileBio').value.trim();
 const remote=typeof miSaveRemoteProfile==='function'
  ?await miSaveRemoteProfile({
    displayName:name,
    username:usernameResult.value.replace(/^@/,''),
    bio
   })
  :{ok:true};

 button.disabled=false;
 button.textContent=originalText;

 if(!remote.ok){
  toast(remote.message||'Could not save profile');
  return;
 }

 state.me.name=name;
 state.me.handle=usernameResult.value;
 state.me.bio=bio;
 state.me.initials=initials(name);
 document.getElementById('profileOrb').textContent=state.me.initials;

 persist();
 closeModal('profileModal');
 if(view==='profile')renderProfile();
 toast('Profile saved');
};
function openSettings(){
 document.getElementById('darkSwitch').classList.toggle('on',!!state.settings.dark);document.getElementById('compactSwitch').classList.toggle('on',!!state.settings.compact);openModal('settingsModal')
}
document.getElementById('darkSwitch').onclick=e=>{state.settings.dark=!state.settings.dark;e.currentTarget.classList.toggle('on',state.settings.dark);applySettings();persist()};
document.getElementById('compactSwitch').onclick=e=>{state.settings.compact=!state.settings.compact;e.currentTarget.classList.toggle('on',state.settings.compact);applySettings();persist()};
document.getElementById('resetDemo').onclick=()=>{if(confirm('Reset local mi.net data for this account?')){miResetAuthenticatedLocalState();location.reload()}};
