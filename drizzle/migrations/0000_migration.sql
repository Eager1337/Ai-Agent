
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  code text not null,
  name text not null,
  description text not null default '',
  organization text not null default '',
  authorization_status text not null default 'Training Lab',
  auth_ref text not null default '',
  scope text not null default '',
  targets text not null default '',
  start_date date, end_date date,
  investigator text not null default '',
  team text not null default '',
  classification text not null default 'TLP:AMBER',
  status text not null default 'Open',
  created_at timestamptz not null default now()
);
create table public.case_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  actor text not null default '',
  action text not null,
  created_at timestamptz not null default now()
);
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  role text not null,
  instructions text not null default '',
  focus text[] not null default '{}',
  created_at timestamptz not null default now()
);
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  title text not null default 'New conversation',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  description text not null default '',
  status text not null default 'Active',
  created_at timestamptz not null default now()
);
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['cases','case_audit','agents','threads','messages','projects','notes'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
