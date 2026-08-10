// Persistent state, DOM references and common helpers
let state;
try{state=JSON.parse(localStorage.getItem('minet_state_v2'))||initialState()}catch(e){state=initialState()}
function persist(){try{localStorage.setItem('minet_state_v2',JSON.stringify(state))}catch(e){}}
function applySettings(){document.body.classList.toggle('dark',!!state.settings.dark);document.body.classList.toggle('compact',!!state.settings.compact);document.querySelector('meta[name="theme-color"]').content=state.settings.dark?'#0c0c0c':'#ffffff'}
applySettings();

let active='alex',view='chats',filter='all',query='',chatSearchOpen=false,chatSearchQuery='',replyTarget=null,pendingAttachment=null,threadCtx=null,callTimer=null,callSeconds=0,exploreCategory='All';
const list=document.getElementById('list'),chat=document.getElementById('chat'),details=document.getElementById('details');
const A=(i,opt='')=>`<span class="avatar ${opt}">${esc(i)}</span>`;
function toast(x){let n=document.createElement('div');n.className='toast';n.textContent=x;document.getElementById('toasts').append(n);setTimeout(()=>n.remove(),2300)}
function conv(idv){return state.conversations.find(c=>c.id===idv)}
function current(){return conv(active)}
function initials(name){return name.split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase()||'U'}
function openModal(idv){document.getElementById(idv).hidden=false}
function closeModal(idv){document.getElementById(idv).hidden=true}
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
document.querySelectorAll('.modalback').forEach(m=>m.addEventListener('click',e=>{if(e.target===m && m.id!=='callModal')m.hidden=true}));
