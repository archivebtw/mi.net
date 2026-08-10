// Lists, Contacts, Publics, Explore, Profile and navigation
function conversationPreview(c){
 const draft=draftFor(c.id);
 if(draft)return `<span class="draft-label">Draft:</span> ${esc(draft)}`;
 return esc(c.preview||'No messages yet');
}

function conversationSortValue(c){
 if(c?.sortAt){
  const value=new Date(c.sortAt).getTime();
  if(Number.isFinite(value))return value;
 }
 return 0;
}

function sortedConversations(items){
 return [...items].sort((a,b)=>{
  const ap=isPinnedConversation(a.id)?1:0;
  const bp=isPinnedConversation(b.id)?1:0;

  if(ap!==bp)return bp-ap;

  const timeDiff=conversationSortValue(b)-conversationSortValue(a);
  if(timeDiff)return timeDiff;

  return String(a.name||'').localeCompare(String(b.name||''));
 });
}

function renderConversationRows(items){
 return sortedConversations(items).map(c=>`
 <button class="conv ${c.id===active?'active':''} ${isPinnedConversation(c.id)?'pinned':''}" data-conv="${c.id}">
 ${A(c.initials,(c.kind!=='direct'?'square ':'')+(c.kind==='public'?'dark':''))}
 <div class="convmain">
  <div class="convtitle"><strong>${esc(c.name)}</strong>
   <span class="type">${isPinnedConversation(c.id)?'pinned · ':''}${state.muted.includes(c.id)?'muted · ':''}${c.kind==='direct'?'':c.kind==='group'?'group':c.mode}</span>
  </div>
  <div class="preview">${conversationPreview(c)}</div>
 </div>
 <div class="convmeta">
  <time>${esc(c.time||'')}</time>
  ${c.unread?`<span class="badge">${c.unread}</span>`:''}
 </div>
 </button>`).join('');
}

function renderInboxWelcome(mode='empty'){
 details.innerHTML='';

 if(mode==='loading'){
  chat.innerHTML=`<div class="inbox-welcome inbox-welcome-loading">
   <div class="inbox-welcome-mark"><span class="direct-search-spinner"></span></div>
   <h1>Syncing your mi.net.</h1>
   <p>Loading your Directs and groups from Supabase.</p>
  </div>`;
  return;
 }

 if(mode==='ready'){
  chat.innerHTML=`<div class="inbox-welcome">
   <div class="inbox-welcome-mark">mi</div>
   <span class="inbox-eyebrow">Synced with Supabase</span>
   <h1>Choose a conversation.</h1>
   <p>Your real Directs and groups are ready. Open one from the left, or start something new.</p>
   <div class="inbox-welcome-actions">
    <button class="primary-lite" data-inbox-action="direct"><span class="icon">${svg('message')}</span>New message</button>
    <button class="outline" data-inbox-action="group"><span class="icon">${svg('users')}</span>New group</button>
   </div>
  </div>`;
  bindInboxWelcomeActions();
  return;
 }

 if(mode==='error'){
  chat.innerHTML=`<div class="inbox-welcome">
   <div class="inbox-welcome-mark">!</div>
   <h1>Couldn’t sync conversations.</h1>
   <p>${esc(miRemoteInboxError||'Check your connection and refresh the page.')}</p>
   <div class="inbox-welcome-actions">
    <button class="primary-lite" data-inbox-action="retry">Retry</button>
   </div>
  </div>`;
  bindInboxWelcomeActions();
  return;
 }

 chat.innerHTML=`<div class="inbox-welcome">
  <div class="inbox-welcome-mark">mi</div>
  <span class="inbox-eyebrow">Your account is ready</span>
  <h1>Start with a conversation.</h1>
  <p>No demo chats. Your inbox only contains conversations that actually belong to your account.</p>

  <div class="inbox-welcome-actions">
   <button class="primary-lite" data-inbox-action="direct"><span class="icon">${svg('message')}</span>New message</button>
   <button class="outline" data-inbox-action="group"><span class="icon">${svg('users')}</span>New group</button>
   <button class="outline" data-inbox-action="explore"><span class="icon">${svg('compass')}</span>Explore</button>
  </div>

  <div class="inbox-welcome-hints">
   <span><b>1</b> Find a registered user</span>
   <span><b>2</b> Create a Direct or group</span>
   <span><b>3</b> Messages sync in realtime</span>
  </div>
 </div>`;

 bindInboxWelcomeActions();
}

