-- mi.net Realtime Direct Messaging v1.1 — fixed table creation order
-- Run in Supabase Dashboard -> SQL Editor.
-- Requires public.profiles from the auth/profile setup.

begin;

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'public.profiles does not exist. Run the mi.net Auth/Profile schema first.';
  end if;
end
$$;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  direct_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_members_user_idx
  on public.conversation_members(user_id, conversation_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  body text not null default '',
  reply_to uuid references public.messages(id) on delete set null,
  forwarded_from text,
  attachment_path text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint messages_content_required
    check (
      deleted_at is not null
      or length(btrim(body)) > 0
      or attachment_path is not null
    ),
  unique (id, conversation_id)
);

create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at);

create table if not exists public.message_reactions (
  message_id uuid not null,
  conversation_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (message_id, user_id),
  foreign key (message_id, conversation_id)
    references public.messages(id, conversation_id)
    on delete cascade
);

create index if not exists message_reactions_conversation_idx
  on public.message_reactions(conversation_id, message_id);

-- Migration-safe column/constraint updates.
-- These run only after BOTH message tables exist.
alter table public.messages
  add column if not exists deleted_at timestamptz;

alter table public.message_reactions
  add column if not exists deleted_at timestamptz;

alter table public.messages
  drop constraint if exists messages_content_required;

alter table public.messages
  add constraint messages_content_required
  check (
    deleted_at is not null
    or length(btrim(body)) > 0
    or attachment_path is not null
  );

-- Security-definer membership helper kept outside the exposed public schema.
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
  );
$$;

grant execute on function private.is_conversation_member(uuid, uuid)
to authenticated;

-- Safe first-folder UUID parser for private Storage paths.
create or replace function private.storage_conversation_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return ((storage.foldername(object_name))[1])::uuid;
exception
  when invalid_text_representation then
    return null;
  when others then
    return null;
end;
$$;

grant execute on function private.storage_conversation_id(text)
to authenticated;

-- One Direct per unordered user pair.
create or replace function public.get_or_create_direct_conversation(other_user uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  pair_key text;
  cid uuid;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if other_user is null or other_user = me then
    raise exception 'Invalid Direct recipient';
  end if;

  if not exists (select 1 from public.profiles where id = other_user) then
    raise exception 'Recipient profile does not exist';
  end if;

  pair_key :=
    case
      when me::text < other_user::text
      then me::text || ':' || other_user::text
      else other_user::text || ':' || me::text
    end;

  insert into public.conversations(kind, created_by, direct_key)
  values ('direct', me, pair_key)
  on conflict (direct_key) do nothing
  returning id into cid;

  if cid is null then
    select c.id into cid
    from public.conversations c
    where c.direct_key = pair_key;
  end if;

  insert into public.conversation_members(conversation_id, user_id)
  values (cid, me), (cid, other_user)
  on conflict do nothing;

  return cid;
end;
$$;

revoke all on function public.get_or_create_direct_conversation(uuid) from public;
grant execute on function public.get_or_create_direct_conversation(uuid)
to authenticated;

-- Direct inbox for the logged-in user.
create or replace function public.list_my_direct_conversations()
returns table (
  conversation_id uuid,
  other_user_id uuid,
  username text,
  display_name text,
  bio text,
  last_message_body text,
  last_message_at timestamptz,
  unread_count bigint,
  my_last_read_at timestamptz,
  other_last_read_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    other.user_id,
    p.username,
    p.display_name,
    p.bio,
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
    mine.last_read_at,
    other.last_read_at
  from public.conversations c
  join public.conversation_members mine
    on mine.conversation_id = c.id
   and mine.user_id = auth.uid()
  join public.conversation_members other
    on other.conversation_id = c.id
   and other.user_id <> auth.uid()
  join public.profiles p
    on p.id = other.user_id
  left join lateral (
    select m.body, m.created_at
    from public.messages m
    where m.conversation_id = c.id
      and m.deleted_at is null
    order by m.created_at desc
    limit 1
  ) lm on true
  where c.kind = 'direct'
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

revoke all on function public.list_my_direct_conversations() from public;
grant execute on function public.list_my_direct_conversations()
to authenticated;

-- Keep conversation sort order fresh.
create or replace function private.touch_conversation_from_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
after insert or update on public.messages
for each row execute function private.touch_conversation_from_message();

-- RLS ------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;

drop policy if exists "Members can read conversations" on public.conversations;
create policy "Members can read conversations"
on public.conversations
for select
to authenticated
using (
  private.is_conversation_member(id, (select auth.uid()))
);

drop policy if exists "Members can read membership" on public.conversation_members;
create policy "Members can read membership"
on public.conversation_members
for select
to authenticated
using (
  private.is_conversation_member(conversation_id, (select auth.uid()))
);

drop policy if exists "Members update own read state" on public.conversation_members;
create policy "Members update own read state"
on public.conversation_members
for update
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_conversation_member(conversation_id, (select auth.uid()))
)
with check (
  user_id = (select auth.uid())
  and private.is_conversation_member(conversation_id, (select auth.uid()))
);

drop policy if exists "Members read messages" on public.messages;
create policy "Members read messages"
on public.messages
for select
to authenticated
using (
  private.is_conversation_member(conversation_id, (select auth.uid()))
);

drop policy if exists "Members send messages" on public.messages;
create policy "Members send messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and private.is_conversation_member(conversation_id, (select auth.uid()))
);

