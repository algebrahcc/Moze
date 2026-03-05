create extension if not exists "pgcrypto";

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash','credit','stock')),
  account_group text not null default 'daily' check (account_group in ('daily','investment','fixed','liability')),
  credit_limit numeric(14,2),
  statement_date integer check (statement_date between 1 and 31),
  payment_due_date integer check (payment_due_date between 1 and 31),
  currency text not null default 'CNY',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, parent_id, name)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  to_account_id uuid references public.accounts(id) on delete cascade,
  type text not null check (type in ('expense','income','transfer')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'CNY',
  category_id uuid references public.categories(id) on delete set null,
  category text,
  note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (type <> 'transfer' and to_account_id is null)
    or (type = 'transfer' and to_account_id is not null and to_account_id <> account_id)
  )
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.transaction_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (transaction_id, tag_id)
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month date not null,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create table if not exists public.asset_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  date date not null,
  total_value numeric(14,2) not null check (total_value >= 0),
  net_deposit numeric(14,2) not null default 0,
  daily_pnl numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, date)
);

create index if not exists accounts_user_id_idx on public.accounts(user_id);
create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists categories_parent_id_idx on public.categories(parent_id);
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_account_id_idx on public.transactions(account_id);
create index if not exists transactions_to_account_id_idx on public.transactions(to_account_id);
create index if not exists tags_user_id_idx on public.tags(user_id);
create index if not exists transaction_tags_user_id_idx on public.transaction_tags(user_id);
create index if not exists transaction_tags_tx_id_idx on public.transaction_tags(transaction_id);
create index if not exists transaction_tags_tag_id_idx on public.transaction_tags(tag_id);
create index if not exists budgets_user_id_idx on public.budgets(user_id);
create index if not exists asset_snapshots_user_id_idx on public.asset_snapshots(user_id);
create index if not exists asset_snapshots_account_id_date_idx on public.asset_snapshots(account_id, date desc);

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.tags enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.budgets enable row level security;
alter table public.asset_snapshots enable row level security;

create policy accounts_select on public.accounts
  for select
  using (user_id = auth.uid());

create policy accounts_insert on public.accounts
  for insert
  with check (user_id = auth.uid());

create policy accounts_update on public.accounts
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy accounts_delete on public.accounts
  for delete
  using (user_id = auth.uid());

create policy categories_select on public.categories
  for select
  using (user_id = auth.uid());

create policy categories_insert on public.categories
  for insert
  with check (user_id = auth.uid());

create policy categories_update on public.categories
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy categories_delete on public.categories
  for delete
  using (user_id = auth.uid());

create policy transactions_select on public.transactions
  for select
  using (user_id = auth.uid());

create policy transactions_insert on public.transactions
  for insert
  with check (user_id = auth.uid());

create policy transactions_update on public.transactions
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy transactions_delete on public.transactions
  for delete
  using (user_id = auth.uid());

create policy tags_select on public.tags
  for select
  using (user_id = auth.uid());

create policy tags_insert on public.tags
  for insert
  with check (user_id = auth.uid());

create policy tags_update on public.tags
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy tags_delete on public.tags
  for delete
  using (user_id = auth.uid());

create policy transaction_tags_select on public.transaction_tags
  for select
  using (user_id = auth.uid());

create policy transaction_tags_insert on public.transaction_tags
  for insert
  with check (user_id = auth.uid());

create policy transaction_tags_update on public.transaction_tags
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy transaction_tags_delete on public.transaction_tags
  for delete
  using (user_id = auth.uid());

create policy budgets_select on public.budgets
  for select
  using (user_id = auth.uid());

create policy budgets_insert on public.budgets
  for insert
  with check (user_id = auth.uid());

create policy budgets_update on public.budgets
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy budgets_delete on public.budgets
  for delete
  using (user_id = auth.uid());

create policy asset_snapshots_select on public.asset_snapshots
  for select
  using (user_id = auth.uid());

create policy asset_snapshots_insert on public.asset_snapshots
  for insert
  with check (user_id = auth.uid());

create policy asset_snapshots_update on public.asset_snapshots
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy asset_snapshots_delete on public.asset_snapshots
  for delete
  using (user_id = auth.uid());

create index if not exists transactions_user_occurred_at_idx on public.transactions(user_id, occurred_at desc);
create index if not exists transactions_user_type_occurred_at_idx on public.transactions(user_id, type, occurred_at desc);
create index if not exists transactions_user_category_id_idx on public.transactions(user_id, category_id);

create or replace view public.v_transactions_monthly_totals as
select
  t.user_id,
  date_trunc('month', t.occurred_at)::date as month,
  sum(case when t.type = 'income' then t.amount else 0 end)::numeric(14,2) as income,
  sum(case when t.type = 'expense' then t.amount else 0 end)::numeric(14,2) as expense,
  sum(case when t.type = 'transfer' then t.amount else 0 end)::numeric(14,2) as transfer
from public.transactions t
group by t.user_id, date_trunc('month', t.occurred_at)::date;

create or replace view public.v_transactions_monthly_category_expense as
select
  t.user_id,
  date_trunc('month', t.occurred_at)::date as month,
  coalesce(t.category, '未分类') as category,
  sum(t.amount)::numeric(14,2) as expense
from public.transactions t
where t.type = 'expense'
group by t.user_id, date_trunc('month', t.occurred_at)::date, coalesce(t.category, '未分类');
