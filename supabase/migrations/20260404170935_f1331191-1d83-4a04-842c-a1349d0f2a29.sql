CREATE POLICY "Anyone can delete addresses"
ON public.customer_addresses
FOR DELETE
USING (true);