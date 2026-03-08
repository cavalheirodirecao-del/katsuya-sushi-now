import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import { categories } from "@/data/products";
import Header from "@/components/Header";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Lock, MapPin, Plus, Trash2 } from "lucide-react";

const ADMIN_PASS = "katsuya2024";

const Admin = () => {
  const { products, updateProduct } = useProducts();
  const { zones, updateZone, addZone, removeZone, origin } = useDeliveryZones();
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [tab, setTab] = useState<"products" | "zones">("products");

  // New zone form
  const [newZoneName, setNewZoneName] = useState("");
  const [newMaxDist, setNewMaxDist] = useState("");
  const [newFee, setNewFee] = useState("");
  const [newDesc, setNewDesc] = useState("");

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

  const inputClass =
    "w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="min-h-screen bg-background pb-10">
      <Header />
      <div className="container py-4">
        <h1 className="font-display text-xl font-bold text-foreground mb-4">Painel Admin</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("products")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "products" ? "gradient-red text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            🍣 Produtos
          </button>
          <button
            onClick={() => setTab("zones")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "zones" ? "gradient-red text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            🛵 Zonas de Entrega
          </button>
        </div>

        {tab === "products" && (
          <>
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
          </>
        )}

        {tab === "zones" && (
          <div className="space-y-4">
            {/* Origin info */}
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm font-bold text-foreground mb-1">📍 Ponto de origem</p>
              <p className="text-xs text-muted-foreground">{origin.address}, {origin.district} — {origin.city}/{origin.state}</p>
              <p className="text-xs text-muted-foreground">Lat: {origin.lat}, Lng: {origin.lng}</p>
            </div>

            {/* Add new zone */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Adicionar Zona
              </p>
              <input className={inputClass} placeholder="Nome da zona (ex: Área 3)" value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} />
              <input className={inputClass} placeholder="Distância máxima (km)" type="number" step="0.5" value={newMaxDist} onChange={(e) => setNewMaxDist(e.target.value)} />
              <input className={inputClass} placeholder="Taxa de entrega (R$)" type="number" value={newFee} onChange={(e) => setNewFee(e.target.value)} />
              <input className={inputClass} placeholder="Descrição (bairros cobertos)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              <button
                onClick={() => {
                  if (!newZoneName || !newMaxDist || !newFee) {
                    toast.error("Preencha nome, distância e taxa!");
                    return;
                  }
                  addZone({
                    id: `zona-${Date.now()}`,
                    zone: newZoneName,
                    maxDistanceKm: parseFloat(newMaxDist),
                    fee: parseFloat(newFee),
                    description: newDesc,
                    active: true,
                  });
                  setNewZoneName("");
                  setNewMaxDist("");
                  setNewFee("");
                  setNewDesc("");
                  toast.success("Zona adicionada!");
                }}
                className="gradient-red text-primary-foreground rounded-lg py-2 px-4 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Adicionar
              </button>
            </div>

            {/* Zones list */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">Zonas configuradas</h3>
              {zones.sort((a, b) => a.maxDistanceKm - b.maxDistanceKm).map((z) => (
                <div key={z.id} className="bg-card border border-border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{z.zone}</p>
                      <p className="text-xs text-muted-foreground">Até {z.maxDistanceKm} km — {z.description}</p>
                      {editingId === z.id ? (
                        <input
                          type="number"
                          className="mt-1 w-20 bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          onBlur={() => {
                            updateZone(z.id, { fee: parseFloat(editPrice) || z.fee });
                            setEditingId(null);
                            toast.success("Taxa atualizada!");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingId(z.id); setEditPrice(String(z.fee)); }}
                          className="text-xs text-primary hover:underline"
                        >
                          R$ {z.fee.toFixed(2)}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={z.active}
                        onCheckedChange={(checked) => {
                          updateZone(z.id, { active: checked });
                          toast.success(checked ? "Zona ativada" : "Zona desativada");
                        }}
                      />
                      <button onClick={() => { removeZone(z.id); toast.success("Zona removida"); }}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                      </button>
                    </div>
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

export default Admin;
