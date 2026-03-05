-- Add asset_class to accounts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'asset_class') THEN
        ALTER TABLE public.accounts ADD COLUMN asset_class text DEFAULT 'other';
        ALTER TABLE public.accounts ADD CONSTRAINT accounts_asset_class_check CHECK (asset_class IN ('equities', 'fixed_income', 'cash', 'real_estate', 'alternatives', 'crypto', 'other'));
    END IF;
END $$;

-- Create fire_settings table
CREATE TABLE IF NOT EXISTS public.fire_settings (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    fire_number numeric(14,2), -- Optional manual override
    withdrawal_rate numeric(4,2) DEFAULT 4.0, -- 4.0%
    expected_return numeric(4,2) DEFAULT 7.0, -- 7.0%
    current_age integer,
    retire_age integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fire_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fire_settings_select ON public.fire_settings;
CREATE POLICY fire_settings_select ON public.fire_settings FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS fire_settings_insert ON public.fire_settings;
CREATE POLICY fire_settings_insert ON public.fire_settings FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS fire_settings_update ON public.fire_settings;
CREATE POLICY fire_settings_update ON public.fire_settings FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS fire_settings_delete ON public.fire_settings;
CREATE POLICY fire_settings_delete ON public.fire_settings FOR DELETE USING (user_id = auth.uid());
