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
 if(type==='media')return msgs.filter(m=>m.file&&(m.file.type?.startsWith('image/')||m.file.type?.startsWith('video/'))).length;
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

function messageStatusHtml(m){
 if(!m.own)return '';
 const status=m.status||'read';
 const glyph=status==='read'?svg('check2'):svg('check');
 return `<span class="message-status ${status}" title="${status==='read'?'Read':'Sent'}">${glyph}</span>`;
}

function pinnedBannerHtml(c){
 const pid=pinnedMessageId(c.id);
 if(!pid||!c.messages)return '';
 const m=c.messages.find(x=>x.id===pid);
 if(!m)return '';
 return `<button class="pinned-banner" id="pinnedBanner" data-scroll-msg="${m.id}">
  <span class="pinned-banner__icon">${svg('pin')}</span>
  <span><strong>Pinned message</strong><small>${esc(m.x||m.file?.name||'Attachment').slice(0,90)}</small></span>
  <span class="pinned-banner__jump">View</span>
 </button>`;
}


const MESSAGE_URL_RE=/((?:https?:\/\/|www\.)[^\s<]+)/ig;

function normalizeExternalUrl(url){
 const raw=String(url||'').trim();
 if(!raw)return '';
 return /^https?:\/\//i.test(raw)?raw:'https://'+raw;
}

function urlMatches(text){
 return String(text||'').match(MESSAGE_URL_RE)||[];
}

function fileAttachmentHtml(file){
 if(!file)return '';
 const type=file.type||'';
 const src=file.url||'';

 if(type.startsWith('image/')&&src){
  return `<figure class="message-media is-image"><img src="${src}" alt="${esc(file.name||'Image attachment')}" loading="lazy"></figure>`;
 }

 if(type.startsWith('video/')&&src){
  return `<figure class="message-media is-video">
   <video controls preload="metadata" src="${src}"></video>
   <figcaption>${esc(file.name||'Video')}</figcaption>
  </figure>`;
 }

 return `<div class="filecard"><span class="icon">${svg('file')}</span><div class="filemeta"><strong>${esc(file.name)}</strong><small>${esc(file.type||'file')} · ${formatSize(file.size||0)}</small></div></div>`;
}

function linkifyText(text){
 return esc(String(text||'')).replace(MESSAGE_URL_RE,match=>{
  const href=normalizeExternalUrl(match);
  return `<a class="message-link" href="${href}" target="_blank" rel="noopener noreferrer">${esc(match)}</a>`;
 });
}

