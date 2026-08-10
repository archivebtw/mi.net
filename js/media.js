// Persistent rich-media storage for mi.net using IndexedDB.
const MI_MEDIA_DB='minet_media_v1';
const MI_MEDIA_STORE='files';
const miMediaUrlCache=new Map();

function miOpenMediaDB(){
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in window))return reject(new Error('IndexedDB unavailable'));
  const request=indexedDB.open(MI_MEDIA_DB,1);
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains(MI_MEDIA_STORE))db.createObjectStore(MI_MEDIA_STORE);
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('Unable to open media database'));
 });
}

async function miStoreMediaFile(file){
 const key='media_'+id();
 const db=await miOpenMediaDB();
 await new Promise((resolve,reject)=>{
  const tx=db.transaction(MI_MEDIA_STORE,'readwrite');
  tx.objectStore(MI_MEDIA_STORE).put(file,key);
  tx.oncomplete=resolve;
  tx.onerror=()=>reject(tx.error||new Error('Unable to store media'));
 });
 db.close();
 return {key,name:file.name,type:file.type||'application/octet-stream',size:file.size};
}

async function miGetMediaBlob(key){
 const db=await miOpenMediaDB();
 const blob=await new Promise((resolve,reject)=>{
  const tx=db.transaction(MI_MEDIA_STORE,'readonly');
  const request=tx.objectStore(MI_MEDIA_STORE).get(key);
  request.onsuccess=()=>resolve(request.result||null);
  request.onerror=()=>reject(request.error||new Error('Unable to read media'));
 });
 db.close();
 return blob;
}

async function miMediaUrl(key){
 if(!key)return '';
 if(miMediaUrlCache.has(key))return miMediaUrlCache.get(key);
 const blob=await miGetMediaBlob(key);
 if(!blob)return '';
 const url=URL.createObjectURL(blob);
 miMediaUrlCache.set(key,url);
 return url;
}

async function miHydrateMediaElements(root=document){
 const elements=[...root.querySelectorAll('[data-mi-media-key]')];
 await Promise.all(elements.map(async el=>{
  if(el.dataset.miMediaLoaded==='1')return;
  try{
   const url=await miMediaUrl(el.dataset.miMediaKey);
   if(!url)return;
   el.src=url;
   el.dataset.miMediaLoaded='1';
   const shell=el.closest('.message-media');
   if(shell)shell.classList.remove('media-loading');
  }catch(e){
   const shell=el.closest('.message-media');
   if(shell)shell.classList.add('media-error');
  }
 }));
}

async function miDeleteMedia(key){
 if(!key)return;
 try{
  const db=await miOpenMediaDB();
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(MI_MEDIA_STORE,'readwrite');
   tx.objectStore(MI_MEDIA_STORE).delete(key);
   tx.oncomplete=resolve;
   tx.onerror=()=>reject(tx.error);
  });
  db.close();
 }catch(e){}
 const url=miMediaUrlCache.get(key);
 if(url){
  URL.revokeObjectURL(url);
  miMediaUrlCache.delete(key);
 }
}
