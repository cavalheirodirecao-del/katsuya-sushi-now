import { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useOrdersDB, OrderDB, OrderStatus } from "@/hooks/useOrdersDB";
import { useProductsDB } from "@/hooks/useProductsDB";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { OrderKanban } from "@/components/OrderKanban";
import { StockManager } from "@/components/StockManager";
import { toast } from "sonner";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  MapPin,
  CreditCard,
  Download,
  BarChart3,
  Package,
  Crown,
  Bell,
  BellOff,
  Boxes,
  Loader2,
  LogOut,
  XCircle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";

const playNotificationSound = () => {
  try {
    const ctx = new AudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc1.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(660, ctx.currentTime + 0.3);
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.45);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);
    osc2.start(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 0.6);
    setTimeout(() => ctx.close(), 1000);
  } catch {
    /* Audio not available */
  }
};

const Dashboard = () => {
  const { user, isStaff, loading: authLoading, signOut, canManageProducts } = useAuth();
  const [tab, setTab] = useState<
    "kanban" | "dashboard" | "pedidos" | "estoque" | "clientes" | "bairros" | "pagamentos" | "cancelados"
  >("kanban");
  const [chartDays, setChartDays] = useState(7);
  const [orderFilter, setOrderFilter] = useState<"hoje" | "ontem" | "7dias" | "mes">("hoje");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const {
    orders,
    loading: ordersLoading,
    ordersToday,
    ordersYesterday,
    ordersLast7,
    ordersThisMonth,
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
    updateStatus,
  } = useOrdersDB();

  const { products, loading: productsLoading, updateStock, toggleActive, getLowStock, getOutOfStock } = useProductsDB();

  const lastOrderCountRef = useRef(orders.length);
  useEffect(() => {
    if (!isStaff || ordersLoading) return;
    if (orders.length > lastOrderCountRef.current) {
      const newCount = orders.length - lastOrderCountRef.current;
      if (soundEnabled) playNotificationSound();
      toast.success(`🔔 ${newCount} novo(s) pedido(s)!`, { duration: 5000 });
    }
    lastOrderCountRef.current = orders.length;
  }, [isStaff, soundEnabled, orders.length, ordersLoading]);

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    const success = await updateStatus(id, status);
    if (success) toast.success("Status atualizado!");
    else toast.error("Erro ao atualizar status");
  };

  if (authLoading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  if (!user || !isStaff) return <Navigate to="/login" replace />;

  const filteredOrders =
    orderFilter === "hoje"
      ? ordersToday
      : orderFilter === "ontem"
        ? ordersYesterday
        : orderFilter === "7dias"
          ? ordersLast7
          : ordersThisMonth;

  // Cancelados separados
  const cancelledToday = ordersToday.filter((o) => o.status === "cancelado");
  const cancelledThisMonth = ordersThisMonth.filter((o) => o.status === "cancelado");

  const chartData = dailySales(chartDays);
  const productsStats = productRanking(ordersThisMonth);
  const customers = topCustomers(ordersThisMonth);
  const neighborhoods = neighborhoodStats(ordersThisMonth);
  const payments = paymentStats(ordersThisMonth);

  const pendingCount = orders.filter((o) => o.status === "pendente").length;
  const cancelledTodayCount = cancelledToday.length;
  const lowStockCount = getLowStock().length;
  const outOfStockCount = getOutOfStock().length;

  const exportCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) {
      toast.error("Sem dados para exportar");
      return;
    }
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map((row) => headers.map((h) => `"${row[h] ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado!");
  };

  const exportOrders = () => {
    exportCSV(
      filteredOrders.map((o) => ({
        pedido: o.order_number,
        data: format(parseISO(o.created_at), "dd/MM/yyyy HH:mm"),
        cliente: o.customer_name,
        telefone: o.customer_phone,
        bairro: o.address_neighborhood,
        subtotal: Number(o.subtotal).toFixed(2),
        frete: Number(o.delivery_fee).toFixed(2),
        taxa_cartao: Number(o.card_fee ?? 0).toFixed(2),
        total: Number(o.total).toFixed(2),
        pagamento: o.payment_method,
        status: o.status,
      })),
      "pedidos",
    );
  };

  const tabs = [
    { id: "kanban" as const, label: "📋 Pedidos", badge: pendingCount },
    ...(canManageProducts
      ? [{ id: "estoque" as const, label: "📦 Estoque", badge: outOfStockCount > 0 ? outOfStockCount : lowStockCount }]
      : []),
    { id: "dashboard" as const, label: "📊 Dashboard" },
    { id: "pedidos" as const, label: "📜 Histórico" },
    { id: "clientes" as const, label: "👥 Clientes" },
    { id: "bairros" as const, label: "📍 Bairros" },
    { id: "pagamentos" as const, label: "💳 Pagamentos" },
    { id: "cancelados" as const, label: "❌ Cancelados", badge: cancelledTodayCount },
  ];

  if (ordersLoading || productsLoading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="min-h-screen bg-background pb-10">
      <Header />
      <div className="container py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-xl font-bold text-foreground">Dashboard</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSoundEnabled((prev) => !prev);
                if (!soundEnabled) playNotificationSound();
                toast.success(soundEnabled ? "🔇 Som desativado" : "🔔 Som ativado");
              }}
              className={`p-2 rounded-lg border transition-colors ${soundEnabled ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"}`}
              title={soundEnabled ? "Desativar som" : "Ativar som"}
            >
              {soundEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </button>
            <button
              onClick={() => {
                signOut();
                toast.success("Logout realizado");
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? "gradient-red text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            >
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* KANBAN */}
        {tab === "kanban" && (
          <div className="animate-fade-in">
            <OrderKanban orders={orders.filter((o) => o.status !== "cancelado")} onStatusChange={handleStatusChange} />
          </div>
        )}

        {/* ESTOQUE */}
        {tab === "estoque" && canManageProducts && (
          <div className="animate-fade-in">
            <StockManager products={products} onUpdateStock={updateStock} onToggleActive={toggleActive} />
          </div>
        )}

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <KPICard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Vendas hoje"
                value={`R$ ${sumTotal(ordersToday).toFixed(2)}`}
              />
              <KPICard
                icon={<ShoppingBag className="h-4 w-4" />}
                label="Pedidos hoje"
                value={String(ordersToday.filter((o) => o.status !== "cancelado").length)}
              />
              <KPICard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Vendas no mês"
                value={`R$ ${sumTotal(ordersThisMonth).toFixed(2)}`}
              />
              <KPICard
                icon={<ShoppingBag className="h-4 w-4" />}
                label="Pedidos no mês"
                value={String(ordersThisMonth.filter((o) => o.status !== "cancelado").length)}
              />
              <KPICard
                icon={<CreditCard className="h-4 w-4" />}
                label="Ticket médio"
                value={`R$ ${avgTicket(ordersThisMonth).toFixed(2)}`}
              />
              <KPICard
                icon={<Users className="h-4 w-4" />}
                label="Clientes únicos"
                value={String(uniqueCustomers(ordersThisMonth))}
              />
            </div>

            {/* Faturamento separado - HOJE */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-bold text-foreground">💰 Faturamento de Hoje</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">🛍️ Produtos</span>
                  <span className="text-sm font-semibold text-foreground">
                    R$ {sumSubtotal(ordersToday).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">🛵 Frete</span>
                  <span className="text-sm font-semibold text-foreground">
                    R$ {sumDeliveryFees(ordersToday).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">💳 Taxa Cartão</span>
                  <span className="text-sm font-semibold text-foreground">
                    R$ {sumCardFees(ordersToday).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-bold text-foreground">Total</span>
                  <span className="text-base font-bold text-primary">R$ {sumTotal(ordersToday).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Faturamento separado - MÊS */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-bold text-foreground">📅 Faturamento do Mês</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">🛍️ Produtos</span>
                  <span className="text-sm font-semibold text-foreground">
                    R$ {sumSubtotal(ordersThisMonth).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">🛵 Frete</span>
                  <span className="text-sm font-semibold text-foreground">
                    R$ {sumDeliveryFees(ordersThisMonth).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">💳 Taxa Cartão</span>
                  <span className="text-sm font-semibold text-foreground">
                    R$ {sumCardFees(ordersThisMonth).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-bold text-foreground">Total</span>
                  <span className="text-base font-bold text-primary">R$ {sumTotal(ordersThisMonth).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Gráfico */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-foreground">Vendas por Dia</h3>
                <div className="flex gap-1">
                  {[7, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setChartDays(d)}
                      className={`text-xs px-2.5 py-1 rounded-full ${chartDays === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <RechartsTooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Vendas (R$)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* HISTÓRICO */}
        {tab === "pedidos" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex gap-1 overflow-x-auto">
                {(
                  [
                    ["hoje", "Hoje"],
                    ["ontem", "Ontem"],
                    ["7dias", "7 dias"],
                    ["mes", "Mês"],
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => setOrderFilter(k)}
                    className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap ${orderFilter === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button onClick={exportOrders} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredOrders.length} pedido(s) — Total: R$ {sumTotal(filteredOrders).toFixed(2)}
            </p>
            <div className="space-y-2">
              {filteredOrders.length === 0 && (
                <p className="text-muted-foreground text-center py-8 text-sm">Nenhum pedido neste período.</p>
              )}
              {filteredOrders.map((o) => (
                <OrderHistoryCard key={o.id} order={o} onStatusChange={handleStatusChange} />
              ))}
            </div>
          </div>
        )}

        {/* CLIENTES */}
        {tab === "clientes" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1">
                <Crown className="h-4 w-4 text-primary" /> Top Clientes (Mês)
              </h3>
              <button
                onClick={() =>
                  exportCSV(
                    customers.map((c) => ({
                      nome: c.name,
                      telefone: c.phone,
                      pedidos: c.orders,
                      total: c.total.toFixed(2),
                    })),
                    "top-clientes",
                  )
                }
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <KPICard
                icon={<Users className="h-4 w-4" />}
                label="Clientes 7 dias"
                value={String(uniqueCustomers(ordersLast7))}
              />
              <KPICard
                icon={<Users className="h-4 w-4" />}
                label="Clientes mês"
                value={String(uniqueCustomers(ordersThisMonth))}
              />
            </div>
            {customers.length === 0 && <p className="text-muted-foreground text-center py-8 text-sm">Sem dados.</p>}
            {customers.map((c, i) => (
              <div key={c.phone} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                <span className={`text-lg font-bold ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                  {i + 1}º
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.phone} — {c.orders} pedidos
                  </p>
                </div>
                <span className="text-sm font-bold text-primary">R$ {c.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* BAIRROS */}
        {tab === "bairros" && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-foreground">📍 Pedidos por Bairro (Mês)</h3>

            {/* Totais gerais */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-bold">Frete hoje</span>
                <span className="text-foreground font-bold">R$ {sumDeliveryFees(ordersToday).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-bold">Frete mês</span>
                <span className="text-foreground font-bold">R$ {sumDeliveryFees(ordersThisMonth).toFixed(2)}</span>
              </div>
            </div>

            {/* Header da tabela */}
            {neighborhoods.length > 0 && (
              <div className="grid grid-cols-4 gap-1 px-3 text-xs text-muted-foreground font-bold">
                <span className="col-span-1">Bairro</span>
                <span className="text-center">Pedidos</span>
                <span className="text-right">Produtos</span>
                <span className="text-right">Frete</span>
              </div>
            )}

            {neighborhoods.length === 0 && <p className="text-muted-foreground text-center py-8 text-sm">Sem dados.</p>}

            {neighborhoods.map((n, i) => (
              <div key={n.name} className="bg-card border border-border rounded-lg p-3">
                <div className="grid grid-cols-4 gap-1 items-center">
                  {/* Nome + ranking */}
                  <div className="col-span-1 flex items-center gap-1.5 min-w-0">
                    <span className={`text-xs font-bold shrink-0 ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                      {i + 1}º
                    </span>
                    <p className="text-xs font-medium text-foreground truncate">{n.name}</p>
                  </div>
                  {/* Pedidos */}
                  <div className="text-center">
                    <span className="text-sm font-bold text-foreground">{n.orders}</span>
                  </div>
                  {/* Produtos */}
                  <div className="text-right">
                    <span className="text-xs font-semibold text-foreground">R$ {n.subtotal.toFixed(2)}</span>
                  </div>
                  {/* Frete */}
                  <div className="text-right">
                    <span className="text-xs font-semibold text-primary">R$ {n.deliveryFees.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGAMENTOS */}
        {tab === "pagamentos" && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-foreground">💳 Por Forma de Pagamento (Mês)</h3>
            <div className="grid grid-cols-1 gap-3">
              {/* PIX */}
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-foreground">🟢 PIX</p>
                  <span className="text-xs text-muted-foreground">{payments.pixCount} pedidos</span>
                </div>
                <p className="text-2xl font-bold text-primary">R$ {payments.pix.toFixed(2)}</p>
              </div>

              {/* Dinheiro */}
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-foreground">💵 Dinheiro</p>
                  <span className="text-xs text-muted-foreground">{payments.cashCount} pedidos</span>
                </div>
                <p className="text-2xl font-bold text-foreground">R$ {payments.cash.toFixed(2)}</p>
              </div>

              {/* Cartão */}
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-foreground">💳 Cartão</p>
                  <span className="text-xs text-muted-foreground">{payments.cardCount} pedidos</span>
                </div>
                <p className="text-2xl font-bold text-foreground">R$ {payments.card.toFixed(2)}</p>
                <div className="mt-2 pt-2 border-t border-border flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Taxa cartão arrecadada (6%)</span>
                  <span className="text-sm font-bold text-primary">R$ {payments.cardFees.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CANCELADOS */}
        {tab === "cancelados" && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" /> Pedidos Cancelados
            </h3>

            {/* KPIs cancelados */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-destructive/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Cancelados hoje</p>
                <p className="text-xl font-bold text-destructive">{cancelledToday.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  R$ {cancelledToday.reduce((s, o) => s + Number(o.total), 0).toFixed(2)} perdidos
                </p>
              </div>
              <div className="bg-card border border-destructive/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Cancelados no mês</p>
                <p className="text-xl font-bold text-destructive">{cancelledThisMonth.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  R$ {cancelledThisMonth.reduce((s, o) => s + Number(o.total), 0).toFixed(2)} perdidos
                </p>
              </div>
            </div>

            {/* Lista cancelados */}
            <div className="space-y-2">
              {cancelledThisMonth.length === 0 && (
                <p className="text-muted-foreground text-center py-8 text-sm">✅ Nenhum cancelamento este mês!</p>
              )}
              {cancelledThisMonth.map((o) => (
                <div key={o.id} className="bg-card border border-destructive/20 rounded-lg p-3 space-y-1 opacity-80">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">{o.order_number}</p>
                      <p className="text-sm font-bold text-foreground">{o.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.customer_phone} — {o.address_neighborhood}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{format(parseISO(o.created_at), "dd/MM HH:mm")}</p>
                      <p className="text-sm font-bold text-destructive">R$ {Number(o.total).toFixed(2)}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">
                        ❌ Cancelado
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {o.items?.map((i, idx) => (
                      <span key={idx}>
                        {i.quantity}x {i.product_name}
                        {idx < (o.items?.length || 0) - 1 ? " · " : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const KPICard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-card border border-border rounded-lg p-3">
    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <p className="text-lg font-bold text-foreground">{value}</p>
  </div>
);

const statusLabels: Record<OrderStatus, string> = {
  pendente: "⏳ Pendente",
  confirmado: "✅ Confirmado",
  preparando: "🍣 Preparando",
  saiu_entrega: "🛵 Saiu p/ entrega",
  entregue: "📦 Entregue",
  cancelado: "❌ Cancelado",
};

const statusOptions: OrderStatus[] = ["pendente", "confirmado", "preparando", "saiu_entrega", "entregue", "cancelado"];

const OrderHistoryCard = ({
  order,
  onStatusChange,
}: {
  order: OrderDB;
  onStatusChange: (id: string, status: OrderStatus) => void;
}) => (
  <div
    className={`bg-card border rounded-lg p-3 space-y-2 ${order.status === "cancelado" ? "border-destructive/30 opacity-60" : "border-border"}`}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-mono text-muted-foreground">{order.order_number}</p>
        <p className="text-sm font-bold text-foreground">{order.customer_name}</p>
        <p className="text-xs text-muted-foreground">
          {order.customer_phone} — {order.address_neighborhood}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">{format(parseISO(order.created_at), "dd/MM HH:mm")}</p>
        <p className={`text-sm font-bold ${order.status === "cancelado" ? "text-destructive" : "text-primary"}`}>
          R$ {Number(order.total).toFixed(2)}
        </p>
      </div>
    </div>
    <div className="text-xs text-muted-foreground">
      {order.items?.map((i, idx) => (
        <span key={idx}>
          {i.quantity}x {i.product_name}
          {idx < (order.items?.length || 0) - 1 ? " · " : ""}
        </span>
      ))}
    </div>
    <div className="flex justify-between items-center">
      <select
        value={order.status}
        onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
        className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
      >
        {statusOptions.map((s) => (
          <option key={s} value={s}>
            {statusLabels[s]}
          </option>
        ))}
      </select>
      <div className="text-right">
        <span className="text-xs text-muted-foreground">{order.payment_method.toUpperCase()}</span>
        {Number(order.card_fee ?? 0) > 0 && (
          <p className="text-xs text-muted-foreground">+R$ {Number(order.card_fee).toFixed(2)} taxa</p>
        )}
      </div>
    </div>
  </div>
);

export default Dashboard;