function urlPreviewHtml(url){
 try{
  const href=normalizeExternalUrl(url);
  const parsed=new URL(href);
  const host=parsed.hostname.replace(/^www\./i,'');
  const path=(parsed.pathname&&parsed.pathname!=='/'?parsed.pathname:'').slice(0,44);
  const hostLabel=host.replace(/\.[^.]+$/,'');
  const title=hostLabel.split(/[.-]/).filter(Boolean).map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ')||host;
  const description=(path?path.replace(/[-_/]+/g,' ')+' · ':'')+host;
  const favicon=`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;

  return `<a class="site-link-preview" href="${href}" target="_blank" rel="noopener noreferrer">
   <span class="site-link-preview__chrome">
    <span class="site-link-preview__dots"><i></i><i></i><i></i></span>
    <span class="site-link-preview__address">${esc(host)}</span>
    <span class="site-link-preview__action">Open</span>
   </span>
   <span class="site-link-preview__body">
    <span class="site-link-preview__thumb">
     <img src="${favicon}" alt="" loading="lazy" onerror="this.style.display='none';this.parentNode.querySelector('b').style.display='grid'">
     <b style="display:none">${esc(host.slice(0,1).toUpperCase())}</b>
    </span>
    <span class="site-link-preview__copy">
     <strong>${esc(title)}</strong>
     <small>${esc(description)}</small>
     <span class="site-link-preview__cta">${esc(host)}</span>
    </span>
   </span>
  </a>`;
 }catch(e){
  return '';
 }
}

function richMessageTextHtml(text){
 const raw=String(text||'').trim();
 if(!raw)return '';
 const firstUrl=urlMatches(raw)[0];
 return `<div class="message-richtext">${linkifyText(raw)}</div>${firstUrl?urlPreviewHtml(firstUrl):''}`;
}

function msg(m){
 const hit=chatSearchQuery&&`${m.a} ${m.x||''} ${m.file?.name||''}`.toLowerCase().includes(chatSearchQuery.toLowerCase());
 return `<article class="msg ${m.own?'own':''} ${hit?'search-hit':''}" data-msg="${m.id}">
 ${A(m.i,m.own?'dark':'')}
 <div class="message-column">
  <div class="author"><strong>${esc(m.a)}</strong><time>${esc(m.t)}${m.edited?' · edited':''}</time>${messageStatusHtml(m)}</div>
  ${m.reply?`<div class="replyquote"><strong>${esc(m.reply.a)}</strong><br>${esc(m.reply.x).slice(0,100)}</div>`:''}
  <div class="bubble" data-message-bubble="${m.id}">
   ${m.forwardedFrom?`<div class="forwarded-label">${svg('forward')} Forwarded from ${esc(m.forwardedFrom)}</div>`:''}
   ${m.x?richMessageTextHtml(m.x):''}
   ${m.file?fileAttachmentHtml(m.file):''}
  </div>
  <div class="message-tools">
   <button class="message-tool" data-quick-reply="${m.id}" title="Reply">${svg('forward')}</button>
   <button class="message-tool" data-message-more="${m.id}" title="More">${svg('more')}</button>
  </div>
  <div class="msgactions">${reactionSummaryHtml(m)}</div>
 </div>
 </article>`;
}
function composerHtml(c,placeholder){
 const draft=editTarget?'':draftFor(c.id);
 return `${editTarget?`<div class="replybar editbar"><div><strong>Editing message</strong><span>${esc(editTarget.x||'').slice(0,90)}</span></div><button class="mini-close" id="cancelEdit">×</button></div>`:''}
 ${replyTarget&&!editTarget?`<div class="replybar"><div><strong>Reply to ${esc(replyTarget.a)}</strong><span>${esc(replyTarget.x||replyTarget.file?.name||'Attachment').slice(0,90)}</span></div><button class="mini-close" id="cancelReply">×</button></div>`:''}
 ${pendingAttachment&&!editTarget?`<div class="attachbar"><div><strong>${esc(pendingAttachment.name)}</strong><span>${esc(pendingAttachment.type||'file')} · ${formatSize(pendingAttachment.size)}</span></div><button class="mini-close" id="cancelAttach">×</button></div>`:''}
 <footer class="composer ${(replyTarget||pendingAttachment||editTarget)?'has-top':''}">
  <button class="iconbtn" id="attachBtn" title="Attach" ${editTarget?'disabled':''}><span class="icon">${svg('paperclip')}</span></button>
  <textarea id="messageInput" placeholder="${esc(editTarget?'Edit message':placeholder)}">${esc(editTarget?editTarget.x||'':draft)}</textarea>
  <div class="composer-meta"><span class="draft-state" id="draftState">${draft&&!editTarget?'draft':''}</span><button class="send" id="sendBtn" title="${editTarget?'Save changes':'Send'}"><span class="icon">${svg(editTarget?'check':'send')}</span></button></div>
 </footer>`;
}
function renderChat(c){
 const q=chatSearchQuery.trim().toLowerCase();
 const msgs=(c.messages||[]).filter(m=>!q||`${m.a} ${m.x||''} ${m.file?.name||''}`.toLowerCase().includes(q));
 chat.innerHTML=`<header class="chathead">${A(c.initials,c.kind!=='direct'?'square'+(c.kind==='public'?' dark':''):'')}<div class="chatname"><strong>${esc(c.name)}</strong><span>${esc(c.subtitle||'')}</span></div><div class="chatactions">${c.kind==='direct'?`<button class="iconbtn" id="callBtn" title="Call"><span class="icon">${svg('phone')}</span></button>`:''}<button class="iconbtn" id="chatSearchBtn" title="Search"><span class="icon">${svg('search')}</span></button><button class="iconbtn" id="chatMoreBtn" title="More"><span class="icon">${svg('more')}</span></button></div></header>
 ${chatSearchOpen?`<div class="chatsearch"><input id="chatSearchInput" value="${esc(chatSearchQuery)}" placeholder="Search in ${esc(c.name)}"><button class="iconbtn" id="closeChatSearch">${svg('x')}</button></div>`:''}
 ${pinnedBannerHtml(c)}
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
 bindPinnedBanner(c);

 const call=document.getElementById('callBtn');if(call)call.onclick=()=>startCall(c);
 const input=document.getElementById('messageInput'),send=document.getElementById('sendBtn');

 const go=()=>{
  let x=input.value.trim();

  if(editTarget){
   if(!x)return toast('Message cannot be empty');
   editTarget.x=x;
   editTarget.edited=true;
   editTarget=null;
   setDraft(c.id,'');
   persist();
   renderChat(c);
   renderList();
   toast('Message edited');
   return;
  }

  if(!x&&!pendingAttachment)return;

  const m={
   id:id(),a:state.me.name,i:state.me.initials,
   t:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),
   x,own:1,reactions:0,reactionMap:{},status:'sent'
  };
  if(replyTarget)m.reply={a:replyTarget.a,x:replyTarget.x||replyTarget.file?.name||'Attachment'};
  if(pendingAttachment)m.file={...pendingAttachment};

  c.messages=c.messages||[];
  c.messages.push(m);
  c.preview=x||(pendingAttachment?.type?.startsWith('image/')?'Photo':pendingAttachment?.type?.startsWith('video/')?'Video':('Attached '+pendingAttachment.name));
  c.time='now';
  replyTarget=null;
  pendingAttachment=null;
  setDraft(c.id,'');
  persist();
  renderChat(c);
  renderList();
  setTimeout(scrollBottom,0);

  // Demo delivery lifecycle: sent -> read.
  setTimeout(()=>{
   const latest=conv(c.id)?.messages?.find(item=>item.id===m.id);
   if(latest&&latest.status!=='read'){
    latest.status='read';
    persist();
    if(active===c.id)renderChat(c);
   }
  },900);
 };

 send.onclick=go;
 input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();go()}};
 input.oninput=()=>{
  if(!editTarget)setDraft(c.id,input.value);
  const stateEl=document.getElementById('draftState');
  if(stateEl&&!editTarget)stateEl.textContent=input.value.trim()?'draft':'';
  if(view==='chats')renderList();
 };

 const attach=document.getElementById('attachBtn');if(attach)attach.onclick=()=>document.getElementById('filePicker').click();
 const cr=document.getElementById('cancelReply');if(cr)cr.onclick=()=>{replyTarget=null;renderChat(c)};
 const ca=document.getElementById('cancelAttach');if(ca)ca.onclick=()=>{pendingAttachment=null;renderChat(c)};
 const ce=document.getElementById('cancelEdit');if(ce)ce.onclick=()=>{editTarget=null;renderChat(c)};

 bindMessageReactions(c);

 chat.querySelectorAll('[data-quick-reply]').forEach(b=>b.onclick=()=>{
  replyTarget=c.messages.find(x=>x.id===b.dataset.quickReply);
  editTarget=null;
  renderChat(c);
  setTimeout(()=>document.getElementById('messageInput')?.focus(),0);
 });

 chat.querySelectorAll('[data-message-more]').forEach(b=>b.onclick=e=>{
  e.stopPropagation();
  const m=c.messages.find(x=>x.id===b.dataset.messageMore);
  if(m)openMessageMenu(e.currentTarget,c,m);
 });

 chat.querySelectorAll('[data-message-bubble]').forEach(el=>el.oncontextmenu=e=>{
  e.preventDefault();
  const m=c.messages.find(x=>x.id===el.dataset.messageBubble);
  if(m)openMessageMenuAt(e.clientX,e.clientY,c,m);
 });
}

