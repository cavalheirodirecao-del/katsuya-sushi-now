import { useState, useEffect } from "react";
import { Product, defaultProducts } from "@/data/products";

const STORAGE_KEY = "katsuya-products";

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // Merge saved state (prices, active status) with default images
      const savedProducts: Product[] = JSON.parse(saved);
      const imageMap = new Map(defaultProducts.map((p) => [p.id, p.image]));
      return savedProducts.map((p) => ({
        ...p,
        image: imageMap.get(p.id) || p.image,
      }));
    }
    return defaultProducts;
  });

  useEffect(() => {
    // Save without image paths (they're module imports, not serializable URLs in some cases)
    const toSave = products.map(({ image, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [products]);

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const addProduct = (product: Product) => {
    setProducts((prev) => [...prev, product]);
  };

  const getByCategory = (cat: string) =>
    products.filter((p) => p.category === cat && p.active);

  return { products, updateProduct, addProduct, getByCategory };
};
