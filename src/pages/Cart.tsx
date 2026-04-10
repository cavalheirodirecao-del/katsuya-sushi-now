import { useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, MessageSquare, Clock } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import Header from "@/components/Header";

const Cart = () => {
  const { items, updateQuantity, updateNotes, removeItem, total } = useCart();
  const { isOpen } = useCompanySettings();
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const toggleNotes = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container flex flex-col items-center justify-center py-20 gap-4">
          <ShoppingBag className="h-16 w-16 text-muted-foreground" />
          <p className="text-muted-foreground text-lg">Seu carrinho está vazio</p>
          <Link to="/cardapio" className="gradient-red text-primary-foreground px-6 py-3 rounded-full font-bold">
            Ver Cardápio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />
      <div className="container py-4">
        <h1 className="font-display text-xl font-bold text-foreground mb-4">Carrinho</h1>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.product.id} className="bg-card rounded-lg border border-border p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-foreground text-sm">{item.product.name}</h3>
                  {item.flavor && <p className="text-xs text-muted-foreground">{item.flavor}</p>}
                </div>
                <button onClick={() => removeItem(item.product.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex justify-between items-center mt-3">
                <div className="flex items-center gap-3 bg-secondary rounded-full">
                  <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-2">
                    <Minus className="h-4 w-4 text-foreground" />
                  </button>
                  <span className="text-foreground font-bold text-sm w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-2">
                    <Plus className="h-4 w-4 text-foreground" />
                  </button>
                </div>
                <span className="text-primary font-bold">
                  R$ {(item.product.price * item.quantity).toFixed(2)}
                </span>
              </div>

              {/* Notes toggle */}
              <button
                onClick={() => toggleNotes(item.product.id)}
                className={`mt-2 flex items-center gap-1.5 text-xs transition-colors ${
                  item.notes ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {item.notes ? "Observação adicionada" : "Adicionar observação"}
              </button>

              {expandedNotes.has(item.product.id) && (
                <textarea
                  className="mt-2 w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={2}
                  placeholder="Ex: sem cebolinha, extra cream cheese..."
                  value={item.notes || ""}
                  onChange={(e) => updateNotes(item.product.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 space-y-3">
        <div className="container flex justify-between items-center">
          <span className="text-muted-foreground font-medium">Total</span>
          <span className="text-foreground font-bold text-xl">R$ {total.toFixed(2)}</span>
        </div>
        <div className="container">
          {isOpen ? (
            <Link
              to="/checkout"
              className="block gradient-red text-primary-foreground py-3.5 rounded-full font-bold text-center text-base hover:opacity-90 transition-opacity"
            >
              Finalizar Pedido
            </Link>
          ) : (
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Clock className="h-4 w-4" /> Fora do horário de funcionamento
              </div>
              <div className="block bg-muted text-muted-foreground py-3.5 rounded-full font-bold text-center text-base cursor-not-allowed opacity-60">
                Finalizar Pedido
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;