function bindPinnedBanner(c){
 const banner=document.getElementById('pinnedBanner');
 if(!banner)return;
 banner.onclick=()=>{
  const target=chat.querySelector(`[data-msg="${banner.dataset.scrollMsg}"]`);
  if(target){
   target.scrollIntoView({behavior:'smooth',block:'center'});
   target.classList.add('message-flash');
   setTimeout(()=>target.classList.remove('message-flash'),900);
  }
 };
}

function ensureMessagePopover(){
 let p=document.getElementById('messagePopover');
 if(!p){
  p=document.createElement('div');
  p.id='messagePopover';
  p.className='popover message-popover';
  p.hidden=true;
  document.body.append(p);
 }
 return p;
}

function copyMessageText(m){
 const value=m.x||m.file?.name||m.file?.url||'';
 if(!value)return toast('Nothing to copy');
 if(navigator.clipboard?.writeText){
  navigator.clipboard.writeText(value).then(()=>toast('Copied')).catch(()=>toast(value));
 }else toast(value);
}

function pinMessage(c,m){
 if(pinnedMessageId(c.id)===m.id)setPinnedMessage(c.id,null);
 else setPinnedMessage(c.id,m.id);
 renderChat(c);detail(c);
 toast(pinnedMessageId(c.id)===m.id?'Message pinned':'Message unpinned');
}

