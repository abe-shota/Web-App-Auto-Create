-- Row Level Security を有効化
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.messages enable row level security;
alter table public.user_integrations enable row level security;

-- profiles: 自分のプロフィールのみ読み書き可
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- projects: 自分のプロジェクトのみ操作可
create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);

create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);

create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id);

create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

-- messages: 自分のプロジェクトのメッセージのみ操作可
create policy "messages_select_own" on public.messages
  for select using (
    exists (
      select 1 from public.projects
      where projects.id = messages.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "messages_insert_own" on public.messages
  for insert with check (
    exists (
      select 1 from public.projects
      where projects.id = messages.project_id
        and projects.user_id = auth.uid()
    )
  );

-- user_integrations: 自分の連携情報のみ操作可
create policy "integrations_select_own" on public.user_integrations
  for select using (auth.uid() = user_id);

create policy "integrations_insert_own" on public.user_integrations
  for insert with check (auth.uid() = user_id);

create policy "integrations_update_own" on public.user_integrations
  for update using (auth.uid() = user_id);

create policy "integrations_delete_own" on public.user_integrations
  for delete using (auth.uid() = user_id);
