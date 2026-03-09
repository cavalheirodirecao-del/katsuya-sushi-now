
-- Company settings table (singleton - only one row)
CREATE TABLE public.company_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL DEFAULT 'Katsuya Sushi Delivery',
    phone text NOT NULL DEFAULT '5581982522785',
    logo_url text,
    address text,
    city text DEFAULT 'Recife',
    state text DEFAULT 'PE',
    description text,
    instagram text,
    facebook text,
    opening_hours text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read company settings (public info)
CREATE POLICY "Anyone can view company settings"
ON public.company_settings
FOR SELECT
USING (true);

-- Only master/admin can update
CREATE POLICY "Staff can manage company settings"
ON public.company_settings
FOR ALL
TO authenticated
USING (
    has_role(auth.uid(), 'master'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
    has_role(auth.uid(), 'master'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
);

-- Insert default row
INSERT INTO public.company_settings (name, phone)
VALUES ('Katsuya Sushi Delivery', '5581982522785');

-- Trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
