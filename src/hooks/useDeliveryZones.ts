import { useState, useEffect } from "react";
import { DeliveryZone, defaultDeliveryZones } from "@/data/deliveryZones";

const STORAGE_KEY = "katsuya-delivery-zones";

export const useDeliveryZones = () => {
  const [zones, setZones] = useState<DeliveryZone[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultDeliveryZones;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
  }, [zones]);

  const activeZones = zones.filter((z) => z.active);

  const neighborhoods = [...new Set(activeZones.map((z) => z.neighborhood))].sort();

  const getReferencesForNeighborhood = (neighborhood: string) =>
    activeZones.filter((z) => z.neighborhood === neighborhood);

  const findZone = (neighborhood: string, reference: string) =>
    activeZones.find((z) => z.neighborhood === neighborhood && z.reference === reference);

  const updateZone = (id: string, updates: Partial<DeliveryZone>) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...updates } : z)));
  };

  const addZone = (zone: DeliveryZone) => {
    setZones((prev) => [...prev, zone]);
  };

  return { zones, activeZones, neighborhoods, getReferencesForNeighborhood, findZone, updateZone, addZone };
};
