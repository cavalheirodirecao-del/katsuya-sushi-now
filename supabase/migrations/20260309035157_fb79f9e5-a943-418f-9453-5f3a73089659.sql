
-- Drop old policy and recreate with master included
DROP POLICY IF EXISTS "Admins and operators can manage products" ON public.products;

CREATE POLICY "Staff can manage products"
ON public.products
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
