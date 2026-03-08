export interface DeliveryOrigin {
  name: string;
  address: string;
  district: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export interface DeliveryZone {
  id: string;
  zone: string;
  maxDistanceKm: number;
  fee: number;
  description: string;
  active: boolean;
}

export const deliveryOrigin: DeliveryOrigin = {
  name: "Cavalheiro Delivery",
  address: "Rua Carlos Laet, 254 A",
  district: "Indianópolis",
  city: "Caruaru",
  state: "PE",
  lat: -8.2837,
  lng: -35.9725,
};

export const defaultDeliveryZones: DeliveryZone[] = [
  {
    id: "zona-1",
    zone: "Indianópolis",
    maxDistanceKm: 1,
    fee: 8,
    description: "Entrega dentro do bairro Indianópolis",
    active: true,
  },
  {
    id: "zona-2",
    zone: "Área 1",
    maxDistanceKm: 2,
    fee: 10,
    description: "Santa Rosa, São Francisco, Petrópolis, Maurício de Nassau, Vassoural",
    active: true,
  },
  {
    id: "zona-3",
    zone: "Área 2",
    maxDistanceKm: 5,
    fee: 13,
    description: "Kennedy, João Mota, Divinópolis, Centenário, Universitário, Salgado",
    active: true,
  },
];

export const MAX_DELIVERY_DISTANCE_KM = 5;
export const OUT_OF_RANGE_MESSAGE = "Desculpe, ainda não entregamos nessa região.";

// Haversine formula — straight-line distance in km
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const referenceSuggestions = [
  "Hospital",
  "Posto de gasolina",
  "Shopping",
  "Farmácia",
  "Supermercado",
  "Escola",
  "Cartório",
  "Praça",
  "Igreja",
  "Banco",
];
