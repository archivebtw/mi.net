-- mi.net v11 — signup stability + custom profile status
-- Run once in Supabase Dashboard -> SQL Editor.
-- Safe to run repeatedly.

begin;

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'public.profiles does not exist. Apply the mi.net Auth/Profile schema first.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Custom user status
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists status_text text not null default '';

alter table public.profiles
  drop constraint if exists profiles_status_text_length;

alter table public.profiles
  add constraint profiles_status_text_length
  check (char_length(status_text) <= 80);

-- ---------------------------------------------------------------------------
-- Username rules, kept server-side as the source of truth.
-- ---------------------------------------------------------------------------
create or replace function public.is_username_allowed(input_username text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  normalized text;
  banned text;
  banned_words text[] := array[
    'fuck','fucker','fucking','shit','bullshit','bitch','cunt','dick','cock','pussy',
    'asshole','whore','slut','porn','porno','sex','nazi','hitler',
    'nigger','nigga','faggot','retard'
  ];
begin
  if input_username is null then
    return false;
  end if;

  if input_username !~ '^[A-Za-z0-9_.-]{3,24}$' then
    return false;
  end if;

  if input_username ~ '^[._-]' or input_username ~ '[._-]$' then
    return false;
  end if;

  if input_username ~ '[._-]{2,}' then
    return false;
  end if;

  normalized := lower(regexp_replace(input_username, '[_.-]+', '', 'g'));

  foreach banned in array banned_words loop
    if strpos(normalized, banned) > 0 then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

alter table public.profiles
  drop constraint if exists profiles_username_allowed;

alter table public.profiles
  add constraint profiles_username_allowed
  check (public.is_username_allowed(username));

-- ---------------------------------------------------------------------------
-- Anonymous registration preflight.
-- This improves UX; the trigger below remains authoritative.
-- ---------------------------------------------------------------------------
create or replace function public.check_registration_username(candidate text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  clean text := lower(btrim(coalesce(candidate,'')));
  available boolean;
begin
  if not public.is_username_allowed(clean) then
    return jsonb_build_object(
      'ok', false,
      'available', false,
      'reason', 'not_allowed'
    );
  end if;

  select not exists (
    select 1
    from public.profiles p
    where lower(p.username) = clean
  )
  into available;

  return jsonb_build_object(
    'ok', true,
    'available', available,
    'reason', case when available then null else 'taken' end
  );
end;
$$;

revoke all on function public.check_registration_username(text) from public;
grant execute on function public.check_registration_username(text)
to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Robust Auth trigger.
--
-- Important behavior:
-- * fully qualified public.profiles references;
-- * SECURITY DEFINER + empty search_path;
-- * invalid/missing metadata receives a safe fallback instead of breaking Auth;
-- * a rare username race/duplicate also receives a unique fallback instead
--   of returning a generic 500 "Database error saving new user".
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
  requested_display_name text;
  safe_username text;
  fallback_username text;
begin
  requested_username :=
    lower(btrim(coalesce(new.raw_user_meta_data ->> 'username','')));

  requested_display_name :=
    left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name','')),48);

  fallback_username :=
    'user_' || substr(replace(new.id::text,'-',''),1,18);

  if public.is_username_allowed(requested_username) then
    safe_username := requested_username;
  else
    safe_username := fallback_username;
  end if;

  if requested_display_name = '' then
    requested_display_name := safe_username;
  end if;

  begin
    insert into public.profiles (
      id,
      username,
      display_name,
      bio,
      status_text
    )
    values (
      new.id,
      safe_username,
      requested_display_name,
      '',
      ''
    );
  exception
    when unique_violation then
      -- A registration preflight can race with another signup.
      -- Never abort auth.users because of that race.
      insert into public.profiles (
        id,
        username,
        display_name,
        bio,
        status_text
      )
      values (
        new.id,
        fallback_username,
        requested_display_name,
        '',
        ''
      )
      on conflict (id) do nothing;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Backfill any Auth users that somehow exist without public.profiles.
-- ---------------------------------------------------------------------------
insert into public.profiles (
  id,
  username,
  display_name,
  bio,
  status_text,
  created_at,
  updated_at
)
select
  u.id,
  'user_' || substr(replace(u.id::text,'-',''),1,18),
  coalesce(
    nullif(left(btrim(u.raw_user_meta_data ->> 'display_name'),48),''),
    split_part(coalesce(u.email,'mi.net user'),'@',1)
  ),
  '',
  '',
  coalesce(u.created_at,now()),
  now()
from auth.users u
where not exists (
  select 1
  from public.profiles p
  where p.id = u.id
)
on conflict do nothing;

-- Existing RLS remains authoritative.
alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant update(username, display_name, bio, avatar_url, status_text, updated_at)
on public.profiles
to authenticated;

commit;

notify pgrst, 'reload schema';

-- Diagnostics ---------------------------------------------------------------
select
  tgname as trigger_name,
  tgenabled as enabled
from pg_trigger
where tgname = 'on_auth_user_created';

select
  public.check_registration_username('minet_test_user') as username_preflight;

select
  count(*) as auth_users_without_profile
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;


-- If signup still returns "Database error saving new user", inspect this list.
-- Any additional custom auth.users trigger may also block registration.
select
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid) as trigger_definition
from pg_trigger t
where t.tgrelid = 'auth.users'::regclass
  and not t.tgisinternal
order by t.tgname;
