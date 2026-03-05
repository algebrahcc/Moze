
-- 1. 创建周期性交易表 (recurring_transactions)
create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  
  -- 基础交易信息（与 transactions 表对齐）
  type text not null check (type in ('expense','income','transfer')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'CNY',
  category_id uuid references public.categories(id) on delete set null,
  category text,
  note text,
  account_id uuid not null references public.accounts(id) on delete cascade,
  to_account_id uuid references public.accounts(id) on delete cascade,

  -- 周期规则
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  interval integer not null default 1, -- 例如：每 2 周
  start_date date not null,
  next_run_date date not null,
  end_date date, -- 可选，结束日期
  last_run_date date,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    (type <> 'transfer' and to_account_id is null)
    or (type = 'transfer' and to_account_id is not null and to_account_id <> account_id)
  )
);

-- 2. 索引与 RLS
create index if not exists recurring_transactions_user_id_idx on public.recurring_transactions(user_id);
create index if not exists recurring_transactions_next_run_idx on public.recurring_transactions(next_run_date) where is_active = true;

alter table public.recurring_transactions enable row level security;

create policy recurring_select on public.recurring_transactions
  for select using (user_id = auth.uid());

create policy recurring_insert on public.recurring_transactions
  for insert with check (user_id = auth.uid());

create policy recurring_update on public.recurring_transactions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy recurring_delete on public.recurring_transactions
  for delete using (user_id = auth.uid());
