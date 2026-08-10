// mi.net realtime groups: creation, membership management and moderation UI.

const miGroupUI = {
  conversation:null,
  members:[],
  memberMap:new Map(),
  addSearchTimer:null,
  addSearchRequest:0,
  actionTarget:null
};

function miGroupClient(){
  return typeof miGetSupabaseClient==='function'?miGetSupabaseClient():null;
}

function miGroupUser(){
  return typeof miGetAuthUser==='function'?miGetAuthUser():null;
}

function miIsRemoteGroup(c){
  return Boolean(c&&c.kind==='group'&&c.remoteConversationId);
}

function miGroupRoleLabel(role){
  if(role==='admin')return 'Admin';
  if(role==='moderator')return 'Moderator';
  return 'Member';
}

function miGroupMemberIsMuted(member){
  if(!member?.muted_until)return false;
  const until=new Date(member.muted_until);
  return !Number.isNaN(until.getTime())&&until>Date.now();
}

function miIsGroupMuted(c){
  if(!miIsRemoteGroup(c)||!c.myMutedUntil)return false;
  const until=new Date(c.myMutedUntil);
  return !Number.isNaN(until.getTime())&&until>Date.now();
}

async function miCreateRemoteGroup(title,memberIds){
  const client=miGroupClient();

  if(!client)return {ok:false,message:'Supabase is not ready.'};

  const cleanTitle=String(title||'').trim();
  const uniqueIds=[...new Set((memberIds||[]).filter(Boolean))];

  if(cleanTitle.length<2||cleanTitle.length>64){
    return {ok:false,message:'Group name must be between 2 and 64 characters.'};
  }

  if(!uniqueIds.length){
    return {ok:false,message:'Choose at least one member.'};
  }

  const {data,error}=await client.rpc('create_group',{
    group_title:cleanTitle,
    member_ids:uniqueIds
  });

  if(error){
    console.error('mi.net create group failed',error);
    return {ok:false,message:error.message||'Could not create group.'};
  }

  if(typeof miLoadRemoteConversations==='function'){
    await miLoadRemoteConversations();
  }

  const c=typeof miFindRemoteConversation==='function'
    ?miFindRemoteConversation(data)
    :state.conversations.find(item=>item.remoteConversationId===data);

  return {
    ok:Boolean(c),
    conversation:c||null,
    message:c?'':'Group was created but could not be loaded.'
  };
}

async function miListGroupMembers(c){
  const client=miGroupClient();

  if(!client||!miIsRemoteGroup(c)){
    return {ok:false,members:[],message:'This is not a realtime group.'};
  }

  const {data,error}=await client.rpc('list_group_members',{
    group_uuid:c.remoteConversationId
  });

  if(error){
    console.error('mi.net list group members failed',error);
    return {ok:false,members:[],message:error.message||'Could not load group members.'};
  }

  const members=data||[];

  if(typeof miPresenceHydrateProfiles==='function'){
    await miPresenceHydrateProfiles(members.map(member=>member.user_id));

    for(const member of members){
      member.status_text=
        typeof miGetUserStatusText==='function'
          ?miGetUserStatusText(member.user_id)
          :'';
    }
  }

  return {ok:true,members};
}

async function miAddRemoteGroupMember(c,userId){
  const client=miGroupClient();

  if(!client||!miIsRemoteGroup(c)){
    return {ok:false,message:'Group is not available.'};
  }

  const {error}=await client.rpc('add_group_member',{
    group_uuid:c.remoteConversationId,
    member_uuid:userId
  });

  if(error){
    console.error('mi.net add group member failed',error);
    return {ok:false,message:error.message||'Could not add member.'};
  }

  await miRefreshGroupConversation(c);
  return {ok:true};
}

async function miRunGroupAction(c,userId,action){
  const client=miGroupClient();

  if(!client||!miIsRemoteGroup(c)){
    return {ok:false,message:'Group is not available.'};
  }

  const {error}=await client.rpc('group_member_action',{
    group_uuid:c.remoteConversationId,
    target_uuid:userId,
    action_name:action
  });

  if(error){
    console.error('mi.net group action failed',error);
    return {ok:false,message:error.message||'Could not update member.'};
  }

  await miRefreshGroupConversation(c);
  return {ok:true};
}

