// mi.net Direct messaging backed by Supabase + Realtime.
// Groups/Publics still use the current local prototype layer.

const miRealtime = {
  channel:null,
  userId:null,
  started:false,
  status:'idle',
  signedUrls:new Map()
};

function miSupabaseClient(){
  return typeof window.miGetSupabaseClient==='function'
    ?window.miGetSupabaseClient()
    :null;
}

function miCurrentAuthUser(){
  return typeof window.miGetAuthUser==='function'
    ?window.miGetAuthUser()
    :null;
}

function miIsRemoteDirect(c){
  return Boolean(c&&c.kind==='direct'&&c.remoteConversationId);
}

function miRemoteLocalConversationId(remoteId){
  return 'remote_'+String(remoteId).replace(/-/g,'');
}

function miFormatRemoteTime(value){
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
}

function miFormatRemoteListTime(value){
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  const now=new Date();
  if(date.toDateString()===now.toDateString()){
    return date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  }
  return date.toLocaleDateString([],{month:'short',day:'numeric'});
}

function miFindRemoteConversation(remoteId){
  return state.conversations.find(c=>c.remoteConversationId===remoteId)||null;
}

function miMergeRemoteConversation(row){
  let c=miFindRemoteConversation(row.conversation_id);

  if(!c){
    c=state.conversations.find(item=>
      item.kind==='direct'&&
      item.remoteUserId===row.other_user_id
    );
  }

  const name=(row.display_name||'').trim()||('@'+row.username);
  const preview=row.last_message_body||'New conversation';

  if(!c){
    c={
      id:miRemoteLocalConversationId(row.conversation_id),
      kind:'direct',
      isRemote:true,
      remoteConversationId:row.conversation_id,
      remoteUserId:row.other_user_id,
      name,
      handle:'@'+row.username,
      initials:initials(name),
      preview,
      time:miFormatRemoteListTime(row.last_message_at),
      unread:Number(row.unread_count||0),
      subtitle:'mi.net · realtime',
      desc:row.bio||'mi.net user',
      messages:[],
      remoteMessagesLoaded:false,
      otherLastReadAt:row.other_last_read_at||null,
      myLastReadAt:row.my_last_read_at||null
    };
    state.conversations.unshift(c);
  }else{
    c.isRemote=true;
    c.remoteConversationId=row.conversation_id;
    c.remoteUserId=row.other_user_id;
    c.name=name;
    c.handle='@'+row.username;
    c.initials=initials(name);
    c.desc=row.bio||c.desc||'mi.net user';
    c.subtitle='mi.net · realtime';
    c.preview=preview;
    c.time=miFormatRemoteListTime(row.last_message_at);
    c.unread=Number(row.unread_count||0);
    c.otherLastReadAt=row.other_last_read_at||null;
    c.myLastReadAt=row.my_last_read_at||null;
    c.messages=c.messages||[];
  }

  return c;
}

async function miLoadRemoteConversations(){
  const client=miSupabaseClient();
  if(!client)return {ok:false,message:'Supabase is not ready.'};

  const {data,error}=await client.rpc('list_my_direct_conversations');

  if(error){
    console.error('mi.net realtime inbox load failed',error);
    return {ok:false,message:'Could not load Direct conversations.'};
  }

  const seen=new Set();

  for(const row of data||[]){
    seen.add(row.conversation_id);
    miMergeRemoteConversation(row);
  }

  // Do not delete local/demo conversations. Remove only stale remote cache entries
  // that no longer appear in the authenticated user's server inbox.
  state.conversations=state.conversations.filter(c=>
    !c.remoteConversationId||seen.has(c.remoteConversationId)
  );

  persist();
  if(view==='chats')renderList();

  return {ok:true,conversations:data||[]};
}

