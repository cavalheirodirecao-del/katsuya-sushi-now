export interface DeliveryZone {
  id: string;
  neighborhood: string;
  reference: string;
  fee: number;
  active: boolean;
}

export const defaultDeliveryZones: DeliveryZone[] = [
  // Centro
  { id: "zona-1", neighborhood: "Centro", reference: "Próximo ao hospital", fee: 5, active: true },
  { id: "zona-2", neighborhood: "Centro", reference: "Próximo ao shopping", fee: 7, active: true },
  { id: "zona-3", neighborhood: "Centro", reference: "Próximo ao fórum", fee: 6, active: true },
  // Indianópolis
  { id: "zona-4", neighborhood: "Indianópolis", reference: "Hospital Unimed", fee: 6, active: true },
  { id: "zona-5", neighborhood: "Indianópolis", reference: "Posto de gasolina", fee: 6, active: true },
  // Maurício de Nassau
  { id: "zona-6", neighborhood: "Maurício de Nassau", reference: "Supermercado", fee: 7, active: true },
  { id: "zona-7", neighborhood: "Maurício de Nassau", reference: "Escola", fee: 7, active: true },
  // Vassoural
  { id: "zona-8", neighborhood: "Vassoural", reference: "Farmácia", fee: 7, active: true },
  // Universitário
  { id: "zona-9", neighborhood: "Universitário", reference: "Faculdade", fee: 8, active: true },
  // São João da Escócia
  { id: "zona-10", neighborhood: "São João da Escócia", reference: "Cartório", fee: 8, active: true },
  // Cidade Jardim
  { id: "zona-11", neighborhood: "Cidade Jardim", reference: "Praça principal", fee: 9, active: true },
];

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
