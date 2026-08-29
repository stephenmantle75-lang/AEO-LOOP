-- ANT-36: durable, evidence-linked analysis snapshots.
-- This migration is intentionally not applied by the application. The cron
-- path must remain draft-only until human approval and persistence policy are
-- reviewed.
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  analysis_key text not null unique,
  run_id uuid not null references public.runs(id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'rejected')),
  agent_version text not null,
  model text,
  prompt_version text not null,
  review_mode text not null default 'draft_only'
    check (review_mode in ('draft_only', 'human_approved')),
  cost_usd numeric(12,6) not null default 0
    check (cost_usd >= 0),
  observation_ids uuid[] not null default '{}',
  findings jsonb not null default '[]'::jsonb
    check (jsonb_typeof(findings) = 'array'),
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analyses_run_id_idx
  on public.analyses (run_id, analyzed_at desc);

create index if not exists analyses_status_analyzed_at_idx
  on public.analyses (status, analyzed_at desc);

alter table public.analyses enable row level security;
revoke all on table public.analyses from anon, authenticated;
grant select, insert, update, delete on table public.analyses to service_role;
