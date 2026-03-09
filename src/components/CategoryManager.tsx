import { useState } from "react";
import { CategoryDB, useCategories } from "@/hooks/useCategories";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Tag } from "lucide-react";

interface Props {
  categories: CategoryDB[];
  loading: boolean;
  addCategory: (cat: { name: string; icon: string; sort_order: number }) => Promise<boolean>;
  updateCategory: (id: string, updates: Partial<CategoryDB>) => Promise<boolean>;
}

const CategoryManager = ({ categories, loading, addCategory, updateCategory }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryDB | null>(null);
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("🍽️");
  const [formOrder, setFormOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormIcon("🍽️");
    setFormOrder(String((categories.length + 1) * 10));
    setDialogOpen(true);
  };

  const openEdit = (c: CategoryDB) => {
    setEditing(c);
    setFormName(c.name);
    setFormIcon(c.icon);
    setFormOrder(String(c.sort_order));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }
    setSaving(true);

    if (editing) {
      const ok = await updateCategory(editing.id, {
        name: formName.trim(),
        icon: formIcon,
        sort_order: parseInt(formOrder) || 0,
      });
      if (ok) toast.success("Categoria atualizada!");
      else toast.error("Erro ao atualizar");
    } else {
      const ok = await addCategory({
        name: formName.trim(),
        icon: formIcon,
        sort_order: parseInt(formOrder) || 0,
      });
      if (ok) toast.success("Categoria criada!");
      else toast.error("Erro ao criar");
    }

    setSaving(false);
    setDialogOpen(false);
  };

  const handleToggle = async (c: CategoryDB) => {
    const ok = await updateCategory(c.id, { active: !c.active });
    if (ok) toast.success(c.active ? "Categoria desativada" : "Categoria ativada");
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" /> Categorias ({categories.length})
        </h3>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      <div className="space-y-2">
        {categories.length === 0 && (
          <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma categoria cadastrada</p>
        )}
        {[...categories].sort((a, b) => a.sort_order - b.sort_order).map((c) => (
          <div
            key={c.id}
            className={`bg-card border border-border rounded-lg p-3 flex items-center justify-between gap-2 ${!c.active ? "opacity-50" : ""}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{c.icon}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">Ordem: {c.sort_order}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
              <Switch checked={c.active} onCheckedChange={() => handleToggle(c)} />
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Combos" />
            </div>
            <div className="space-y-1.5">
              <Label>Ícone (emoji)</Label>
              <Input value={formIcon} onChange={(e) => setFormIcon(e.target.value)} placeholder="🍱" />
            </div>
            <div className="space-y-1.5">
              <Label>Ordem de exibição</Label>
              <Input type="number" value={formOrder} onChange={(e) => setFormOrder(e.target.value)} />
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar" : "Criar Categoria"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManager;
