-- ANT-36: authenticated human review for durable analysis snapshots.
-- This migration is local-first. Apply it to production only after the Auth
-- provider, owner UUID, and review workflow have been manually verified.

alter table public.analyses
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

alter table public.findings
  add column if not exists analysis_id uuid references public.analyses(id) on delete restrict,
  add column if not exists source_key text;

create unique index if not exists findings_analysis_source_key_idx
  on public.findings (analysis_id, source_key);

create table if not exists public.analysis_review_events (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null unique references public.analyses(id) on delete restrict,
  run_id uuid not null references public.runs(id) on delete restrict,
  decision text not null check (decision in ('approved', 'rejected')),
  reviewer_id uuid not null,
  review_note text not null,
  evidence_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists analysis_review_events_reviewer_created_at_idx
  on public.analysis_review_events (reviewer_id, created_at desc);

alter table public.analysis_review_events enable row level security;
revoke all on table public.analysis_review_events from anon, authenticated;
grant select, insert, update, delete on table public.analysis_review_events to service_role;

-- The application verifies the Supabase Auth identity before calling this RPC.
-- The RPC itself remains service_role-only so the browser can never mutate
-- analyses or findings through the Data API.
create or replace function public.review_analysis(
  p_run_id uuid,
  p_reviewer_id uuid,
  p_decision text,
  p_review_note text
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  analysis_row public.analyses;
  allowed_evidence text[];
  finding_count integer := 0;
begin
  if current_user <> 'service_role' then
    raise exception 'review_analysis is restricted to service_role';
  end if;

  if p_reviewer_id is null then
    raise exception 'reviewer_id is required';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'unsupported review decision';
  end if;

  if p_review_note is null or length(trim(p_review_note)) = 0 or length(p_review_note) > 2000 then
    raise exception 'review note is required and must be 2000 characters or fewer';
  end if;

  select * into analysis_row
  from public.analyses
  where run_id = p_run_id
  order by analyzed_at desc
  limit 1
  for update;

  if not found then
    raise exception 'analysis not found';
  end if;

  if analysis_row.status <> 'draft' or analysis_row.review_mode <> 'draft_only' then
    raise exception 'analysis has already been reviewed';
  end if;

  allowed_evidence := array(select unnest(analysis_row.observation_ids)::text);

  if jsonb_typeof(analysis_row.findings) <> 'array' then
    raise exception 'analysis findings are malformed';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(analysis_row.findings) as finding(
      id text,
      "runId" text,
      "topicKey" text,
      kind text,
      title text,
      summary text,
      recommendation text,
      priority text,
      "evidenceIds" jsonb,
      confidence numeric,
      status text
    )
    where finding."runId" is distinct from analysis_row.run_id::text
      or finding.id is null
      or finding."topicKey" is null
      or finding.title is null
      or finding.summary is null
      or finding.recommendation is null
      or finding."evidenceIds" is null
      or jsonb_typeof(finding."evidenceIds") <> 'array'
      or jsonb_array_length(finding."evidenceIds") = 0
      or exists (
        select 1
        from jsonb_array_elements_text(finding."evidenceIds") evidence(value)
        where not (evidence.value = any(allowed_evidence))
      )
  ) then
    raise exception 'analysis contains invalid evidence-linked findings';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(analysis_row.findings) as finding(
      id text,
      "evidenceIds" jsonb
    )
    cross join lateral jsonb_array_elements_text(finding."evidenceIds") evidence(value)
    where not exists (
      select 1 from public.observations
      where observations.id = evidence.value::uuid
        and observations.run_id = analysis_row.run_id
    )
  ) then
    raise exception 'analysis references evidence from another run';
  end if;

  if p_decision = 'approved' then
    insert into public.findings (
      analysis_id,
      source_key,
      run_id,
      topic_key,
      kind,
      status,
      priority,
      title,
      summary,
      recommendation,
      evidence_ids,
      confidence
    )
    select
      analysis_row.id,
      finding.id,
      analysis_row.run_id,
      finding."topicKey",
      finding.kind,
      'new',
      finding.priority,
      finding.title,
      finding.summary,
      finding.recommendation,
      array(select evidence.value::uuid from jsonb_array_elements_text(finding."evidenceIds") evidence(value)),
      finding.confidence
    from jsonb_to_recordset(analysis_row.findings) as finding(
      id text,
      "topicKey" text,
      kind text,
      priority text,
      title text,
      summary text,
      recommendation text,
      "evidenceIds" jsonb,
      confidence numeric
    )
    on conflict (analysis_id, source_key) do nothing;

    get diagnostics finding_count = row_count;
  end if;

  insert into public.analysis_review_events (analysis_id, run_id, decision, reviewer_id, review_note, evidence_ids)
  values (analysis_row.id, analysis_row.run_id, p_decision, p_reviewer_id, trim(p_review_note), analysis_row.observation_ids);

  update public.analyses
  set status = p_decision,
      review_mode = 'human_approved',
      reviewed_by = p_reviewer_id,
      reviewed_at = now(),
      review_note = trim(p_review_note),
      updated_at = now()
  where id = analysis_row.id;

  return jsonb_build_object(
    'analysis_id', analysis_row.id,
    'run_id', analysis_row.run_id,
    'status', p_decision,
    'finding_count', finding_count
  );
end;
$$;

revoke all on function public.review_analysis(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_analysis(uuid, uuid, text, text) to service_role;
