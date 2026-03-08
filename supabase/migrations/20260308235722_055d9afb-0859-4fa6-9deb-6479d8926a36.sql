-- Products table with stock control
CREATE TABLE public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT -1, -- -1 means unlimited
    active BOOLEAN NOT NULL DEFAULT true,
    flavors TEXT[] DEFAULT ARRAY[]::TEXT[],
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders table
CREATE TABLE public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    address_street TEXT NOT NULL,
    address_number TEXT NOT NULL,
    address_neighborhood TEXT NOT NULL,
    address_reference TEXT,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'dinheiro')),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'preparando', 'saiu_entrega', 'entregue', 'cancelado')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    flavor TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Products: public read, admin/operator write
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
USING (active = true);

CREATE POLICY "Admins and operators can manage products"
ON public.products FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

-- Orders: public insert, admin/operator full access
CREATE POLICY "Anyone can create orders"
ON public.orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff can view all orders"
ON public.orders FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'support'));

CREATE POLICY "Staff can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

-- Order items: follow order permissions
CREATE POLICY "Anyone can create order items"
ON public.order_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff can view order items"
ON public.order_items FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'support'));

-- Function to decrement stock
CREATE OR REPLACE FUNCTION public.decrement_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only decrement if product has limited stock (stock >= 0)
    UPDATE public.products
    SET stock = stock - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.product_id
      AND stock >= 0
      AND stock >= NEW.quantity;
    
    RETURN NEW;
END;
$$;

-- Trigger for auto stock decrement
CREATE TRIGGER on_order_item_created
    AFTER INSERT ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.decrement_stock();

-- Trigger for updated_at
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;