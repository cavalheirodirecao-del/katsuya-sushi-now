import { CartItem } from "@/contexts/CartContext";

export interface Order {
  id: string;
  date: string; // ISO string
  customerName: string;
  customerPhone: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    reference: string;
  };
  items: {
    name: string;
    quantity: number;
    price: number;
    flavor?: string;
    notes?: string;
  }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: "pix" | "dinheiro" | "cartao";
  status: "pendente" | "confirmado" | "preparando" | "saiu_entrega" | "entregue" | "cancelado";
}

const STORAGE_KEY = "katsuya-orders";

export const loadOrders = (): Order[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
};

export const saveOrder = (order: Order): void => {
  const orders = loadOrders();
  orders.unshift(order);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
};

export const updateOrderStatus = (id: string, status: Order["status"]): void => {
  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx >= 0) {
    orders[idx].status = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }
};

export const createOrderFromCheckout = (
  name: string,
  phone: string,
  address: Order["address"],
  items: CartItem[],
  subtotal: number,
  deliveryFee: number,
  total: number,
  paymentMethod: "pix" | "dinheiro" | "cartao",
): Order => {
  return {
    id: `PED-${Date.now().toString(36).toUpperCase()}`,
    date: new Date().toISOString(),
    customerName: name,
    customerPhone: phone,
    address,
    items: items.map((i) => ({
      name: i.product.name,
      quantity: i.quantity,
      price: i.product.price,
      flavor: i.flavor,
      notes: i.notes,
    })),
    subtotal,
    deliveryFee,
    total,
    paymentMethod,
    status: "pendente",
  };
};