async function miRefreshGroupConversation(c){
  if(typeof miLoadRemoteConversations==='function'){
    await miLoadRemoteConversations();
  }

  const refreshed=state.conversations.find(item=>item.remoteConversationId===c.remoteConversationId)||c;

  if(active===refreshed.id){
    detail(refreshed);
  }

  if(view==='chats')renderList();

  if(miGroupUI.conversation?.remoteConversationId===refreshed.remoteConversationId){
    miGroupUI.conversation=refreshed;
    await miRenderGroupMembersManager();
  }

  return refreshed;
}

function miEnsureGroupManagerModal(){
  let modal=document.getElementById('groupManageModal');
  if(modal)return modal;

  modal=document.createElement('div');
  modal.id='groupManageModal';
  modal.className='modalback';
  modal.hidden=true;
  modal.innerHTML=`
   <section class="modal wide group-manage-modal">
    <header class="modalhead">
     <button class="iconbtn" id="closeGroupManage">${svg('x')}</button>
     <strong>Group members</strong>
     <span></span>
    </header>
    <div class="modalbody" id="groupManageBody"></div>
   </section>`;

  document.body.append(modal);

  document.getElementById('closeGroupManage').onclick=()=>closeModal('groupManageModal');
  modal.addEventListener('click',event=>{
    if(event.target===modal)closeModal('groupManageModal');
  });

  return modal;
}

function miGroupCanModerate(c){
  return ['admin','moderator'].includes(c?.myRole);
}

function miGroupCanAdmin(c){
  return c?.myRole==='admin';
}

function miGroupMemberStatusText(member){
  if(member.member_status==='banned')return 'Banned';
  if(member.member_status==='kicked')return 'Removed';
  if(miGroupMemberIsMuted(member))return 'Muted';
  return miGroupRoleLabel(member.member_role);
}

function miGroupMemberStatusClass(member){
  if(member.member_status==='banned')return 'is-banned';
  if(member.member_status==='kicked')return 'is-kicked';
  if(miGroupMemberIsMuted(member))return 'is-muted';
  if(member.member_role==='admin')return 'is-admin';
  if(member.member_role==='moderator')return 'is-moderator';
  return '';
}

function miGroupActionOptions(c,member){
  if(!miGroupCanModerate(c)||member.is_me)return [];

  const actorRole=c.myRole;
  const targetRole=member.member_role;
  const targetStatus=member.member_status;
  const muted=miGroupMemberIsMuted(member);

  if(targetRole==='admin')return [];

  if(actorRole==='moderator'&&targetRole!=='member')return [];

  if(targetStatus==='banned'){
    return actorRole==='admin'
      ?[{action:'unban',label:'Unban & add back',icon:'user-plus'}]
      :[];
  }

  if(targetStatus==='kicked'){
    const items=[{action:'restore',label:'Add back',icon:'user-plus'}];
    if(actorRole==='admin')items.push({action:'ban',label:'Ban',icon:'trash',danger:true});
    return items;
  }

  const items=[
    {
      action:muted?'unmute':'mute',
      label:muted?'Unmute':'Mute',
      icon:'bell'
    },
    {action:'kick',label:'Remove from group',icon:'x',danger:true}
  ];

  if(actorRole==='admin'){
    items.push({action:'ban',label:'Ban',icon:'trash',danger:true});

    if(targetRole==='moderator'){
      items.push({action:'demote',label:'Remove moderator',icon:'users'});
    }else{
      items.push({action:'promote',label:'Make moderator',icon:'users'});
    }

    items.push({
      action:'transfer_admin',
      label:'Transfer admin rights',
      icon:'check',
      adminTransfer:true
    });
  }

  return items;
}

function miCloseGroupActionPopover(){
  const pop=document.getElementById('groupMemberPopover');
  if(pop)pop.hidden=true;
  miGroupUI.actionTarget=null;
}

