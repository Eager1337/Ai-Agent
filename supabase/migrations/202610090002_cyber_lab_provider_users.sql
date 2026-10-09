create table if not exists public.cyber_lab_provider_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider_user_id text not null unique,
  created_at timestamptz not null default now()
);

alter table public.cyber_lab_provider_users enable row level security;
revoke all on public.cyber_lab_provider_users from anon, authenticated;
grant all on public.cyber_lab_provider_users to service_role;