function bindInboxWelcomeActions(){
 chat.querySelectorAll('[data-inbox-action]').forEach(button=>{
  button.onclick=async()=>{
   const action=button.dataset.inboxAction;

   if(action==='direct'){
    openDirectModal();
    return;
   }

   if(action==='group'){
    openGroupModal();
    return;
   }

   if(action==='explore'){
    nav('explore');
    return;
   }

   if(action==='retry'&&typeof miLoadRemoteConversations==='function'){
    miRemoteInboxError='';
    miRemoteInboxReady=false;
    miRemoteInboxLoading=true;
    renderList();
    renderInboxWelcome('loading');
    const result=await miLoadRemoteConversations();
    miRemoteInboxLoading=false;
    miRemoteInboxReady=true;

    if(!result.ok)miRemoteInboxError=result.message||'Could not sync conversations.';

    renderList();

    if(!state.conversations.length&&!active){
     renderInboxWelcome(miRemoteInboxError?'error':'empty');
    }
   }
  };
 });
}

function inboxListEmptyHtml(){
 const hasAuthenticatedUser=
  typeof miGetAuthUser==='function'&&
  Boolean(miGetAuthUser());

 if(hasAuthenticatedUser&&!miRemoteInboxReady){
  return `<div class="inbox-list-state">
   <span class="direct-search-spinner"></span>
   <strong>Syncing conversations…</strong>
   <small>Directs and groups are loading from Supabase.</small>
  </div>`;
 }

 if(miRemoteInboxError&&!state.conversations.length){
  return `<div class="inbox-list-state is-error">
   <strong>Sync failed</strong>
   <small>${esc(miRemoteInboxError)}</small>
  </div>`;
 }

 if(query.trim()||filter!=='all'){
  return `<div class="inbox-list-state">
   <strong>No matches</strong>
   <small>Try another search or conversation filter.</small>
  </div>`;
 }

 return `<div class="inbox-list-state">
  <div class="inbox-list-icon">${svg('message')}</div>
  <strong>Your inbox is empty</strong>
  <small>Message a registered user or create a group.</small>
  <div class="inbox-list-actions">
   <button data-empty-create="direct">New message</button>
   <button data-empty-create="group">New group</button>
  </div>
 </div>`;
}

function renderList(){
 const q=query.toLowerCase().trim();
 const items=state.conversations.filter(c=>
  (filter==='all'||c.kind===filter)&&
  (!q||`${c.name} ${c.handle||''} ${c.preview||''} ${draftFor(c.id)}`.toLowerCase().includes(q))
 );
 const pinned=items.filter(c=>isPinnedConversation(c.id));
 const regular=items.filter(c=>!isPinnedConversation(c.id));

 list.innerHTML=items.length
  ?`${pinned.length?`<div class="sectionlabel">Pinned</div>${renderConversationRows(pinned)}`:''}
    <div class="sectionlabel">${pinned.length?'All conversations':'Conversations'}</div>${renderConversationRows(regular)}`
  :inboxListEmptyHtml();

 list.querySelectorAll('[data-conv]').forEach(b=>{
  b.onclick=()=>openConv(b.dataset.conv);
  b.oncontextmenu=e=>{
   e.preventDefault();
   const c=conv(b.dataset.conv);
   if(c)openConversationQuickMenu(e.clientX,e.clientY,c);
  };
 });

 list.querySelectorAll('[data-empty-create]').forEach(button=>{
  button.onclick=()=>{
   if(button.dataset.emptyCreate==='direct')openDirectModal();
   if(button.dataset.emptyCreate==='group')openGroupModal();
  };
 });

 if(!active){
  if(!state.conversations.length){
   if(!miRemoteInboxReady)renderInboxWelcome('loading');
   else if(miRemoteInboxError)renderInboxWelcome('error');
   else renderInboxWelcome('empty');
  }else if(miRemoteInboxReady){
   renderInboxWelcome('ready');
  }
 }
}
function openConversationQuickMenu(x,y,c){
 let menu=document.getElementById('chatPopover');
 menu.innerHTML=`
  <button id="quickPin"><span class="icon">${svg('pin')}</span>${isPinnedConversation(c.id)?'Unpin':'Pin'} conversation</button>
  <button id="quickUnread"><span class="icon">${svg('message')}</span>Mark as unread</button>
  <button id="quickMute"><span class="icon">${svg('bell')}</span>${state.muted.includes(c.id)?'Unmute':'Mute'} notifications</button>`;
 menu.style.left=Math.min(x,window.innerWidth-215)+'px';
 menu.style.top=Math.min(y,window.innerHeight-150)+'px';
 menu.hidden=false;

 document.getElementById('quickPin').onclick=()=>{menu.hidden=true;toggleConversationPin(c)};
 document.getElementById('quickUnread').onclick=()=>{menu.hidden=true;c.unread=Math.max(1,c.unread||0);persist();renderList();toast('Marked as unread')};
 document.getElementById('quickMute').onclick=()=>{menu.hidden=true;toggleMute(c)};
}

