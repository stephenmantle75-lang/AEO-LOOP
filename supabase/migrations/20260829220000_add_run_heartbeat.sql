alter table public.runs
  add column if not exists heartbeat_at timestamptz;

create index if not exists runs_status_heartbeat_at_idx
  on public.runs (status, heartbeat_at desc);
