create or replace function public.claim_daily_run(
  p_run_key text,
  p_sources text[] default '{}',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  existing_run public.runs;
  active_run public.runs;
  claimed_run public.runs;
begin
  if p_run_key is null or length(trim(p_run_key)) = 0 then
    raise exception 'run_key is required';
  end if;

  -- Serialize daily claims so two cron invocations cannot both pass the overlap check.
  perform pg_advisory_xact_lock(hashtext('aeo-loop:daily-observation'));

  select * into existing_run
  from public.runs
  where run_key = p_run_key;

  if existing_run.id is not null then
    return jsonb_build_object('run', to_jsonb(existing_run), 'claimed', false, 'reason', 'duplicate');
  end if;

  select * into active_run
  from public.runs
  where run_type = 'daily_observation'
    and status = 'running'
  order by started_at desc
  limit 1;

  if active_run.id is not null then
    return jsonb_build_object('run', to_jsonb(active_run), 'claimed', false, 'reason', 'overlap');
  end if;

  insert into public.runs (run_key, run_type, status, sources, metadata)
  values (p_run_key, 'daily_observation', 'running', coalesce(p_sources, '{}'), coalesce(p_metadata, '{}'::jsonb))
  returning * into claimed_run;

  return jsonb_build_object('run', to_jsonb(claimed_run), 'claimed', true, 'reason', 'claimed');
end;
$$;

revoke all on function public.claim_daily_run(text, text[], jsonb) from public, anon, authenticated;
grant execute on function public.claim_daily_run(text, text[], jsonb) to service_role;