function toggleConversationPin(c){
 const i=state.pinnedConversations.indexOf(c.id);
 if(i>=0)state.pinnedConversations.splice(i,1);
 else state.pinnedConversations.unshift(c.id);
 persist();
 renderList();
 toast(isPinnedConversation(c.id)?'Conversation pinned':'Conversation unpinned');
}

async function ensureDirect(person){
 const remoteId=person.id||person.remoteUserId||null;

 if(!remoteId){
  toast('Direct messages are available only for registered mi.net users');
  return;
 }

 if(typeof miGetOrCreateRemoteDirect!=='function'){
  toast('Realtime Direct is not available');
  return;
 }

 const result=await miGetOrCreateRemoteDirect({
  ...person,
  remoteUserId:remoteId
 });

 if(!result.ok){
  toast(result.message||'Could not open Direct');
  return;
 }

 openConv(result.conversation.id);
}

let contactsSearchRequest=0;
let contactsSearchTimer=null;

function profileToDirectPerson(profile){
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

async function renderContactResults(searchTerm=''){
 const target=document.getElementById('contactsResults');
 if(!target)return;

 const requestId=++contactsSearchRequest;

 target.innerHTML=`<div class="direct-search-state loading">
  <span class="direct-search-spinner"></span>
  <strong>${searchTerm.trim()?'Searching mi.net…':'Loading registered users…'}</strong>
 </div>`;

 if(typeof miSearchProfiles!=='function'){
  target.innerHTML=`<div class="direct-search-state error"><strong>Supabase profile search is unavailable.</strong></div>`;
  return;
 }

 const result=await miSearchProfiles(searchTerm.trim(),24);

 if(requestId!==contactsSearchRequest)return;

 if(!result.ok){
  target.innerHTML=`<div class="direct-search-state error"><strong>${esc(result.message||'Could not load users.')}</strong></div>`;
  return;
 }

 if(!result.profiles?.length){
  target.innerHTML=`<div class="direct-search-state empty"><strong>No registered users found.</strong></div>`;
  return;
 }

 target.innerHTML=result.profiles.map(profile=>{
  const person=profileToDirectPerson(profile);

  return `<button class="contact-directory-row" data-contact-profile="${profile.id}">
   ${A(person.initials)}
   <div class="copy">
    <strong>${esc(person.name)}</strong>
    <small>${esc(person.handle)}${person.bio?' · '+esc(person.bio):''}</small>
   </div>
   <span class="contact-message-action">${svg('message')}</span>
  </button>`;
 }).join('');

 target.querySelectorAll('[data-contact-profile]').forEach(button=>{
  button.onclick=()=>{
   const profile=result.profiles.find(item=>item.id===button.dataset.contactProfile);
   if(profile)ensureDirect(profileToDirectPerson(profile));
  };
 });
}

function renderContacts(target=list){
 target.innerHTML=`<div class="page contacts-directory">
  <div class="pagehead">
   <h2>People</h2>
   <p>Find registered mi.net users and start a Direct.</p>
  </div>

  <div class="contacts-search-wrap">
   <label class="searchbox">
    <span class="icon">${svg('search')}</span>
    <input id="contactsSearch" placeholder="Search @username or display name" autocomplete="off" autocapitalize="none" spellcheck="false">
   </label>
  </div>

  <div class="sectionlabel">Registered users</div>
  <div class="contacts-results" id="contactsResults"></div>
 </div>`;

 const input=document.getElementById('contactsSearch');

 input.oninput=()=>{
  clearTimeout(contactsSearchTimer);
  contactsSearchTimer=setTimeout(()=>renderContactResults(input.value),180);
 };

 renderContactResults('');
}

function renderPublics(){
 const pubs=state.conversations.filter(c=>c.kind==='public');
 list.innerHTML=`<div class="page"><div class="pagehead"><h2>Publics</h2><p>Channels and communities you follow.</p></div>`+
 (pubs.length?sortedConversations(pubs).map(c=>`<button class="publicrow" data-conv="${c.id}">${A(c.initials,'square dark')}<div class="copy"><strong>${esc(c.name)}</strong><small>${esc(c.desc)}</small></div><span class="type">${esc(c.subtitle)}</span></button>`).join(''):`<div class="empty" style="margin-top:80px"><p>You have not joined any publics yet.</p></div>`)+`</div>`;
 list.querySelectorAll('[data-conv]').forEach(b=>b.onclick=()=>openConv(b.dataset.conv));
}

function joinDiscovered(d){
 let existing=state.conversations.find(c=>c.kind==='public'&&c.handle==='mi.net/'+d.address);
 if(!existing){
  existing={id:id(),kind:'public',mode:'community',name:d.name,handle:'mi.net/'+d.address,initials:d.initials,preview:'You joined the public',time:'now',unread:0,subtitle:d.members+' members',desc:d.desc,joined:1,owner:false,messages:[
   {id:id(),a:d.name,i:d.initials,t:'now',x:'Welcome to '+d.name+'. Start a conversation.',reactions:0}
  ]};
  state.conversations.unshift(existing);persist();
 }
 toast('Joined '+d.name);openConv(existing.id);
}

function renderExplore(){
 const items=discover.filter(d=>exploreCategory==='All'||d.cat===exploreCategory);
 list.innerHTML=`<div class="page"><div class="pagehead"><h2>Explore</h2><p>Find people and publics worth joining.</p></div>
 <div class="sectionlabel">Categories</div><div class="chips">${['All','Technology','Design','Music','Gaming','Culture','Photography'].map(x=>`<button class="chip ${x===exploreCategory?'active':''}" data-cat="${x}">${x}</button>`).join('')}</div>
 <div class="sectionlabel">Popular publics</div>${items.map(p=>`<div class="publicrow">${A(p.initials,'square dark')}<div class="copy"><strong>${p.name}</strong><small>${p.desc}</small></div><button class="outline join-discovered" data-address="${p.address}">Join</button></div>`).join('')}</div>`;
 list.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{exploreCategory=b.dataset.cat;renderExplore()});
 list.querySelectorAll('.join-discovered').forEach(b=>b.onclick=()=>joinDiscovered(discover.find(d=>d.address===b.dataset.address)));
}

