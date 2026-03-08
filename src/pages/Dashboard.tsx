import { useState, useEffect, useRef, useCallback } from "react";
import { useOrders } from "@/hooks/useOrders";
import { Order, loadOrders } from "@/data/orders";
import Header from "@/components/Header";
import { toast } from "sonner";
import { Lock, TrendingUp, ShoppingBag, Users, MapPin, CreditCard, Download, BarChart3, Package, Crown, Bell, BellOff } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";

const ADMIN_PASS = "katsuya2024";

// Generate notification sound using Web Audio API
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
    // Audio not available
  }
};

const statusLabels: Record<Order["status"], string> = {
  pendente: "⏳ Pendente",
  confirmado: "✅ Confirmado",
  preparando: "🍣 Preparando",
  saiu_entrega: "🛵 Saiu p/ entrega",
  entregue: "📦 Entregue",
  cancelado: "❌ Cancelado",
};

const statusOptions: Order["status"][] = ["pendente", "confirmado", "preparando", "saiu_entrega", "entregue", "cancelado"];

const Dashboard = () => {
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState<"dashboard" | "pedidos" | "produtos" | "clientes" | "bairros" | "pagamentos">("dashboard");
  const [chartDays, setChartDays] = useState(7);
  const [orderFilter, setOrderFilter] = useState<"hoje" | "ontem" | "7dias" | "mes">("hoje");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const {
    orders, refresh,
    ordersToday, ordersYesterday, ordersLast7, ordersThisMonth,
    sumTotal, sumSubtotal, sumDeliveryFees, avgTicket, uniqueCustomers, totalItemsSold,
    productRanking, topCustomers, neighborhoodStats, paymentStats, dailySales, updateStatus,
  } = useOrders();

  // Poll for new orders every 5 seconds
  const lastOrderCountRef = useRef(orders.length);

  useEffect(() => {
    if (!auth) return;

    const interval = setInterval(() => {
      const currentOrders = loadOrders();
      if (currentOrders.length > lastOrderCountRef.current) {
        const newCount = currentOrders.length - lastOrderCountRef.current;
        refresh();
        if (soundEnabled) {
          playNotificationSound();
        }
        toast.success(`🔔 ${newCount} novo(s) pedido(s)!`, { duration: 5000 });
      }
      lastOrderCountRef.current = currentOrders.length;
    }, 5000);

    return () => clearInterval(interval);
  }, [auth, soundEnabled, refresh]);

  if (!auth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card border border-border rounded-xl p-6 w-80 space-y-4">
          <Lock className="h-8 w-8 text-primary mx-auto" />
          <h1 className="font-display text-lg font-bold text-foreground text-center">Dashboard Admin</h1>
          <input
            type="password"
            className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Senha"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { if (pass === ADMIN_PASS) setAuth(true); else toast.error("Senha incorreta"); } }}
          />
          <button onClick={() => { if (pass === ADMIN_PASS) setAuth(true); else toast.error("Senha incorreta"); }} className="w-full gradient-red text-primary-foreground py-3 rounded-lg font-bold">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  const filteredOrders = orderFilter === "hoje" ? ordersToday : orderFilter === "ontem" ? ordersYesterday : orderFilter === "7dias" ? ordersLast7 : ordersThisMonth;
  const chartData = dailySales(chartDays);
  const products = productRanking(ordersThisMonth);
  const customers = topCustomers(ordersThisMonth);
  const neighborhoods = neighborhoodStats(ordersThisMonth);
  const payments = paymentStats(ordersThisMonth);

  const exportCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) { toast.error("Sem dados para exportar"); return; }
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map((row) => headers.map((h) => `"${row[h] ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado!");
  };

  const exportOrders = () => {
    exportCSV(filteredOrders.map((o) => ({
      pedido: o.id, data: format(parseISO(o.date), "dd/MM/yyyy HH:mm"), cliente: o.customerName, telefone: o.customerPhone,
      bairro: o.address.neighborhood, subtotal: o.subtotal.toFixed(2), frete: o.deliveryFee.toFixed(2),
      total: o.total.toFixed(2), pagamento: o.paymentMethod, status: o.status,
    })), "pedidos-katsuya");
  };

  const tabs = [
    { id: "dashboard" as const, label: "📊 Dashboard", icon: BarChart3 },
    { id: "pedidos" as const, label: "📋 Pedidos", icon: ShoppingBag },
    { id: "produtos" as const, label: "🍣 Produtos", icon: Package },
    { id: "clientes" as const, label: "👥 Clientes", icon: Users },
    { id: "bairros" as const, label: "📍 Bairros", icon: MapPin },
    { id: "pagamentos" as const, label: "💳 Pagamentos", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background pb-10">
      <Header />
      <div className="container py-4">
        <h1 className="font-display text-xl font-bold text-foreground mb-4">Dashboard</h1>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? "gradient-red text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div className="space-y-4 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <KPICard icon={<TrendingUp className="h-4 w-4" />} label="Vendas hoje" value={`R$ ${sumTotal(ordersToday).toFixed(2)}`} />
              <KPICard icon={<ShoppingBag className="h-4 w-4" />} label="Pedidos hoje" value={String(ordersToday.length)} />
              <KPICard icon={<TrendingUp className="h-4 w-4" />} label="Vendas no mês" value={`R$ ${sumTotal(ordersThisMonth).toFixed(2)}`} />
              <KPICard icon={<ShoppingBag className="h-4 w-4" />} label="Pedidos no mês" value={String(ordersThisMonth.length)} />
              <KPICard icon={<CreditCard className="h-4 w-4" />} label="Ticket médio" value={`R$ ${avgTicket(ordersThisMonth).toFixed(2)}`} />
              <KPICard icon={<Users className="h-4 w-4" />} label="Clientes únicos" value={String(uniqueCustomers(ordersThisMonth))} />
            </div>

            {/* Daily summary */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-bold text-foreground">Resumo do Dia</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Produtos vendidos</span>
                <span className="text-foreground text-right">{totalItemsSold(ordersToday)}</span>
                <span className="text-muted-foreground">Faturamento produtos</span>
                <span className="text-foreground text-right">R$ {sumSubtotal(ordersToday).toFixed(2)}</span>
                <span className="text-muted-foreground">Taxas entrega</span>
                <span className="text-foreground text-right">R$ {sumDeliveryFees(ordersToday).toFixed(2)}</span>
                <span className="text-muted-foreground font-bold">Total faturamento</span>
                <span className="text-primary text-right font-bold">R$ {sumTotal(ordersToday).toFixed(2)}</span>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-foreground">Vendas por Dia</h3>
                <div className="flex gap-1">
                  {[7, 30].map((d) => (
                    <button key={d} onClick={() => setChartDays(d)}
                      className={`text-xs px-2.5 py-1 rounded-full ${chartDays === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 55%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 55%)" }} />
                  <RechartsTooltip contentStyle={{ background: "hsl(0 0% 11%)", border: "1px solid hsl(0 0% 18%)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="total" fill="hsl(0 80% 50%)" radius={[4, 4, 0, 0]} name="Vendas (R$)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* PEDIDOS */}
        {tab === "pedidos" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex gap-1 overflow-x-auto">
                {([["hoje", "Hoje"], ["ontem", "Ontem"], ["7dias", "7 dias"], ["mes", "Mês"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setOrderFilter(k)}
                    className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap ${orderFilter === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {l}
                  </button>
                ))}
              </div>
              <button onClick={exportOrders} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </div>

            <p className="text-xs text-muted-foreground">{filteredOrders.length} pedido(s) — Total: R$ {sumTotal(filteredOrders).toFixed(2)}</p>

            <div className="space-y-2">
              {filteredOrders.length === 0 && <p className="text-muted-foreground text-center py-8 text-sm">Nenhum pedido neste período.</p>}
              {filteredOrders.map((o) => (
                <div key={o.id} className="bg-card border border-border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">{o.id}</p>
                      <p className="text-sm font-bold text-foreground">{o.customerName}</p>
                      <p className="text-xs text-muted-foreground">{o.customerPhone} — {o.address.neighborhood}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{format(parseISO(o.date), "dd/MM HH:mm")}</p>
                      <p className="text-sm font-bold text-primary">R$ {o.total.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {o.items.map((i, idx) => <span key={idx}>{i.quantity}x {i.name}{idx < o.items.length - 1 ? " · " : ""}</span>)}
                  </div>
                  <div className="flex justify-between items-center">
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value as Order["status"])}
                      className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground"
                    >
                      {statusOptions.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                    </select>
                    <span className="text-xs text-muted-foreground">{o.paymentMethod.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUTOS */}
        {tab === "produtos" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">🏆 Ranking de Produtos (Mês)</h3>
              <button onClick={() => exportCSV(products.map((p) => ({ produto: p.name, quantidade: p.qty, faturamento: p.revenue.toFixed(2) })), "ranking-produtos")}
                className="flex items-center gap-1 text-xs text-primary hover:underline"><Download className="h-3.5 w-3.5" /> CSV</button>
            </div>
            {products.length === 0 && <p className="text-muted-foreground text-center py-8 text-sm">Sem dados.</p>}
            {products.map((p, i) => (
              <div key={p.name} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                <span className={`text-lg font-bold ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>{i + 1}º</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.qty} vendas</p>
                </div>
                <span className="text-sm font-bold text-primary">R$ {p.revenue.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* CLIENTES */}
        {tab === "clientes" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1"><Crown className="h-4 w-4 text-primary" /> Top Clientes (Mês)</h3>
              <button onClick={() => exportCSV(customers.map((c) => ({ nome: c.name, telefone: c.phone, pedidos: c.orders, total: c.total.toFixed(2) })), "top-clientes")}
                className="flex items-center gap-1 text-xs text-primary hover:underline"><Download className="h-3.5 w-3.5" /> CSV</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <KPICard icon={<Users className="h-4 w-4" />} label="Clientes 7 dias" value={String(uniqueCustomers(ordersLast7))} />
              <KPICard icon={<Users className="h-4 w-4" />} label="Clientes mês" value={String(uniqueCustomers(ordersThisMonth))} />
            </div>
            {customers.length === 0 && <p className="text-muted-foreground text-center py-8 text-sm">Sem dados.</p>}
            {customers.map((c, i) => (
              <div key={c.phone} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                <span className={`text-lg font-bold ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>{i + 1}º</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone} — {c.orders} pedidos</p>
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
            <div className="bg-card border border-border rounded-lg p-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground font-bold">
                <span>Frete hoje</span><span>R$ {sumDeliveryFees(ordersToday).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground font-bold">
                <span>Frete mês</span><span>R$ {sumDeliveryFees(ordersThisMonth).toFixed(2)}</span>
              </div>
            </div>
            {neighborhoods.length === 0 && <p className="text-muted-foreground text-center py-8 text-sm">Sem dados.</p>}
            {neighborhoods.map((n) => (
              <div key={n.name} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{n.name}</p>
                  <p className="text-xs text-muted-foreground">{n.orders} pedidos</p>
                </div>
                <span className="text-sm font-bold text-primary">R$ {n.revenue.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* PAGAMENTOS */}
        {tab === "pagamentos" && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-foreground">💳 Por Forma de Pagamento (Mês)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">PIX</p>
                <p className="text-lg font-bold text-primary">R$ {payments.pix.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{payments.pixCount} pedidos</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Dinheiro</p>
                <p className="text-lg font-bold text-foreground">R$ {payments.cash.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{payments.cashCount} pedidos</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const KPICard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-card border border-border rounded-lg p-3">
    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">{icon}<span className="text-xs">{label}</span></div>
    <p className="text-lg font-bold text-foreground">{value}</p>
  </div>
);

export default Dashboard;
