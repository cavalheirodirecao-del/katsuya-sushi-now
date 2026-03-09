
-- Create neighborhoods table
CREATE TABLE public.neighborhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  zone text NOT NULL DEFAULT '',
  fee numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active neighborhoods" ON public.neighborhoods
  FOR SELECT USING (active = true);

CREATE POLICY "Staff can manage neighborhoods" ON public.neighborhoods
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'master'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'master'));

CREATE POLICY "Staff can view all neighborhoods" ON public.neighborhoods
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'master') OR has_role(auth.uid(), 'operator'));

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL DEFAULT '',
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'master'));

CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger for neighborhoods
CREATE TRIGGER update_neighborhoods_updated_at
  BEFORE UPDATE ON public.neighborhoods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed neighborhoods
INSERT INTO public.neighborhoods (name, zone, fee, active) VALUES
  ('Centro', 'Área 1', 5, true),
  ('Indianópolis', 'Área 1', 6, true),
  ('Maurício de Nassau', 'Área 1', 7, true),
  ('Vassoural', 'Área 2', 7, true),
  ('Universitário', 'Área 2', 8, true),
  ('São João da Escócia', 'Área 2', 8, true),
  ('Cidade Jardim', 'Área 3', 9, true);

-- Update has_role to include master
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update get_user_roles to include master
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(array_agg(role), ARRAY[]::app_role[])
  FROM public.user_roles
  WHERE user_id = _user_id
$$;
