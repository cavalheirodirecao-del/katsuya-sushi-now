import { useState } from "react";
import { OrderDB, OrderStatus } from "@/hooks/useOrdersDB";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, MapPin, Clock, ChevronDown, ChevronUp, Package } from "lucide-react";
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

const OrderCard = ({ 
  order, 
  onStatusChange 
}: { 
  order: OrderDB; 
  onStatusChange: (id: string, status: OrderStatus) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIG.find((s) => s.status === order.status)!;

  const nextStatus = (): OrderStatus | null => {
    const flow: OrderStatus[] = ["pendente", "confirmado", "preparando", "saiu_entrega", "entregue"];
    const idx = flow.indexOf(order.status);
    if (idx === -1 || idx === flow.length - 1) return null;
    return flow[idx + 1];
  };

  const next = nextStatus();

  return (
    <div className={cn(
      "bg-card border rounded-lg p-3 space-y-2 transition-all",
      statusConfig.color.split(" ")[1]
    )}>
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
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Phone className="h-3 w-3" />
          {order.customer_phone}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {order.address_neighborhood}
        </p>
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

      {/* Expanded items */}
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
          {order.items.some((i) => i.notes) && (
            <div className="mt-1 pt-1 border-t border-border">
              {order.items.filter((i) => i.notes).map((item) => (
                <p key={item.id} className="text-xs text-yellow-400">📝 {item.product_name}: {item.notes}</p>
              ))}
            </div>
          )}
          <div className="mt-2 pt-1 border-t border-border text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>R$ {Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Entrega</span>
              <span>R$ {Number(order.delivery_fee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-foreground">
              <span>Total</span>
              <span>R$ {Number(order.total).toFixed(2)}</span>
            </div>
          </div>
          <div className="pt-1">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full uppercase font-medium",
              order.payment_method === "pix" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
            )}>
              {order.payment_method}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      {next && (
        <button
          onClick={() => onStatusChange(order.id, next)}
          className="w-full mt-2 py-2 rounded-lg text-xs font-bold gradient-red text-primary-foreground transition-transform active:scale-95"
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
  );
};

export const OrderKanban = ({ orders, onStatusChange }: OrderKanbanProps) => {
  // Mobile: vertical, Desktop: horizontal
  const activeStatuses: OrderStatus[] = ["pendente", "confirmado", "preparando", "saiu_entrega"];

  return (
    <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-4 lg:gap-4">
      {activeStatuses.map((status) => {
        const config = STATUS_CONFIG.find((s) => s.status === status)!;
        const statusOrders = orders.filter((o) => o.status === status);

        return (
          <div key={status} className="space-y-2">
            <div className={cn(
              "flex items-center justify-between px-3 py-2 rounded-lg border",
              config.color
            )}>
              <span className="font-bold text-sm">
                {config.emoji} {config.label}
              </span>
              <span className="text-xs bg-background/50 px-2 py-0.5 rounded-full">
                {statusOrders.length}
              </span>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {statusOrders.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">
                  Nenhum pedido
                </p>
              )}
              {statusOrders.map((order) => (
                <OrderCard key={order.id} order={order} onStatusChange={onStatusChange} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderKanban;
