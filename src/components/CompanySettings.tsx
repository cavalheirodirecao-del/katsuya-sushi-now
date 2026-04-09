import { useState, useEffect } from "react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Building2, Phone, MapPin, Instagram, Facebook, Clock, Image, Loader2, Save, AlertTriangle } from "lucide-react";
import BusinessHoursEditor from "@/components/BusinessHoursEditor";
import type { BusinessHours } from "@/hooks/useCompanySettings";

const CompanySettings = () => {
  const { settings, loading, updateSettings } = useCompanySettings();
  const { user } = useAuth();
  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  const set = (key: keyof typeof form, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name || !form.phone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }
    setSaving(true);

    if (user) {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        user_email: user.email || "",
        action: "update",
        entity_type: "company_settings",
        entity_id: settings.id,
        description: "Configurações da empresa atualizadas",
        old_value: { name: settings.name, phone: settings.phone } as any,
        new_value: { name: form.name, phone: form.phone } as any,
      });
    }

    const success = await updateSettings({
      name: form.name,
      phone: form.phone.replace(/\D/g, ""),
      logo_url: form.logo_url || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      description: form.description || null,
      instagram: form.instagram || null,
      facebook: form.facebook || null,
      opening_hours: form.opening_hours || null,
      business_hours: form.business_hours,
      high_demand_active: form.high_demand_active,
      high_demand_message: form.high_demand_message || null,
      high_demand_activated_at: form.high_demand_activated_at,
    });

    setSaving(false);
    if (success) {
      toast.success("Configurações salvas com sucesso!");
    } else {
      toast.error("Erro ao salvar configurações");
    }
  };

  const toggleHighDemand = () => {
    const newVal = !form.high_demand_active;
    set("high_demand_active", newVal);
    set("high_demand_activated_at", newVal ? new Date().toISOString() : null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold text-foreground">Configurações da Empresa</h2>

      {/* Alta Demanda */}
      <section className={`border rounded-xl p-4 space-y-4 ${form.high_demand_active ? "bg-destructive/10 border-destructive/50" : "bg-card border-border"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" /> Alta Demanda
          </div>
          <Switch checked={form.high_demand_active} onCheckedChange={toggleHighDemand} />
        </div>
        {form.high_demand_active && (
          <p className="text-xs text-destructive font-medium">
            ⚠️ Pedidos estão bloqueados! O modo será desativado automaticamente à meia-noite.
          </p>
        )}
        <div className="space-y-1.5">
          <Label>Mensagem para o cliente</Label>
          <Textarea
            value={form.high_demand_message || ""}
            onChange={(e) => set("high_demand_message", e.target.value)}
            placeholder="Por hoje encerramos os pedidos devido à alta demanda. Por favor, volte amanhã."
            rows={2}
          />
          <p className="text-xs text-muted-foreground">Deixe vazio para usar a mensagem padrão.</p>
        </div>
      </section>

      {/* Identidade */}
      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Building2 className="h-4 w-4" /> Identidade
        </div>
        <div className="space-y-1.5">
          <Label>Nome da Empresa *</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Katsuya Sushi Delivery" />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição / Slogan</Label>
          <Textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="Uma breve descrição do seu negócio" rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Image className="h-3.5 w-3.5" /> URL do Logo</Label>
          <Input type="url" value={form.logo_url || ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://exemplo.com/logo.png" />
          {form.logo_url && (
            <div className="w-16 h-16 rounded-lg overflow-hidden border border-border">
              <img src={form.logo_url} alt="Logo preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}
        </div>
      </section>

      {/* Contato */}
      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Phone className="h-4 w-4" /> Contato & WhatsApp
        </div>
        <div className="space-y-1.5">
          <Label>Número WhatsApp para Pedidos *</Label>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="5581999999999 (com DDI e DDD)" />
          <p className="text-xs text-muted-foreground">Formato: código do país + DDD + número</p>
          <div className="flex items-center gap-2 mt-1 p-2 bg-primary/10 border border-primary/30 rounded-lg">
            <Phone className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs text-primary font-medium">Pedidos enviados para: wa.me/{form.phone.replace(/\D/g, "") || "..."}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5" /> Instagram</Label>
          <Input value={form.instagram || ""} onChange={(e) => set("instagram", e.target.value)} placeholder="@seuinstagram" />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Facebook className="h-3.5 w-3.5" /> Facebook</Label>
          <Input value={form.facebook || ""} onChange={(e) => set("facebook", e.target.value)} placeholder="facebook.com/suapagina" />
        </div>
      </section>

      {/* Endereço */}
      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <MapPin className="h-4 w-4" /> Endereço
        </div>
        <div className="space-y-1.5">
          <Label>Endereço Completo</Label>
          <Input value={form.address || ""} onChange={(e) => set("address", e.target.value)} placeholder="Rua, Número — Bairro" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Cidade</Label>
            <Input value={form.city || ""} onChange={(e) => set("city", e.target.value)} placeholder="Recife" />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Input value={form.state || ""} onChange={(e) => set("state", e.target.value)} placeholder="PE" maxLength={2} />
          </div>
        </div>
      </section>

      {/* Horário de Funcionamento */}
      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Clock className="h-4 w-4" /> Horário de Funcionamento
        </div>
        <BusinessHoursEditor
          value={form.business_hours || {}}
          onChange={(v) => set("business_hours", v)}
        />
      </section>

      <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
};

export default CompanySettings;