async function miGetOrCreateRemoteDirect(person){
  const client=miSupabaseClient();
  const user=miCurrentAuthUser();

  if(!client||!user||!person?.remoteUserId){
    return {ok:false,message:'Supabase Direct is not available.'};
  }

  const {data,error}=await client.rpc('get_or_create_direct_conversation',{
    other_user:person.remoteUserId
  });

  if(error){
    console.error('mi.net get/create Direct failed',error);
    return {ok:false,message:error.message||'Could not create Direct.'};
  }

  const remoteId=data;
  let c=miFindRemoteConversation(remoteId);

  if(!c){
    const name=person.name||person.handle||'mi.net user';
    c={
      id:miRemoteLocalConversationId(remoteId),
      kind:'direct',
      isRemote:true,
      remoteConversationId:remoteId,
      remoteUserId:person.remoteUserId,
      name,
      handle:person.handle||'',
      initials:person.initials||initials(name),
      preview:'New conversation',
      time:'now',
      unread:0,
      subtitle:'mi.net · realtime',
      desc:person.bio||'mi.net user',
      messages:[],
      remoteMessagesLoaded:false,
      otherLastReadAt:null,
      myLastReadAt:new Date().toISOString()
    };
    state.conversations.unshift(c);
    persist();
  }

  // Refresh from the authoritative inbox function when possible.
  await miLoadRemoteConversations();
  c=miFindRemoteConversation(remoteId)||c;

  return {ok:true,conversation:c};
}

async function miRemoteMediaSignedUrl(path){
  if(!path)return '';

  const cached=miRealtime.signedUrls.get(path);
  if(cached&&cached.expiresAt>Date.now()+30_000)return cached.url;

  const client=miSupabaseClient();
  if(!client)return '';

  const {data,error}=await client.storage
    .from('message-media')
    .createSignedUrl(path,3600);

  if(error){
    console.error('mi.net signed media URL failed',error);
    return '';
  }

  const url=data?.signedUrl||'';
  if(url){
    miRealtime.signedUrls.set(path,{
      url,
      expiresAt:Date.now()+3500_000
    });
  }

  return url;
}

function miReactionMapForMessage(messageId,reactions){
  const map={};
  const me=miCurrentAuthUser()?.id;

  for(const reaction of reactions||[]){
    if(reaction.message_id!==messageId)continue;

    if(!map[reaction.emoji]){
      map[reaction.emoji]={count:0,mine:false};
    }

    map[reaction.emoji].count+=1;
    if(reaction.user_id===me)map[reaction.emoji].mine=true;
  }

  return map;
}

async function miRemoteMessageToLocal(row,c,reactions=[]){
  const me=miCurrentAuthUser()?.id;
  const own=row.sender_id===me;

  let file=null;
  if(row.attachment_path){
    file={
      remotePath:row.attachment_path,
      name:row.attachment_name||'Attachment',
      type:row.attachment_type||'application/octet-stream',
      size:Number(row.attachment_size||0),
      url:await miRemoteMediaSignedUrl(row.attachment_path)
    };
  }

  const createdAt=row.created_at||new Date().toISOString();
  const otherRead=c.otherLastReadAt&&new Date(c.otherLastReadAt)>=new Date(createdAt);

  return {
    id:row.id,
    remoteMessageId:row.id,
    remote:true,
    createdAt,
    senderId:row.sender_id,
    a:own?state.me.name:c.name,
    i:own?state.me.initials:c.initials,
    t:miFormatRemoteTime(createdAt),
    x:row.body||'',
    own:own?1:0,
    reactions:0,
    reactionMap:miReactionMapForMessage(row.id,reactions),
    status:own?(otherRead?'read':'sent'):undefined,
    edited:Boolean(row.edited_at),
    replyToId:row.reply_to||null,
    forwardedFrom:row.forwarded_from||null,
    file
  };
}

function miResolveRemoteReplies(messages){
  const byId=new Map(messages.map(m=>[m.id,m]));

  for(const m of messages){
    if(!m.replyToId){
      delete m.reply;
      continue;
    }

    const target=byId.get(m.replyToId);
    if(target){
      m.reply={
        a:target.a,
        x:target.x||target.file?.name||'Attachment'
      };
    }else{
      m.reply={
        a:'Message',
        x:'Original message'
      };
    }
  }
}

function miRecalculateRemoteReactionTotals(c){
  for(const m of c.messages||[]){
    const map=ensureMessageReactionMap(m);
    m.reactions=Object.values(map).reduce((sum,item)=>sum+(Number(item.count)||0),0);
    m.reacted=Object.values(map).some(item=>item.mine);
  }
}

