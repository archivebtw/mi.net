-- mi.net searchable user profiles fix
-- Run once in Supabase Dashboard -> SQL Editor.
-- Safe to run repeatedly.

begin;

-- Existing authenticated users must be allowed to discover public profiles.
alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (true);

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;

-- Backfill Auth users that were created before the profile trigger existed.
-- Preserve their requested username when it is valid and available.
-- Otherwise create a stable fallback handle from their UUID.
insert into public.profiles (
  id,
  username,
  display_name,
  bio,
  created_at,
  updated_at
)
select
  u.id,
  case
    when
      nullif(u.raw_user_meta_data ->> 'username','') is not null
      and public.is_username_allowed(u.raw_user_meta_data ->> 'username')
      and not exists (
        select 1
        from public.profiles p2
        where lower(p2.username)=lower(u.raw_user_meta_data ->> 'username')
      )
    then u.raw_user_meta_data ->> 'username'
    else 'user_' || substr(replace(u.id::text,'-',''),1,8)
  end,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'display_name',''),
    nullif(u.raw_user_meta_data ->> 'name',''),
    split_part(coalesce(u.email,'mi.net user'),'@',1)
  ),
  '',
  coalesce(u.created_at,now()),
  now()
from auth.users u
where not exists (
  select 1
  from public.profiles p
  where p.id=u.id
)
on conflict do nothing;

commit;

notify pgrst, 'reload schema';

-- Diagnostic: shows Auth users and whether each one has a searchable profile.
select
  u.id,
  u.email,
  p.username,
  p.display_name,
  case when p.id is null then 'MISSING PROFILE' else 'OK' end as profile_status
from auth.users u
left join public.profiles p on p.id=u.id
order by u.created_at desc;
