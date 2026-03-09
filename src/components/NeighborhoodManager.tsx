import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Loader2, MapPin, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface NeighborhoodDB {
  id: string;
  name: string;
  zone: string;
  fee: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const NeighborhoodManager = () => {
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NeighborhoodDB | null>(null);

  const [formName, setFormName] = useState("");
  const [formZone, setFormZone] = useState("");
  const [formFee, setFormFee] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchNeighborhoods = useCallback(async () => {
    const { data, error } = await supabase
      .from("neighborhoods")
      .select("*")
      .order("zone", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar bairros");
    }
    setNeighborhoods((data as NeighborhoodDB[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNeighborhoods();
  }, [fetchNeighborhoods]);

  const filtered = neighborhoods.filter((n) =>
    n.name.toLowerCase().includes(search.toLowerCase()) || n.zone.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormZone("");
    setFormFee("");
    setDialogOpen(true);
  };

  const openEdit = (n: NeighborhoodDB) => {
    setEditing(n);
    setFormName(n.name);
    setFormZone(n.zone);
    setFormFee(String(n.fee));
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formFee) {
      toast.error("Preencha nome e taxa");
      return;
    }
    setSubmitting(true);

    if (editing) {
      const { error } = await supabase
        .from("neighborhoods")
        .update({ name: formName, zone: formZone, fee: parseFloat(formFee) })
        .eq("id", editing.id);
      if (error) toast.error("Erro ao atualizar");
      else toast.success("Bairro atualizado!");
    } else {
      const { error } = await supabase
        .from("neighborhoods")
        .insert({ name: formName, zone: formZone, fee: parseFloat(formFee), active: true });
      if (error) toast.error("Erro ao criar bairro");
      else toast.success("Bairro cadastrado!");
    }

    setSubmitting(false);
    setDialogOpen(false);
    fetchNeighborhoods();
  };

  const toggleActive = async (n: NeighborhoodDB) => {
    const { error } = await supabase
      .from("neighborhoods")
      .update({ active: !n.active })
      .eq("id", n.id);
    if (error) toast.error("Erro ao alterar status");
    else toast.success(n.active ? "Bairro inativado" : "Bairro ativado");
    fetchNeighborhoods();
  };

  const inputClass =
    "w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> Bairros ({neighborhoods.length})
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button onClick={openCreate} className="gradient-red text-primary-foreground rounded-lg py-2 px-4 text-sm font-medium flex items-center gap-1">
              <Plus className="h-4 w-4" /> Novo Bairro
            </button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editing ? "Editar Bairro" : "Novo Bairro"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Nome do Bairro</label>
                <input className={inputClass} value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Centro" required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Zona</label>
                <input className={inputClass} value={formZone} onChange={(e) => setFormZone(e.target.value)} placeholder="Ex: Área 1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Taxa de Entrega (R$)</label>
                <input className={inputClass} type="number" step="0.5" value={formFee} onChange={(e) => setFormFee(e.target.value)} placeholder="0.00" required />
              </div>
              <button type="submit" disabled={submitting} className="w-full gradient-red text-primary-foreground py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Salvar" : "Cadastrar"}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Buscar bairro..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>

      {/* Table */}
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Nenhum bairro encontrado</p>}
        {filtered.map((n) => (
          <div key={n.id} className={`bg-card border border-border rounded-lg p-3 flex items-center justify-between gap-2 ${!n.active ? "opacity-50" : ""}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{n.name}</p>
              <p className="text-xs text-muted-foreground">{n.zone || "Sem zona"} — R$ {Number(n.fee).toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(n)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <Edit2 className="h-4 w-4 text-muted-foreground" />
              </button>
              <Switch checked={n.active} onCheckedChange={() => toggleActive(n)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NeighborhoodManager;
