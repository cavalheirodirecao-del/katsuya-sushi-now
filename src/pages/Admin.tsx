import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useProductsDB } from "@/hooks/useProductsDB";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MapPin, Plus, BarChart3, Loader2, LogOut, Users, MapPinned, Clock, Package } from "lucide-react";
import UserManagement from "@/components/UserManagement";
import NeighborhoodManager from "@/components/NeighborhoodManager";
import AuditLogViewer from "@/components/AuditLogViewer";
import ProductManager from "@/components/ProductManager";

type AdminTab = "products" | "zones" | "neighborhoods" | "users" | "audit";

const Admin = () => {
  const { products, updateProduct, loading, refresh } = useProductsDB();
  const { zones, updateZone, addZone, origin } = useDeliveryZones();
  const {
    user, isStaff, isMaster, loading: authLoading, signOut,
    canManageProducts, canManageZones, canManageNeighborhoods, canManageUsers,
  } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [tab, setTab] = useState<AdminTab>("products");

  // New zone form
  const [newZoneName, setNewZoneName] = useState("");
  const [newMaxDist, setNewMaxDist] = useState("");
  const [newFee, setNewFee] = useState("");
  const [newDesc, setNewDesc] = useState("");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isStaff) {
    return <Navigate to="/login" replace />;
  }

  const inputClass =
    "w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; visible: boolean }[] = [
    { id: "products", label: "Produtos", icon: <Package className="h-4 w-4" />, visible: canManageProducts },
    { id: "zones", label: "Zonas", icon: <MapPin className="h-4 w-4" />, visible: canManageZones },
    { id: "neighborhoods", label: "Bairros", icon: <MapPinned className="h-4 w-4" />, visible: canManageNeighborhoods },
    { id: "users", label: "Usuários", icon: <Users className="h-4 w-4" />, visible: canManageUsers },
    { id: "audit", label: "Histórico", icon: <Clock className="h-4 w-4" />, visible: isMaster },
  ];

  const visibleTabs = tabs.filter((t) => t.visible);

  return (
    <div className="min-h-screen bg-background pb-10">
      <Header />
      <div className="container py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-xl font-bold text-foreground">Sistema de Gestão</h1>
          <button
            onClick={() => { signOut(); toast.success("Logout realizado"); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {visibleTabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t.id ? "gradient-red text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Link to Dashboard */}
        <Link
          to="/dashboard"
          className="flex items-center justify-center gap-2 mb-6 bg-card border border-border rounded-lg py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <BarChart3 className="h-4 w-4" /> Abrir Dashboard de Vendas
        </Link>

        {/* PRODUCTS TAB */}
        {tab === "products" && canManageProducts && (
          <ProductManager products={products} loading={loading} updateProduct={updateProduct} refresh={refresh} />
        )}

        {/* ZONES TAB */}
        {tab === "zones" && canManageZones && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm font-bold text-foreground mb-1">📍 Ponto de origem</p>
              <p className="text-xs text-muted-foreground">{origin.address}, {origin.district} — {origin.city}/{origin.state}</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Adicionar Zona
              </p>
              <input className={inputClass} placeholder="Nome da zona" value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} />
              <input className={inputClass} placeholder="Distância máxima (km)" type="number" step="0.5" value={newMaxDist} onChange={(e) => setNewMaxDist(e.target.value)} />
              <input className={inputClass} placeholder="Taxa de entrega (R$)" type="number" value={newFee} onChange={(e) => setNewFee(e.target.value)} />
              <input className={inputClass} placeholder="Descrição" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              <button
                onClick={async () => {
                  if (!newZoneName || !newMaxDist || !newFee) { toast.error("Preencha nome, distância e taxa!"); return; }
                  await addZone({ zone: newZoneName, max_distance_km: parseFloat(newMaxDist), fee: parseFloat(newFee), description: newDesc, active: true });
                  setNewZoneName(""); setNewMaxDist(""); setNewFee(""); setNewDesc("");
                  toast.success("Zona adicionada!");
                }}
                className="gradient-red text-primary-foreground rounded-lg py-2 px-4 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Adicionar
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">Zonas configuradas</h3>
              {[...zones].sort((a, b) => Number(a.max_distance_km) - Number(b.max_distance_km)).map((z) => (
                <div key={z.id} className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{z.zone}</p>
                      <p className="text-xs text-muted-foreground">Até {z.max_distance_km} km — {z.description}</p>
                      {editingId === z.id ? (
                        <input type="number" className="mt-1 w-20 bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground"
                          value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                          onBlur={() => { updateZone(z.id, { fee: parseFloat(editPrice) || Number(z.fee) }); setEditingId(null); toast.success("Taxa atualizada!"); }}
                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                          autoFocus />
                      ) : (
                        <button onClick={() => { setEditingId(z.id); setEditPrice(String(z.fee)); }} className="text-xs text-primary hover:underline">
                          R$ {Number(z.fee).toFixed(2)}
                        </button>
                      )}
                    </div>
                    <Switch checked={z.active} onCheckedChange={(checked) => { updateZone(z.id, { active: checked }); toast.success(checked ? "Zona ativada" : "Zona desativada"); }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NEIGHBORHOODS TAB */}
        {tab === "neighborhoods" && canManageNeighborhoods && <NeighborhoodManager />}

        {/* USERS TAB */}
        {tab === "users" && canManageUsers && <UserManagement />}

        {/* AUDIT LOG TAB */}
        {tab === "audit" && isMaster && <AuditLogViewer />}
      </div>
    </div>
  );
};

export default Admin;
