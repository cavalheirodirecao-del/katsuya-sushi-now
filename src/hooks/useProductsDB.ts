import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProductDB {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  stock: number; // -1 = unlimited
  active: boolean;
  flavors: string[];
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useProductsDB = () => {
  const [products, setProducts] = useState<ProductDB[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching products:", error);
      return;
    }

    setProducts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateProduct = async (id: string, updates: Partial<ProductDB>) => {
    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Error updating product:", error);
      return false;
    }

    await fetchProducts();
    return true;
  };

  const updateStock = async (id: string, newStock: number) => {
    return updateProduct(id, { stock: newStock });
  };

  const toggleActive = async (id: string, active: boolean) => {
    return updateProduct(id, { active });
  };

  const getByCategory = (cat: string) =>
    products.filter((p) => p.category === cat && p.active);

  const getLowStock = (threshold = 5) =>
    products.filter((p) => p.stock >= 0 && p.stock <= threshold);

  const getOutOfStock = () =>
    products.filter((p) => p.stock === 0);

  return {
    products,
    loading,
    refresh: fetchProducts,
    updateProduct,
    updateStock,
    toggleActive,
    getByCategory,
    getLowStock,
    getOutOfStock,
  };
};
