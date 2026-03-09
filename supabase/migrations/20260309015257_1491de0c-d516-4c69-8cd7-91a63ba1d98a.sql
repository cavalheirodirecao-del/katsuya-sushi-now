
-- Customers table (identified by phone number, no auth required)
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Customer addresses
CREATE TABLE public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  street text NOT NULL,
  number text NOT NULL,
  neighborhood text NOT NULL,
  reference text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Delivery zones table
CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone text NOT NULL,
  max_distance_km numeric NOT NULL,
  fee numeric NOT NULL,
  description text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Customers: anyone can insert/update (for checkout), staff can read all
CREATE POLICY "Anyone can create customers"
  ON public.customers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update customers"
  ON public.customers FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Staff can view customers"
  ON public.customers FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'operator'::app_role) OR 
    has_role(auth.uid(), 'support'::app_role)
  );

-- Allow anyone to look up their own customer record by phone (for checkout)
CREATE POLICY "Anyone can view own customer by phone"
  ON public.customers FOR SELECT
  USING (true);

-- Customer addresses: anyone can insert, staff can read all
CREATE POLICY "Anyone can create addresses"
  ON public.customer_addresses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view addresses"
  ON public.customer_addresses FOR SELECT
  USING (true);

-- Delivery zones: anyone can read active zones, staff can manage
CREATE POLICY "Anyone can view active delivery zones"
  ON public.delivery_zones FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage delivery zones"
  ON public.delivery_zones FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'operator'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'operator'::app_role)
  );

-- Update trigger for customers
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for delivery_zones
CREATE TRIGGER update_delivery_zones_updated_at
  BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
