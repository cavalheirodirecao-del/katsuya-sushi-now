import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/Header";

const Cart = () => {
  const { items, updateQuantity, removeItem, total } = useCart();

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
          <Link
            to="/checkout"
            className="block gradient-red text-primary-foreground py-3.5 rounded-full font-bold text-center text-base hover:opacity-90 transition-opacity"
          >
            Finalizar Pedido
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
