import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomers, CustomerAddress } from "@/hooks/useCustomers";
import { useNeighborhoodsDB } from "@/hooks/useNeighborhoodsDB";
import { useProductsDB, Product } from "@/hooks/useProductsDB";
import { useOrdersDB, PaymentMethod } from "@/hooks/useOrdersDB";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Search, User, Plus, MapPin, Trash2, Minus, Loader2,
  ClipboardEdit, AlertTriangle, Check, Phone, Package,
} from "lucide-react";

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

type CartLine = { product: Product; quantity: number; notes?: string };
type DeliveryMode = "manual" | "retirada";
type CustomerHit = { id: string; name: string; phone: string };

const inputClass =
  "w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

const ManualOrderForm = () => {
  const { user } = useAuth();
  const { currentCustomer, setCurrentCustomer, lookupByPhone, createOrUpdate, addAddress, searchCustomers } =
    useCustomers();
  const { activeNeighborhoods } = useNeighborhoodsDB();
  const { getActiveProducts } = useProductsDB();
  const { createOrder } = useOrdersDB();
  const { isOpen: storeIsOpen } = useCompanySettings();

  // Customer search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerHit[]>([]);
  const [searching, setSearching] = useState(false);

  // New customer form
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // Delivery
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("manual");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "", street: "", number: "", neighborhood: "", reference: "" });
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState("");

  // Items
  const [productQuery, setProductQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);

  // Payment
  const [payment, setPayment] = useState<PaymentMethod>("pix");
  const [submitting, setSubmitting] = useState(false);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const hits = await searchCustomers(q);
      setResults(hits);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, searchCustomers]);

  const selectedNeighborhood = useMemo(
    () => activeNeighborhoods.find((n) => n.id === selectedNeighborhoodId),
    [selectedNeighborhoodId, activeNeighborhoods],
  );

  const products = useMemo(() => getActiveProducts(), [getActiveProducts]);
  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    ).slice(0, 50);
  }, [productQuery, products]);

  const subtotal = cart.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const deliveryFee = deliveryMode === "retirada" ? 0 : Number(selectedNeighborhood?.fee || 0);
  const cardFee = payment === "cartao" ? (subtotal + deliveryFee) * 0.06 : 0;
  const total = subtotal + deliveryFee + cardFee;

  const selectCustomer = async (hit: CustomerHit) => {
    setQuery("");
    setResults([]);
    await lookupByPhone(hit.phone);
  };

  const handleCreateCustomer = async () => {
    const digits = newPhone.replace(/\D/g, "");
    if (!newName.trim() || digits.length < 10) {
      toast.error("Informe nome e telefone válido");
      return;
    }
    const c = await createOrUpdate(digits, newName.trim());
    if (c) {
      toast.success("Cliente cadastrado");
      setShowNewCustomer(false);
      setNewName("");
      setNewPhone("");
    } else {
      toast.error("Erro ao cadastrar cliente");
    }
  };

  const handleAddAddress = async () => {
    if (!currentCustomer) return;
    if (!newAddress.street || !newAddress.number || !newAddress.neighborhood) {
      toast.error("Preencha rua, número e bairro");
      return;
    }
    const ok = await addAddress(currentCustomer.phone, newAddress);
    if (ok) {
      toast.success("Endereço adicionado");
      setShowNewAddress(false);
      setNewAddress({ label: "", street: "", number: "", neighborhood: "", reference: "" });
    }
  };

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.product.id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { product: p, quantity: 1 }];
    });
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.product.id === id ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  };

  const resetForm = () => {
    setCurrentCustomer(null);
    setQuery("");
    setResults([]);
    setDeliveryMode("manual");
    setSelectedAddressId(null);
    setSelectedNeighborhoodId("");
    setCart([]);
    setProductQuery("");
    setPayment("pix");
  };

  const handleSubmit = async () => {
    if (!currentCustomer) {
      toast.error("Selecione um cliente");
      return;
    }
    if (cart.length === 0) {
      toast.error("Adicione ao menos um item");
      return;
    }

    let address = { street: "Retirada no local", number: "-", neighborhood: "Retirada", reference: "" };
    if (deliveryMode === "manual") {
      const sel = currentCustomer.addresses.find((a) => a.id === selectedAddressId);
      if (!sel) {
        toast.error("Selecione um endereço");
        return;
      }
      if (!selectedNeighborhood) {
        toast.error("Selecione o bairro para a taxa de entrega");
        return;
      }
      address = {
        street: sel.street,
        number: sel.number,
        neighborhood: selectedNeighborhood.name,
        reference: sel.reference || "",
      };
    }

    setSubmitting(true);
    try {
      const order = await createOrder(
        currentCustomer.name,
        currentCustomer.phone,
        address,
        cart.map((l) => ({
          productId: l.product.id,
          name: l.product.name,
          quantity: l.quantity,
          price: l.product.price,
          notes: l.notes,
        })),
        subtotal,
        deliveryFee,
        cardFee,
        total,
        payment,
      );

      if (!order) {
        toast.error("Erro ao lançar pedido");
        return;
      }

      // Audit log
      try {
        await supabase.from("audit_logs").insert({
          user_id: user?.id as string,
          user_email: user?.email || "",
          action: "manual_order_created",
          entity_type: "orders",
          entity_id: order.id,
          description: `Pedido ${order.order_number} lançado manualmente por ${user?.email || "operador"}`,
          new_value: { order_number: order.order_number, total, payment } as any,
        });
      } catch (e) {
        console.warn("audit log failed", e);
      }

      toast.success(`Pedido ${order.order_number} lançado!`);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-32">
      {/* Header card */}
      <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
        <ClipboardEdit className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground">
          Use esta tela para registrar pedidos recebidos por <strong className="text-foreground">WhatsApp</strong>,
          telefone ou print. O pedido entra direto no painel como qualquer outro.
        </div>
      </div>

      {!storeIsOpen && (
        <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-200">
            Loja fora do horário ou em alta demanda — confirme o pedido com o cliente antes de lançar.
          </p>
        </div>
      )}

      {/* 1. CLIENTE */}
      <section className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <User className="h-4 w-4 text-primary" /> 1. Cliente
        </h3>

        {currentCustomer ? (
          <div className="bg-secondary/60 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{currentCustomer.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {formatPhone(currentCustomer.phone)}
              </p>
            </div>
            <button
              onClick={() => setCurrentCustomer(null)}
              className="text-xs text-primary hover:underline"
            >
              Trocar
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className={inputClass + " pl-9"}
                placeholder="Buscar por nome ou telefone..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {searching && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Buscando...
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => selectCustomer(r)}
                    className="w-full text-left bg-secondary hover:bg-secondary/70 rounded-lg px-3 py-2 transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPhone(r.phone)}</p>
                  </button>
                ))}
              </div>
            )}

            {!showNewCustomer ? (
              <button
                onClick={() => setShowNewCustomer(true)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Novo cliente
              </button>
            ) : (
              <div className="space-y-2 border-t border-border pt-3">
                <input
                  className={inputClass}
                  placeholder="Nome do cliente"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="Telefone (com DDD)"
                  inputMode="tel"
                  value={formatPhone(newPhone)}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateCustomer}
                    className="flex-1 gradient-red text-primary-foreground rounded-lg py-2 text-sm font-medium"
                  >
                    Cadastrar
                  </button>
                  <button
                    onClick={() => setShowNewCustomer(false)}
                    className="px-3 text-xs text-muted-foreground"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* 2. ENTREGA */}
      {currentCustomer && (
        <section className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> 2. Entrega
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDeliveryMode("manual")}
              className={`rounded-lg py-2 text-sm font-medium border ${
                deliveryMode === "manual"
                  ? "gradient-red text-primary-foreground border-transparent"
                  : "bg-secondary text-secondary-foreground border-border"
              }`}
            >
              Delivery
            </button>
            <button
              onClick={() => setDeliveryMode("retirada")}
              className={`rounded-lg py-2 text-sm font-medium border ${
                deliveryMode === "retirada"
                  ? "gradient-red text-primary-foreground border-transparent"
                  : "bg-secondary text-secondary-foreground border-border"
              }`}
            >
              Retirada
            </button>
          </div>

          {deliveryMode === "manual" && (
            <>
              <div className="space-y-2">
                {currentCustomer.addresses.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum endereço cadastrado.</p>
                )}
                {currentCustomer.addresses.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAddressId(a.id)}
                    className={`w-full text-left rounded-lg p-3 border ${
                      selectedAddressId === a.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary"
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">
                      {a.label || "Endereço"} {selectedAddressId === a.id && <Check className="h-3 w-3 inline text-primary" />}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.street}, {a.number} — {a.neighborhood}
                    </p>
                  </button>
                ))}
              </div>

              {!showNewAddress ? (
                <button
                  onClick={() => setShowNewAddress(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Novo endereço
                </button>
              ) : (
                <div className="space-y-2 border-t border-border pt-3">
                  <input className={inputClass} placeholder="Apelido (Casa, Trabalho...)"
                    value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} />
                  <input className={inputClass} placeholder="Rua"
                    value={newAddress.street} onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })} />
                  <input className={inputClass} placeholder="Número"
                    value={newAddress.number} onChange={(e) => setNewAddress({ ...newAddress, number: e.target.value })} />
                  <input className={inputClass} placeholder="Bairro"
                    value={newAddress.neighborhood} onChange={(e) => setNewAddress({ ...newAddress, neighborhood: e.target.value })} />
                  <input className={inputClass} placeholder="Referência (opcional)"
                    value={newAddress.reference} onChange={(e) => setNewAddress({ ...newAddress, reference: e.target.value })} />
                  <div className="flex gap-2">
                    <button onClick={handleAddAddress} className="flex-1 gradient-red text-primary-foreground rounded-lg py-2 text-sm font-medium">
                      Salvar
                    </button>
                    <button onClick={() => setShowNewAddress(false)} className="px-3 text-xs text-muted-foreground">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Bairro de entrega (taxa)</label>
                <select
                  className={inputClass}
                  value={selectedNeighborhoodId}
                  onChange={(e) => setSelectedNeighborhoodId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {activeNeighborhoods.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} — R$ {Number(n.fee).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </section>
      )}

      {/* 3. ITENS */}
      {currentCustomer && (
        <section className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> 3. Itens
          </h3>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              className={inputClass + " pl-9"}
              placeholder="Buscar produto..."
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-lg p-1">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="w-full text-left bg-secondary hover:bg-secondary/70 rounded-md px-3 py-2 flex items-center justify-between gap-2 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">R$ {p.price.toFixed(2)} · {p.category}</p>
                </div>
                <Plus className="h-4 w-4 text-primary shrink-0" />
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <p className="text-xs text-muted-foreground p-3 text-center">Nenhum produto.</p>
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">Carrinho</p>
              {cart.map((l) => (
                <div key={l.product.id} className="bg-secondary rounded-lg p-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{l.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      R$ {(l.product.price * l.quantity).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => changeQty(l.product.id, -1)}
                      className="h-7 w-7 rounded bg-background border border-border flex items-center justify-center">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{l.quantity}</span>
                    <button onClick={() => changeQty(l.product.id, 1)}
                      className="h-7 w-7 rounded bg-background border border-border flex items-center justify-center">
                      <Plus className="h-3 w-3" />
                    </button>
                    <button onClick={() => changeQty(l.product.id, -l.quantity)}
                      className="h-7 w-7 rounded bg-destructive/20 text-destructive flex items-center justify-center ml-1">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. PAGAMENTO */}
      {currentCustomer && cart.length > 0 && (
        <section className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">4. Pagamento</h3>
          <div className="grid grid-cols-3 gap-2">
            {(["pix", "dinheiro", "cartao"] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setPayment(m)}
                className={`rounded-lg py-2 text-xs font-medium border ${
                  payment === m
                    ? "gradient-red text-primary-foreground border-transparent"
                    : "bg-secondary text-secondary-foreground border-border"
                }`}
              >
                {m === "pix" ? "PIX" : m === "dinheiro" ? "Dinheiro" : "Cartão +6%"}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* RESUMO + LANÇAR */}
      {currentCustomer && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-40">
          <div className="container max-w-2xl mx-auto space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {deliveryMode === "manual" && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Entrega</span><span>R$ {deliveryFee.toFixed(2)}</span>
              </div>
            )}
            {cardFee > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Taxa cartão (6%)</span><span>R$ {cardFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-foreground">
              <span>Total</span><span>R$ {total.toFixed(2)}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full gradient-red text-primary-foreground rounded-lg py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Lançar Pedido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to avoid stale memo deps
function activeNeighborhoodId(id: string, list: { id: string }[]) {
  return list.find((n) => n.id === id)?.id || id;
}

export default ManualOrderForm;
