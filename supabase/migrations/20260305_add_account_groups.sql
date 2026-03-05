-- 1. 添加 account_group 字段，并设置默认值为 'daily'
-- 约束：必须是 'daily', 'investment', 'fixed', 'liability' 其中之一
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS account_group text NOT NULL DEFAULT 'daily' 
CHECK (account_group IN ('daily', 'investment', 'fixed', 'liability'));

-- 2. 添加信用卡相关字段
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS credit_limit numeric(14,2),
ADD COLUMN IF NOT EXISTS statement_date integer CHECK (statement_date BETWEEN 1 AND 31),
ADD COLUMN IF NOT EXISTS payment_due_date integer CHECK (payment_due_date BETWEEN 1 AND 31);

-- 3. (可选) 刷洗现有数据：将 type='stock' 的账户归入 'investment' 分组
UPDATE public.accounts 
SET account_group = 'investment' 
WHERE type = 'stock' AND account_group = 'daily';

-- 4. (可选) 刷洗现有数据：将 type='credit' 的账户归入 'liability' 分组（如果这就是你的意图）
-- 注意：有些用户可能更愿意把信用卡放在 'daily'，这里根据 Moze 的“负债显性化”设计，建议归入 liability 或 daily 均可。
-- 这里的 SQL 默认不做此操作，让用户手动去设置，或者根据你的业务逻辑解开注释。
-- UPDATE public.accounts SET account_group = 'liability' WHERE type = 'credit' AND account_group = 'daily';
