import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CompanySettings {
  id: string;
  name: string;
  phone: string;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  instagram: string | null;
  facebook: string | null;
  opening_hours: string | null;
}

const DEFAULT_SETTINGS: CompanySettings = {
  id: "",
  name: "Katsuya Sushi Delivery",
  phone: "5581982522785",
  logo_url: null,
  address: null,
  city: "Recife",
  state: "PE",
  description: null,
  instagram: null,
  facebook: null,
  opening_hours: null,
};

export const useCompanySettings = () => {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("company_settings")
      .select("*")
      .limit(1)
      .single();

    if (!error && data) {
      setSettings(data as CompanySettings);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<CompanySettings>) => {
    const { error } = await supabase
      .from("company_settings" as any)
      .update(updates)
      .eq("id", settings.id);

    if (error) {
      console.error("Error updating company settings:", error);
      return false;
    }
    await fetchSettings();
    return true;
  };

  return { settings, loading, updateSettings, refresh: fetchSettings };
};
