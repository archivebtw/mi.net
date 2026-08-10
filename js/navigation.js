// Lists, Contacts, Publics, Explore, Profile and navigation
function conversationPreview(c){
 const draft=draftFor(c.id);
 if(draft)return `<span class="draft-label">Draft:</span> ${esc(draft)}`;
 return esc(c.preview||'No messages yet');
}

function sortedConversations(items){
 return [...items].sort((a,b)=>{
  const ap=isPinnedConversation(a.id)?1:0;
  const bp=isPinnedConversation(b.id)?1:0;
  if(ap!==bp)return bp-ap;
  return 0;
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

function renderList(){
 const q=query.toLowerCase().trim();
 const items=state.conversations.filter(c=>(filter==='all'||c.kind===filter)&&(!q||`${c.name} ${c.handle||''} ${c.preview||''} ${draftFor(c.id)}`.toLowerCase().includes(q)));
 const pinned=items.filter(c=>isPinnedConversation(c.id));
 const regular=items.filter(c=>!isPinnedConversation(c.id));

 list.innerHTML=items.length
  ?`${pinned.length?`<div class="sectionlabel">Pinned</div>${renderConversationRows(pinned)}`:''}
    <div class="sectionlabel">${pinned.length?'All conversations':'Conversations'}</div>${renderConversationRows(regular)}`
  :`<div class="empty" style="margin-top:80px"><p>No conversations found.</p></div>`;

 list.querySelectorAll('[data-conv]').forEach(b=>{
  b.onclick=()=>openConv(b.dataset.conv);
  b.oncontextmenu=e=>{
   e.preventDefault();
   const c=conv(b.dataset.conv);
   if(c)openConversationQuickMenu(e.clientX,e.clientY,c);
  };
 });
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

function ensureDirect(person){
 const remoteId=person.id||person.remoteUserId||null;

 let c=state.conversations.find(x=>
  x.kind==='direct'&&(
   (remoteId&&x.remoteUserId===remoteId)||
   (!x.remoteUserId&&x.handle===person.handle)
  )
 );

 if(!c){
  c={
   id:id(),
   kind:'direct',
   remoteUserId:remoteId,
   name:person.name,
   handle:person.handle,
   initials:person.initials,
   preview:'New conversation',
   time:'now',
   unread:0,
   subtitle:person.status||'mi.net user',
   desc:person.bio||'mi.net user',
   messages:[]
  };
  state.conversations.unshift(c);
 }else{
  // Refresh mutable public profile data without changing conversation identity.
  if(remoteId)c.remoteUserId=remoteId;
  c.name=person.name||c.name;
  c.handle=person.handle||c.handle;
  c.initials=person.initials||c.initials;
  c.desc=person.bio||c.desc;
 }

 persist();
 openConv(c.id);
}

function renderContacts(target=list){
 target.innerHTML=`<div class="page"><div class="pagehead"><h2>Contacts</h2><p>People you can reach quickly.</p></div>`+
 people.map(p=>`<button class="person" data-person="${p.handle}">${A(p.initials)}<div class="copy"><strong>${esc(p.name)}</strong><small>${esc(p.handle)} · ${esc(p.status)}</small></div><span class="icon">${svg('message')}</span></button>`).join('')+`</div>`;
 target.querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>ensureDirect(people.find(p=>p.handle===b.dataset.person)));
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
