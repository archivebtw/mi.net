// Discussion threads, media/files library and demo calls
function openThread(c,pid){
 const p=c.posts.find(x=>x.id===pid);threadCtx={c,p};const body=document.getElementById('threadBody');
 body.innerHTML=`<div class="thread-original"><strong>${esc(c.name)} · ${esc(p.t)}</strong><p>${esc(p.x)}</p></div><div id="threadReplies">${(p.replies||[]).map(r=>`<div class="threadreply">${A(r.i)}<div><strong style="font-size:10px">${esc(r.a)}</strong><p>${esc(r.x)}</p></div></div>`).join('')||`<p style="color:var(--muted);font-size:10px">No replies yet. Start the discussion.</p>`}</div><div class="threadcompose"><input id="threadInput" placeholder="Write a reply"><button class="primary-lite" id="threadSend">Reply</button></div>`;
 openModal('threadModal');document.getElementById('threadSend').onclick=()=>{let input=document.getElementById('threadInput'),x=input.value.trim();if(!x)return;p.replies=p.replies||[];p.replies.push({id:id(),a:state.me.name,i:state.me.initials,t:'now',x});p.r=(p.replies||[]).length;persist();openThread(c,pid);renderPublic(c)};
 document.getElementById('threadInput').onkeydown=e=>{if(e.key==='Enter')document.getElementById('threadSend').click()};
}
function openLibrary(c,type){
 document.getElementById('libraryTitle').textContent=type[0].toUpperCase()+type.slice(1);
 let content='';
 if(type==='members'){
  const members=c.members||['@alex','@nora','@leov',state.me.handle];content=members.map(h=>`<div class="libraryitem">${A(h.slice(1,3).toUpperCase())}<div><strong>${esc(h)}</strong><small>member</small></div></div>`).join('');
 }else{
  const msgs=allMessages(c);let items=[];
  if(type==='files')items=msgs.filter(m=>m.file);
  if(type==='media')items=msgs.filter(m=>m.file&&m.file.type?.startsWith('image/'));
  if(type==='links')items=msgs.filter(m=>/https?:\/\/|www\./i.test(m.x||''));
  content=items.map(m=>`<div class="libraryitem"><span class="icon">${svg(type==='links'?'link':type==='media'?'image':'file')}</span><div><strong>${esc(type==='links'?(m.x||'Link'):(m.file?.name||'File'))}</strong><small>${esc(m.a||'')}</small></div></div>`).join('')||`<p style="font-size:10px;color:var(--muted)">Nothing here yet.</p>`;
 }
 document.getElementById('libraryBody').innerHTML=content;openModal('libraryModal');
}
function startCall(c){
 callSeconds=0;const body=document.getElementById('callBody');openModal('callModal');
 function draw(){body.innerHTML=`${A(c.initials,'dark')}<h2>${esc(c.name)}</h2><div class="callstatus">${callSeconds<2?'Calling…':'Connected'}</div><div class="calltimer">${callSeconds<2?'':String(Math.floor((callSeconds-2)/60)).padStart(2,'0')+':'+String(Math.max(0,callSeconds-2)%60).padStart(2,'0')}</div><div class="callactions"><button class="callbtn" id="muteCall">${svg('mic')}</button><button class="callbtn" id="speakerCall">${svg('volume')}</button><button class="callbtn end" id="endCall">${svg('phone')}</button></div>`;document.getElementById('muteCall').onclick=e=>e.currentTarget.classList.toggle('active');document.getElementById('speakerCall').onclick=e=>e.currentTarget.classList.toggle('active');document.getElementById('endCall').onclick=endCall}
 draw();clearInterval(callTimer);callTimer=setInterval(()=>{callSeconds++;draw()},1000)
}
function endCall(){clearInterval(callTimer);callTimer=null;closeModal('callModal');toast('Call ended')}
