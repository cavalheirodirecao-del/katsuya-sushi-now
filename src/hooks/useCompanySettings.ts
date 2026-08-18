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

// Horário oficial da loja (fuso do restaurante), independente do fuso do aparelho
const STORE_TZ = "America/Sao_Paulo";

function storeNow(): { dayIndex: number; hhmm: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { dayIndex: map[get("weekday")] ?? new Date().getDay(), hhmm: `${hour}:${get("minute")}` };
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TZ }).format(d);
  return fmt(new Date(dateStr)) === fmt(new Date());
}

function timeInSlot(slot: TimeSlot, hhmm: string): boolean {
  if (!slot?.start || !slot?.end) return false;
  // Turno que vira a madrugada (ex.: 18:00 → 02:00)
  if (slot.end <= slot.start) return hhmm >= slot.start || hhmm < slot.end;
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

  // Re-avalia o status a cada 30s (e ao voltar para o app)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setTick((t) => t + 1);
        fetchSettings();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [fetchSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Realtime: qualquer alteração no painel reflete imediatamente nos clientes
  useEffect(() => {
    const channel = supabase
      .channel("company-settings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_settings" },
        () => fetchSettings()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  const isHighDemand = useMemo(() => {
    return settings.high_demand_active && isToday(settings.high_demand_activated_at);
  }, [settings.high_demand_active, settings.high_demand_activated_at, tick]);

  const highDemandMessage = useMemo(() => {
    return settings.high_demand_message || DEFAULT_HIGH_DEMAND_MSG;
  }, [settings.high_demand_message]);

  const isWithinBusinessHours = useMemo(() => {
    const bh = settings.business_hours;
    if (!bh || Object.keys(bh).length === 0) return true; // sem horários = sempre aberto
    const { dayIndex, hhmm } = storeNow();
    const todayKey = JS_DAY_TO_KEY[dayIndex];
    const day = bh[todayKey];
    if (day?.active && (day.slots || []).some((s) => timeInSlot(s, hhmm))) return true;

    // Turno da véspera que atravessa a madrugada (ex.: sáb 18:00 → 02:00)
    const prevKey = JS_DAY_TO_KEY[(dayIndex + 6) % 7];
    const prev = bh[prevKey];
    if (prev?.active) {
      return (prev.slots || []).some(
        (s) => s.start && s.end && s.end <= s.start && hhmm < s.end
      );
    }
    return false;
  }, [settings.business_hours, tick]);


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
