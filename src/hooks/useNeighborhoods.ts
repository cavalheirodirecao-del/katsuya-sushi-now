import { useState, useEffect } from "react";
import { Neighborhood, defaultNeighborhoods } from "@/data/neighborhoods";

const STORAGE_KEY = "katsuya-neighborhoods";

export const useNeighborhoods = () => {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultNeighborhoods;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(neighborhoods));
  }, [neighborhoods]);

  const updateNeighborhood = (id: string, updates: Partial<Neighborhood>) => {
    setNeighborhoods((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
  };

  const addNeighborhood = (neighborhood: Neighborhood) => {
    setNeighborhoods((prev) => [...prev, neighborhood]);
  };

  const activeNeighborhoods = neighborhoods.filter((n) => n.active);

  return { neighborhoods, activeNeighborhoods, updateNeighborhood, addNeighborhood };
};
