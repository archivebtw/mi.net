// mi.net v11 — global online/offline Presence + custom status helpers.

const miPresence = {
  channel:null,
  userId:null,
  subscribed:false,
  online:new Set(),
  liveStatus:new Map(),
  profileCache:new Map(),
  generation:0
};

function miPresenceClient(){
  return typeof miGetSupabaseClient==='function'
    ?miGetSupabaseClient()
    :null;
}

function miPresenceUser(){
  return typeof miGetAuthUser==='function'
    ?miGetAuthUser()
    :null;
}

function miIsUserOnline(userId){
  return Boolean(userId&&miPresence.online.has(String(userId)));
}

function miPresenceStateLabel(userId){
  return miIsUserOnline(userId)?'Online':'Offline';
}

function miGetUserStatusText(userId){
  const key=String(userId||'');

  if(miPresence.liveStatus.has(key)){
    return String(miPresence.liveStatus.get(key)||'');
  }

  return String(miPresence.profileCache.get(key)?.status_text||'');
}

function miPresenceSubtitle(userId,statusText=''){
  const presence=miPresenceStateLabel(userId);
  const status=String(statusText||miGetUserStatusText(userId)||'').trim();
  return status?`${presence} · ${status}`:presence;
}

function miPresenceAvatar(initialsValue,userId,opt=''){
  const online=miIsUserOnline(userId);

  return `<span class="presence-avatar">
   ${A(initialsValue,opt)}
   <span
    class="presence-dot ${online?'is-online':'is-offline'}"
    data-presence-dot="${esc(userId||'')}"
    aria-label="${online?'Online':'Offline'}"
   ></span>
  </span>`;
}

async function miPresenceHydrateProfiles(userIds){
  const client=miPresenceClient();
  const ids=[...new Set((userIds||[]).filter(Boolean).map(String))];

  if(!client||!ids.length)return miPresence.profileCache;

  const missing=ids.filter(userId=>!miPresence.profileCache.has(userId));
  if(!missing.length)return miPresence.profileCache;

  const {data,error}=await client
    .from('profiles')
    .select('id, username, display_name, bio, status_text')
    .in('id',missing);

  if(error){
    console.warn('mi.net presence profile hydration failed',error);
    return miPresence.profileCache;
  }

  for(const profile of data||[]){
    miPresence.profileCache.set(String(profile.id),profile);
  }

  return miPresence.profileCache;
}

function miPresenceRefreshDOM(){
  document.querySelectorAll('[data-presence-user]').forEach(node=>{
    const userId=node.dataset.presenceUser;
    const statusText=node.dataset.statusText||miGetUserStatusText(userId);
    const online=miIsUserOnline(userId);

    node.classList.toggle('is-online',online);
    node.classList.toggle('is-offline',!online);

    const text=node.querySelector('[data-presence-text]');
    if(text)text.textContent=miPresenceSubtitle(userId,statusText);
  });

  document.querySelectorAll('[data-presence-dot]').forEach(dot=>{
    const userId=dot.dataset.presenceDot;
    const online=miIsUserOnline(userId);

    dot.classList.toggle('is-online',online);
    dot.classList.toggle('is-offline',!online);
    dot.setAttribute('aria-label',online?'Online':'Offline');
  });
}

function miPresenceNotifyUI(){
  miPresenceRefreshDOM();

  if(typeof renderList==='function'&&view==='chats'){
    renderList();
  }

  const current=typeof conv==='function'?conv(active):null;
  if(current&&typeof detail==='function'){
    detail(current);
  }
}

function miPresenceSyncFromChannel(){
  if(!miPresence.channel)return;

  const raw=miPresence.channel.presenceState();
  const next=new Set();
  const liveStatus=new Map();

  for(const [key,metas] of Object.entries(raw||{})){
    if(Array.isArray(metas)&&metas.length){
      const latest=metas[metas.length-1]||metas[0];
      const userId=String(latest?.user_id||key||'');

      if(userId){
        const statusText=String(latest?.status_text||'');
        next.add(userId);
        liveStatus.set(userId,statusText);

        if(miPresence.profileCache.has(userId)){
          miPresence.profileCache.set(userId,{
            ...miPresence.profileCache.get(userId),
            status_text:statusText
          });
        }
      }
    }
  }

  miPresence.online=next;
  miPresence.liveStatus=liveStatus;
  miPresenceNotifyUI();
}