async function miLoadRemoteMessages(c){
  if(!miIsRemoteDirect(c))return {ok:false};

  const scrollState=active===c.id&&typeof captureMessageScroll==='function'
    ?captureMessageScroll()
    :null;
  const firstRemoteLoad=!c.remoteMessagesLoaded;

  const client=miSupabaseClient();
  if(!client)return {ok:false,message:'Supabase is not ready.'};

  c.remoteLoading=true;
  if(active===c.id&&!c.remoteMessagesLoaded){
    renderChat(c);
    if(typeof restoreMessageScroll==='function'){
      restoreMessageScroll(scrollState,{forceBottom:true});
    }
  }

  const [messageResult,reactionResult]=await Promise.all([
    client
      .from('messages')
      .select('id, conversation_id, sender_id, body, reply_to, forwarded_from, attachment_path, attachment_name, attachment_type, attachment_size, created_at, updated_at, edited_at, deleted_at')
      .eq('conversation_id',c.remoteConversationId)
      .is('deleted_at',null)
      .order('created_at',{ascending:true})
      .limit(300),
    client
      .from('message_reactions')
      .select('message_id, conversation_id, user_id, emoji, created_at')
      .eq('conversation_id',c.remoteConversationId)
      .is('deleted_at',null)
  ]);

  c.remoteLoading=false;

  if(messageResult.error){
    console.error('mi.net remote messages load failed',messageResult.error);
    if(active===c.id)toast('Could not load realtime messages');
    return {ok:false,message:messageResult.error.message};
  }

  if(reactionResult.error){
    console.warn('mi.net reactions load failed',reactionResult.error);
  }

  const reactions=reactionResult.data||[];
  const messages=await Promise.all(
    (messageResult.data||[]).map(row=>miRemoteMessageToLocal(row,c,reactions))
  );

  messages.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  miResolveRemoteReplies(messages);

  c.messages=messages;
  c.remoteMessagesLoaded=true;
  c.preview=messages.at(-1)?.x||messages.at(-1)?.file?.name||c.preview||'New conversation';
  c.time=miFormatRemoteListTime(messages.at(-1)?.createdAt);
  miRecalculateRemoteReactionTotals(c);

  persist();

  if(active===c.id){
    renderChat(c);
    detail(c);
    if(typeof restoreMessageScroll==='function'){
      restoreMessageScroll(scrollState,{
        forceBottom:firstRemoteLoad||Boolean(scrollState?.nearBottom)
      });
    }
  }
  if(view==='chats')renderList();

  await miMarkRemoteRead(c);
  return {ok:true,messages};
}

async function miRefreshRemoteReactions(c){
  if(!miIsRemoteDirect(c))return;

  const client=miSupabaseClient();
  const {data,error}=await client
    .from('message_reactions')
    .select('message_id, conversation_id, user_id, emoji, created_at, deleted_at')
    .eq('conversation_id',c.remoteConversationId)
    .is('deleted_at',null);

  if(error){
    console.warn('mi.net reaction refresh failed',error);
    return;
  }

  for(const m of c.messages||[]){
    m.reactionMap=miReactionMapForMessage(m.id,data||[]);
  }
  miRecalculateRemoteReactionTotals(c);
  persist();

  if(active===c.id){
    const scrollState=typeof captureMessageScroll==='function'
      ?captureMessageScroll()
      :null;
    renderChat(c);
    if(typeof restoreMessageScroll==='function'){
      restoreMessageScroll(scrollState);
    }
  }
}

async function miUploadRemoteAttachment(c,attachment){
  if(!attachment)return null;
  if(!attachment.key)throw new Error('This attachment is not stored locally.');

  const client=miSupabaseClient();
  const user=miCurrentAuthUser();
  const blob=await miGetMediaBlob(attachment.key);

  if(!blob)throw new Error('Attachment data is no longer available.');

  const safeName=String(attachment.name||'file')
    .replace(/[^A-Za-z0-9._-]+/g,'_')
    .slice(-120);

  const objectName=
    `${c.remoteConversationId}/${user.id}/${crypto.randomUUID()}-${safeName}`;

  const {data,error}=await client.storage
    .from('message-media')
    .upload(objectName,blob,{
      contentType:attachment.type||blob.type||'application/octet-stream',
      upsert:false,
      cacheControl:'3600'
    });

  if(error)throw error;

  return {
    path:data.path,
    name:attachment.name||safeName,
    type:attachment.type||blob.type||'application/octet-stream',
    size:Number(attachment.size||blob.size||0)
  };
}

