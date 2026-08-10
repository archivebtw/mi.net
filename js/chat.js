// Chat rendering, messages, public posts and conversation actions
function detail(c){
 if(!c){details.innerHTML='';return}
 details.innerHTML=`<div class="detailtop">${A(c.initials,(c.kind!=='direct'?'square ':'')+(c.kind==='public'?'dark':''))}<h2>${esc(c.name)}</h2><div class="handle">${esc(c.handle||'')}</div><p>${esc(c.desc||'')}</p><div class="detailactions">${c.kind==='public'?`<button class="outline" id="joinBtn">${c.joined?'Joined':'Join'}</button>`:`<button class="outline" id="detailMessage">Message</button>`}</div></div>
 <div class="detaillist">
 ${c.kind!=='direct'?`<button class="detailrow" data-library="members"><span class="icon">${svg('users')}</span><span>Members</span><small>${esc(c.subtitle||'')}</small></button>`:''}
 <button class="detailrow" data-library="media"><span class="icon">${svg('image')}</span><span>Media</span><small>${countLibrary(c,'media')}</small></button>
 <button class="detailrow" data-library="links"><span class="icon">${svg('link')}</span><span>Links</span><small>${countLibrary(c,'links')}</small></button>
 <button class="detailrow" data-library="files"><span class="icon">${svg('file')}</span><span>Files</span><small>${countLibrary(c,'files')}</small></button>
 <button class="detailrow" id="notificationToggle"><span class="icon">${svg('bell')}</span><span>Notifications</span><small>${state.muted.includes(c.id)?'Off':'On'}</small></button>
 <button class="detailrow" id="detailSearch"><span class="icon">${svg('search')}</span><span>Search</span></button>
 </div>`;
 const j=document.getElementById('joinBtn');if(j)j.onclick=()=>{c.joined=!c.joined;j.textContent=c.joined?'Joined':'Join';persist();toast(c.joined?'Joined public':'Left public')};
 const dm=document.getElementById('detailMessage');if(dm)dm.onclick=()=>document.getElementById('messageInput')?.focus();
 details.querySelectorAll('[data-library]').forEach(b=>b.onclick=()=>openLibrary(c,b.dataset.library));
 document.getElementById('notificationToggle').onclick=()=>toggleMute(c);
 document.getElementById('detailSearch').onclick=()=>{chatSearchOpen=true;renderConversation(c);setTimeout(()=>document.getElementById('chatSearchInput')?.focus(),0)};
}
function allMessages(c){
 if(c.messages)return c.messages;
 if(c.posts)return c.posts.flatMap(p=>(p.replies||[]));
 return [];
}
function countLibrary(c,type){
 if(type==='members')return c.members?.length||c.subtitle||'—';
 const msgs=allMessages(c);
 if(type==='files')return msgs.filter(m=>m.file).length;
 if(type==='media')return msgs.filter(m=>m.file&&m.file.type?.startsWith('image/')).length;
 if(type==='links')return msgs.filter(m=>/https?:\/\/|www\./i.test(m.x||'')).length;
 return 0;
}
const MESSAGE_REACTIONS=['👍','❤️','😂','😮','😢','🔥'];

function ensureMessageReactionMap(m){
 if(!m.reactionMap||typeof m.reactionMap!=='object'||Array.isArray(m.reactionMap)){
  m.reactionMap={};
  const legacyCount=Number(m.reactions)||0;
  if(legacyCount>0){
   m.reactionMap['❤️']={count:legacyCount,mine:!!m.reacted};
  }
 }
 for(const emoji of Object.keys(m.reactionMap)){
  const item=m.reactionMap[emoji];
  if(typeof item==='number'){
   m.reactionMap[emoji]={count:Math.max(0,item),mine:false};
  }else{
   item.count=Math.max(0,Number(item.count)||0);
   item.mine=!!item.mine;
  }
  if(m.reactionMap[emoji].count===0)delete m.reactionMap[emoji];
 }
 return m.reactionMap;
}

