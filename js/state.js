// Persistent state, migration, runtime state and common UI helpers
const MI_STATE_BASE_KEY='minet_state_v2';
let miStateStorageKey=MI_STATE_BASE_KEY;
let state;
try{state=JSON.parse(localStorage.getItem(miStateStorageKey))||initialState()}catch(e){state=initialState()}

function migrateState(){
 state.me=state.me||initialState().me;
 state.settings=Object.assign({dark:true,compact:false},state.settings||{});
 if(!state.designVersion||state.designVersion<5){
  state.settings.dark=true;
  state.designVersion=5;
 }
 state.muted=Array.isArray(state.muted)?state.muted:[];
 state.pinnedConversations=Array.isArray(state.pinnedConversations)?state.pinnedConversations:[];
 state.drafts=state.drafts&&typeof state.drafts==='object'?state.drafts:{};
 state.pinnedMessages=state.pinnedMessages&&typeof state.pinnedMessages==='object'?state.pinnedMessages:{};
 state.readState=state.readState&&typeof state.readState==='object'?state.readState:{};
 state.conversations=Array.isArray(state.conversations)?state.conversations:[];
 for(const c of state.conversations){
  c.unread=Math.max(0,Number(c.unread)||0);
  if(c.messages){
   for(const m of c.messages){
    if(!m.id)m.id=id();
    if(m.edited===undefined)m.edited=false;
    if(m.status===undefined&&m.own)m.status='read';
   }
  }
 }
}
migrateState();

function persist(){try{localStorage.setItem(miStateStorageKey,JSON.stringify(state))}catch(e){}}

function miActivateAuthenticatedState(userId){
 const nextKey=`${MI_STATE_BASE_KEY}:${userId}`;
 let nextState=null;

 try{
  const userState=localStorage.getItem(nextKey);
  if(userState){
   nextState=JSON.parse(userState);
  }else{
   const legacy=localStorage.getItem(MI_STATE_BASE_KEY);
   nextState=legacy?JSON.parse(legacy):initialState();
  }
 }catch(e){
  nextState=initialState();
 }

 miStateStorageKey=nextKey;
 state=nextState||initialState();
 migrateState();
 applySettings();
 persist();
}

function miResetAuthenticatedLocalState(){
 try{localStorage.removeItem(miStateStorageKey)}catch(e){}
 state=initialState();
 migrateState();
 applySettings();
 persist();
}
function applySettings(){
 document.body.classList.toggle('dark',!!state.settings.dark);
 document.body.classList.toggle('compact',!!state.settings.compact);
 document.body.classList.add('reference-ui');
 document.querySelector('meta[name="theme-color"]').content=state.settings.dark?'#0b0b0e':'#f7f7fb';
}
applySettings();

let active='alex',view='chats',filter='all',query='',chatSearchOpen=false,chatSearchQuery='',replyTarget=null,pendingAttachment=null,threadCtx=null,callTimer=null,callSeconds=0,exploreCategory='All';
let editTarget=null,forwardTarget=null,typingTimer=null,typingConversation=null;

const list=document.getElementById('list'),chat=document.getElementById('chat'),details=document.getElementById('details');
const A=(i,opt='')=>`<span class="avatar ${opt}">${esc(i)}</span>`;

function toast(x){
 let n=document.createElement('div');
 n.className='toast';
 n.textContent=x;
 document.getElementById('toasts').append(n);
 setTimeout(()=>n.remove(),2300);
}
function conv(idv){return state.conversations.find(c=>c.id===idv)}
function current(){return conv(active)}
function initials(name){return name.split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase()||'U'}
function openModal(idv){document.getElementById(idv).hidden=false}
function closeModal(idv){document.getElementById(idv).hidden=true}
function isPinnedConversation(idv){return state.pinnedConversations.includes(idv)}
function draftFor(idv){return state.drafts[idv]||''}
function setDraft(idv,value){
 if(value)state.drafts[idv]=value;
 else delete state.drafts[idv];
 persist();
}
function pinnedMessageId(idv){return state.pinnedMessages[idv]||null}
function setPinnedMessage(idv,msgId){
 if(msgId)state.pinnedMessages[idv]=msgId;
 else delete state.pinnedMessages[idv];
 persist();
}

document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
document.querySelectorAll('.modalback').forEach(m=>m.addEventListener('click',e=>{if(e.target===m && m.id!=='callModal')m.hidden=true}));