async function miUpsertRemoteLocalMessage(c,row,{incrementUnread=false}={}){
  if(!c||!row)return null;

  const scrollState=active===c.id&&typeof captureMessageScroll==='function'
    ?captureMessageScroll()
    :null;

  const existingIndex=(c.messages||[]).findIndex(m=>m.id===row.id);
  const existing=existingIndex>=0?c.messages[existingIndex]:null;
  const mapped=await miRemoteMessageToLocal(row,c,[]);

  if(existing?.reactionMap)mapped.reactionMap=existing.reactionMap;

  if(existingIndex>=0){
    c.messages[existingIndex]=mapped;
  }else{
    c.messages=c.messages||[];
    c.messages.push(mapped);
  }

  c.messages.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  miResolveRemoteReplies(c.messages);

  c.preview=mapped.x||mapped.file?.name||'Message';
  c.time=miFormatRemoteListTime(mapped.createdAt);

  const me=miCurrentAuthUser()?.id;
  if(incrementUnread&&row.sender_id!==me&&active!==c.id){
    c.unread=(Number(c.unread)||0)+1;
  }

  persist();

  if(active===c.id){
    renderChat(c);

    if(typeof restoreMessageScroll==='function'){
      restoreMessageScroll(scrollState,{
        // Own messages always stay attached to the bottom.
        // Incoming messages auto-follow only if the user was already near bottom.
        forceBottom:row.sender_id===me||Boolean(scrollState?.nearBottom),
        smooth:row.sender_id!==me&&Boolean(scrollState?.nearBottom)
      });
    }

    if(row.sender_id!==me)miMarkRemoteRead(c);
  }

  if(view==='chats')renderList();

  return mapped;
}

async function miSendRemoteMessage(c,{body='',replyTo=null,attachment=null,forwardedFrom=null}={}){
  if(!miIsRemoteDirect(c))return {ok:false,message:'Not a realtime Direct.'};

  const client=miSupabaseClient();
  const user=miCurrentAuthUser();
  if(!client||!user)return {ok:false,message:'You are not signed in.'};

  let uploaded=null;

  try{
    if(attachment){
      uploaded=await miUploadRemoteAttachment(c,attachment);
    }

    const payload={
      conversation_id:c.remoteConversationId,
      sender_id:user.id,
      body:String(body||''),
      reply_to:replyTo?.remoteMessageId||replyTo?.id||null,
      forwarded_from:forwardedFrom||null,
      attachment_path:uploaded?.path||null,
      attachment_name:uploaded?.name||null,
      attachment_type:uploaded?.type||null,
      attachment_size:uploaded?.size||null
    };

    const {data,error}=await client
      .from('messages')
      .insert(payload)
      .select('id, conversation_id, sender_id, body, reply_to, forwarded_from, attachment_path, attachment_name, attachment_type, attachment_size, created_at, updated_at, edited_at, deleted_at')
      .single();

    if(error)throw error;

    if(attachment?.key)miDeleteMedia(attachment.key);
    await miUpsertRemoteLocalMessage(c,data);

    return {ok:true,message:data};
  }catch(error){
    console.error('mi.net remote send failed',error);

    if(uploaded?.path){
      try{
        await client.storage.from('message-media').remove([uploaded.path]);
      }catch(e){}
    }

    return {ok:false,message:error?.message||'Could not send message.'};
  }
}

async function miUpdateRemoteMessage(c,m,body){
  const client=miSupabaseClient();
  const user=miCurrentAuthUser();

  const now=new Date().toISOString();

  const {data,error}=await client
    .from('messages')
    .update({
      body:String(body||''),
      edited_at:now,
      updated_at:now
    })
    .eq('id',m.remoteMessageId||m.id)
    .eq('sender_id',user.id)
    .select('id, conversation_id, sender_id, body, reply_to, forwarded_from, attachment_path, attachment_name, attachment_type, attachment_size, created_at, updated_at, edited_at, deleted_at')
    .single();

  if(error){
    console.error('mi.net edit failed',error);
    return {ok:false,message:error.message};
  }

  await miUpsertRemoteLocalMessage(c,data);
  return {ok:true};
}