async function miPresenceTrack(){
  const user=miPresenceUser();
  if(!miPresence.channel||!miPresence.subscribed||!user)return;

  const result=await miPresence.channel.track({
    user_id:user.id,
    online_at:new Date().toISOString(),
    status_text:String(state?.me?.statusText||'').slice(0,80),
    client_id:
      typeof crypto!=='undefined'&&crypto.randomUUID
        ?crypto.randomUUID()
        :Math.random().toString(36).slice(2)
  });

  if(result!=='ok'){
    console.warn('mi.net Presence track returned',result);
  }
}

async function miPresenceUntrack(){
  if(!miPresence.channel||!miPresence.subscribed)return;

  try{
    await miPresence.channel.untrack();
  }catch(error){
    console.warn('mi.net Presence untrack failed',error);
  }
}

async function miPresenceStart(){
  const client=miPresenceClient();
  const user=miPresenceUser();

  if(!client||!user)return {ok:false};

  if(
    miPresence.channel &&
    miPresence.userId===user.id &&
    miPresence.subscribed
  ){
    await miPresenceTrack();
    return {ok:true};
  }

  await miPresenceStop();

  miPresence.userId=user.id;
  const generation=++miPresence.generation;

  const channel=client.channel('mi-net-global-presence',{
    config:{
      presence:{
        key:user.id
      }
    }
  });

  channel
    .on('presence',{event:'sync'},()=>{
      if(generation!==miPresence.generation)return;
      miPresenceSyncFromChannel();
    })
    .on('presence',{event:'join'},()=>{
      if(generation!==miPresence.generation)return;
      miPresenceSyncFromChannel();
    })
    .on('presence',{event:'leave'},()=>{
      if(generation!==miPresence.generation)return;
      miPresenceSyncFromChannel();
    })
    .subscribe(async(status,error)=>{
      if(generation!==miPresence.generation)return;

      if(status==='SUBSCRIBED'){
        miPresence.subscribed=true;
        await miPresenceTrack();
      }

      if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
        console.error('mi.net Presence channel error',status,error);
      }
    });

  miPresence.channel=channel;
  return {ok:true};
}

async function miPresenceStop(){
  const client=miPresenceClient();

  miPresence.generation+=1;

  if(miPresence.channel){
    try{
      if(miPresence.subscribed){
        await miPresence.channel.untrack();
      }
    }catch(e){}

    try{
      if(client)await client.removeChannel(miPresence.channel);
    }catch(e){}
  }

  miPresence.channel=null;
  miPresence.userId=null;
  miPresence.subscribed=false;
  miPresence.online=new Set();
  miPresence.liveStatus=new Map();
  miPresenceNotifyUI();
}

window.addEventListener('pagehide',()=>{
  // Best effort. If the page/browser disappears before this completes,
  // the Realtime websocket disconnect still causes a Presence leave.
  miPresenceUntrack();
});

window.addEventListener('pageshow',()=>{
  if(miPresenceUser()){
    miPresenceStart();
  }
});

window.addEventListener('offline',()=>{
  miPresenceUntrack();
});

window.addEventListener('online',()=>{
  if(miPresenceUser())miPresenceStart();
});

async function miPresenceUpdateStatus(){
  const user=miPresenceUser();

  if(user){
    miPresence.profileCache.set(String(user.id),{
      ...(miPresence.profileCache.get(String(user.id))||{}),
      id:user.id,
      status_text:String(state?.me?.statusText||'').slice(0,80)
    });
  }

  if(miPresence.subscribed){
    await miPresenceTrack();
  }

  miPresenceNotifyUI();
}

window.miPresenceStart=miPresenceStart;
window.miPresenceStop=miPresenceStop;
window.miIsUserOnline=miIsUserOnline;
window.miPresenceStateLabel=miPresenceStateLabel;
window.miPresenceSubtitle=miPresenceSubtitle;
window.miPresenceAvatar=miPresenceAvatar;
window.miPresenceHydrateProfiles=miPresenceHydrateProfiles;
window.miGetUserStatusText=miGetUserStatusText;
window.miPresenceRefreshDOM=miPresenceRefreshDOM;
window.miPresenceUpdateStatus=miPresenceUpdateStatus;
