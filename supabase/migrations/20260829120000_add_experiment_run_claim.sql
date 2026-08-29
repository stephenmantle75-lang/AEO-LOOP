-- Serialize manual experiment runs with the scheduled observation run.
-- The database remains authoritative for overlap prevention and idempotency.
create or replace function public.claim_observation_run(
  p_run_key text,
  p_run_type text,
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

  if p_run_type not in ('daily_observation', 'experiment_retest', 'manual') then
    raise exception 'unsupported observation run type: %', p_run_type;
  end if;

  perform pg_advisory_xact_lock(hashtext('aeo-loop:observation-run'));

  select * into existing_run
  from public.runs
  where run_key = p_run_key;

  if existing_run.id is not null then
    return jsonb_build_object('run', to_jsonb(existing_run), 'claimed', false, 'reason', 'duplicate');
  end if;

  select * into active_run
  from public.runs
  where status = 'running'
    and run_type in ('daily_observation', 'experiment_retest', 'manual')
  order by started_at desc
  limit 1;

  if active_run.id is not null then
    return jsonb_build_object('run', to_jsonb(active_run), 'claimed', false, 'reason', 'overlap');
  end if;

  insert into public.runs (run_key, run_type, status, sources, metadata)
  values (p_run_key, p_run_type, 'running', coalesce(p_sources, '{}'), coalesce(p_metadata, '{}'::jsonb))
  returning * into claimed_run;

  return jsonb_build_object('run', to_jsonb(claimed_run), 'claimed', true, 'reason', 'claimed');
end;
$$;

create or replace function public.claim_daily_run(
  p_run_key text,
  p_sources text[] default '{}',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language sql
set search_path = public, pg_temp
as $$
  select public.claim_observation_run(p_run_key, 'daily_observation', p_sources, p_metadata);
$$;

create or replace function public.claim_experiment_run(
  p_run_key text,
  p_sources text[] default '{}',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language sql
set search_path = public, pg_temp
as $$
  select public.claim_observation_run(p_run_key, 'experiment_retest', p_sources, p_metadata);
$$;

revoke all on function public.claim_observation_run(text, text, text[], jsonb) from public, anon, authenticated;
revoke all on function public.claim_experiment_run(text, text[], jsonb) from public, anon, authenticated;
grant execute on function public.claim_observation_run(text, text, text[], jsonb) to service_role;
grant execute on function public.claim_experiment_run(text, text[], jsonb) to service_role;
