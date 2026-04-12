-- ================================================================
-- Fix RLS: replace permissive SELECT policies with secure RPCs
-- Anonymous users access data only through SECURITY DEFINER functions
-- which bypass RLS and return only what they're allowed to see.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. lookup_customer_by_phone
--    Returns customer + addresses for one specific phone number.
--    Anonymous users can only fetch their own data by providing
--    the correct phone — they cannot list all customers.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lookup_customer_by_phone(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id        uuid;
  v_phone     text;
  v_name      text;
  v_created   timestamptz;
  v_updated   timestamptz;
  v_addresses jsonb;
BEGIN
  SELECT id, phone, name, created_at, updated_at
  INTO   v_id, v_phone, v_name, v_created, v_updated
  FROM   customers
  WHERE  phone = p_phone;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',           a.id,
        'customer_id',  a.customer_id,
        'label',        COALESCE(a.label, ''),
        'street',       a.street,
        'number',       a.number,
        'neighborhood', a.neighborhood,
        'reference',    COALESCE(a.reference, ''),
        'created_at',   a.created_at
      ) ORDER BY a.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_addresses
  FROM customer_addresses a
  WHERE a.customer_id = v_id;

  RETURN jsonb_build_object(
    'id',         v_id,
    'phone',      v_phone,
    'name',       v_name,
    'created_at', v_created,
    'updated_at', v_updated,
    'addresses',  v_addresses
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_customer_by_phone(text) TO anon, authenticated;

-- ----------------------------------------------------------------
-- 2. upsert_customer
--    Creates or updates a customer and returns the full record
--    with addresses. Replaces the direct upsert + select pattern.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_customer(p_phone text, p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id        uuid;
  v_phone     text;
  v_name      text;
  v_created   timestamptz;
  v_updated   timestamptz;
  v_addresses jsonb;
BEGIN
  INSERT INTO customers (phone, name)
  VALUES (p_phone, p_name)
  ON CONFLICT (phone) DO UPDATE
    SET name = EXCLUDED.name, updated_at = now();

  SELECT id, phone, name, created_at, updated_at
  INTO   v_id, v_phone, v_name, v_created, v_updated
  FROM   customers
  WHERE  phone = p_phone;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',           a.id,
        'customer_id',  a.customer_id,
        'label',        COALESCE(a.label, ''),
        'street',       a.street,
        'number',       a.number,
        'neighborhood', a.neighborhood,
        'reference',    COALESCE(a.reference, ''),
        'created_at',   a.created_at
      ) ORDER BY a.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_addresses
  FROM customer_addresses a
  WHERE a.customer_id = v_id;

  RETURN jsonb_build_object(
    'id',         v_id,
    'phone',      v_phone,
    'name',       v_name,
    'created_at', v_created,
    'updated_at', v_updated,
    'addresses',  v_addresses
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_customer(text, text) TO anon, authenticated;

-- ----------------------------------------------------------------
-- 3. create_order_public
--    Creates an order + items in one call and returns the order.
--    Replaces the direct insert + select pattern used in checkout.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_public(
  p_order_number  text,
  p_customer_name text,
  p_customer_phone text,
  p_street        text,
  p_number        text,
  p_neighborhood  text,
  p_reference     text,
  p_subtotal      numeric,
  p_delivery_fee  numeric,
  p_card_fee      numeric,
  p_total         numeric,
  p_payment_method text,
  p_items         jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_order    orders%ROWTYPE;
  v_item     jsonb;
BEGIN
  INSERT INTO orders (
    order_number, customer_name, customer_phone,
    address_street, address_number, address_neighborhood, address_reference,
    subtotal, delivery_fee, card_fee, total, payment_method, status
  ) VALUES (
    p_order_number, p_customer_name, p_customer_phone,
    p_street, p_number, p_neighborhood, NULLIF(p_reference, ''),
    p_subtotal, p_delivery_fee, p_card_fee, p_total,
    p_payment_method, 'pendente'
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, product_id, product_name, quantity, price, flavor, notes
    ) VALUES (
      v_order_id,
      NULLIF(v_item->>'productId', '')::uuid,
      v_item->>'name',
      (v_item->>'quantity')::int,
      (v_item->>'price')::numeric,
      NULLIF(v_item->>'flavor', ''),
      NULLIF(v_item->>'notes', '')
    );
  END LOOP;

  SELECT * INTO v_order FROM orders WHERE id = v_order_id;

  RETURN row_to_json(v_order)::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_public(text,text,text,text,text,text,text,numeric,numeric,numeric,numeric,text,jsonb) TO anon, authenticated;

-- ----------------------------------------------------------------
-- 4. Remove permissive SELECT policies
-- ----------------------------------------------------------------

-- Customers: anyone was able to read ALL customers
DROP POLICY IF EXISTS "Anyone can view own customer by phone" ON public.customers;

-- Customer addresses: anyone was able to read ALL addresses
DROP POLICY IF EXISTS "Anyone can view addresses" ON public.customer_addresses;

-- Add staff-only SELECT for customer_addresses (admin/dashboard)
CREATE POLICY "Staff can view all addresses"
ON public.customer_addresses FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)    OR
  has_role(auth.uid(), 'operator'::app_role) OR
  has_role(auth.uid(), 'support'::app_role)  OR
  has_role(auth.uid(), 'master'::app_role)
);

-- Orders: anyone was able to read ALL orders
DROP POLICY IF EXISTS "Anyone can view their own new order on insert" ON public.orders;
