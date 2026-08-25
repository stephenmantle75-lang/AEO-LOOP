create extension if not exists pgcrypto;

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  run_type text not null default 'daily_observation'
    check (run_type in ('daily_observation', 'analysis', 'experiment_retest', 'manual')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'partial', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  cost_usd numeric(12,6) check (cost_usd is null or cost_usd >= 0),
  sources text[] not null default '{}',
  agent_version text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  error_message text,
  created_at timestamptz not null default now(),
  check (completed_at is null or completed_at >= started_at)
);

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete restrict,
  topic_key text not null,
  question text not null,
  provider text not null
    check (provider in ('exa', 'firecrawl', 'google_search_console', 'manual', 'other')),
  observation_type text not null
    check (observation_type in ('citation_check', 'page_fetch', 'search_performance', 'competitor_gap', 'technical_check')),
  status text not null default 'observed'
    check (status in ('observed', 'failed', 'skipped')),
  observed_at timestamptz not null default now(),
  target_url text,
  answer_text text,
  mentioned boolean not null default false,
  citation_found boolean not null default false,
  citation_urls text[] not null default '{}',
  citations jsonb not null default '[]'::jsonb
    check (jsonb_typeof(citations) = 'array'),
  metrics jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metrics) = 'object'),
  source_url text,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete restrict,
  topic_key text not null,
  kind text not null
    check (kind in ('citation_gap', 'content_update', 'technical', 'experiment')),
  status text not null default 'new'
    check (status in ('new', 'approved', 'rejected', 'in_progress', 'shipped', 'verified')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  title text not null,
  summary text not null,
  recommendation text not null,
  evidence_ids uuid[] not null default '{}',
  evidence jsonb not null default '{}'::jsonb
    check (jsonb_typeof(evidence) = 'object'),
  expected_impact text,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  suggested_patch jsonb not null default '{}'::jsonb
    check (jsonb_typeof(suggested_patch) = 'object'),
  linear_issue_id text,
  linear_issue_url text,
  slack_delivery_status text
    check (slack_delivery_status is null or slack_delivery_status in ('not_requested', 'queued', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists runs_status_created_at_idx
  on public.runs (status, created_at desc);

create index if not exists observations_run_id_idx
  on public.observations (run_id);

create index if not exists observations_topic_observed_at_idx
  on public.observations (topic_key, observed_at desc);

create index if not exists observations_provider_observed_at_idx
  on public.observations (provider, observed_at desc);

create index if not exists findings_status_priority_created_at_idx
  on public.findings (status, priority, created_at desc);

create index if not exists findings_topic_created_at_idx
  on public.findings (topic_key, created_at desc);

alter table public.runs enable row level security;
alter table public.observations enable row level security;
alter table public.findings enable row level security;

revoke all on table public.runs, public.observations, public.findings from anon, authenticated;

grant select, insert, update, delete on table public.runs, public.observations, public.findings to service_role;

revoke all on function public.rls_auto_enable() from public, anon, authenticated;