async function miDeleteRemoteMessage(c,m){
  const client=miSupabaseClient();
  const user=miCurrentAuthUser();
  const now=new Date().toISOString();

  const remoteMediaPath=m.file?.remotePath||null;

  const {error}=await client
    .from('messages')
    .update({
      body:'',
      attachment_path:null,
      attachment_name:null,
      attachment_type:null,
      attachment_size:null,
      deleted_at:now,
      updated_at:now
    })
    .eq('id',m.remoteMessageId||m.id)
    .eq('sender_id',user.id);

  if(error){
    console.error('mi.net delete failed',error);
    return {ok:false,message:error.message};
  }

  if(remoteMediaPath){
    try{
      await client.storage
        .from('message-media')
        .remove([remoteMediaPath]);
    }catch(e){
      console.warn('mi.net media cleanup failed',e);
    }
  }

  c.messages=(c.messages||[]).filter(item=>item.id!==m.id);
  if(pinnedMessageId(c.id)===m.id)setPinnedMessage(c.id,null);
  c.preview=c.messages.at(-1)?.x||c.messages.at(-1)?.file?.name||'Message deleted';
  persist();
  if(active===c.id)renderChat(c);
  if(view==='chats')renderList();

  return {ok:true};
}

async function miSetRemoteReaction(c,m,emoji){
  const client=miSupabaseClient();
  const user=miCurrentAuthUser();
  const map=ensureMessageReactionMap(m);
  const currentMine=Object.keys(map).find(key=>map[key]?.mine);
  const messageId=m.remoteMessageId||m.id;

  if(currentMine===emoji){
    const {error}=await client
      .from('message_reactions')
      .update({deleted_at:new Date().toISOString()})
      .eq('message_id',messageId)
      .eq('user_id',user.id);

    if(error)return {ok:false,message:error.message};
  }else{
    // First try to revive/update an existing row for this user/message.
    const {data:updateData,error:updateError}=await client
      .from('message_reactions')
      .update({
        emoji,
        deleted_at:null
      })
      .eq('message_id',messageId)
      .eq('user_id',user.id)
      .select('message_id');

    if(updateError)return {ok:false,message:updateError.message};

    if(!updateData?.length){
      const {error:insertError}=await client
        .from('message_reactions')
        .insert({
          message_id:messageId,
          conversation_id:c.remoteConversationId,
          user_id:user.id,
          emoji,
          deleted_at:null
        });

      if(insertError)return {ok:false,message:insertError.message};
    }
  }

  await miRefreshRemoteReactions(c);
  return {ok:true};
}

async function miMarkRemoteRead(c){
  if(!miIsRemoteDirect(c))return;

  const client=miSupabaseClient();
  const user=miCurrentAuthUser();
  if(!client||!user)return;

  const now=new Date().toISOString();

  const {error}=await client
    .from('conversation_members')
    .update({last_read_at:now})
    .eq('conversation_id',c.remoteConversationId)
    .eq('user_id',user.id);

  if(error){
    console.warn('mi.net read receipt update failed',error);
    return;
  }

  c.myLastReadAt=now;
  c.unread=0;
  persist();
  if(view==='chats')renderList();
}

function miRefreshRemoteReadStatuses(c){
  if(!miIsRemoteDirect(c))return;

  for(const m of c.messages||[]){
    if(!m.own)continue;
    m.status=
      c.otherLastReadAt&&
      new Date(c.otherLastReadAt)>=new Date(m.createdAt)
        ?'read'
        :'sent';
  }

  persist();
  if(active===c.id){
    const scrollState=typeof captureMessageScroll==='function'
      ?captureMessageScroll()
      :null;
    renderChat(c);
    if(typeof restoreMessageScroll==='function'){
      restoreMessageScroll(scrollState);
    }
  }
}

async function miOpenRemoteConversation(c){
  if(!miIsRemoteDirect(c))return;
  await miLoadRemoteMessages(c);
}

