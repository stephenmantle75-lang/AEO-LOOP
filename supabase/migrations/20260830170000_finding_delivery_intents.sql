-- ANT-39: queue an idempotent delivery intent when an approved finding is created.
-- This migration records the handoff only. External Linear, Slack, and Zapier
-- adapters remain separate and must not be enabled by applying this schema.

create table if not exists public.finding_delivery_events (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references public.findings(id) on delete restrict,
  event_id text not null,
  channel text not null
    check (channel in ('slack', 'linear', 'zapier')),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'sent', 'failed', 'skipped')),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  external_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  response_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(response_metadata) = 'object'),
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (finding_id, channel),
  unique (event_id, channel)
);

create index if not exists finding_delivery_events_status_available_idx
  on public.finding_delivery_events (status, created_at);

create index if not exists finding_delivery_events_finding_id_idx
  on public.finding_delivery_events (finding_id, created_at desc);

alter table public.finding_delivery_events enable row level security;
revoke all on table public.finding_delivery_events from anon, authenticated;
grant select, insert, update, delete on table public.finding_delivery_events to service_role;

create or replace function public.queue_finding_delivery_intents()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  event_id_value text := 'finding.created:' || new.id::text;
begin
  if new.analysis_id is null or new.status <> 'new' then
    return new;
  end if;

  insert into public.finding_delivery_events (finding_id, event_id, channel, payload)
  select
    new.id,
    event_id_value,
    channel,
    jsonb_build_object(
      'eventId', event_id_value,
      'findingId', new.id,
      'runId', new.run_id,
      'topic', new.topic_key,
      'confidence', new.confidence,
      'dashboardPath', '/findings/' || new.id::text,
      'createdAt', new.created_at,
      'title', new.title,
      'summary', new.summary,
      'recommendation', new.recommendation,
      'priority', new.priority,
      'evidenceIds', to_jsonb(new.evidence_ids)
    )
  from unnest(array['linear', 'slack', 'zapier']::text[]) as channels(channel)
  on conflict (finding_id, channel) do nothing;

  return new;
end;
$$;

revoke all on function public.queue_finding_delivery_intents() from public, anon, authenticated;
grant execute on function public.queue_finding_delivery_intents() to service_role;

drop trigger if exists findings_queue_delivery_intents on public.findings;
create trigger findings_queue_delivery_intents
after insert on public.findings
for each row execute function public.queue_finding_delivery_intents();
