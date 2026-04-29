create extension if not exists "pgcrypto";

create table if not exists public.helena_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null default 'Untitled Helena Video',
  status text not null default 'draft',
  aspect_ratio text not null default '9:16',
  duration_seconds integer not null default 18,
  creative_profile text not null default 'social-premium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.helena_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.helena_projects(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  kind text not null check (kind in ('video', 'audio', 'image', 'caption', 'output')),
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.helena_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.helena_projects(id) on delete set null,
  owner_id uuid references auth.users(id) on delete cascade,
  external_job_id text,
  module text not null check (module in ('module1', 'module2', 'autocut')),
  provider text not null default 'helena-native',
  status text not null default 'queued',
  prompt text not null,
  params jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.helena_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.helena_projects(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  agent_name text not null default 'Helena Video',
  created_at timestamptz not null default now()
);

create table if not exists public.helena_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.helena_chat_sessions(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant', 'tool')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.helena_publications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.helena_projects(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  platform text not null,
  status text not null default 'draft',
  caption text,
  scheduled_at timestamptz,
  external_ref text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.helena_projects enable row level security;
alter table public.helena_assets enable row level security;
alter table public.helena_generation_jobs enable row level security;
alter table public.helena_chat_sessions enable row level security;
alter table public.helena_chat_messages enable row level security;
alter table public.helena_publications enable row level security;

create policy "helena_projects_owner_all"
  on public.helena_projects for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "helena_assets_owner_all"
  on public.helena_assets for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "helena_generation_jobs_owner_all"
  on public.helena_generation_jobs for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "helena_chat_sessions_owner_all"
  on public.helena_chat_sessions for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "helena_chat_messages_owner_all"
  on public.helena_chat_messages for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "helena_publications_owner_all"
  on public.helena_publications for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists helena_projects_owner_idx on public.helena_projects(owner_id);
create index if not exists helena_assets_project_idx on public.helena_assets(project_id);
create index if not exists helena_generation_jobs_project_idx on public.helena_generation_jobs(project_id);
create index if not exists helena_generation_jobs_external_idx on public.helena_generation_jobs(external_job_id);
create index if not exists helena_chat_messages_session_idx on public.helena_chat_messages(session_id);
create index if not exists helena_publications_project_idx on public.helena_publications(project_id);