async function miHandleRemoteMessageEvent(payload){
  const row=payload.new&&Object.keys(payload.new).length?payload.new:payload.old;
  if(!row)return;

  let c=row.conversation_id?miFindRemoteConversation(row.conversation_id):null;

  if(row.deleted_at){
    const scrollState=active===c?.id&&typeof captureMessageScroll==='function'
      ?captureMessageScroll()
      :null;

    if(!c){
      c=state.conversations.find(item=>
        item.remoteConversationId&&
        item.messages?.some(m=>m.id===row.id)
      );
    }
    if(!c)return;

    c.messages=(c.messages||[]).filter(m=>m.id!==row.id);
    c.preview=c.messages.at(-1)?.x||c.messages.at(-1)?.file?.name||'Message deleted';
    persist();
    if(active===c.id){
      renderChat(c);
      if(typeof restoreMessageScroll==='function'){
        restoreMessageScroll(scrollState);
      }
    }
    if(view==='chats')renderList();
    return;
  }

  if(!c){
    await miLoadRemoteConversations();
    c=miFindRemoteConversation(row.conversation_id);
  }
  if(!c)return;

  await miUpsertRemoteLocalMessage(c,row,{
    incrementUnread:payload.eventType==='INSERT'
  });

  if(payload.eventType==='INSERT'){
    await miRefreshRemoteReactions(c);
  }
}

async function miHandleRemoteReactionEvent(payload){
  const row=payload.new&&Object.keys(payload.new).length?payload.new:payload.old;
  if(!row?.conversation_id)return;

  const c=miFindRemoteConversation(row.conversation_id);
  if(c)await miRefreshRemoteReactions(c);
}

async function miHandleRemoteMemberEvent(payload){
  const row=payload.new&&Object.keys(payload.new).length?payload.new:payload.old;
  if(!row)return;

  const user=miCurrentAuthUser();
  if(!user)return;

  if(payload.eventType==='INSERT'&&row.user_id===user.id){
    await miLoadRemoteConversations();
    return;
  }

  const c=miFindRemoteConversation(row.conversation_id);
  if(!c)return;

  if(row.user_id===c.remoteUserId){
    c.otherLastReadAt=row.last_read_at||null;
    miRefreshRemoteReadStatuses(c);
  }
}

async function miRealtimeStart(){
  const client=miSupabaseClient();
  const user=miCurrentAuthUser();

  if(!client||!user)return {ok:false};

  if(miRealtime.started&&miRealtime.userId===user.id){
    await miLoadRemoteConversations();
    return {ok:true};
  }

  await miRealtimeStop();

  miRealtime.userId=user.id;
  miRealtime.started=true;
  miRealtime.status='connecting';

  await miLoadRemoteConversations();

  const channel=client
    .channel('mi-direct-'+user.id)
    .on(
      'postgres_changes',
      {event:'INSERT',schema:'public',table:'messages'},
      miHandleRemoteMessageEvent
    )
    .on(
      'postgres_changes',
      {event:'UPDATE',schema:'public',table:'messages'},
      miHandleRemoteMessageEvent
    )
    .on(
      'postgres_changes',
      {event:'INSERT',schema:'public',table:'message_reactions'},
      miHandleRemoteReactionEvent
    )
    .on(
      'postgres_changes',
      {event:'UPDATE',schema:'public',table:'message_reactions'},
      miHandleRemoteReactionEvent
    )
    .on(
      'postgres_changes',
      {event:'INSERT',schema:'public',table:'conversation_members'},
      miHandleRemoteMemberEvent
    )
    .on(
      'postgres_changes',
      {event:'UPDATE',schema:'public',table:'conversation_members'},
      miHandleRemoteMemberEvent
    )
    .subscribe((status,error)=>{
      miRealtime.status=status;

      if(status==='SUBSCRIBED'){
        console.info('mi.net Realtime connected');
      }else if(status==='CHANNEL_ERROR'){
        console.error('mi.net Realtime channel error',error);
        toast('Realtime connection error');
      }
    });

  miRealtime.channel=channel;
  return {ok:true};
}

async function miRealtimeStop(){
  const client=miSupabaseClient();

  if(client&&miRealtime.channel){
    try{
      await client.removeChannel(miRealtime.channel);
    }catch(e){}
  }

  miRealtime.channel=null;
  miRealtime.userId=null;
  miRealtime.started=false;
  miRealtime.status='idle';
}

window.miRealtimeStart=miRealtimeStart;
window.miRealtimeStop=miRealtimeStop;
window.miGetOrCreateRemoteDirect=miGetOrCreateRemoteDirect;
window.miOpenRemoteConversation=miOpenRemoteConversation;
window.miSendRemoteMessage=miSendRemoteMessage;
window.miUpdateRemoteMessage=miUpdateRemoteMessage;
window.miDeleteRemoteMessage=miDeleteRemoteMessage;
window.miSetRemoteReaction=miSetRemoteReaction;
window.miLoadRemoteConversations=miLoadRemoteConversations;