function reactionSummaryHtml(m){
 const map=ensureMessageReactionMap(m);
 const chips=Object.entries(map)
  .filter(([,value])=>value.count>0)
  .sort((a,b)=>Number(b[1].mine)-Number(a[1].mine)||b[1].count-a[1].count)
  .map(([emoji,value])=>`<button class="reaction-chip ${value.mine?'mine':''}" data-reaction-chip="${m.id}" data-emoji="${emoji}" aria-label="${emoji} ${value.count}">${emoji}<span>${value.count}</span></button>`)
  .join('');

 const mineEmoji=Object.entries(map).find(([,value])=>value.mine)?.[0]||'';

 return `<div class="reaction-zone ${chips?'has-reactions':''}" data-reaction-zone="${m.id}">
  <button class="reaction-trigger ${mineEmoji?'mine':''}" data-reaction-trigger="${m.id}" aria-label="Choose reaction" aria-expanded="false">☺</button>
  <div class="reaction-chips">${chips}</div>
  <div class="reaction-picker" role="menu" aria-label="Message reactions">
   ${MESSAGE_REACTIONS.map(emoji=>`<button class="reaction-option ${mineEmoji===emoji?'selected':''}" data-reaction-pick="${m.id}" data-emoji="${emoji}" role="menuitem" aria-label="React ${emoji}">${emoji}</button>`).join('')}
  </div>
 </div>`;
}

