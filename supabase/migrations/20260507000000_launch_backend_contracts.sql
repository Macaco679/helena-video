create extension if not exists "pgcrypto";

create table if not exists public.helena_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  password_hash text not null,
  password_salt text not null,
  plan text not null default 'free',
  role text not null default 'owner',
  phone text,
  company text,
  job_title text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.helena_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.helena_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.helena_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.helena_users(id) on delete cascade,
  name text not null default 'Helena Studio',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.helena_projects add column if not exists app_user_id uuid references public.helena_users(id) on delete cascade;
alter table public.helena_projects add column if not exists description text;
alter table public.helena_projects add column if not exists template_id text;
alter table public.helena_projects add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.helena_assets add column if not exists app_user_id uuid references public.helena_users(id) on delete cascade;
alter table public.helena_generation_jobs add column if not exists app_user_id uuid references public.helena_users(id) on delete cascade;
alter table public.helena_chat_sessions add column if not exists app_user_id uuid references public.helena_users(id) on delete cascade;
alter table public.helena_chat_messages add column if not exists app_user_id uuid references public.helena_users(id) on delete cascade;
alter table public.helena_publications add column if not exists app_user_id uuid references public.helena_users(id) on delete cascade;
alter table public.helena_publications add column if not exists platforms text[] not null default '{}'::text[];

create table if not exists public.helena_workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.helena_workspaces(id) on delete cascade,
  app_user_id uuid references public.helena_users(id) on delete cascade,
  email text not null,
  role text not null default 'editor',
  status text not null default 'invited',
  created_at timestamptz not null default now()
);

create table if not exists public.helena_integrations (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.helena_users(id) on delete cascade,
  provider text not null,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (app_user_id, provider)
);

create table if not exists public.helena_api_keys (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.helena_users(id) on delete cascade,
  label text not null default 'Production key',
  key_prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.helena_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.helena_users(id) on delete cascade,
  kind text not null check (kind in ('credit', 'debit', 'withdrawal')),
  amount_cents integer not null,
  description text not null,
  status text not null default 'posted',
  created_at timestamptz not null default now()
);

create table if not exists public.helena_billing_events (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.helena_users(id) on delete cascade,
  kind text not null,
  amount_cents integer not null default 0,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.helena_action_events (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid references public.helena_users(id) on delete cascade,
  area text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists helena_users_email_idx on public.helena_users(email);
create index if not exists helena_sessions_user_idx on public.helena_sessions(user_id);
create index if not exists helena_projects_app_user_idx on public.helena_projects(app_user_id);
create index if not exists helena_generation_jobs_app_user_idx on public.helena_generation_jobs(app_user_id);
create index if not exists helena_publications_app_user_idx on public.helena_publications(app_user_id);
create index if not exists helena_chat_sessions_app_user_idx on public.helena_chat_sessions(app_user_id);
create index if not exists helena_wallet_ledger_user_idx on public.helena_wallet_ledger(app_user_id);
create index if not exists helena_action_events_user_idx on public.helena_action_events(app_user_id);
