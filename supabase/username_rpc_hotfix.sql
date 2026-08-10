-- mi.net Supabase username/RPC hotfix
-- Safe to run multiple times.
-- Supabase Dashboard -> SQL Editor -> paste this file -> Run.

begin;

grant usage on schema public to anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null default '',
  bio text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

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

alter table public.profiles
  drop constraint if exists profiles_username_allowed;

alter table public.profiles
  add constraint profiles_username_allowed
  check (public.is_username_allowed(username));

create or replace function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_username_allowed(candidate)
    and not exists (
      select 1
      from public.profiles
      where lower(public.profiles.username) = lower(candidate)
    );
$$;

revoke execute on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
  requested_display_name text;
begin
  requested_username := coalesce(new.raw_user_meta_data ->> 'username', '');
  requested_display_name := coalesce(new.raw_user_meta_data ->> 'display_name', '');

  if not public.is_username_allowed(requested_username) then
    raise exception 'Username is not allowed';
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, requested_username, requested_display_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;

commit;

-- Refresh the Data API/PostgREST function schema cache.
notify pgrst, 'reload schema';
