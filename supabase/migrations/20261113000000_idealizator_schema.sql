-- Idealizator schema. Designed to live safely inside a SHARED Supabase project:
--  * every object is prefixed idealizator_ so it cannot collide with other apps,
--  * nothing touches auth.users (no trigger), Auth settings or email templates,
--  * profiles are created lazily by idealizator_ensure_profile(), so other apps' users get no rows unless they use Idealizator.
-- Supabase Auth handles accounts. Row-level security everywhere: a person only ever reads their own rows;
-- writes that need rules go through security-definer functions.

-- ---------- profiles ----------
create table public.idealizator_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  storage text not null default 'both' check (storage in ('device', 'server', 'both')),
  plan text not null default 'free' check (plan in ('free', 'plus', 'pro')),
  created_at timestamptz not null default now()
);
alter table public.idealizator_profiles enable row level security;
create policy "read own profile" on public.idealizator_profiles for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.idealizator_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- People may change their name and storage choice, never their plan (billing sets that).
revoke update on public.idealizator_profiles from authenticated, anon;
grant update (name, storage) on public.idealizator_profiles to authenticated;

-- Creates the profile on first use and returns it. Name and storage come from sign-up metadata when the row is new.
create function public.idealizator_ensure_profile() returns public.idealizator_profiles
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  meta jsonb;
  row public.idealizator_profiles;
begin
  if uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select raw_user_meta_data into meta from auth.users where id = uid;
  insert into public.idealizator_profiles (id, name, storage)
  values (uid, coalesce(left(meta ->> 'name', 60), ''),
          case when meta ->> 'storage' in ('device', 'server', 'both') then meta ->> 'storage' else 'both' end)
  on conflict (id) do nothing;
  select * into row from public.idealizator_profiles where id = uid;
  return row;
end $$;

-- ---------- ideas (synced copy; last write wins by the idea's own updatedAt) ----------
create table public.idealizator_ideas (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null,
  server_at timestamptz not null default now(),
  deleted boolean not null default false,
  primary key (user_id, id)
);
create index idealizator_ideas_user_server_at on public.idealizator_ideas (user_id, server_at);
alter table public.idealizator_ideas enable row level security;
create policy "read own ideas" on public.idealizator_ideas for select to authenticated using (user_id = (select auth.uid()));
-- No insert/update/delete policies: the app writes only through idealizator_sync().

create function public.idealizator_sync(p_since timestamptz, p_ideas jsonb, p_deleted text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  t timestamptz := clock_timestamp();
  el jsonb;
begin
  if uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
  if jsonb_typeof(coalesce(p_ideas, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_ideas, '[]'::jsonb)) > 500 then
    raise exception 'too many ideas in one sync'; end if;

  for el in select * from jsonb_array_elements(coalesce(p_ideas, '[]'::jsonb)) loop
    continue when jsonb_typeof(el -> 'id') is distinct from 'string' or (el ->> 'updatedAt') is null;
    continue when pg_column_size(el) > 500000;
    insert into public.idealizator_ideas as i (user_id, id, data, updated_at, server_at, deleted)
    values (uid, el ->> 'id', jsonb_set(el, '{images}', '[]'::jsonb), (el ->> 'updatedAt')::timestamptz, t, false)
    on conflict (user_id, id) do update
      set data = excluded.data, updated_at = excluded.updated_at, server_at = excluded.server_at, deleted = false
      where i.updated_at < excluded.updated_at;   -- the server copy (or its deletion) wins if it is newer
  end loop;

  insert into public.idealizator_ideas as i (user_id, id, data, updated_at, server_at, deleted)
  select uid, d, '{}'::jsonb, t, t, true from unnest(coalesce(p_deleted, '{}')) as d
  on conflict (user_id, id) do update set deleted = true, updated_at = excluded.updated_at, server_at = excluded.server_at;

  return jsonb_build_object(
    'serverTime', to_char(t at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'ideas', coalesce((select jsonb_agg(data) from public.idealizator_ideas where user_id = uid and not deleted and server_at > coalesce(p_since, '-infinity')), '[]'::jsonb),
    'deleted', coalesce((select jsonb_agg(id) from public.idealizator_ideas where user_id = uid and deleted and server_at > coalesce(p_since, '-infinity')), '[]'::jsonb)
  );
end $$;

-- ---------- usage limits (enforced here, not in the app) ----------
create table public.idealizator_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  analyses int not null default 0,
  primary key (user_id, month)
);
alter table public.idealizator_usage enable row level security;
create policy "read own usage" on public.idealizator_usage for select to authenticated using (user_id = (select auth.uid()));

-- Sample limits from the handoff (not decisions): free 3, plus 20, pro unlimited.
create function public.idealizator_analysis_status() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  p text; used int; lim int;
begin
  if uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select plan into p from public.idealizator_profiles where id = uid;
  select analyses into used from public.idealizator_usage where user_id = uid and month = to_char(now() at time zone 'utc', 'YYYY-MM');
  used := coalesce(used, 0);
  lim := case coalesce(p, 'free') when 'pro' then null when 'plus' then 20 else 3 end;
  return jsonb_build_object('used', used, 'limit', lim, 'allowed', lim is null or used < lim);
end $$;

create function public.idealizator_count_analysis() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  insert into public.idealizator_usage (user_id, month, analyses) values (auth.uid(), to_char(now() at time zone 'utc', 'YYYY-MM'), 1)
  on conflict (user_id, month) do update set analyses = public.idealizator_usage.analyses + 1;
end $$;

-- Removes ONLY Idealizator's data for the signed-in person (profile, ideas, usage). It never deletes the shared auth user,
-- because the same login may belong to other apps in this project.
create function public.idealizator_delete_my_data() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  delete from public.idealizator_ideas where user_id = auth.uid();
  delete from public.idealizator_usage where user_id = auth.uid();
  delete from public.idealizator_profiles where id = auth.uid();
end $$;

-- Only signed-in people may call these.
revoke execute on function public.idealizator_ensure_profile(), public.idealizator_sync(timestamptz, jsonb, text[]),
  public.idealizator_analysis_status(), public.idealizator_count_analysis(), public.idealizator_delete_my_data() from public, anon;
grant execute on function public.idealizator_ensure_profile(), public.idealizator_sync(timestamptz, jsonb, text[]),
  public.idealizator_analysis_status(), public.idealizator_count_analysis(), public.idealizator_delete_my_data() to authenticated;
