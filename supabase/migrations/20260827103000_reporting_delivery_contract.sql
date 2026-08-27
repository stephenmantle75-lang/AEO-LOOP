-- Reporting is deliberately separate from raw observations. The payload stored
-- here must be the sanitized daily-pulse contract, never a provider response.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.runs(id) on delete restrict,
  event_id text not null unique,
  report_type text not null check (report_type in ('daily_pulse')),
  schema_version text not null,
  health text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  content_hash text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.report_outbox (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.reports(id) on delete restrict,
  event_id text not null unique,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'sent', 'failed', 'cancelled')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete restrict,
  outbox_id uuid references public.report_outbox(id) on delete restrict,
  event_id text not null,
  channel text not null check (channel in ('slack', 'linear', 'zapier')),
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  external_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  response_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(response_metadata) = 'object'),
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, channel)
);

create index if not exists reports_generated_at_idx
  on public.reports (generated_at desc);

create index if not exists report_outbox_status_available_at_idx
  on public.report_outbox (status, available_at);

create index if not exists delivery_events_report_id_idx
  on public.delivery_events (report_id, created_at desc);

alter table public.reports enable row level security;
alter table public.report_outbox enable row level security;
alter table public.delivery_events enable row level security;

revoke all on table public.reports, public.report_outbox, public.delivery_events from anon, authenticated;
grant select, insert, update, delete on table public.reports, public.report_outbox, public.delivery_events to service_role;
