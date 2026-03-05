-- Enable RLS and add per-user policies for tags and transaction_tags

-- tags
alter table if exists public.tags enable row level security;

drop policy if exists "tags_select_own" on public.tags;
create policy "tags_select_own" on public.tags
  for select
  using (user_id = auth.uid());

drop policy if exists "tags_insert_own" on public.tags;
create policy "tags_insert_own" on public.tags
  for insert
  with check (user_id = auth.uid());

drop policy if exists "tags_update_own" on public.tags;
create policy "tags_update_own" on public.tags
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "tags_delete_own" on public.tags;
create policy "tags_delete_own" on public.tags
  for delete
  using (user_id = auth.uid());

-- transaction_tags
alter table if exists public.transaction_tags enable row level security;

drop policy if exists "tx_tags_select_own" on public.transaction_tags;
create policy "tx_tags_select_own" on public.transaction_tags
  for select
  using (user_id = auth.uid());

drop policy if exists "tx_tags_insert_own" on public.transaction_tags;
create policy "tx_tags_insert_own" on public.transaction_tags
  for insert
  with check (user_id = auth.uid());

drop policy if exists "tx_tags_update_own" on public.transaction_tags;
create policy "tx_tags_update_own" on public.transaction_tags
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "tx_tags_delete_own" on public.transaction_tags;
create policy "tx_tags_delete_own" on public.transaction_tags
  for delete
  using (user_id = auth.uid());

