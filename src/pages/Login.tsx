import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error("Email ou senha inválidos");
        return;
      }

      // Check if user has admin/operator/support role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Erro ao verificar usuário");
        return;
      }

      const { data: roles } = await supabase.rpc("get_user_roles", { _user_id: user.id });
      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        toast.error("Acesso negado. Usuário sem permissão administrativa.");
        return;
      }

      toast.success("Login realizado!");
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-center">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-display text-lg font-bold text-foreground text-center">Acesso Administrativo</h1>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="admin@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type={showPass ? "text" : "password"}
              className="w-full bg-secondary border border-border rounded-lg pl-10 pr-10 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full gradient-red text-primary-foreground py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Entrar
        </button>
      </form>
    </div>
  );
};

export default Login;
