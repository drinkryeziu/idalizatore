-- Free plan: 10 analyzed ideas a month (was 3). Plus and Pro are unchanged (20 and unlimited).
create or replace function public.idealizator_analysis_status() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  p text; used int; lim int;
begin
  if uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select plan into p from public.idealizator_profiles where id = uid;
  select analyses into used from public.idealizator_usage where user_id = uid and month = to_char(now() at time zone 'utc', 'YYYY-MM');
  used := coalesce(used, 0);
  lim := case coalesce(p, 'free') when 'pro' then null when 'plus' then 20 else 10 end;
  return jsonb_build_object('used', used, 'limit', lim, 'allowed', lim is null or used < lim);
end $$;
