-- Fix order_items: add master to SELECT policy
DROP POLICY IF EXISTS "Staff can view order items" ON public.order_items;
CREATE POLICY "Staff can view order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'operator'::app_role)
    OR has_role(auth.uid(), 'support'::app_role)
  );

-- Fix orders: add master to SELECT policy
DROP POLICY IF EXISTS "Staff can view all orders" ON public.orders;
CREATE POLICY "Staff can view all orders"
  ON public.orders FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'operator'::app_role)
    OR has_role(auth.uid(), 'support'::app_role)
  );

-- Fix orders: add master to UPDATE policy
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Staff can update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'operator'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'operator'::app_role)
  );