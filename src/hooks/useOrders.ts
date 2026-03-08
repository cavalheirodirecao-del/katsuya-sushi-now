import { useState, useCallback } from "react";
import { Order, loadOrders, saveOrder as persistOrder, updateOrderStatus as persistStatus } from "@/data/orders";
import {
  startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, parseISO, isWithinInterval, format
} from "date-fns";

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>(loadOrders);

  const refresh = useCallback(() => setOrders(loadOrders()), []);

  const addOrder = useCallback((order: Order) => {
    persistOrder(order);
    setOrders(loadOrders());
  }, []);

  const updateStatus = useCallback((id: string, status: Order["status"]) => {
    persistStatus(id, status);
    setOrders(loadOrders());
  }, []);

  // Filters
  const today = new Date();

  const filterByRange = useCallback((from: Date, to: Date) => {
    return orders.filter((o) => {
      const d = parseISO(o.date);
      return isWithinInterval(d, { start: from, end: to });
    });
  }, [orders]);

  const ordersToday = filterByRange(startOfDay(today), endOfDay(today));
  const ordersYesterday = filterByRange(startOfDay(subDays(today, 1)), endOfDay(subDays(today, 1)));
  const ordersLast7 = filterByRange(startOfDay(subDays(today, 6)), endOfDay(today));
  const ordersThisMonth = filterByRange(startOfMonth(today), endOfMonth(today));

  // KPIs
  const sumTotal = (list: Order[]) => list.reduce((s, o) => s + o.total, 0);
  const sumSubtotal = (list: Order[]) => list.reduce((s, o) => s + o.subtotal, 0);
  const sumDeliveryFees = (list: Order[]) => list.reduce((s, o) => s + o.deliveryFee, 0);
  const avgTicket = (list: Order[]) => list.length ? sumTotal(list) / list.length : 0;
  const uniqueCustomers = (list: Order[]) => new Set(list.map((o) => o.customerPhone)).size;
  const totalItemsSold = (list: Order[]) => list.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0);

  // Product ranking
  const productRanking = (list: Order[]) => {
    const map = new Map<string, { qty: number; revenue: number }>();
    list.forEach((o) =>
      o.items.forEach((i) => {
        const prev = map.get(i.name) || { qty: 0, revenue: 0 };
        map.set(i.name, { qty: prev.qty + i.quantity, revenue: prev.revenue + i.price * i.quantity });
      })
    );
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty);
  };

  // Top customers
  const topCustomers = (list: Order[]) => {
    const map = new Map<string, { name: string; phone: string; orders: number; total: number }>();
    list.forEach((o) => {
      const prev = map.get(o.customerPhone) || { name: o.customerName, phone: o.customerPhone, orders: 0, total: 0 };
      map.set(o.customerPhone, { ...prev, name: o.customerName, orders: prev.orders + 1, total: prev.total + o.total });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  };

  // Neighborhood stats
  const neighborhoodStats = (list: Order[]) => {
    const map = new Map<string, { orders: number; revenue: number }>();
    list.forEach((o) => {
      const n = o.address.neighborhood;
      const prev = map.get(n) || { orders: 0, revenue: 0 };
      map.set(n, { orders: prev.orders + 1, revenue: prev.revenue + o.total });
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.orders - a.orders);
  };

  // Payment stats
  const paymentStats = (list: Order[]) => {
    const pix = list.filter((o) => o.paymentMethod === "pix");
    const cash = list.filter((o) => o.paymentMethod === "dinheiro");
    return { pix: sumTotal(pix), cash: sumTotal(cash), pixCount: pix.length, cashCount: cash.length };
  };

  // Daily sales for chart
  const dailySales = (days: number) => {
    const result: { date: string; total: number; orders: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(today, i);
      const dayOrders = filterByRange(startOfDay(day), endOfDay(day));
      result.push({
        date: format(day, "dd/MM"),
        total: sumTotal(dayOrders),
        orders: dayOrders.length,
      });
    }
    return result;
  };

  return {
    orders, refresh, addOrder, updateStatus,
    ordersToday, ordersYesterday, ordersLast7, ordersThisMonth,
    filterByRange,
    sumTotal, sumSubtotal, sumDeliveryFees, avgTicket, uniqueCustomers, totalItemsSold,
    productRanking, topCustomers, neighborhoodStats, paymentStats, dailySales,
  };
};
