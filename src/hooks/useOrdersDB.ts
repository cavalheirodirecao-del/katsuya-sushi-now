import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, parseISO, isWithinInterval, format } from "date-fns";

export type OrderStatus = "pendente" | "confirmado" | "preparando" | "saiu_entrega" | "entregue" | "cancelado";
export type PaymentMethod = "pix" | "dinheiro" | "cartao";

export interface OrderItemDB {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  flavor: string | null;
  notes: string | null;
  created_at: string;
}

export interface OrderDB {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_reference: string | null;
  subtotal: number;
  delivery_fee: number;
  card_fee: number;
  total: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  items?: OrderItemDB[];
}

export const useOrdersDB = () => {
  const [orders, setOrders] = useState<OrderDB[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      return;
    }

    const orderIds = ordersData?.map((o) => o.id) || [];

    if (orderIds.length > 0) {
      const { data: itemsData } = await supabase.from("order_items").select("*").in("order_id", orderIds);

      const itemsByOrder = new Map<string, OrderItemDB[]>();
      itemsData?.forEach((item) => {
        const existing = itemsByOrder.get(item.order_id) || [];
        itemsByOrder.set(item.order_id, [...existing, item as OrderItemDB]);
      });

      const ordersWithItems = ordersData?.map((order) => ({
        ...order,
        card_fee: Number((order as any).card_fee ?? 0),
        items: itemsByOrder.get(order.id) || [],
      })) as OrderDB[];

      setOrders(ordersWithItems);
    } else {
      setOrders([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  const updateStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);

    if (error) {
      console.error("Error updating order status:", error);
      return false;
    }

    await fetchOrders();
    return true;
  };

  const createOrder = async (
    customerName: string,
    customerPhone: string,
    address: {
      street: string;
      number: string;
      neighborhood: string;
      reference?: string;
    },
    items: { productId?: string; name: string; quantity: number; price: number; flavor?: string; notes?: string }[],
    subtotal: number,
    deliveryFee: number,
    cardFee: number,
    total: number,
    paymentMethod: PaymentMethod,
  ): Promise<OrderDB | null> => {
    const orderNumber = `PED-${Date.now().toString(36).toUpperCase()}`;

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: customerName,
        customer_phone: customerPhone,
        address_street: address.street,
        address_number: address.number,
        address_neighborhood: address.neighborhood,
        address_reference: address.reference || null,
        subtotal,
        delivery_fee: deliveryFee,
        card_fee: cardFee,
        total,
        payment_method: paymentMethod,
        status: "pendente" as OrderStatus,
      })
      .select()
      .single();

    if (orderError || !orderData) {
      console.error("Error creating order:", orderError);
      return null;
    }

    const orderItems = items.map((item) => ({
      order_id: orderData.id,
      product_id: item.productId || null,
      product_name: item.name,
      quantity: item.quantity,
      price: item.price,
      flavor: item.flavor || null,
      notes: item.notes || null,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
    }

    return orderData as OrderDB;
  };

  const today = new Date();

  // Offset UTC-3 (Brasil) — converte created_at UTC para horário local BRT
  const toBRT = (utcStr: string): Date => {
    const utc = parseISO(utcStr);
    return new Date(utc.getTime() - 3 * 60 * 60 * 1000);
  };

  const filterByRange = useCallback(
    (from: Date, to: Date) => {
      return orders.filter((o) => {
        const d = toBRT(o.created_at);
        return isWithinInterval(d, { start: from, end: to });
      });
    },
    [orders],
  );

  const filterByStatus = useCallback(
    (status: OrderStatus) => {
      return orders.filter((o) => o.status === status);
    },
    [orders],
  );

  const ordersToday = filterByRange(startOfDay(today), endOfDay(today));
  const ordersYesterday = filterByRange(startOfDay(subDays(today, 1)), endOfDay(subDays(today, 1)));
  const ordersLast7 = filterByRange(startOfDay(subDays(today, 6)), endOfDay(today));
  const ordersThisMonth = filterByRange(startOfMonth(today), endOfMonth(today));

  // KPIs — todos excluem cancelados por padrão
  const active = (list: OrderDB[]) => list.filter((o) => o.status !== "cancelado");

  const sumTotal = (list: OrderDB[]) => active(list).reduce((s, o) => s + Number(o.total), 0);
  const sumSubtotal = (list: OrderDB[]) => active(list).reduce((s, o) => s + Number(o.subtotal), 0);
  const sumDeliveryFees = (list: OrderDB[]) => active(list).reduce((s, o) => s + Number(o.delivery_fee), 0);
  const sumCardFees = (list: OrderDB[]) => active(list).reduce((s, o) => s + Number(o.card_fee ?? 0), 0);
  const avgTicket = (list: OrderDB[]) => (active(list).length ? sumTotal(list) / active(list).length : 0);
  const uniqueCustomers = (list: OrderDB[]) => new Set(active(list).map((o) => o.customer_phone)).size;
  const totalItemsSold = (list: OrderDB[]) =>
    active(list).reduce((s, o) => s + (o.items?.reduce((ss, i) => ss + i.quantity, 0) || 0), 0);

  const productRanking = (list: OrderDB[]) => {
    const map = new Map<string, { qty: number; revenue: number }>();
    active(list).forEach((o) =>
      o.items?.forEach((i) => {
        const prev = map.get(i.product_name) || { qty: 0, revenue: 0 };
        map.set(i.product_name, { qty: prev.qty + i.quantity, revenue: prev.revenue + Number(i.price) * i.quantity });
      }),
    );
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty);
  };

  const topCustomers = (list: OrderDB[]) => {
    const map = new Map<string, { name: string; phone: string; orders: number; total: number }>();
    active(list).forEach((o) => {
      const prev = map.get(o.customer_phone) || { name: o.customer_name, phone: o.customer_phone, orders: 0, total: 0 };
      map.set(o.customer_phone, {
        ...prev,
        name: o.customer_name,
        orders: prev.orders + 1,
        total: prev.total + Number(o.total),
      });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  };

  const neighborhoodStats = (list: OrderDB[]) => {
    const map = new Map<string, { orders: number; revenue: number }>();
    active(list).forEach((o) => {
      const n = o.address_neighborhood;
      const prev = map.get(n) || { orders: 0, revenue: 0 };
      map.set(n, { orders: prev.orders + 1, revenue: prev.revenue + Number(o.total) });
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.orders - a.orders);
  };

  const paymentStats = (list: OrderDB[]) => {
    const activeList = active(list);
    const pix = activeList.filter((o) => o.payment_method === "pix");
    const cash = activeList.filter((o) => o.payment_method === "dinheiro");
    const card = activeList.filter((o) => o.payment_method === "cartao");
    return {
      pix: pix.reduce((s, o) => s + Number(o.total), 0),
      pixCount: pix.length,
      cash: cash.reduce((s, o) => s + Number(o.total), 0),
      cashCount: cash.length,
      card: card.reduce((s, o) => s + Number(o.total), 0),
      cardCount: card.length,
      cardFees: card.reduce((s, o) => s + Number(o.card_fee ?? 0), 0),
    };
  };

  const dailySales = (days: number) => {
    const result: { date: string; total: number; orders: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(today, i);
      const dayOrders = filterByRange(startOfDay(day), endOfDay(day));
      result.push({
        date: format(day, "dd/MM"),
        total: sumTotal(dayOrders),
        orders: active(dayOrders).length,
      });
    }
    return result;
  };

  return {
    orders,
    loading,
    refresh: fetchOrders,
    updateStatus,
    createOrder,
    ordersToday,
    ordersYesterday,
    ordersLast7,
    ordersThisMonth,
    filterByRange,
    filterByStatus,
    sumTotal,
    sumSubtotal,
    sumDeliveryFees,
    sumCardFees,
    avgTicket,
    uniqueCustomers,
    totalItemsSold,
    productRanking,
    topCustomers,
    neighborhoodStats,
    paymentStats,
    dailySales,
  };
};
