import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CategoryDB {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCategories = () => {
  const [categories, setCategories] = useState<CategoryDB[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      setLoading(false);
      return;
    }

    setCategories((data as CategoryDB[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const activeCategories = categories.filter((c) => c.active);

  const addCategory = async (cat: { name: string; icon: string; sort_order: number }) => {
    const { error } = await supabase.from("categories").insert(cat);
    if (error) {
      console.error("Error adding category:", error);
      return false;
    }
    await fetchCategories();
    return true;
  };

  const updateCategory = async (id: string, updates: Partial<CategoryDB>) => {
    const { error } = await supabase.from("categories").update(updates).eq("id", id);
    if (error) {
      console.error("Error updating category:", error);
      return false;
    }
    await fetchCategories();
    return true;
  };

  return {
    categories,
    activeCategories,
    loading,
    refresh: fetchCategories,
    addCategory,
    updateCategory,
  };
};
