-- mi.net Realtime Groups v1
-- Run AFTER the working Realtime Direct v1.1 schema.
-- Safe to run more than once.

begin;

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'public.profiles is missing. Apply the Auth/Profile schema first.';
  end if;

  if to_regclass('public.conversations') is null
     or to_regclass('public.conversation_members') is null
     or to_regclass('public.messages') is null then
    raise exception 'Realtime Direct tables are missing. Apply realtime_direct_v1_1_fix.sql first.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Conversations can now be Direct or Group.
-- ---------------------------------------------------------------------------
alter table public.conversations
  add column if not exists title text;

do $$
declare
  item record;
begin
  for item in
    select conname
    from pg_constraint
    where conrelid = 'public.conversations'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format(
      'alter table public.conversations drop constraint %I',
      item.conname
    );
  end loop;
end
$$;

alter table public.conversations
  add constraint conversations_kind_check
  check (kind in ('direct','group'));

alter table public.conversations
  drop constraint if exists conversations_group_title_check;

alter table public.conversations
  add constraint conversations_group_title_check
  check (
    kind <> 'group'
    or (
      title is not null
      and char_length(btrim(title)) between 2 and 64
    )
  );

-- ---------------------------------------------------------------------------
-- Roles + moderation state live on the membership.
-- Existing Direct rows automatically become active members.
-- ---------------------------------------------------------------------------
alter table public.conversation_members
  add column if not exists member_role text not null default 'member';

alter table public.conversation_members
  add column if not exists member_status text not null default 'active';

alter table public.conversation_members
  add column if not exists muted_until timestamptz;

alter table public.conversation_members
  add column if not exists status_changed_at timestamptz not null default now();

alter table public.conversation_members
  drop constraint if exists conversation_members_role_check;

alter table public.conversation_members
  add constraint conversation_members_role_check
  check (member_role in ('member','moderator','admin'));

alter table public.conversation_members
  drop constraint if exists conversation_members_status_check;

alter table public.conversation_members
  add constraint conversation_members_status_check
  check (member_status in ('active','kicked','banned'));

create index if not exists conversation_members_group_status_idx
  on public.conversation_members(conversation_id, member_status, member_role);

-- Directs never need moderator/admin roles.
update public.conversation_members cm
set member_role = 'member',
    member_status = 'active'
from public.conversations c
where c.id = cm.conversation_id
  and c.kind = 'direct';

-- ---------------------------------------------------------------------------
-- Membership helpers. Active membership is the security boundary.
-- ---------------------------------------------------------------------------
create or replace function private.is_conversation_member(
  conversation_uuid uuid,
  member_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversation_uuid
      and cm.user_id = member_uuid
      and cm.member_status = 'active'
  );
$$;

create or replace function private.can_send_message(
  conversation_uuid uuid,
  member_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversation_uuid
      and cm.user_id = member_uuid
      and cm.member_status = 'active'
      and (
        cm.muted_until is null
        or cm.muted_until <= now()
      )
  );
$$;