function editMessage(c,m){
 if(!m.own)return;
 editTarget=m;replyTarget=null;pendingAttachment=null;
 renderChat(c);
 setTimeout(()=>{const input=document.getElementById('messageInput');if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length)}},0);
}

function deleteMessage(c,m){
 if(!confirm('Delete this message?'))return;
 c.messages=c.messages.filter(x=>x.id!==m.id);
 if(pinnedMessageId(c.id)===m.id)setPinnedMessage(c.id,null);
 c.preview=c.messages.at(-1)?.x||'Message deleted';
 persist();renderChat(c);renderList();detail(c);toast('Message deleted');
}

function openForwardModal(sourceConversation,m){
 let modal=document.getElementById('forwardMessageModal');
 if(!modal){
  modal=document.createElement('div');
  modal.id='forwardMessageModal';
  modal.className='modalback';
  modal.hidden=true;
  document.body.append(modal);
 }
 forwardTarget={sourceConversation,m};
 modal.innerHTML=`<section class="modal">
  <header class="modalhead"><button class="iconbtn" id="closeForward">${svg('x')}</button><strong>Forward message</strong><span></span></header>
  <div class="modalbody">
   <div class="forward-preview"><strong>${esc(m.a)}</strong><p>${esc(m.x||m.file?.name||'Attachment')}</p></div>
   <div class="sectionlabel" style="padding-left:0">Send to</div>
   <div class="forward-list">${state.conversations.filter(c=>c.id!==sourceConversation.id&&c.messages).map(c=>`
    <button class="forward-row" data-forward-to="${c.id}">${A(c.initials,c.kind!=='direct'?'square':'')}<span><strong>${esc(c.name)}</strong><small>${esc(c.subtitle||c.handle||'')}</small></span>${svg('forward')}</button>`).join('')}</div>
  </div></section>`;
 modal.hidden=false;
 document.getElementById('closeForward').onclick=()=>modal.hidden=true;
 modal.onclick=e=>{if(e.target===modal)modal.hidden=true};
 modal.querySelectorAll('[data-forward-to]').forEach(b=>b.onclick=()=>{
  const dest=conv(b.dataset.forwardTo);
  const forwarded={
   id:id(),a:state.me.name,i:state.me.initials,t:'now',
   x:m.x||'',own:1,reactions:0,reactionMap:{},status:'sent',
   forwardedFrom:m.a
  };
  if(m.file)forwarded.file={...m.file};
  dest.messages=dest.messages||[];
  dest.messages.push(forwarded);
  dest.preview='Forwarded: '+(m.x||m.file?.name||'message');
  dest.time='now';
  persist();modal.hidden=true;renderList();toast('Message forwarded to '+dest.name);
 });
}

function openMessageMenu(anchor,c,m){
 const r=anchor.getBoundingClientRect();
 openMessageMenuAt(Math.min(r.left,window.innerWidth-210),r.bottom+5,c,m);
}

function openMessageMenuAt(x,y,c,m){
 const p=ensureMessagePopover();
 const pinned=pinnedMessageId(c.id)===m.id;
 p.innerHTML=`
  <button data-mm="reply"><span class="icon">${svg('forward')}</span>Reply</button>
  <button data-mm="copy"><span class="icon">${svg('copy')}</span>Copy text</button>
  <button data-mm="forward"><span class="icon">${svg('forward')}</span>Forward</button>
  <button data-mm="pin"><span class="icon">${svg('pin')}</span>${pinned?'Unpin':'Pin'} message</button>
  ${m.own?`<button data-mm="edit"><span class="icon">${svg('edit')}</span>Edit</button><button class="danger" data-mm="delete"><span class="icon">${svg('trash')}</span>Delete</button>`:''}`;
 p.style.left=Math.max(8,Math.min(x,window.innerWidth-215))+'px';
 p.style.top=Math.max(8,Math.min(y,window.innerHeight-275))+'px';
 p.hidden=false;
 p.querySelector('[data-mm="reply"]').onclick=()=>{p.hidden=true;replyTarget=m;editTarget=null;renderChat(c);setTimeout(()=>document.getElementById('messageInput')?.focus(),0)};
 p.querySelector('[data-mm="copy"]').onclick=()=>{p.hidden=true;copyMessageText(m)};
 p.querySelector('[data-mm="forward"]').onclick=()=>{p.hidden=true;openForwardModal(c,m)};
 p.querySelector('[data-mm="pin"]').onclick=()=>{p.hidden=true;pinMessage(c,m)};
 const edit=p.querySelector('[data-mm="edit"]');if(edit)edit.onclick=()=>{p.hidden=true;editMessage(c,m)};
 const del=p.querySelector('[data-mm="delete"]');if(del)del.onclick=()=>{p.hidden=true;deleteMessage(c,m)};
}

