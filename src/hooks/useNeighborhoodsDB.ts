import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NeighborhoodDB {
  id: string;
  name: string;
  zone: string;
  fee: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useNeighborhoodsDB = () => {
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodDB[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNeighborhoods = useCallback(async () => {
    const { data, error } = await supabase
      .from("neighborhoods")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching neighborhoods:", error);
      setLoading(false);
      return;
    }

    setNeighborhoods((data as NeighborhoodDB[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNeighborhoods();
  }, [fetchNeighborhoods]);

  const activeNeighborhoods = neighborhoods.filter((n) => n.active);

  return {
    neighborhoods,
    activeNeighborhoods,
    loading,
    refresh: fetchNeighborhoods,
  };
};
