import { useState, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import { useCustomers } from "@/hooks/useCustomers";
import { CustomerAddress } from "@/data/customer";
import { referenceSuggestions } from "@/data/deliveryZones";
import Header from "@/components/Header";
import { toast } from "sonner";
import { MessageCircle, Copy, ChevronDown, User, MapPin, Plus, Check, Phone } from "lucide-react";

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const { neighborhoods, getReferencesForNeighborhood, findZone } = useDeliveryZones();
  const { currentCustomer, lookupByPhone, createOrUpdate, addAddress } = useCustomers();
  const navigate = useNavigate();

  // Step management
  const [step, setStep] = useState<"phone" | "details" | "payment">("phone");

  // Phone step
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [phoneLocked, setPhoneLocked] = useState(false);

  // Address
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "", street: "", number: "", neighborhood: "", reference: "" });

  // Payment
  const [payment, setPayment] = useState<"pix" | "dinheiro">("pix");
  const [changeFor, setChangeFor] = useState("");

  // Reference suggestions filter
  const [showRefSuggestions, setShowRefSuggestions] = useState(false);

  // Derived
  const selectedAddress = useMemo(() => {
    if (selectedAddressId && currentCustomer) {
      return currentCustomer.addresses.find((a) => a.id === selectedAddressId);
    }
    return null;
  }, [selectedAddressId, currentCustomer]);

  const activeNeighborhood = selectedAddress?.neighborhood || newAddress.neighborhood;
  const activeReference = selectedAddress?.reference || newAddress.reference;

  const matchedZone = activeNeighborhood && activeReference ? findZone(activeNeighborhood, activeReference) : null;
  const deliveryFee = matchedZone?.fee || 0;
  const grandTotal = total + deliveryFee;

  const availableReferences = activeNeighborhood ? getReferencesForNeighborhood(activeNeighborhood) : [];

  // Phone lookup
  const handlePhoneLookup = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) {
      toast.error("Telefone inválido! Use DDD + 9 dígitos.");
      return;
    }
    const found = lookupByPhone(digits);
    if (found) {
      setName(found.name);
      toast.success(`Bem-vindo de volta, ${found.name}! 🎉`);
      if (found.addresses.length > 0) {
        setSelectedAddressId(found.addresses[0].id);
      }
    }
    setPhoneLocked(true);
    setStep("details");
  };

  const handleAddNewAddress = () => {
    if (!newAddress.street || !newAddress.number || !newAddress.neighborhood || !newAddress.reference) {
      toast.error("Preencha todos os campos do endereço!");
      return;
    }
    if (!name) {
      toast.error("Informe seu nome!");
      return;
    }

    const digits = phone.replace(/\D/g, "");
    createOrUpdate(digits, name);

    const addr: CustomerAddress = {
      id: `addr-${Date.now()}`,
      label: newAddress.label || `${newAddress.neighborhood}`,
      street: newAddress.street,
      number: newAddress.number,
      neighborhood: newAddress.neighborhood,
      reference: newAddress.reference,
    };

    addAddress(digits, addr);
    setSelectedAddressId(addr.id);
    setShowNewAddress(false);
    setNewAddress({ label: "", street: "", number: "", neighborhood: "", reference: "" });
    toast.success("Endereço salvo! ✅");
  };

  const handleSubmit = () => {
    if (!name) {
      toast.error("Informe seu nome!");
      return;
    }

    const finalAddress = selectedAddress || (showNewAddress ? {
      street: newAddress.street,
      number: newAddress.number,
      neighborhood: newAddress.neighborhood,
      reference: newAddress.reference,
    } : null);

    if (!finalAddress || !finalAddress.street || !finalAddress.neighborhood) {
      toast.error("Selecione ou adicione um endereço!");
      return;
    }
    if (items.length === 0) {
      toast.error("Carrinho vazio!");
      return;
    }

    // Save customer
    const digits = phone.replace(/\D/g, "");
    createOrUpdate(digits, name);

    const itemsText = items
      .map((i) => `${i.quantity}x ${i.product.name}${i.flavor ? ` (${i.flavor})` : ""}${i.notes ? `\n   _Obs: ${i.notes}_` : ""}`)
      .join("\n");

    const paymentText =
      payment === "pix" ? "PIX — Vou enviar o comprovante." : `Dinheiro${changeFor ? ` — Troco para R$ ${changeFor}` : ""}`;

    const message = `*Pedido Katsuya Sushi* 🍣

*Nome:* ${name}
*Telefone:* ${formatPhone(digits)}

*Endereço:*
${finalAddress.street}, ${finalAddress.number}
Bairro: ${finalAddress.neighborhood}
Ponto referência: ${finalAddress.reference}

*Pedido:*
${itemsText}

Subtotal: R$ ${total.toFixed(2)}
Taxa entrega: R$ ${deliveryFee.toFixed(2)}

*Total: R$ ${grandTotal.toFixed(2)}*

*Pagamento:* ${paymentText}`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/5581982522785?text=${encoded}`, "_blank");
    clearCart();
    navigate("/");
    toast.success("Pedido enviado! Verifique o WhatsApp.");
  };

  const inputClass =
    "w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="min-h-screen bg-background pb-10">
      <Header />
      <div className="container py-4 space-y-6">
        <h1 className="font-display text-xl font-bold text-foreground">Finalizar Pedido</h1>

        {/* STEP 1: Phone */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> Identificação
          </h2>
          <div className="flex gap-2">
            <input
              className={`${inputClass} ${phoneLocked ? "opacity-60" : ""}`}
              placeholder="(81) 99999-9999 *"
              value={formatPhone(phone)}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              disabled={phoneLocked}
              inputMode="numeric"
            />
            {!phoneLocked ? (
              <button
                onClick={handlePhoneLookup}
                className="gradient-red text-primary-foreground px-5 rounded-lg font-bold text-sm whitespace-nowrap shrink-0"
              >
                Continuar
              </button>
            ) : (
              <button
                onClick={() => { setPhoneLocked(false); setStep("phone"); }}
                className="bg-secondary text-secondary-foreground px-4 rounded-lg text-sm shrink-0"
              >
                Trocar
              </button>
            )}
          </div>
          {currentCustomer && phoneLocked && (
            <p className="text-xs text-primary">✅ Cliente encontrado: {currentCustomer.name}</p>
          )}
        </div>

        {/* STEP 2: Name + Address */}
        {step !== "phone" && (
          <>
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Seu Nome
              </h2>
              <input
                className={inputClass}
                placeholder="Nome completo *"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-3 animate-fade-in">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Endereço de Entrega
              </h2>

              {/* Saved addresses */}
              {currentCustomer && currentCustomer.addresses.length > 0 && (
                <div className="space-y-2">
                  {currentCustomer.addresses.map((addr) => (
                    <button
                      key={addr.id}
                      onClick={() => {
                        setSelectedAddressId(addr.id);
                        setShowNewAddress(false);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedAddressId === addr.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">{addr.label}</span>
                        {selectedAddressId === addr.id && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {addr.street}, {addr.number} — {addr.neighborhood}
                      </p>
                      <p className="text-xs text-muted-foreground">Ref: {addr.reference}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Add new address button */}
              {!showNewAddress && (
                <button
                  onClick={() => { setShowNewAddress(true); setSelectedAddressId(null); }}
                  className="w-full bg-secondary border border-dashed border-border rounded-lg py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Adicionar novo endereço
                </button>
              )}

              {/* New address form */}
              {showNewAddress && (
                <div className="bg-card border border-border rounded-lg p-4 space-y-3 animate-fade-in">
                  <p className="text-sm font-bold text-foreground">Novo Endereço</p>
                  <input
                    className={inputClass}
                    placeholder="Apelido (ex: Casa, Trabalho)"
                    value={newAddress.label}
                    onChange={(e) => setNewAddress((p) => ({ ...p, label: e.target.value }))}
                  />
                  <input
                    className={inputClass}
                    placeholder="Rua *"
                    value={newAddress.street}
                    onChange={(e) => setNewAddress((p) => ({ ...p, street: e.target.value }))}
                  />
                  <input
                    className={inputClass}
                    placeholder="Número *"
                    value={newAddress.number}
                    onChange={(e) => setNewAddress((p) => ({ ...p, number: e.target.value }))}
                  />

                  {/* Neighborhood dropdown */}
                  <div className="relative">
                    <select
                      value={newAddress.neighborhood}
                      onChange={(e) => setNewAddress((p) => ({ ...p, neighborhood: e.target.value, reference: "" }))}
                      className={`${inputClass} appearance-none pr-10 ${!newAddress.neighborhood ? "text-muted-foreground" : ""}`}
                    >
                      <option value="">Bairro *</option>
                      {neighborhoods.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>

                  {/* Reference with suggestions */}
                  <div className="relative">
                    <input
                      className={inputClass}
                      placeholder="Ponto de referência *"
                      value={newAddress.reference}
                      onChange={(e) => setNewAddress((p) => ({ ...p, reference: e.target.value }))}
                      onFocus={() => setShowRefSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowRefSuggestions(false), 200)}
                    />
                    {showRefSuggestions && newAddress.neighborhood && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                        {availableReferences.length > 0 && (
                          <>
                            <p className="text-xs text-muted-foreground px-3 pt-2 pb-1">Zonas cadastradas:</p>
                            {availableReferences.map((z) => (
                              <button
                                key={z.id}
                                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors flex justify-between"
                                onMouseDown={() => setNewAddress((p) => ({ ...p, reference: z.reference }))}
                              >
                                <span>{z.reference}</span>
                                <span className="text-primary text-xs">R$ {z.fee.toFixed(2)}</span>
                              </button>
                            ))}
                          </>
                        )}
                        <p className="text-xs text-muted-foreground px-3 pt-2 pb-1">Sugestões:</p>
                        {referenceSuggestions
                          .filter((s) => !availableReferences.some((z) => z.reference === s))
                          .map((s) => (
                            <button
                              key={s}
                              className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors"
                              onMouseDown={() => setNewAddress((p) => ({ ...p, reference: s }))}
                            >
                              {s}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {newAddress.neighborhood && newAddress.reference && (
                    <p className="text-xs text-primary">
                      {matchedZone
                        ? `🛵 Taxa de entrega: R$ ${matchedZone.fee.toFixed(2)}`
                        : "⚠️ Zona não cadastrada — consulte pelo WhatsApp"}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleAddNewAddress}
                      className="flex-1 gradient-red text-primary-foreground py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-1"
                    >
                      <Check className="h-4 w-4" /> Salvar Endereço
                    </button>
                    <button
                      onClick={() => setShowNewAddress(false)}
                      className="bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Show fee for selected saved address */}
              {selectedAddress && (
                <p className="text-xs text-primary">
                  {(() => {
                    const zone = findZone(selectedAddress.neighborhood, selectedAddress.reference);
                    return zone
                      ? `🛵 Taxa de entrega para ${selectedAddress.neighborhood}: R$ ${zone.fee.toFixed(2)}`
                      : "⚠️ Zona não cadastrada — consulte pelo WhatsApp";
                  })()}
                </p>
              )}
            </div>

            {/* STEP 3: Payment */}
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-sm font-bold text-foreground">Forma de Pagamento</h2>
              <div className="flex gap-3">
                {(["pix", "dinheiro"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPayment(p)}
                    className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${
                      payment === p
                        ? "gradient-red text-primary-foreground border-primary"
                        : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {p === "pix" ? "PIX" : "Dinheiro"}
                  </button>
                ))}
              </div>

              {payment === "pix" && (
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <p className="text-sm font-bold text-foreground">Dados PIX</p>
                  <div className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs text-muted-foreground">CNPJ</p>
                      <p className="text-sm font-mono text-foreground">27.810857000123</p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("27810857000123");
                        toast.success("CNPJ copiado!");
                      }}
                    >
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Banco do Brasil</p>
                  <p className="text-xs text-muted-foreground">Rafaela Silva de Freitas</p>
                  <p className="text-xs text-primary mt-2">
                    Após realizar o pagamento, envie o comprovante para confirmar seu pedido.
                  </p>
                </div>
              )}

              {payment === "dinheiro" && (
                <input
                  className={inputClass}
                  placeholder="Troco para quanto? (R$)"
                  value={changeFor}
                  onChange={(e) => setChangeFor(e.target.value)}
                />
              )}
            </div>

            {/* Summary */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-2 animate-fade-in">
              <h2 className="text-sm font-bold text-foreground">Resumo do Pedido</h2>
              {items.map((i) => (
                <div key={i.product.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {i.quantity}x {i.product.name}
                  </span>
                  <span className="text-foreground">R$ {(i.product.price * i.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de entrega</span>
                  <span className="text-foreground">
                    {deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2)}` : "Selecione endereço"}
                  </span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">R$ {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              className="w-full gradient-red text-primary-foreground py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
            >
              <MessageCircle className="h-5 w-5" />
              Enviar Pedido no WhatsApp
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Checkout;