drop policy if exists "Senders edit own messages" on public.messages;
create policy "Senders edit own messages"
on public.messages
for update
to authenticated
using (
  sender_id = (select auth.uid())
  and private.is_conversation_member(conversation_id, (select auth.uid()))
)
with check (
  sender_id = (select auth.uid())
  and private.is_conversation_member(conversation_id, (select auth.uid()))
);

drop policy if exists "Members read reactions" on public.message_reactions;
create policy "Members read reactions"
on public.message_reactions
for select
to authenticated
using (
  private.is_conversation_member(conversation_id, (select auth.uid()))
);

drop policy if exists "Members add own reactions" on public.message_reactions;
create policy "Members add own reactions"
on public.message_reactions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_conversation_member(conversation_id, (select auth.uid()))
);

drop policy if exists "Members change own reactions" on public.message_reactions;
create policy "Members change own reactions"
on public.message_reactions
for update
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_conversation_member(conversation_id, (select auth.uid()))
)
with check (
  user_id = (select auth.uid())
  and private.is_conversation_member(conversation_id, (select auth.uid()))
);

-- Explicit Data API grants; RLS still decides which rows are visible.
revoke all on public.conversations from anon, authenticated;
revoke all on public.conversation_members from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.message_reactions from anon, authenticated;

grant select on public.conversations to authenticated;
grant select on public.conversation_members to authenticated;
grant update(last_read_at) on public.conversation_members to authenticated;
grant select, insert on public.messages to authenticated;
grant update(body, edited_at, updated_at, deleted_at, attachment_path, attachment_name, attachment_type, attachment_size) on public.messages to authenticated;
grant select, insert on public.message_reactions to authenticated;
grant update(emoji, deleted_at) on public.message_reactions to authenticated;

-- Realtime -------------------------------------------------------------------
alter table public.messages replica identity full;
alter table public.message_reactions replica identity full;
alter table public.conversation_members replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_reactions'
  ) then
    execute 'alter publication supabase_realtime add table public.message_reactions';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversation_members'
  ) then
    execute 'alter publication supabase_realtime add table public.conversation_members';
  end if;
end
$$;

-- Private message-media bucket ------------------------------------------------
insert into storage.buckets(id, name, public, file_size_limit)
values ('message-media', 'message-media', false, 83886080)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "Conversation members can read message media" on storage.objects;
create policy "Conversation members can read message media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'message-media'
  and private.is_conversation_member(
    private.storage_conversation_id(name),
    (select auth.uid())
  )
);

drop policy if exists "Conversation members can upload message media" on storage.objects;
create policy "Conversation members can upload message media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'message-media'
  and private.is_conversation_member(
    private.storage_conversation_id(name),
    (select auth.uid())
  )
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "Owners can delete their uploaded message media" on storage.objects;
create policy "Owners can delete their uploaded message media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'message-media'
  and private.is_conversation_member(
    private.storage_conversation_id(name),
    (select auth.uid())
  )
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

commit;

notify pgrst, 'reload schema';

-- Diagnostics ----------------------------------------------------------------
select
  tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in ('messages','message_reactions','conversation_members')
order by tablename;

select
  to_regclass('public.conversations') as conversations,
  to_regclass('public.conversation_members') as conversation_members,
  to_regclass('public.messages') as messages,
  to_regclass('public.message_reactions') as message_reactions;
