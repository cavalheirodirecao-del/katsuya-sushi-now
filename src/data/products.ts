export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  active: boolean;
  flavors?: string[];
  image?: string;
}

export const defaultProducts: Product[] = [
  // COMBOS
  { id: "combo-1", name: "Combo 1", description: "1 Temaki + 10 Arco-Íris", price: 30, category: "combos", active: true, flavors: ["Salmão empanado", "Camarão empanado", "Kani empanado", "Skin"] },
  { id: "combo-2", name: "Combo 2", description: "1 Temaki + 10 Canapés", price: 30, category: "combos", active: true },
  { id: "combo-3", name: "Combo 3", description: "1 Temaki + 12 Cariocas", price: 30, category: "combos", active: true },
  { id: "combo-4", name: "Combo 4", description: "24 Cariocas — Até 2 sabores", price: 28, category: "combos", active: true },
  { id: "combo-5", name: "Combo 5", description: "32 sushis: 12 cariocas salmão, 10 hossomakis camarão, 10 arco-íris", price: 39, category: "combos", active: true },
  { id: "combo-6", name: "Combo 6", description: "2 temakis sabores diferentes", price: 34, category: "combos", active: true },
  { id: "combo-7", name: "Combo 7", description: "2 temakis + 12 cariocas salmão", price: 46, category: "combos", active: true },
  { id: "combo-8", name: "Combo 8", description: "3 temakis sabores diferentes", price: 48, category: "combos", active: true },
  { id: "combo-9", name: "Combo 9", description: "4 temakis", price: 64, category: "combos", active: true },
  { id: "combo-10", name: "Combo 10", description: "12 cariocas salmão, 10 canapés salmão, 10 uramakis camarão, 10 arco-íris", price: 50, category: "combos", active: true },
  // PORÇÕES
  { id: "porcao-1", name: "Kani Queijo", description: "6 unidades", price: 15, category: "porcoes", active: true },
  { id: "porcao-2", name: "Canapé", description: "10 unidades", price: 15, category: "porcoes", active: true },
  { id: "porcao-3", name: "Arco-Íris", description: "10 unidades", price: 15, category: "porcoes", active: true },
  { id: "porcao-4", name: "Hossomaki", description: "10 unidades", price: 15, category: "porcoes", active: true },
  { id: "porcao-5", name: "Uramaki", description: "10 unidades", price: 15, category: "porcoes", active: true },
  { id: "porcao-6", name: "Cariocas", description: "12 unidades", price: 15, category: "porcoes", active: true },
  { id: "porcao-7", name: "Temaki", description: "1 unidade", price: 18, category: "porcoes", active: true },
  { id: "porcao-8", name: "Temaki Hot", description: "1 unidade", price: 21, category: "porcoes", active: true },
  { id: "porcao-9", name: "Canapé Especial", description: "Porção especial", price: 20, category: "porcoes", active: true },
  { id: "porcao-10", name: "Sushi Dog", description: "1 unidade", price: 38, category: "porcoes", active: true },
  // BEBIDAS
  { id: "bebida-1", name: "Refrigerante Lata", description: "350ml", price: 5, category: "bebidas", active: true },
  { id: "bebida-2", name: "Refrigerante 1L", description: "1 litro", price: 8, category: "bebidas", active: true },
  { id: "bebida-3", name: "Água", description: "500ml", price: 3, category: "bebidas", active: true },
  { id: "bebida-4", name: "Suco", description: "Natural", price: 7, category: "bebidas", active: true },
  // SOBREMESAS
  { id: "sobremesa-1", name: "Harumaki Doce Chocolate", description: "Harumaki doce de chocolate", price: 10, category: "sobremesas", active: true },
  { id: "sobremesa-2", name: "Harumaki Doce Banana", description: "Harumaki doce de banana", price: 10, category: "sobremesas", active: true },
  // FRETE
  { id: "frete-1", name: "Taxa de Entrega", description: "Entrega em Caruaru", price: 5, category: "frete", active: true },
];

export const categories = [
  { id: "combos", name: "Combos", icon: "🍱" },
  { id: "porcoes", name: "Porções", icon: "🍣" },
  { id: "bebidas", name: "Bebidas", icon: "🥤" },
  { id: "sobremesas", name: "Sobremesas", icon: "🍡" },
  { id: "frete", name: "Frete", icon: "🛵" },
];