function renderProfile(){
 const m=state.me;
 const stats={
  chats:state.conversations.filter(c=>c.kind==='direct').length,
  groups:state.conversations.filter(c=>c.kind==='group').length,
  publics:state.conversations.filter(c=>c.kind==='public').length
 };
 list.innerHTML=`<div class="page"><div class="pagehead"><h2>Profile</h2><p>Your identity on mi.net.</p></div>
 <div class="profilecard">${A(m.initials,'dark')}<h2>${esc(m.name)}</h2><div class="handle">${esc(m.handle)}</div><p>${esc(m.bio)}</p><button class="outline" id="editProfileBtn">Edit profile</button></div>
 <div class="profile-stats"><div><strong>${stats.chats}</strong><span>Direct</span></div><div><strong>${stats.groups}</strong><span>Groups</span></div><div><strong>${stats.publics}</strong><span>Publics</span></div></div>
 <div class="account-panel">
  <div class="account-panel__row"><div><strong>Supabase account</strong><small>${esc(typeof miAuthUserEmail==='function'?miAuthUserEmail():'')}</small></div><span class="type">connected</span></div>
  <div class="account-panel__row"><div><strong>Session</strong><small>Account data is synced with Supabase.</small></div><button class="account-panel__logout" id="profileSignOut">Sign out</button></div>
 </div>
 </div>`;
 document.getElementById('editProfileBtn').onclick=openProfileEditor;
 const signOut=document.getElementById('profileSignOut');
 if(signOut)signOut.onclick=()=>miSignOut();
}

function nav(v){
 view=v;
 document.querySelectorAll('.railbtn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
 document.getElementById('filters').style.display=v==='chats'?'flex':'none';
 if(v==='chats')renderList();
 if(v==='contacts')renderContacts();
 if(v==='publics')renderPublics();
 if(v==='explore')renderExplore();
 if(v==='profile')renderProfile();
 document.getElementById('mobileTitle').textContent=v[0].toUpperCase()+v.slice(1);
 if(typeof syncMobileNavigation==='function')syncMobileNavigation(v);
}
