import { useState, useEffect } from "react";
import { Product, defaultProducts } from "@/data/products";

const STORAGE_KEY = "katsuya-products";

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultProducts;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
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
