
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS business_hours jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS high_demand_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS high_demand_message text,
  ADD COLUMN IF NOT EXISTS high_demand_activated_at timestamptz;
