-- ユーザープロフィール (auth.usersを拡張)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  plan_tier text default 'free' not null,
  trial_ends_at timestamptz,
  created_at timestamptz default now() not null
);

-- アプリ作成プロジェクト
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  tier text default 'basic' not null,
  status text default 'requirements_gathering' not null,
  -- requirements_gathering → requirements_confirmed → payment_pending → paid → in_generation → completed
  requirements_json jsonb,
  payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- チャットメッセージ
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  phase text default 'requirements' not null check (phase in ('requirements', 'guidance', 'generation')),
  metadata jsonb,
  created_at timestamptz default now() not null
);

-- 外部サービス連携 (GitHub, Vercel, Supabaseアカウント)
create table public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  service text not null check (service in ('github', 'vercel', 'supabase_deploy')),
  encrypted_token text not null,
  metadata jsonb,
  created_at timestamptz default now() not null,
  unique(user_id, service)
);

-- updated_atを自動更新するトリガー
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure public.handle_updated_at();

-- 新規ユーザー登録時にprofileを自動作成するトリガー
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, trial_ends_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    now() + interval '7 days'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
