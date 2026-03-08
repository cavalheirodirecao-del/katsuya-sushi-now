export interface Neighborhood {
  id: string;
  name: string;
  fee: number;
  reference?: string;
  active: boolean;
}

export const defaultNeighborhoods: Neighborhood[] = [
  { id: "bairro-1", name: "Centro", fee: 5, active: true },
  { id: "bairro-2", name: "Indianópolis", fee: 6, active: true },
  { id: "bairro-3", name: "Maurício de Nassau", fee: 7, active: true },
  { id: "bairro-4", name: "Vassoural", fee: 7, active: true },
  { id: "bairro-5", name: "Universitário", fee: 8, active: true },
  { id: "bairro-6", name: "São João da Escócia", fee: 8, active: true },
  { id: "bairro-7", name: "Cidade Jardim", fee: 9, active: true },
];