function miOpenGroupMemberPopover(anchor,member){
  let pop=document.getElementById('groupMemberPopover');

  if(!pop){
    pop=document.createElement('div');
    pop.id='groupMemberPopover';
    pop.className='popover group-member-popover';
    pop.hidden=true;
    document.body.append(pop);
  }

  const c=miGroupUI.conversation;
  const options=miGroupActionOptions(c,member);

  if(!options.length)return;

  miGroupUI.actionTarget=member;

  pop.innerHTML=options.map(option=>`
   <button
    data-group-action="${option.action}"
    class="${option.danger?'danger':''}"
   >
    <span class="icon">${svg(option.icon)}</span>
    ${esc(option.label)}
   </button>
  `).join('');

  const rect=anchor.getBoundingClientRect();
  pop.style.left=Math.min(rect.left,window.innerWidth-225)+'px';
  pop.style.top=Math.min(rect.bottom+6,window.innerHeight-(options.length*43+20))+'px';
  pop.hidden=false;

  pop.querySelectorAll('[data-group-action]').forEach(button=>{
    button.onclick=async()=>{
      const action=button.dataset.groupAction;
      const target=miGroupUI.actionTarget;

      miCloseGroupActionPopover();

      if(!target)return;

      if(action==='transfer_admin'){
        const confirmed=confirm(
          `Transfer admin rights to ${target.display_name||'@'+target.username}?\n\nYou will become a moderator.`
        );
        if(!confirmed)return;
      }

      if(action==='ban'){
        const confirmed=confirm(
          `Ban ${target.display_name||'@'+target.username} from this group?`
        );
        if(!confirmed)return;
      }

      const result=await miRunGroupAction(c,target.user_id,action);

      if(!result.ok){
        toast(result.message||'Action failed');
        return;
      }

      const labels={
        mute:'Member muted',
        unmute:'Member unmuted',
        kick:'Member removed',
        restore:'Member added back',
        ban:'Member banned',
        unban:'Member unbanned',
        promote:'Moderator appointed',
        demote:'Moderator removed',
        transfer_admin:'Admin rights transferred'
      };

      toast(labels[action]||'Group updated');
    };
  });
}

async function miRenderGroupMembersManager(){
  const body=document.getElementById('groupManageBody');
  const c=miGroupUI.conversation;

  if(!body||!c)return;

  body.innerHTML=`<div class="group-manager-loading"><span class="direct-search-spinner"></span> Loading members…</div>`;

  const result=await miListGroupMembers(c);

  if(!result.ok){
    body.innerHTML=`<div class="direct-search-state error"><strong>${esc(result.message)}</strong></div>`;
    return;
  }

  miGroupUI.members=result.members;
  miGroupUI.memberMap=new Map(result.members.map(member=>[member.user_id,member]));

  const canModerate=miGroupCanModerate(c);

  body.innerHTML=`
   <section class="group-manage-summary">
    ${A(c.initials,'square dark')}
    <div>
     <strong>${esc(c.name)}</strong>
     <small>${c.memberCount||result.members.filter(member=>member.member_status==='active').length} members · You are ${esc(miGroupRoleLabel(c.myRole).toLowerCase())}</small>
    </div>
   </section>

   ${canModerate?`
    <section class="group-add-panel">
     <div class="sectionlabel" style="padding-left:0">Add people</div>
     <label class="field group-member-search-field">
      <span>Search registered users</span>
      <input id="groupAddSearch" placeholder="@username or display name" autocomplete="off">
     </label>
     <div id="groupAddResults" class="group-add-results">
      <div class="direct-search-state empty"><strong>Start typing to find a user.</strong></div>
     </div>
    </section>
   `:''}

   <div class="sectionlabel" style="padding-left:0">Members</div>
   <div class="group-member-list">
    ${result.members.map(member=>{
      const name=(member.display_name||'').trim()||('@'+member.username);
      const status=miGroupMemberStatusText(member);
      const options=miGroupActionOptions(c,member);

      return `<article class="group-member-row ${miGroupMemberStatusClass(member)}">
       ${typeof miPresenceAvatar==='function'
        ?miPresenceAvatar(initials(name),member.user_id)
        :A(initials(name))}
       <div class="group-member-copy">
        <strong>${esc(name)}${member.is_me?' <span class="group-you">you</span>':''}</strong>
        <small>@${esc(member.username)}</small>
        <span
         class="presence-line group-member-presence ${typeof miIsUserOnline==='function'&&miIsUserOnline(member.user_id)?'is-online':'is-offline'}"
         data-presence-user="${member.user_id}"
         data-status-text="${esc(member.status_text||'')}"
        ><span data-presence-text>${esc(typeof miPresenceSubtitle==='function'?miPresenceSubtitle(member.user_id,member.status_text||''):'Offline')}</span></span>
       </div>
       <span class="group-role-pill">${esc(status)}</span>
       ${options.length?`<button class="iconbtn group-member-more" data-group-member-more="${member.user_id}" title="Manage">${svg('more')}</button>`:'<span></span>'}
      </article>`;
    }).join('')}
   </div>
  `;

  body.querySelectorAll('[data-group-member-more]').forEach(button=>{
    button.onclick=event=>{
      event.stopPropagation();
      const member=miGroupUI.memberMap.get(button.dataset.groupMemberMore);
      if(member)miOpenGroupMemberPopover(button,member);
    };
  });

  const search=document.getElementById('groupAddSearch');

  if(search){
    search.oninput=()=>{
      clearTimeout(miGroupUI.addSearchTimer);
      miGroupUI.addSearchTimer=setTimeout(()=>miRenderGroupAddSearch(search.value),180);
    };
  }
}

