import { useState } from "react";
import { OrderDB, OrderStatus } from "@/hooks/useOrdersDB";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, MapPin, Clock, ChevronDown, ChevronUp, Package, MessageCircle, Eye, X, CreditCard, Truck, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderKanbanProps {
  orders: OrderDB[];
  onStatusChange: (id: string, status: OrderStatus) => void;
}

const STATUS_CONFIG: { status: OrderStatus; label: string; emoji: string; color: string }[] = [
  { status: "pendente", label: "Pendente", emoji: "⏳", color: "bg-yellow-500/20 border-yellow-500/50 text-yellow-400" },
  { status: "confirmado", label: "Confirmado", emoji: "✅", color: "bg-green-500/20 border-green-500/50 text-green-400" },
  { status: "preparando", label: "Preparando", emoji: "🍣", color: "bg-blue-500/20 border-blue-500/50 text-blue-400" },
  { status: "saiu_entrega", label: "Em Rota", emoji: "🛵", color: "bg-purple-500/20 border-purple-500/50 text-purple-400" },
  { status: "entregue", label: "Entregue", emoji: "📦", color: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" },
  { status: "cancelado", label: "Cancelado", emoji: "❌", color: "bg-red-500/20 border-red-500/50 text-red-400" },
];

const STATUS_MESSAGES: Record<string, (nome: string, pedido: string) => string> = {
  confirmado: (nome, pedido) => `Olá ${nome}! 😊 Seu pedido *${pedido}* foi *confirmado* e já está sendo preparado com carinho. Em breve sairá para entrega! 🍣`,
  preparando: (nome, pedido) => `Olá ${nome}! 🍣 Seu pedido *${pedido}* está sendo *preparado* agora. Logo logo estará a caminho!`,
  saiu_entrega: (nome, pedido) => `Olá ${nome}! 🛵 Seu pedido *${pedido}* *saiu para entrega* e está a caminho! Fique de olho. 📍`,
  entregue: (nome, pedido) => `Olá ${nome}! 📦 Seu pedido *${pedido}* foi *entregue*! Esperamos que aproveite muito. Obrigado pela preferência! 🙏`,
  cancelado: (nome, pedido) => `Olá ${nome}, infelizmente seu pedido *${pedido}* precisou ser *cancelado*. Entre em contato conosco para mais informações. 😔`,
};

const getWhatsAppMessage = (order: OrderDB, status: OrderStatus): string | null => {
  const fn = STATUS_MESSAGES[status];
  if (!fn) return null;
  return fn(order.customer_name.trim().split(" ")[0], order.order_number);
};

const openWhatsApp = (phone: string, message: string) => {
  const digits = phone.replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/55${digits}?text=${encoded}`, "_blank");
};

const PAYMENT_LABELS: Record<string, string> = { pix: "PIX", dinheiro: "Dinheiro", cartao: "Cartão" };

/* ── Modal de detalhes do pedido ── */
const OrderDetailModal = ({ order, onClose }: { order: OrderDB; onClose: () => void }) => {
  const isRetirada = order.delivery_fee === 0 && order.address_street === "Retirada";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Detalhes do Pedido</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <div className="text-xs text-muted-foreground font-mono">{order.order_number}</div>

        {/* Cliente */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">👤 Cliente</h4>
          <p className="text-sm text-foreground">{order.customer_name}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{order.customer_phone}</p>
        </div>

        {/* Endereço */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">📍 Endereço</h4>
          {isRetirada ? (
            <p className="text-sm text-muted-foreground">Retirada no local</p>
          ) : (
            <>
              <p className="text-sm text-foreground">{order.address_street}, {order.address_number}</p>
              <p className="text-sm text-muted-foreground">{order.address_neighborhood}</p>
              {order.address_reference && <p className="text-sm text-muted-foreground italic">Ref: {order.address_reference}</p>}
            </>
          )}
        </div>

        {/* Itens */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">🍣 Itens</h4>
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-foreground">
                {item.quantity}x {item.product_name}
                {item.flavor && <span className="text-muted-foreground"> ({item.flavor})</span>}
              </span>
              <span className="text-muted-foreground">R$ {(Number(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          {order.items?.filter((i) => i.notes).map((item) => (
            <p key={`n-${item.id}`} className="text-xs text-yellow-400">📝 {item.product_name}: {item.notes}</p>
          ))}
        </div>

        {/* Valores */}
        <div className="border-t border-border pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>R$ {Number(order.subtotal).toFixed(2)}</span></div>
          <div className="flex justify-between text-muted-foreground">
            <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" />Entrega</span>
            <span>{isRetirada ? "Grátis" : `R$ ${Number(order.delivery_fee).toFixed(2)}`}</span>
          </div>
          {Number(order.card_fee ?? 0) > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" />Taxa cartão</span>
              <span>R$ {Number(order.card_fee).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-foreground text-base pt-1 border-t border-border">
            <span>Total</span><span>R$ {Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Pagamento & Status */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />{PAYMENT_LABELS[order.payment_method] || order.payment_method}
          </span>
          <span className="text-sm text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">{format(parseISO(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
        </div>

        {/* Botão WhatsApp */}
        {getWhatsAppMessage(order, order.status) && (
          <button
            onClick={() => openWhatsApp(order.customer_phone, getWhatsAppMessage(order, order.status)!)}
            className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="h-4 w-4" /> Enviar mensagem no WhatsApp
          </button>
        )}
      </div>
    </div>
  );
};

/* ── Card do pedido ── */
const OrderCard = ({ order, onStatusChange }: { order: OrderDB; onStatusChange: (id: string, status: OrderStatus) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const statusConfig = STATUS_CONFIG.find((s) => s.status === order.status)!;

  const nextStatus = (): OrderStatus | null => {
    const flow: OrderStatus[] = ["pendente", "confirmado", "preparando", "saiu_entrega", "entregue"];
    const idx = flow.indexOf(order.status);
    if (idx === -1 || idx === flow.length - 1) return null;
    return flow[idx + 1];
  };

  const next = nextStatus();
  const currentMsg = getWhatsAppMessage(order, order.status);

  return (
    <>
      <div className={cn("bg-card border rounded-lg p-3 space-y-2 transition-all", statusConfig.color.split(" ")[1])}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-mono text-muted-foreground">{order.order_number}</span>
            <h4 className="font-semibold text-foreground text-sm">{order.customer_name}</h4>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-primary">R$ {Number(order.total).toFixed(2)}</span>
            <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
              <Clock className="h-3 w-3" />
              {format(parseISO(order.created_at), "HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Contact & Address */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{order.customer_phone}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{order.address_neighborhood}</p>
        </div>

        {/* Items summary */}
        <div
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between cursor-pointer hover:bg-secondary/50 rounded px-1 py-0.5 -mx-1"
        >
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Package className="h-3 w-3" />
            {order.items?.reduce((sum, i) => sum + i.quantity, 0) || 0} itens
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>

        {expanded && order.items && (
          <div className="border-t border-border pt-2 space-y-1">
            {order.items.map((item) => (
              <div key={item.id} className="text-xs flex justify-between">
                <span className="text-foreground">
                  {item.quantity}x {item.product_name}
                  {item.flavor && <span className="text-muted-foreground"> ({item.flavor})</span>}
                </span>
                <span className="text-muted-foreground">R$ {(Number(item.price) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Botões de ação: Ver pedido + WhatsApp */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setShowDetail(true)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-secondary/80 hover:bg-secondary text-foreground flex items-center justify-center gap-1 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" /> Ver pedido
          </button>
          {currentMsg && (
            <button
              onClick={() => openWhatsApp(order.customer_phone, currentMsg)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-green-600/90 hover:bg-green-600 text-white flex items-center justify-center gap-1 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </button>
          )}
        </div>

        {/* Avançar status */}
        {next && (
          <button
            onClick={() => onStatusChange(order.id, next)}
            className="w-full py-2 rounded-lg text-xs font-bold gradient-red text-primary-foreground transition-transform active:scale-95"
          >
            {STATUS_CONFIG.find((s) => s.status === next)?.emoji} Avançar para {STATUS_CONFIG.find((s) => s.status === next)?.label}
          </button>
        )}

        {order.status !== "cancelado" && order.status !== "entregue" && (
          <button
            onClick={() => onStatusChange(order.id, "cancelado")}
            className="w-full py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Cancelar pedido
          </button>
        )}
      </div>

      {showDetail && <OrderDetailModal order={order} onClose={() => setShowDetail(false)} />}
    </>
  );
};

export const OrderKanban = ({ orders, onStatusChange }: OrderKanbanProps) => {
  const activeStatuses: OrderStatus[] = ["pendente", "confirmado", "preparando", "saiu_entrega"];
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (status: string) => {
    setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  return (
    <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-4 lg:gap-4">
      {activeStatuses.map((status) => {
        const config = STATUS_CONFIG.find((s) => s.status === status)!;
        const statusOrders = orders.filter((o) => o.status === status);
        const isCollapsed = collapsed[status] ?? false;

        return (
          <div key={status} className="space-y-2">
            <button
              onClick={() => toggleCollapse(status)}
              className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-opacity", config.color, isCollapsed && "opacity-60")}
            >
              <span className="font-bold text-sm">{config.emoji} {config.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-background/50 px-2 py-0.5 rounded-full">{statusOrders.length}</span>
                {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </div>
            </button>

            {!isCollapsed && (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-hide">
                {statusOrders.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">Nenhum pedido</p>}
                {statusOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onStatusChange={onStatusChange} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OrderKanban;
