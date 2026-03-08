import { useState, useEffect } from "react";
import {
  DeliveryZone,
  defaultDeliveryZones,
  deliveryOrigin,
  haversineDistance,
  MAX_DELIVERY_DISTANCE_KM,
} from "@/data/deliveryZones";

const STORAGE_KEY = "katsuya-delivery-zones";

export const useDeliveryZones = () => {
  const [zones, setZones] = useState<DeliveryZone[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: if old format (has neighborhood field), reset to new defaults
        if (parsed.length > 0 && "neighborhood" in parsed[0]) {
          return defaultDeliveryZones;
        }
        return parsed;
      } catch {
        return defaultDeliveryZones;
      }
    }
    return defaultDeliveryZones;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
  }, [zones]);

  const activeZones = zones.filter((z) => z.active).sort((a, b) => a.maxDistanceKm - b.maxDistanceKm);

  /**
   * Given customer coordinates, find the matching zone and fee.
   * Returns { zone, fee, distanceKm } or null if out of range.
   */
  const calculateFee = (customerLat: number, customerLng: number) => {
    const dist = haversineDistance(deliveryOrigin.lat, deliveryOrigin.lng, customerLat, customerLng);
    if (dist > MAX_DELIVERY_DISTANCE_KM) return null;

    for (const z of activeZones) {
      if (dist <= z.maxDistanceKm) {
        return { zone: z, fee: z.fee, distanceKm: Math.round(dist * 10) / 10 };
      }
    }
    return null;
  };

  const updateZone = (id: string, updates: Partial<DeliveryZone>) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...updates } : z)));
  };

  const addZone = (zone: DeliveryZone) => {
    setZones((prev) => [...prev, zone]);
  };

  const removeZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
  };

  return { zones, activeZones, calculateFee, updateZone, addZone, removeZone, origin: deliveryOrigin };
};