create or replace function private.group_role(
  conversation_uuid uuid,
  member_uuid uuid
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select cm.member_role
  from public.conversation_members cm
  join public.conversations c on c.id = cm.conversation_id
  where cm.conversation_id = conversation_uuid
    and cm.user_id = member_uuid
    and cm.member_status = 'active'
    and c.kind = 'group'
  limit 1;
$$;

grant execute on function private.is_conversation_member(uuid, uuid) to authenticated;
grant execute on function private.can_send_message(uuid, uuid) to authenticated;
grant execute on function private.group_role(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Group creation.
-- creator becomes admin, selected users become members.
-- ---------------------------------------------------------------------------
create or replace function public.create_group(
  group_title text,
  member_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  clean_title text := btrim(group_title);
  selected_count integer;
  existing_count integer;
  group_id uuid;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if char_length(clean_title) < 2 or char_length(clean_title) > 64 then
    raise exception 'Group name must be between 2 and 64 characters';
  end if;

  select count(distinct x.candidate)
  into selected_count
  from unnest(coalesce(member_ids, array[]::uuid[])) as x(candidate)
  where x.candidate is not null
    and x.candidate <> me;

  if selected_count < 1 then
    raise exception 'Choose at least one other member';
  end if;

  if selected_count > 99 then
    raise exception 'A group can have at most 100 members in this version';
  end if;

  select count(*)
  into existing_count
  from public.profiles p
  where p.id in (
    select distinct x.candidate
    from unnest(coalesce(member_ids, array[]::uuid[])) as x(candidate)
    where x.candidate is not null
      and x.candidate <> me
  );

  if existing_count <> selected_count then
    raise exception 'One or more selected users no longer exist';
  end if;

  insert into public.conversations(kind, created_by, title)
  values ('group', me, clean_title)
  returning id into group_id;

  insert into public.conversation_members(
    conversation_id,
    user_id,
    member_role,
    member_status,
    joined_at,
    last_read_at,
    status_changed_at
  )
  values (
    group_id,
    me,
    'admin',
    'active',
    now(),
    now(),
    now()
  );

  insert into public.conversation_members(
    conversation_id,
    user_id,
    member_role,
    member_status,
    joined_at,
    last_read_at,
    status_changed_at
  )
  select
    group_id,
    candidate,
    'member',
    'active',
    now(),
    now(),
    now()
  from (
    select distinct x.candidate
    from unnest(coalesce(member_ids, array[]::uuid[])) as x(candidate)
    where x.candidate is not null
      and x.candidate <> me
  ) selected;

  insert into public.messages(
    conversation_id,
    sender_id,
    body
  )
  values (
    group_id,
    me,
    'Group created.'
  );

  return group_id;
end;
$$;

revoke all on function public.create_group(text, uuid[]) from public;
grant execute on function public.create_group(text, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Group inbox.
-- ---------------------------------------------------------------------------
create or replace function public.list_my_group_conversations()
returns table (
  conversation_id uuid,
  title text,
  creator_id uuid,
  my_role text,
  my_muted_until timestamptz,
  member_count bigint,
  last_message_body text,
  last_message_at timestamptz,
  unread_count bigint,
  my_last_read_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.title,
    c.created_by,
    mine.member_role,
    mine.muted_until,
    (
      select count(*)
      from public.conversation_members active_members
      where active_members.conversation_id = c.id
        and active_members.member_status = 'active'
    )::bigint,
    lm.body,
    lm.created_at,
    (
      select count(*)
      from public.messages unread
      where unread.conversation_id = c.id
        and unread.sender_id <> auth.uid()
        and unread.deleted_at is null
        and unread.created_at > mine.last_read_at
    )::bigint,
    mine.last_read_at
  from public.conversations c
  join public.conversation_members mine
    on mine.conversation_id = c.id
   and mine.user_id = auth.uid()
   and mine.member_status = 'active'
  left join lateral (
    select m.body, m.created_at
    from public.messages m
    where m.conversation_id = c.id
      and m.deleted_at is null
    order by m.created_at desc
    limit 1
  ) lm on true
  where c.kind = 'group'
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

revoke all on function public.list_my_group_conversations() from public;
grant execute on function public.list_my_group_conversations() to authenticated;

-- ---------------------------------------------------------------------------
-- Group members list.
-- Regular members see active members.
-- Admin/moderator also see kicked and banned rows for management.
-- ---------------------------------------------------------------------------
create or replace function public.list_group_members(group_uuid uuid)
returns table (
  user_id uuid,
  username text,
  display_name text,
  bio text,
  member_role text,
  member_status text,
  muted_until timestamptz,
  joined_at timestamptz,
  is_me boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  actor_role text;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  actor_role := private.group_role(group_uuid, me);

  if actor_role is null then
    raise exception 'You are not an active member of this group';
  end if;

  return query
  select
    cm.user_id,
    p.username,
    p.display_name,
    p.bio,
    cm.member_role,
    cm.member_status,
    cm.muted_until,
    cm.joined_at,
    cm.user_id = me
  from public.conversation_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.conversation_id = group_uuid
    and (
      cm.member_status = 'active'
      or actor_role in ('admin','moderator')
    )
  order by
    case cm.member_role
      when 'admin' then 0
      when 'moderator' then 1
      else 2
    end,
    case cm.member_status
      when 'active' then 0
      when 'kicked' then 1
      else 2
    end,
    lower(coalesce(nullif(p.display_name,''), p.username));
end;
$$;

revoke all on function public.list_group_members(uuid) from public;
grant execute on function public.list_group_members(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Add/re-add a member.
-- Admin and moderator may add; banned accounts require admin unban action.
-- ---------------------------------------------------------------------------
create or replace function public.add_group_member(
  group_uuid uuid,
  member_uuid uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  actor_role text;
  current_status text;
  active_count integer;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  actor_role := private.group_role(group_uuid, me);

  if actor_role is null or actor_role not in ('admin','moderator') then
    raise exception 'Only admins or moderators can add members';
  end if;

  if member_uuid is null or member_uuid = me then
    raise exception 'Invalid member';
  end if;

  if not exists (select 1 from public.profiles where id = member_uuid) then
    raise exception 'Profile does not exist';
  end if;

  select count(*)
  into active_count
  from public.conversation_members
  where conversation_id = group_uuid
    and member_status = 'active';

  if active_count >= 100 then
    raise exception 'Group member limit reached';
  end if;

  select cm.member_status
  into current_status
  from public.conversation_members cm
  where cm.conversation_id = group_uuid
    and cm.user_id = member_uuid;

  if current_status = 'banned' then
    raise exception 'This user is banned. Unban them first';
  end if;

  insert into public.conversation_members(
    conversation_id,
    user_id,
    member_role,
    member_status,
    muted_until,
    joined_at,
    last_read_at,
    status_changed_at
  )
  values (
    group_uuid,
    member_uuid,
    'member',
    'active',
    null,
    now(),
    now(),
    now()
  )
  on conflict (conversation_id, user_id)
  do update set
    member_role = 'member',
    member_status = 'active',
    muted_until = null,
    joined_at = now(),
    last_read_at = now(),
    status_changed_at = now();
end;
$$;

revoke all on function public.add_group_member(uuid, uuid) from public;
grant execute on function public.add_group_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Group moderation actions.
-- admin: all actions.
-- moderator: mute/unmute/kick regular members.
-- ---------------------------------------------------------------------------
create or replace function public.group_member_action(
  group_uuid uuid,
  target_uuid uuid,
  action_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  actor_role text;
  target_role text;
  target_status text;
  normalized_action text := lower(btrim(action_name));
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  actor_role := private.group_role(group_uuid, me);

  if actor_role is null or actor_role not in ('admin','moderator') then
    raise exception 'You do not have moderation permissions';
  end if;

  select cm.member_role, cm.member_status
  into target_role, target_status
  from public.conversation_members cm
  where cm.conversation_id = group_uuid
    and cm.user_id = target_uuid;

  if target_role is null then
    raise exception 'Member not found';
  end if;

  if target_uuid = me then
    raise exception 'You cannot apply this action to yourself';
  end if;

  if target_role = 'admin' then
    raise exception 'The current admin cannot be moderated';
  end if;

  -- Moderators may affect only ordinary members.
  if actor_role = 'moderator' then
    if target_role <> 'member' then
      raise exception 'Moderators can manage only regular members';
    end if;

    if normalized_action not in ('mute','unmute','kick','restore') then
      raise exception 'This action requires admin permission';
    end if;
  end if;

  case normalized_action
    when 'mute' then
      if target_status <> 'active' then
        raise exception 'Only active members can be muted';
      end if;

      update public.conversation_members
      set muted_until = timestamptz '9999-12-31 23:59:59+00',
          status_changed_at = now()
      where conversation_id = group_uuid
        and user_id = target_uuid;

    when 'unmute' then
      update public.conversation_members
      set muted_until = null,
          status_changed_at = now()
      where conversation_id = group_uuid
        and user_id = target_uuid;

    when 'kick' then
      update public.conversation_members
      set member_status = 'kicked',
          member_role = 'member',
          muted_until = null,
          status_changed_at = now()
      where conversation_id = group_uuid
        and user_id = target_uuid;

    when 'restore' then
      if target_status = 'banned' then
        raise exception 'Banned members must be unbanned by an admin';
      end if;

      update public.conversation_members
      set member_status = 'active',
          member_role = 'member',
          muted_until = null,
          joined_at = now(),
          last_read_at = now(),
          status_changed_at = now()
      where conversation_id = group_uuid
        and user_id = target_uuid;

    when 'ban' then
      if actor_role <> 'admin' then
        raise exception 'Only the admin can ban members';
      end if;

      update public.conversation_members
      set member_status = 'banned',
          member_role = 'member',
          muted_until = null,
          status_changed_at = now()
      where conversation_id = group_uuid
        and user_id = target_uuid;

    when 'unban' then
      if actor_role <> 'admin' then
        raise exception 'Only the admin can unban members';
      end if;

      update public.conversation_members
      set member_status = 'active',
          member_role = 'member',
          muted_until = null,
          joined_at = now(),
          last_read_at = now(),
          status_changed_at = now()
      where conversation_id = group_uuid
        and user_id = target_uuid;

    when 'promote' then
      if actor_role <> 'admin' then
        raise exception 'Only the admin can appoint moderators';
      end if;

      if target_status <> 'active' then
        raise exception 'Only active members can become moderators';
      end if;

      update public.conversation_members
      set member_role = 'moderator',
          status_changed_at = now()
      where conversation_id = group_uuid
        and user_id = target_uuid;

    when 'demote' then
      if actor_role <> 'admin' then
        raise exception 'Only the admin can remove moderators';
      end if;

      update public.conversation_members
      set member_role = 'member',
          status_changed_at = now()
      where conversation_id = group_uuid
        and user_id = target_uuid;

    when 'transfer_admin' then
      if actor_role <> 'admin' then
        raise exception 'Only the current admin can transfer admin rights';
      end if;

      if target_status <> 'active' then
        raise exception 'New admin must be an active member';
      end if;

      update public.conversation_members
      set member_role = 'moderator',
          status_changed_at = now()
      where conversation_id = group_uuid
        and user_id = me;

      update public.conversation_members
      set member_role = 'admin',
          member_status = 'active',
          muted_until = null,
          status_changed_at = now()
      where conversation_id = group_uuid
        and user_id = target_uuid;

    else
      raise exception 'Unknown group action';
  end case;
end;
$$;

revoke all on function public.group_member_action(uuid, uuid, text) from public;
grant execute on function public.group_member_action(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS adjustments.
-- Active members can see active membership rows.
-- A kicked/banned user may still see their OWN membership row so Realtime can
-- deliver the status change that removes the group from their UI.
-- ---------------------------------------------------------------------------
drop policy if exists "Members can read membership" on public.conversation_members;
create policy "Members can read membership"
on public.conversation_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (
    member_status = 'active'
    and private.is_conversation_member(conversation_id, (select auth.uid()))
  )
);

drop policy if exists "Members send messages" on public.messages;
create policy "Members send messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and private.can_send_message(conversation_id, (select auth.uid()))
);

-- Keep own read-state update only while active.
drop policy if exists "Members update own read state" on public.conversation_members;
create policy "Members update own read state"
on public.conversation_members
for update
to authenticated
using (
  user_id = (select auth.uid())
  and member_status = 'active'
  and private.is_conversation_member(conversation_id, (select auth.uid()))
)
with check (
  user_id = (select auth.uid())
);

-- Group moderation happens through SECURITY DEFINER RPCs, not direct column writes.
revoke update(member_role, member_status, muted_until, status_changed_at)
on public.conversation_members
from authenticated;

grant update(last_read_at)
on public.conversation_members
to authenticated;

-- Prevent muted users from uploading files they cannot send.
drop policy if exists "Conversation members can upload message media" on storage.objects;
create policy "Conversation members can upload message media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'message-media'
  and private.can_send_message(
    private.storage_conversation_id(name),
    (select auth.uid())
  )
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

-- Realtime already contains conversation_members/messages from Direct v1.
-- Keep this migration safe if run against an installation missing membership.
alter table public.conversation_members replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversation_members'
  ) then
    execute 'alter publication supabase_realtime add table public.conversation_members';
  end if;
end
$$;

commit;

notify pgrst, 'reload schema';

-- Diagnostics
select
  c.column_name,
  c.data_type
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'conversation_members'
  and c.column_name in ('member_role','member_status','muted_until')
order by c.column_name;

select
  p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_group',
    'list_my_group_conversations',
    'list_group_members',
    'add_group_member',
    'group_member_action'
  )
order by p.proname;
