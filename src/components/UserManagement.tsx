import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Edit2, UserX, UserCheck, Loader2, Users, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  active: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  master: "Master",
  admin: "Administrador",
  operator: "Operador",
  support: "Suporte",
};

const ROLE_COLORS: Record<string, string> = {
  master: "bg-primary/20 text-primary",
  admin: "bg-blue-500/20 text-blue-400",
  operator: "bg-green-500/20 text-green-400",
  support: "bg-yellow-500/20 text-yellow-400",
};

export const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("operator");
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "list" },
    });
    if (error) {
      toast.error("Erro ao carregar usuários");
      console.error(error);
    } else {
      setUsers(data.users || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("operator");
    setDialogOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setFormName(u.full_name);
    setFormEmail(u.email);
    setFormPassword("");
    setFormRole(u.roles[0] || "operator");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (editingUser) {
      const { error } = await supabase.functions.invoke("manage-users", {
        body: { action: "update", user_id: editingUser.id, full_name: formName, role: formRole, email: formEmail },
      });
      if (error) {
        toast.error("Erro ao atualizar usuário");
      } else {
        toast.success("Usuário atualizado!");
        await logAudit("update", "user", editingUser.id, `Usuário ${formEmail} atualizado`);
      }
    } else {
      if (!formPassword) {
        toast.error("Senha é obrigatória para novo usuário");
        setSubmitting(false);
        return;
      }
      const { error } = await supabase.functions.invoke("manage-users", {
        body: { action: "create", email: formEmail, password: formPassword, full_name: formName, role: formRole },
      });
      if (error) {
        toast.error("Erro ao criar usuário");
      } else {
        toast.success("Usuário criado!");
        await logAudit("create", "user", "", `Novo usuário ${formEmail} criado como ${ROLE_LABELS[formRole]}`);
      }
    }

    setSubmitting(false);
    setDialogOpen(false);
    fetchUsers();
  };

  const toggleActive = async (u: AdminUser) => {
    const newActive = !u.active;
    const { error } = await supabase.functions.invoke("manage-users", {
      body: { action: "toggle_active", user_id: u.id, active: newActive },
    });
    if (error) {
      toast.error("Erro ao alterar status");
    } else {
      toast.success(newActive ? "Usuário ativado" : "Usuário inativado");
      await logAudit("toggle_active", "user", u.id, `Usuário ${u.email} ${newActive ? "ativado" : "inativado"}`);
      fetchUsers();
    }
  };

  const logAudit = async (action: string, entityType: string, entityId: string, description: string) => {
    if (!user) return;
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_email: user.email || "",
      action,
      entity_type: entityType,
      entity_id: entityId,
      description,
    });
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
          <Users className="h-4 w-4 text-primary" /> Usuários ({users.length})
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button onClick={openCreate} className="gradient-red text-primary-foreground rounded-lg py-2 px-4 text-sm font-medium flex items-center gap-1">
              <Plus className="h-4 w-4" /> Novo Usuário
            </button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Nome</label>
                <input className={inputClass} value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome completo" required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <input className={inputClass} type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@exemplo.com" required />
              </div>
              {!editingUser && (
                <div>
                  <label className="text-xs text-muted-foreground">Senha</label>
                  <input className={inputClass} type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground">Tipo de Acesso</label>
                <select className={inputClass} value={formRole} onChange={(e) => setFormRole(e.target.value)}>
                  <option value="master">Master</option>
                  <option value="admin">Administrador</option>
                  <option value="operator">Operador</option>
                </select>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-bold text-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Permissões</p>
                {formRole === "master" && <p>Acesso total ao sistema, incluindo criar e gerenciar usuários.</p>}
                {formRole === "admin" && <p>Editar produtos, preços, fotos, bairros, zonas de entrega. Visualizar pedidos e dashboard. Não pode gerenciar usuários.</p>}
                {formRole === "operator" && <p>Ver pedidos e atualizar status de pedidos. Não pode alterar produtos, preços ou fretes.</p>}
              </div>
              <button type="submit" disabled={submitting} className="w-full gradient-red text-primary-foreground py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingUser ? "Salvar Alterações" : "Criar Usuário"}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users list */}
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className={`bg-card border border-border rounded-lg p-4 ${!u.active ? "opacity-50" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{u.full_name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                <div className="flex gap-1 mt-1">
                  {u.roles.map((r) => (
                    <span key={r} className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[r] || "bg-muted text-muted-foreground"}`}>
                      {ROLE_LABELS[r] || r}
                    </span>
                  ))}
                  {!u.active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">Inativo</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(u)} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Editar">
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </button>
                {u.id !== user?.id && (
                  <button onClick={() => toggleActive(u)} className="p-2 rounded-lg hover:bg-secondary transition-colors" title={u.active ? "Inativar" : "Ativar"}>
                    {u.active ? <UserX className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4 text-green-400" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManagement;
