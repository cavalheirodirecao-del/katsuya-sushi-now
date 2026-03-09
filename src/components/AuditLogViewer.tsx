import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, Search } from "lucide-react";
import { format, parseISO } from "date-fns";

interface AuditLog {
  id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: any;
  new_value: any;
  description: string | null;
  created_at: string;
}

export const AuditLogViewer = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) console.error(error);
    setLogs((data as AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filtered = logs.filter(
    (l) =>
      (l.description || "").toLowerCase().includes(search.toLowerCase()) ||
      l.user_email.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" /> Histórico de Alterações
      </h3>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>

      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Nenhum registro encontrado</p>}

      <div className="space-y-2">
        {filtered.map((log) => (
          <div key={log.id} className="bg-card border border-border rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{log.user_email}</p>
              <p className="text-xs text-muted-foreground">{format(parseISO(log.created_at), "dd/MM/yyyy HH:mm")}</p>
            </div>
            <p className="text-sm text-foreground">{log.description || `${log.action} em ${log.entity_type}`}</p>
            {log.old_value && (
              <p className="text-xs text-muted-foreground">De: {JSON.stringify(log.old_value)}</p>
            )}
            {log.new_value && (
              <p className="text-xs text-muted-foreground">Para: {JSON.stringify(log.new_value)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuditLogViewer;