function msg(m){
 const hit=chatSearchQuery&&`${m.a} ${m.x||''} ${m.file?.name||''}`.toLowerCase().includes(chatSearchQuery.toLowerCase());
 return `<article class="msg ${m.own?'own':''} ${hit?'search-hit':''}" data-msg="${m.id}">${A(m.i,m.own?'dark':'')}<div><div class="author"><strong>${esc(m.a)}</strong><time>${esc(m.t)}</time></div>
 ${m.reply?`<div class="replyquote"><strong>${esc(m.reply.a)}</strong><br>${esc(m.reply.x).slice(0,100)}</div>`:''}
 <div class="bubble">${m.x?esc(m.x):''}${m.file?`<div class="filecard"><span class="icon">${svg(m.file.type?.startsWith('image/')?'image':'file')}</span><div class="filemeta"><strong>${esc(m.file.name)}</strong><small>${esc(m.file.type||'file')} · ${formatSize(m.file.size||0)}</small></div></div>`:''}</div>
 <div class="msgactions">${reactionSummaryHtml(m)}<button class="react reply-action" data-reply="${m.id}">Reply</button></div></div></article>`;
}
function composerHtml(c,placeholder){
 return `${replyTarget?`<div class="replybar"><div><strong>Reply to ${esc(replyTarget.a)}</strong><span>${esc(replyTarget.x||replyTarget.file?.name||'Attachment').slice(0,90)}</span></div><button class="mini-close" id="cancelReply">×</button></div>`:''}
 ${pendingAttachment?`<div class="attachbar"><div><strong>${esc(pendingAttachment.name)}</strong><span>${esc(pendingAttachment.type||'file')} · ${formatSize(pendingAttachment.size)}</span></div><button class="mini-close" id="cancelAttach">×</button></div>`:''}
 <footer class="composer ${(replyTarget||pendingAttachment)?'has-top':''}"><button class="iconbtn" id="attachBtn" title="Attach"><span class="icon">${svg('paperclip')}</span></button><textarea id="messageInput" placeholder="${esc(placeholder)}"></textarea><button class="send" id="sendBtn"><span class="icon">${svg('send')}</span></button></footer>`;
}
function renderChat(c){
 const q=chatSearchQuery.trim().toLowerCase();
 const msgs=(c.messages||[]).filter(m=>!q||`${m.a} ${m.x||''} ${m.file?.name||''}`.toLowerCase().includes(q));
 chat.innerHTML=`<header class="chathead">${A(c.initials,c.kind!=='direct'?'square'+(c.kind==='public'?' dark':''):'')}<div class="chatname"><strong>${esc(c.name)}</strong><span>${esc(c.subtitle||'')}</span></div><div class="chatactions">${c.kind==='direct'?`<button class="iconbtn" id="callBtn" title="Call"><span class="icon">${svg('phone')}</span></button>`:''}<button class="iconbtn" id="chatSearchBtn" title="Search"><span class="icon">${svg('search')}</span></button><button class="iconbtn" id="chatMoreBtn" title="More"><span class="icon">${svg('more')}</span></button></div></header>
 ${chatSearchOpen?`<div class="chatsearch"><input id="chatSearchInput" value="${esc(chatSearchQuery)}" placeholder="Search in ${esc(c.name)}"><button class="iconbtn" id="closeChatSearch">${svg('x')}</button></div>`:''}
 <section class="messages" id="messages"><div class="day">${q?`${msgs.length} result${msgs.length===1?'':'s'}`:'Today'}</div>${msgs.length?msgs.map(msg).join(''):`<div class="empty"><p>No matching messages.</p></div>`}</section>
 ${composerHtml(c,'Message '+c.name)}`;
 bindChat(c);
}
function renderPublic(c){
 chat.innerHTML=`<header class="chathead">${A(c.initials,'square dark')}<div class="chatname"><strong>${esc(c.name)}</strong><span>${esc(c.subtitle)}</span></div><div class="chatactions"><button class="iconbtn" id="chatSearchBtn" title="Search"><span class="icon">${svg('search')}</span></button><button class="iconbtn" id="chatMoreBtn" title="More"><span class="icon">${svg('more')}</span></button></div></header>
 ${chatSearchOpen?`<div class="chatsearch"><input id="chatSearchInput" value="${esc(chatSearchQuery)}" placeholder="Search posts"><button class="iconbtn" id="closeChatSearch">${svg('x')}</button></div>`:''}
 <section class="messages">${(c.posts||[]).filter(p=>!chatSearchQuery||p.x.toLowerCase().includes(chatSearchQuery.toLowerCase())).map(p=>`<article class="publicpost" data-post="${p.id}"><div class="pubhead">${A(c.initials,'square dark')}<strong>${esc(c.name)}</strong><time>${esc(p.t)}</time></div><div class="pubbody">${esc(p.x)}</div><div class="pubfoot"><button class="metric ${p.liked?'active':''}" data-like-post="${p.id}">♡ ${p.l}</button><button class="metric" data-thread="${p.id}">${(p.replies||[]).length||p.r||0} replies</button><button class="metric" data-share="${p.id}">Share</button></div></article>`).join('')||`<div class="empty"><p>No matching posts.</p></div>`}</section>
 ${c.owner?`<footer class="composer"><button class="iconbtn" id="attachBtn"><span class="icon">${svg('paperclip')}</span></button><textarea id="messageInput" placeholder="Publish to ${esc(c.name)}"></textarea><button class="send" id="sendBtn"><span class="icon">${svg('send')}</span></button></footer>`:''}`;
 bindPublic(c);
}
function renderConversation(c){if(c.kind==='public'&&c.mode==='hybrid')renderPublic(c);else renderChat(c)}
function bindHeaderCommon(c){
 const searchBtn=document.getElementById('chatSearchBtn');if(searchBtn)searchBtn.onclick=()=>{chatSearchOpen=!chatSearchOpen;if(!chatSearchOpen)chatSearchQuery='';renderConversation(c);setTimeout(()=>document.getElementById('chatSearchInput')?.focus(),0)};
 const si=document.getElementById('chatSearchInput');if(si)si.oninput=e=>{chatSearchQuery=e.target.value;renderConversation(c);setTimeout(()=>{let x=document.getElementById('chatSearchInput');if(x){x.focus();x.setSelectionRange(x.value.length,x.value.length)}},0)};
 const cs=document.getElementById('closeChatSearch');if(cs)cs.onclick=()=>{chatSearchOpen=false;chatSearchQuery='';renderConversation(c)};
 const more=document.getElementById('chatMoreBtn');if(more)more.onclick=e=>openChatMenu(e.currentTarget,c);
}
function bindChat(c){
 bindHeaderCommon(c);
 const call=document.getElementById('callBtn');if(call)call.onclick=()=>startCall(c);
 const input=document.getElementById('messageInput'),send=document.getElementById('sendBtn');
 const go=()=>{let x=input.value.trim();if(!x&&!pendingAttachment)return;const m={id:id(),a:state.me.name,i:state.me.initials,t:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),x,own:1,reactions:0,reactionMap:{}};if(replyTarget)m.reply={a:replyTarget.a,x:replyTarget.x||replyTarget.file?.name||'Attachment'};if(pendingAttachment)m.file={...pendingAttachment};c.messages=c.messages||[];c.messages.push(m);c.preview=x||('Attached '+pendingAttachment.name);c.time='now';replyTarget=null;pendingAttachment=null;persist();renderChat(c);renderList();setTimeout(scrollBottom,0)};
 send.onclick=go;input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();go()}};
 document.getElementById('attachBtn').onclick=()=>document.getElementById('filePicker').click();
 const cr=document.getElementById('cancelReply');if(cr)cr.onclick=()=>{replyTarget=null;renderChat(c)};
 const ca=document.getElementById('cancelAttach');if(ca)ca.onclick=()=>{pendingAttachment=null;renderChat(c)};
 bindMessageReactions(c);
 chat.querySelectorAll('[data-reply]').forEach(b=>b.onclick=()=>{replyTarget=c.messages.find(x=>x.id===b.dataset.reply);renderChat(c);setTimeout(()=>document.getElementById('messageInput')?.focus(),0)});
}

