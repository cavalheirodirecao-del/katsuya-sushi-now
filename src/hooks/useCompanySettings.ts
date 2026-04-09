import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TimeSlot {
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface DaySchedule {
  active: boolean;
  slots: TimeSlot[];
}

export type BusinessHours = Record<string, DaySchedule>;

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
  pix_key: string | null;
  pix_name: string | null;
  pix_bank: string | null;
  business_hours: BusinessHours;
  high_demand_active: boolean;
  high_demand_message: string | null;
  high_demand_activated_at: string | null;
}

export const DAY_KEYS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const;
export const DAY_LABELS: Record<string, string> = {
  seg: "Segunda-feira",
  ter: "Terça-feira",
  qua: "Quarta-feira",
  qui: "Quinta-feira",
  sex: "Sexta-feira",
  sab: "Sábado",
  dom: "Domingo",
};

// JS getDay(): 0=Sun,1=Mon,...6=Sat → map to our keys
const JS_DAY_TO_KEY = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

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
  pix_key: null,
  pix_name: null,
  pix_bank: null,
  business_hours: {},
  high_demand_active: false,
  high_demand_message: null,
  high_demand_activated_at: null,
};

const DEFAULT_HIGH_DEMAND_MSG =
  "Por hoje encerramos os pedidos devido à alta demanda. Por favor, volte amanhã.";

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function timeInSlot(slot: TimeSlot): boolean {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return hhmm >= slot.start && hhmm < slot.end;
}

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
      const s = data as any;
      setSettings({
        ...s,
        business_hours: s.business_hours || {},
        high_demand_active: s.high_demand_active ?? false,
        high_demand_message: s.high_demand_message ?? null,
        high_demand_activated_at: s.high_demand_activated_at ?? null,
      });

      // Auto-reset high demand if activated_at is not today
      if (s.high_demand_active && !isToday(s.high_demand_activated_at)) {
        await (supabase as any)
          .from("company_settings")
          .update({ high_demand_active: false, high_demand_activated_at: null })
          .eq("id", s.id);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const isHighDemand = useMemo(() => {
    return settings.high_demand_active && isToday(settings.high_demand_activated_at);
  }, [settings.high_demand_active, settings.high_demand_activated_at]);

  const highDemandMessage = useMemo(() => {
    return settings.high_demand_message || DEFAULT_HIGH_DEMAND_MSG;
  }, [settings.high_demand_message]);

  const isWithinBusinessHours = useMemo(() => {
    const bh = settings.business_hours;
    if (!bh || Object.keys(bh).length === 0) return true; // no hours configured = always open
    const todayKey = JS_DAY_TO_KEY[new Date().getDay()];
    const day = bh[todayKey];
    if (!day || !day.active) return false;
    return day.slots.some(timeInSlot);
  }, [settings.business_hours]);

  const isOpen = useMemo(() => {
    if (isHighDemand) return false;
    return isWithinBusinessHours;
  }, [isHighDemand, isWithinBusinessHours]);

  const updateSettings = async (updates: Partial<CompanySettings>) => {
    const { error } = await (supabase as any)
      .from("company_settings")
      .update(updates)
      .eq("id", settings.id);

    if (error) {
      console.error("Error updating company settings:", error);
      return false;
    }
    await fetchSettings();
    return true;
  };

  return {
    settings,
    loading,
    updateSettings,
    refresh: fetchSettings,
    isOpen,
    isHighDemand,
    highDemandMessage,
    isWithinBusinessHours,
  };
};
