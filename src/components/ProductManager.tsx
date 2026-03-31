import { useState } from "react";
import { ProductDB, useProductsDB } from "@/hooks/useProductsDB";
import { CategoryDB } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Search, X, ImageIcon, Package } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import { cn } from "@/lib/utils";

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category: string;
  stock: string;
  active: boolean;
  image_url: string;
  flavors: string[];
}

const emptyForm: ProductFormData = {
  name: "",
  description: "",
  price: "",
  category: "",
  stock: "-1",
  active: true,
  image_url: "",
  flavors: [],
};

interface Props {
  products: ProductDB[];
  loading: boolean;
  updateProduct: (id: string, updates: Partial<ProductDB>) => Promise<boolean>;
  refresh: () => Promise<void>;
  categories: CategoryDB[];
}

const ProductManager = ({ products, loading, updateProduct, refresh, categories }: Props) => {
  const getCategorySlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/ç/g, "c");

  const CATEGORIES = categories.map((c) => ({ id: getCategorySlug(c.name), name: c.name }));
  const FILTER_CATEGORIES = [{ id: "all", name: "Todos" }, ...CATEGORIES];
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDB | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [newFlavor, setNewFlavor] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = products.filter((p) => {
    const matchCat = filterCat === "all" || p.category === filterCat;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: ProductDB) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      category: p.category,
      stock: String(p.stock),
      active: p.active,
      image_url: p.image_url || "",
      flavors: p.flavors || [],
    });
    setDialogOpen(true);
  };

  const addFlavor = () => {
    const f = newFlavor.trim();
    if (f && !form.flavors.includes(f)) {
      setForm({ ...form, flavors: [...form.flavors, f] });
      setNewFlavor("");
    }
  };

  const removeFlavor = (flavor: string) => {
    setForm({ ...form, flavors: form.flavors.filter((fl) => fl !== flavor) });
  };

  const logAudit = async (action: string, entityType: string, entityId: string, description: string, oldValue?: any, newValue?: any) => {
    if (!user) return;
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_email: user.email || "",
      action,
      entity_type: entityType,
      entity_id: entityId,
      description,
      old_value: oldValue || null,
      new_value: newValue || null,
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.category || !form.price) {
      toast.error("Preencha nome, categoria e preço");
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      category: form.category,
      stock: parseInt(form.stock),
      active: form.active,
      image_url: form.image_url || null,
      flavors: form.flavors.length > 0 ? form.flavors : null,
    };

    if (editingProduct) {
      // Update
      const success = await updateProduct(editingProduct.id, payload);
      if (success) {
        await logAudit("update", "product", editingProduct.id, `Produto "${form.name}" atualizado`, {
          name: editingProduct.name, price: editingProduct.price, category: editingProduct.category,
        }, { name: payload.name, price: payload.price, category: payload.category });
        toast.success("Produto atualizado!");
      } else {
        toast.error("Erro ao atualizar produto");
      }
    } else {
      // Create
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) {
        toast.error("Erro ao cadastrar: " + error.message);
      } else {
        await logAudit("create", "product", data.id, `Produto "${form.name}" cadastrado`, null, payload);
        toast.success("Produto cadastrado!");
        await refresh();
      }
    }

    setSaving(false);
    setDialogOpen(false);
  };

  const handleToggleActive = async (p: ProductDB) => {
    const newActive = !p.active;
    const success = await updateProduct(p.id, { active: newActive });
    if (success) {
      await logAudit("update", "product", p.id, `Produto "${p.name}" ${newActive ? "ativado" : "desativado"}`, { active: p.active }, { active: newActive });
      toast.success(newActive ? "Produto ativado" : "Produto desativado");
    }
  };

  const getCategoryName = (id: string) => CATEGORIES.find((c) => c.id === id)?.name || id;

  if (loading) {
    return <div className="flex justify-center py-10"><Package className="h-8 w-8 animate-pulse text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-foreground">Gestão de Produtos</h2>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" /> Novo Produto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCat(cat.id)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                filterCat === cat.id ? "gradient-red text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Cards */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhum produto encontrado</p>
        )}
        {filtered.map((p) => (
          <div
            key={p.id}
            className={cn(
              "bg-card border border-border rounded-lg p-3 flex items-center gap-3",
              !p.active && "opacity-50"
            )}
          >
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                {!p.active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{p.description || "Sem descrição"}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-primary">R$ {Number(p.price).toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">• {getCategoryName(p.category)}</span>
                {p.stock >= 0 && <span className="text-xs text-muted-foreground">• Estoque: {p.stock}</span>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => openEdit(p)}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                title="Editar produto"
              >
                <Pencil className="h-4 w-4 text-foreground" />
              </button>
              <Switch
                checked={p.active}
                onCheckedChange={() => handleToggleActive(p)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do produto" />
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição do produto" rows={2} />
            </div>

            {/* Preço e Categoria */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Preço (R$) *</Label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estoque */}
            <div className="space-y-1.5">
              <Label>Estoque (-1 = ilimitado)</Label>
              <Input type="number" min="-1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>

            {/* Ativo */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Produto Ativo</Label>
                <p className="text-xs text-muted-foreground">Inativos não aparecem no cardápio</p>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>

            {/* Imagem */}
            <ImageUpload value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />

            {/* Sabores */}
            <div className="space-y-1.5">
              <Label>Sabores / Opcionais</Label>
              <div className="flex gap-2">
                <Input
                  value={newFlavor}
                  onChange={(e) => setNewFlavor(e.target.value)}
                  placeholder="Adicionar sabor"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFlavor(); } }}
                />
                <Button type="button" size="icon" variant="outline" onClick={addFlavor}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {form.flavors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {form.flavors.map((f) => (
                    <Badge key={f} variant="secondary" className="gap-1">
                      {f}
                      <button type="button" onClick={() => removeFlavor(f)} className="ml-0.5 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? "Salvando..." : editingProduct ? "Salvar Alterações" : "Cadastrar Produto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManager;
