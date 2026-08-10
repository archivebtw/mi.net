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
function msg(m){
 const hit=chatSearchQuery&&`${m.a} ${m.x||''} ${m.file?.name||''}`.toLowerCase().includes(chatSearchQuery.toLowerCase());
 return `<article class="msg ${m.own?'own':''} ${hit?'search-hit':''}" data-msg="${m.id}">${A(m.i,m.own?'dark':'')}<div><div class="author"><strong>${esc(m.a)}</strong><time>${esc(m.t)}</time></div>
 ${m.reply?`<div class="replyquote"><strong>${esc(m.reply.a)}</strong><br>${esc(m.reply.x).slice(0,100)}</div>`:''}
 <div class="bubble">${m.x?esc(m.x):''}${m.file?`<div class="filecard"><span class="icon">${svg(m.file.type?.startsWith('image/')?'image':'file')}</span><div class="filemeta"><strong>${esc(m.file.name)}</strong><small>${esc(m.file.type||'file')} · ${formatSize(m.file.size||0)}</small></div></div>`:''}</div>
 <div class="msgactions"><button class="react ${m.reacted?'active':''}" data-react="${m.id}">♡ ${m.reactions||0}</button><button class="react" data-reply="${m.id}">Reply</button></div></div></article>`;
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
 const go=()=>{let x=input.value.trim();if(!x&&!pendingAttachment)return;const m={id:id(),a:state.me.name,i:state.me.initials,t:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),x,own:1,reactions:0};if(replyTarget)m.reply={a:replyTarget.a,x:replyTarget.x||replyTarget.file?.name||'Attachment'};if(pendingAttachment)m.file={...pendingAttachment};c.messages=c.messages||[];c.messages.push(m);c.preview=x||('Attached '+pendingAttachment.name);c.time='now';replyTarget=null;pendingAttachment=null;persist();renderChat(c);renderList();setTimeout(scrollBottom,0)};
 send.onclick=go;input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();go()}};
 document.getElementById('attachBtn').onclick=()=>document.getElementById('filePicker').click();
 const cr=document.getElementById('cancelReply');if(cr)cr.onclick=()=>{replyTarget=null;renderChat(c)};
 const ca=document.getElementById('cancelAttach');if(ca)ca.onclick=()=>{pendingAttachment=null;renderChat(c)};
 chat.querySelectorAll('[data-react]').forEach(b=>b.onclick=()=>{let m=c.messages.find(x=>x.id===b.dataset.react);m.reacted=!m.reacted;m.reactions=Math.max(0,(m.reactions||0)+(m.reacted?1:-1));persist();renderChat(c)});
 chat.querySelectorAll('[data-reply]').forEach(b=>b.onclick=()=>{replyTarget=c.messages.find(x=>x.id===b.dataset.reply);renderChat(c);setTimeout(()=>document.getElementById('messageInput')?.focus(),0)});
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
