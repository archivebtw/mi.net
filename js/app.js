// Attachments, global events and application boot
function readAttachmentAsDataUrl(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(reader.result);
  reader.onerror=()=>reject(new Error('Unable to read file'));
  reader.readAsDataURL(file);
 });
}

document.getElementById('filePicker').onchange=async e=>{
 const f=e.target.files[0];
 if(!f)return;
 const type=f.type||'application/octet-stream';
 try{
  const url=(type.startsWith('image/')||type.startsWith('video/'))?await readAttachmentAsDataUrl(f):'';
  pendingAttachment={name:f.name,type,size:f.size,url};
  e.target.value='';
  let c=current();
  if(c&&!(c.kind==='public'&&c.mode==='hybrid'))renderChat(c);
  toast(type.startsWith('image/')?'Photo ready to send':type.startsWith('video/')?'Video ready to send':'Attachment ready to send');
 }catch(err){
  e.target.value='';
  toast('Could not load attachment');
 }
};

document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>nav(b.dataset.view));
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderList()});
document.getElementById('search').oninput=e=>{query=e.target.value;if(view==='chats')renderList()};
document.getElementById('focusSearch').onclick=()=>document.getElementById('search').focus();
document.getElementById('settingsBtn').onclick=openSettings;
document.getElementById('back').onclick=()=>{document.body.classList.remove('chatopen');document.getElementById('mobileTitle').textContent=view==='chats'?'Chats':view};

const create=document.getElementById('createPopover');
function toggleCreate(anchor){let r=anchor.getBoundingClientRect();create.hidden=!create.hidden;if(!create.hidden){create.style.top=(r.bottom+6)+'px';create.style.left=Math.max(10,r.right-200)+'px'}}
document.getElementById('createBtn').onclick=e=>{e.stopPropagation();toggleCreate(e.currentTarget)};
document.getElementById('mobileCreate').onclick=e=>{e.stopPropagation();toggleCreate(e.currentTarget)};
create.querySelectorAll('[data-create]').forEach(b=>b.onclick=()=>{create.hidden=true;if(b.dataset.create==='direct')openDirectModal();if(b.dataset.create==='group')openGroupModal();if(b.dataset.create==='public'){document.getElementById('pubName').value='';document.getElementById('pubAddress').value='';document.getElementById('pubDesc').value='';openModal('publicModal')}});

document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){
  document.querySelectorAll('.popover').forEach(p=>p.hidden=true);
  document.querySelectorAll('.modalback').forEach(m=>{if(m.id!=='callModal')m.hidden=true});
 }
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
  e.preventDefault();
  document.getElementById('search').focus();
 }
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'){
  e.preventDefault();
  const button=document.getElementById('createBtn');
  if(button)toggleCreate(button);
 }
});
document.getElementById('profileOrb').textContent=state.me.initials;
icons();nav('chats');if(conv(active))openConv(active);else renderList();
