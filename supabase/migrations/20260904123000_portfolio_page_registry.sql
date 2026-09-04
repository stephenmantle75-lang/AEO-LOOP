create table if not exists public.portfolio_pages (
  page_key text primary key,
  path text not null unique,
  url text not null,
  page_type text not null check (page_type in ('note', 'insight')),
  priority text not null check (priority in ('high', 'standard')),
  active boolean not null default true,
  source_sitemap_url text not null,
  registry_digest text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_page_checks (
  id uuid primary key default gen_random_uuid(),
  page_key text not null references public.portfolio_pages(page_key) on delete restrict,
  checked_at timestamptz not null default now(),
  registry_digest text not null,
  status text not null check (status in ('ready', 'needs_attention', 'failed')),
  score integer not null check (score between 0 and 100),
  passed_checks jsonb not null default '[]'::jsonb check (jsonb_typeof(passed_checks) = 'array'),
  failed_checks jsonb not null default '[]'::jsonb check (jsonb_typeof(failed_checks) = 'array'),
  http_status integer,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_pages_active_priority_idx
  on public.portfolio_pages (active, priority, path);

create index if not exists portfolio_page_checks_page_checked_at_idx
  on public.portfolio_page_checks (page_key, checked_at desc);

alter table public.portfolio_pages enable row level security;
alter table public.portfolio_page_checks enable row level security;

revoke all on table public.portfolio_pages, public.portfolio_page_checks from anon, authenticated;
grant select, insert, update, delete on table public.portfolio_pages, public.portfolio_page_checks to service_role;
