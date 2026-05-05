CREATE OR REPLACE FUNCTION public.search_customers(p_query text)
RETURNS TABLE(id uuid, name text, phone text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_q   text;
BEGIN
  IF v_uid IS NULL OR NOT (
    public.has_role(v_uid, 'admin'::app_role)
    OR public.has_role(v_uid, 'master'::app_role)
    OR public.has_role(v_uid, 'operator'::app_role)
    OR public.has_role(v_uid, 'support'::app_role)
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_q := '%' || coalesce(trim(p_query), '') || '%';

  RETURN QUERY
    SELECT c.id, c.name, c.phone
    FROM public.customers c
    WHERE c.name ILIKE v_q
       OR c.phone ILIKE '%' || regexp_replace(coalesce(p_query,''), '\D', '', 'g') || '%'
    ORDER BY c.updated_at DESC
    LIMIT 20;
END;
$$;