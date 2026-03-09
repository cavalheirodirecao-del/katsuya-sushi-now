import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  deliveryOrigin,
  haversineDistance,
  MAX_DELIVERY_DISTANCE_KM,
} from "@/data/deliveryZones";

export interface DeliveryZoneDB {
  id: string;
  zone: string;
  max_distance_km: number;
  fee: number;
  description: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useDeliveryZones = () => {
  const [zones, setZones] = useState<DeliveryZoneDB[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchZones = useCallback(async () => {
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .order("max_distance_km", { ascending: true });

    if (error) {
      console.error("Error fetching delivery zones:", error);
      setLoading(false);
      return;
    }

    setZones((data || []) as DeliveryZoneDB[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const activeZones = zones
    .filter((z) => z.active)
    .sort((a, b) => Number(a.max_distance_km) - Number(b.max_distance_km));

  const calculateFee = (customerLat: number, customerLng: number) => {
    const dist = haversineDistance(deliveryOrigin.lat, deliveryOrigin.lng, customerLat, customerLng);
    if (dist > MAX_DELIVERY_DISTANCE_KM) return null;

    for (const z of activeZones) {
      if (dist <= Number(z.max_distance_km)) {
        return {
          zone: { zone: z.zone, description: z.description },
          fee: Number(z.fee),
          distanceKm: Math.round(dist * 10) / 10,
        };
      }
    }
    return null;
  };

  const updateZone = async (id: string, updates: Partial<DeliveryZoneDB>) => {
    const { error } = await supabase
      .from("delivery_zones")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Error updating zone:", error);
      return false;
    }

    await fetchZones();
    return true;
  };

  const addZone = async (zone: {
    zone: string;
    max_distance_km: number;
    fee: number;
    description: string;
    active: boolean;
  }) => {
    const { error } = await supabase
      .from("delivery_zones")
      .insert(zone);

    if (error) {
      console.error("Error adding zone:", error);
      return false;
    }

    await fetchZones();
    return true;
  };

  const removeZone = async (id: string) => {
    const { error } = await supabase
      .from("delivery_zones")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error removing zone:", error);
      return false;
    }

    await fetchZones();
    return true;
  };

  return {
    zones,
    activeZones,
    loading,
    calculateFee,
    updateZone,
    addZone,
    removeZone,
    origin: deliveryOrigin,
    refresh: fetchZones,
  };
};
