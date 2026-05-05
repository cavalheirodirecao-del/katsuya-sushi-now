REVOKE EXECUTE ON FUNCTION public.search_customers(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_customers(text) TO authenticated;