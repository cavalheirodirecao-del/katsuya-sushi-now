import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Image mapping for local assets (used when image_url is a relative path)
const localImages: Record<string, string> = {};

// Dynamically import local images
const importLocalImages = async () => {
  const images = import.meta.glob('/src/assets/products/*.jpg', { eager: true }) as Record<string, { default: string }>;
  Object.entries(images).forEach(([path, module]) => {
    const filename = path.split('/').pop();
    if (filename) {
      localImages[`/products/${filename}`] = module.default;
    }
  });
};

// Initialize images
importLocalImages();

export interface ProductDB {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  stock: number; // -1 = unlimited
  active: boolean;
  flavors: string[] | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

// Unified Product type for use in cart and menu (compatible with old Product interface)
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  active: boolean;
  stock: number;
  flavors?: string[];
  image?: string;
}

// Convert ProductDB to Product for cart/menu compatibility
export const toProduct = (p: ProductDB): Product => ({
  id: p.id,
  name: p.name,
  description: p.description || "",
  price: Number(p.price),
  category: p.category,
  active: p.active,
  stock: p.stock,
  flavors: p.flavors || undefined,
  image: p.image_url ? (localImages[p.image_url] || p.image_url) : undefined,
});

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
      setLoading(false);
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

  // Get active products by category (for menu display)
  const getByCategory = (cat: string): Product[] =>
    products
      .filter((p) => p.category === cat && p.active && p.category !== "frete")
      .map(toProduct);

  // Get all active products as Product[] for menu
  const getActiveProducts = (): Product[] =>
    products
      .filter((p) => p.active && p.category !== "frete")
      .map(toProduct);

  const getLowStock = (threshold = 5) =>
    products.filter((p) => p.stock >= 0 && p.stock <= threshold);

  const getOutOfStock = () =>
    products.filter((p) => p.stock === 0);

  // Find product by ID (returns Product for cart compatibility)
  const getProductById = (id: string): Product | undefined => {
    const p = products.find((p) => p.id === id);
    return p ? toProduct(p) : undefined;
  };

  return {
    products,
    loading,
    refresh: fetchProducts,
    updateProduct,
    updateStock,
    toggleActive,
    getByCategory,
    getActiveProducts,
    getLowStock,
    getOutOfStock,
    getProductById,
  };
};
