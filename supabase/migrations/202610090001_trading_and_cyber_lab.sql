-- Private integration state. Only server-side service-role code may access these tables.
create table if not exists public.trading_provider_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  provider_user_id text not null unique,
  user_secret_ciphertext text not null,
  user_secret_iv text not null,
  user_secret_tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trading_provider_users enable row level security;
revoke all on public.trading_provider_users from anon, authenticated;
grant all on public.trading_provider_users to service_role;

create table if not exists public.cyber_lab_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_session_id text not null unique,
  provider_user_id text not null,
  session_mode text not null check (session_mode in ('linux-desktop', 'virtual-machine')),
  status text not null default 'starting',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 hour')
);

alter table public.cyber_lab_sessions enable row level security;
revoke all on public.cyber_lab_sessions from anon, authenticated;
grant all on public.cyber_lab_sessions to service_role;