function closeMessageReactionPickers(exceptZone=null){
 chat.querySelectorAll('.reaction-zone.picker-open').forEach(zone=>{
  if(zone!==exceptZone){
   zone.classList.remove('picker-open');
   const trigger=zone.querySelector('[data-reaction-trigger]');
   if(trigger)trigger.setAttribute('aria-expanded','false');
  }
 });
}

function syncLegacyReactionFields(m){
 const map=ensureMessageReactionMap(m);
 m.reactions=Object.values(map).reduce((sum,item)=>sum+(item.count||0),0);
 m.reacted=Object.values(map).some(item=>item.mine);
}

function setMessageReaction(c,m,emoji){
 const map=ensureMessageReactionMap(m);
 const currentMine=Object.keys(map).find(key=>map[key]?.mine);

 if(currentMine===emoji){
  map[emoji].count=Math.max(0,map[emoji].count-1);
  map[emoji].mine=false;
  if(map[emoji].count===0)delete map[emoji];
 }else{
  if(currentMine&&map[currentMine]){
   map[currentMine].count=Math.max(0,map[currentMine].count-1);
   map[currentMine].mine=false;
   if(map[currentMine].count===0)delete map[currentMine];
  }

  if(!map[emoji])map[emoji]={count:0,mine:false};
  map[emoji].count+=1;
  map[emoji].mine=true;
 }

 syncLegacyReactionFields(m);
 persist();

 const messageArea=document.getElementById('messages');
 const previousScroll=messageArea?.scrollTop||0;
 renderChat(c);
 const nextArea=document.getElementById('messages');
 if(nextArea)nextArea.scrollTop=previousScroll;
}

function bindMessageReactions(c){
 chat.querySelectorAll('[data-reaction-trigger]').forEach(trigger=>{
  trigger.onclick=e=>{
   e.stopPropagation();
   const zone=trigger.closest('.reaction-zone');
   const willOpen=!zone.classList.contains('picker-open');
   closeMessageReactionPickers(zone);
   zone.classList.toggle('picker-open',willOpen);
   trigger.setAttribute('aria-expanded',String(willOpen));
  };
 });

 chat.querySelectorAll('[data-reaction-pick]').forEach(option=>{
  option.onclick=e=>{
   e.stopPropagation();
   const m=c.messages.find(item=>item.id===option.dataset.reactionPick);
   if(m)setMessageReaction(c,m,option.dataset.emoji);
  };
 });

 chat.querySelectorAll('[data-reaction-chip]').forEach(chip=>{
  chip.onclick=e=>{
   e.stopPropagation();
   const m=c.messages.find(item=>item.id===chip.dataset.reactionChip);
   if(m)setMessageReaction(c,m,chip.dataset.emoji);
  };
 });
}

if(!window.__miMessageReactionPickerBound){
 window.__miMessageReactionPickerBound=true;
 document.addEventListener('pointerdown',e=>{
  if(!e.target.closest('.reaction-zone'))closeMessageReactionPickers();
 });
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape')closeMessageReactionPickers();
 });
}

