import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { categories } from "@/data/products";
import Header from "@/components/Header";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Lock } from "lucide-react";

const ADMIN_PASS = "katsuya2024";

const Admin = () => {
  const { products, updateProduct } = useProducts();
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  if (!auth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card border border-border rounded-xl p-6 w-80 space-y-4">
          <div className="flex items-center justify-center">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-lg font-bold text-foreground text-center">Admin</h1>
          <input
            type="password"
            className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Senha"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (pass === ADMIN_PASS) setAuth(true);
                else toast.error("Senha incorreta");
              }
            }}
          />
          <button
            onClick={() => {
              if (pass === ADMIN_PASS) setAuth(true);
              else toast.error("Senha incorreta");
            }}
            className="w-full gradient-red text-primary-foreground py-3 rounded-lg font-bold"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <Header />
      <div className="container py-4">
        <h1 className="font-display text-xl font-bold text-foreground mb-4">Painel Admin</h1>
        {categories.map((cat) => {
          const catProducts = products.filter((p) => p.category === cat.id);
          return (
            <div key={cat.id} className="mb-6">
              <h2 className="text-sm font-bold text-primary mb-2">
                {cat.icon} {cat.name}
              </h2>
              <div className="space-y-2">
                {catProducts.map((p) => (
                  <div key={p.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      {editingId === p.id ? (
                        <input
                          type="number"
                          className="mt-1 w-24 bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          onBlur={() => {
                            updateProduct(p.id, { price: parseFloat(editPrice) || p.price });
                            setEditingId(null);
                            toast.success("Preço atualizado!");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(p.id);
                            setEditPrice(String(p.price));
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          R$ {p.price.toFixed(2)}
                        </button>
                      )}
                    </div>
                    <Switch
                      checked={p.active}
                      onCheckedChange={(checked) => {
                        updateProduct(p.id, { active: checked });
                        toast.success(checked ? "Produto ativado" : "Produto desativado");
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Admin;
