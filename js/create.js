// Create Direct, Group, Public, Profile and Settings
function renderDirectContacts(){
 const q=document.getElementById('directSearch').value.trim().toLowerCase();const items=people.filter(p=>!q||`${p.name} ${p.handle}`.toLowerCase().includes(q));
 document.getElementById('directContacts').innerHTML=items.map(p=>`<button data-direct-person="${p.handle}">${A(p.initials)}<div class="copy"><strong>${esc(p.name)}</strong><small>${esc(p.handle)}</small></div><span class="icon">${svg('message')}</span></button>`).join('');
 document.querySelectorAll('[data-direct-person]').forEach(b=>b.onclick=()=>{closeModal('directModal');ensureDirect(people.find(p=>p.handle===b.dataset.directPerson))});
}
function openDirectModal(){document.getElementById('directSearch').value='';renderDirectContacts();openModal('directModal');setTimeout(()=>document.getElementById('directSearch').focus(),0)}
document.getElementById('directSearch').oninput=renderDirectContacts;

function openGroupModal(){
 document.getElementById('groupName').value='';document.getElementById('groupMembers').innerHTML=people.map(p=>`<label class="checkrow"><input type="checkbox" value="${p.handle}"><span><strong>${esc(p.name)}</strong><small>${esc(p.handle)}</small></span></label>`).join('');openModal('groupModal')
}
document.getElementById('saveGroup').onclick=()=>{
 let name=document.getElementById('groupName').value.trim();let selected=[...document.querySelectorAll('#groupMembers input:checked')].map(x=>x.value);if(!name)return toast('Add a group name');if(!selected.length)return toast('Choose at least one member');
 let c={id:id(),kind:'group',name,handle:'/'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),initials:initials(name),preview:'Group created',time:'now',unread:0,subtitle:(selected.length+1)+' members',desc:'Group conversation',members:[state.me.handle,...selected],messages:[{id:id(),a:state.me.name,i:state.me.initials,t:'now',x:'Group created.',own:1,reactions:0}]};
 state.conversations.unshift(c);persist();closeModal('groupModal');nav('chats');openConv(c.id);toast('Group created')
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