function bindPublic(c){
 bindHeaderCommon(c);
 chat.querySelectorAll('[data-like-post]').forEach(b=>b.onclick=()=>{let p=c.posts.find(x=>x.id===b.dataset.likePost);p.liked=!p.liked;p.l=Math.max(0,p.l+(p.liked?1:-1));persist();renderPublic(c)});
 chat.querySelectorAll('[data-thread]').forEach(b=>b.onclick=()=>openThread(c,b.dataset.thread));
 chat.querySelectorAll('[data-share]').forEach(b=>b.onclick=async()=>{let url=`https://mi.net/${c.name.replace('/','')}/post/${b.dataset.share}`;try{await navigator.clipboard.writeText(url);toast('Link copied')}catch(e){toast(url)}});
 if(c.owner){
  const send=document.getElementById('sendBtn'),input=document.getElementById('messageInput');
  send.onclick=()=>{let x=input.value.trim();if(!x)return;c.posts.unshift({id:id(),t:'now',x,r:0,l:0,liked:false,replies:[]});c.preview=x;c.time='now';persist();renderPublic(c);renderList();toast('Published')};
  input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send.click()}};
  document.getElementById('attachBtn').onclick=()=>toast('Post media upload is next on the roadmap');
 }
}
function scrollBottom(){let m=document.getElementById('messages');if(m)m.scrollTop=m.scrollHeight}
function openConv(idv){
 let c=conv(idv);if(!c)return;active=idv;c.unread=0;chatSearchOpen=false;chatSearchQuery='';replyTarget=null;pendingAttachment=null;renderConversation(c);detail(c);if(view==='chats')renderList();document.body.classList.add('chatopen');document.getElementById('mobileTitle').textContent=c.name;persist();setTimeout(scrollBottom,0)
}
function toggleMute(c){const i=state.muted.indexOf(c.id);if(i>=0)state.muted.splice(i,1);else state.muted.push(c.id);persist();detail(c);if(view==='chats')renderList();toast(state.muted.includes(c.id)?'Notifications muted':'Notifications enabled')}
function openChatMenu(anchor,c){
 const p=document.getElementById('chatPopover');const muted=state.muted.includes(c.id);
 p.innerHTML=`<button id="menuMute"><span class="icon">${svg('bell')}</span>${muted?'Unmute':'Mute'} notifications</button><button id="menuSearch"><span class="icon">${svg('search')}</span>Search conversation</button>${c.kind!=='public'?`<button id="menuClear"><span class="icon">${svg('trash')}</span>Clear messages</button>`:''}<button class="danger" id="menuDelete"><span class="icon">${svg('trash')}</span>${c.kind==='public'?'Leave public':'Delete conversation'}</button>`;
 let r=anchor.getBoundingClientRect();p.style.top=(r.bottom+6)+'px';p.style.left=Math.max(10,r.right-200)+'px';p.hidden=false;
 document.getElementById('menuMute').onclick=()=>{p.hidden=true;toggleMute(c)};
 document.getElementById('menuSearch').onclick=()=>{p.hidden=true;chatSearchOpen=true;renderConversation(c);setTimeout(()=>document.getElementById('chatSearchInput')?.focus(),0)};
 const clear=document.getElementById('menuClear');if(clear)clear.onclick=()=>{p.hidden=true;if(confirm('Clear all messages in this conversation?')){c.messages=[];c.preview='Conversation cleared';persist();renderChat(c);renderList()}};
 document.getElementById('menuDelete').onclick=()=>{p.hidden=true;if(confirm(c.kind==='public'?'Leave this public?':'Delete this conversation?')){state.conversations=state.conversations.filter(x=>x.id!==c.id);persist();active=state.conversations[0]?.id||null;chat.innerHTML=`<div class="empty"><div class="emptylogo">mi.net</div><h1>No conversation selected.</h1><p>Choose another chat or create a new one.</p></div>`;details.innerHTML='';renderList();document.body.classList.remove('chatopen')}};
}
document.addEventListener('click',e=>{for(const pid of ['createPopover','chatPopover']){const p=document.getElementById(pid);if(!p.hidden&&!e.target.closest('#'+pid)&&!e.target.closest('#createBtn')&&!e.target.closest('#mobileCreate')&&!e.target.closest('#chatMoreBtn'))p.hidden=true}});