document.addEventListener('pointerdown',e=>{
 const p=document.getElementById('messagePopover');
 if(p&&!p.hidden&&!e.target.closest('#messagePopover')&&!e.target.closest('[data-message-more]'))p.hidden=true;
});

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
 let c=conv(idv);if(!c)return;active=idv;c.unread=0;chatSearchOpen=false;chatSearchQuery='';replyTarget=null;pendingAttachment=null;editTarget=null;renderConversation(c);detail(c);if(view==='chats')renderList();document.body.classList.add('chatopen');document.getElementById('mobileTitle').textContent=c.name;persist();setTimeout(scrollBottom,0)
}
function toggleMute(c){const i=state.muted.indexOf(c.id);if(i>=0)state.muted.splice(i,1);else state.muted.push(c.id);persist();detail(c);if(view==='chats')renderList();toast(state.muted.includes(c.id)?'Notifications muted':'Notifications enabled')}
function openChatMenu(anchor,c){
 const p=document.getElementById('chatPopover');const muted=state.muted.includes(c.id);
 p.innerHTML=`<button id="menuPin"><span class="icon">${svg('pin')}</span>${isPinnedConversation(c.id)?'Unpin':'Pin'} conversation</button><button id="menuUnread"><span class="icon">${svg('message')}</span>Mark as unread</button><button id="menuMute"><span class="icon">${svg('bell')}</span>${muted?'Unmute':'Mute'} notifications</button><button id="menuSearch"><span class="icon">${svg('search')}</span>Search conversation</button>${c.kind!=='public'?`<button id="menuClear"><span class="icon">${svg('trash')}</span>Clear messages</button>`:''}<button class="danger" id="menuDelete"><span class="icon">${svg('trash')}</span>${c.kind==='public'?'Leave public':'Delete conversation'}</button>`;
 let r=anchor.getBoundingClientRect();p.style.top=(r.bottom+6)+'px';p.style.left=Math.max(10,r.right-200)+'px';p.hidden=false;
 document.getElementById('menuPin').onclick=()=>{p.hidden=true;toggleConversationPin(c)};document.getElementById('menuUnread').onclick=()=>{p.hidden=true;c.unread=Math.max(1,c.unread||0);persist();renderList();toast('Marked as unread')};document.getElementById('menuMute').onclick=()=>{p.hidden=true;toggleMute(c)};
 document.getElementById('menuSearch').onclick=()=>{p.hidden=true;chatSearchOpen=true;renderConversation(c);setTimeout(()=>document.getElementById('chatSearchInput')?.focus(),0)};
 const clear=document.getElementById('menuClear');if(clear)clear.onclick=()=>{p.hidden=true;if(confirm('Clear all messages in this conversation?')){c.messages=[];c.preview='Conversation cleared';persist();renderChat(c);renderList()}};
 document.getElementById('menuDelete').onclick=()=>{p.hidden=true;if(confirm(c.kind==='public'?'Leave this public?':'Delete this conversation?')){state.conversations=state.conversations.filter(x=>x.id!==c.id);persist();active=state.conversations[0]?.id||null;chat.innerHTML=`<div class="empty"><div class="emptylogo">mi.net</div><h1>No conversation selected.</h1><p>Choose another chat or create a new one.</p></div>`;details.innerHTML='';renderList();document.body.classList.remove('chatopen')}};
}
document.addEventListener('click',e=>{for(const pid of ['createPopover','chatPopover']){const p=document.getElementById(pid);if(!p.hidden&&!e.target.closest('#'+pid)&&!e.target.closest('#createBtn')&&!e.target.closest('#mobileCreate')&&!e.target.closest('#chatMoreBtn'))p.hidden=true}});