async function miRenderGroupAddSearch(query){
  const target=document.getElementById('groupAddResults');
  const c=miGroupUI.conversation;

  if(!target||!c)return;

  const clean=String(query||'').trim();

  if(clean.length<1){
    target.innerHTML=`<div class="direct-search-state empty"><strong>Start typing to find a user.</strong></div>`;
    return;
  }

  const requestId=++miGroupUI.addSearchRequest;

  target.innerHTML=`<div class="direct-search-state loading"><span class="direct-search-spinner"></span><strong>Searching mi.net…</strong></div>`;

  const result=await miSearchProfiles(clean,12);

  if(requestId!==miGroupUI.addSearchRequest)return;

  if(!result.ok){
    target.innerHTML=`<div class="direct-search-state error"><strong>${esc(result.message||'Search failed.')}</strong></div>`;
    return;
  }

  const existing=miGroupUI.memberMap;
  const profiles=(result.profiles||[]).filter(profile=>{
    const member=existing.get(profile.id);
    return !member||member.member_status!=='active';
  });

  if(!profiles.length){
    target.innerHTML=`<div class="direct-search-state empty"><strong>No addable users found.</strong></div>`;
    return;
  }

  target.innerHTML=profiles.map(profile=>{
    const name=(profile.display_name||'').trim()||('@'+profile.username);
    const existingMember=existing.get(profile.id);
    const banned=existingMember?.member_status==='banned';

    return `<button class="group-add-result" data-group-add="${profile.id}" ${banned?'disabled':''}>
     ${A(initials(name))}
     <span>
      <strong>${esc(name)}</strong>
      <small>@${esc(profile.username)}${banned?' · banned':''}</small>
     </span>
     <b>${banned?'Banned':'Add'}</b>
    </button>`;
  }).join('');

  target.querySelectorAll('[data-group-add]').forEach(button=>{
    button.onclick=async()=>{
      if(button.disabled)return;

      button.disabled=true;
      button.querySelector('b').textContent='Adding…';

      const result=await miAddRemoteGroupMember(c,button.dataset.groupAdd);

      if(!result.ok){
        button.disabled=false;
        button.querySelector('b').textContent='Add';
        toast(result.message||'Could not add member');
        return;
      }

      toast('Member added');
      await miRenderGroupMembersManager();
    };
  });
}

async function miOpenGroupMembersManager(c){
  if(!miIsRemoteGroup(c))return;

  miEnsureGroupManagerModal();
  miGroupUI.conversation=c;
  openModal('groupManageModal');
  await miRenderGroupMembersManager();
}

async function miRefreshGroupManagerIfOpen(conversationId){
  const modal=document.getElementById('groupManageModal');

  if(
    modal &&
    !modal.hidden &&
    miGroupUI.conversation?.remoteConversationId===conversationId
  ){
    await miRenderGroupMembersManager();
  }
}

document.addEventListener('pointerdown',event=>{
  const pop=document.getElementById('groupMemberPopover');

  if(
    pop &&
    !pop.hidden &&
    !event.target.closest('#groupMemberPopover') &&
    !event.target.closest('[data-group-member-more]')
  ){
    miCloseGroupActionPopover();
  }
});

window.miCreateRemoteGroup=miCreateRemoteGroup;
window.miOpenGroupMembersManager=miOpenGroupMembersManager;
window.miIsRemoteGroup=miIsRemoteGroup;
window.miIsGroupMuted=miIsGroupMuted;
window.miRefreshGroupManagerIfOpen=miRefreshGroupManagerIfOpen;
