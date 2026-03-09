import { useState, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import { useCustomers, CustomerAddress } from "@/hooks/useCustomers";
import { useOrdersDB, PaymentMethod } from "@/hooks/useOrdersDB";
import { useCompanySettings } from "@/hooks/useCompanySettings";

import { OUT_OF_RANGE_MESSAGE } from "@/data/deliveryZones";
import Header from "@/components/Header";
import { toast } from "sonner";
import { MessageCircle, Copy, User, MapPin, Plus, Check, Phone, Navigation, Loader2 } from "lucide-react";

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const { calculateFee } = useDeliveryZones();
  const { currentCustomer, lookupByPhone, createOrUpdate, addAddress } = useCustomers();
  const { createOrder } = useOrdersDB();
  const { settings } = useCompanySettings();
  const navigate = useNavigate();

  // Step management
  const [step, setStep] = useState<"phone" | "details" | "payment">("phone");
  const [submitting, setSubmitting] = useState(false);

  // Phone step
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [phoneLocked, setPhoneLocked] = useState(false);

  // Address
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "", street: "", number: "", neighborhood: "", reference: "" });

  // Geolocation
  const [geoLoading, setGeoLoading] = useState(false);
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState("");

  // Payment
  const [payment, setPayment] = useState<PaymentMethod>("pix");
  const [changeFor, setChangeFor] = useState("");

  // Derived
  const selectedAddress = useMemo(() => {
    if (selectedAddressId && currentCustomer) {
      return currentCustomer.addresses.find((a) => a.id === selectedAddressId);
    }
    return null;
  }, [selectedAddressId, currentCustomer]);

  // Fee calculation based on geolocation
  const feeResult = useMemo(() => {
    if (!customerCoords) return null;
    return calculateFee(customerCoords.lat, customerCoords.lng);
  }, [customerCoords, calculateFee]);

  const deliveryFee = feeResult?.fee || 0;
  const grandTotal = total + deliveryFee;

  // Geolocation handler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocalização não suportada pelo navegador.");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCustomerCoords(coords);
        setGeoLoading(false);
        const result = calculateFee(coords.lat, coords.lng);
        if (result) {
          toast.success(`📍 ${result.distanceKm} km — Frete: R$ ${result.fee.toFixed(2)}`);
        } else {
          toast.error(OUT_OF_RANGE_MESSAGE);
        }
      },
      (err) => {
        setGeoLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError("Permissão de localização negada. Ative nas configurações do navegador.");
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError("Localização indisponível.");
            break;
          default:
            setGeoError("Não foi possível obter sua localização.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Phone lookup
  const handlePhoneLookup = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) {
      toast.error("Telefone inválido! Use DDD + 9 dígitos.");
      return;
    }
    const found = await lookupByPhone(digits);
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

  const handleAddNewAddress = async () => {
    if (!newAddress.street || !newAddress.number || !newAddress.neighborhood) {
      toast.error("Preencha rua, número e bairro!");
      return;
    }
    if (!name) {
      toast.error("Informe seu nome!");
      return;
    }

    const digits = phone.replace(/\D/g, "");
    await createOrUpdate(digits, name);

    const success = await addAddress(digits, {
      label: newAddress.label || newAddress.neighborhood,
      street: newAddress.street,
      number: newAddress.number,
      neighborhood: newAddress.neighborhood,
      reference: newAddress.reference,
    });

    if (success) {
      // Refresh to get the new address with its DB id
      const updated = await lookupByPhone(digits);
      if (updated && updated.addresses.length > 0) {
        setSelectedAddressId(updated.addresses[0].id);
      }
    }
    setShowNewAddress(false);
    setNewAddress({ label: "", street: "", number: "", neighborhood: "", reference: "" });
    toast.success("Endereço salvo! ✅");
  };

  const handleSubmit = async () => {
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
    if (!customerCoords) {
      toast.error("Use sua localização para calcular o frete!");
      return;
    }
    if (!feeResult) {
      toast.error(OUT_OF_RANGE_MESSAGE);
      return;
    }
    if (items.length === 0) {
      toast.error("Carrinho vazio!");
      return;
    }

    setSubmitting(true);

    // Save customer to localStorage
    const digits = phone.replace(/\D/g, "");
    createOrUpdate(digits, name);

    // Save order to Supabase
    const orderItems = items.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      quantity: i.quantity,
      price: i.product.price,
      flavor: i.flavor,
      notes: i.notes,
    }));

    const order = await createOrder(
      name,
      digits,
      {
        street: finalAddress.street,
        number: finalAddress.number,
        neighborhood: finalAddress.neighborhood,
        reference: finalAddress.reference,
      },
      orderItems,
      total,
      deliveryFee,
      grandTotal,
      payment
    );

    if (!order) {
      setSubmitting(false);
      toast.error("Erro ao criar pedido. Tente novamente.");
      return;
    }

    // Build WhatsApp message
    const itemsText = items
      .map((i) => `${i.quantity}x ${i.product.name}${i.flavor ? ` (${i.flavor})` : ""}${i.notes ? `\n   _Obs: ${i.notes}_` : ""}`)
      .join("\n");

    const paymentText =
      payment === "pix" ? "PIX — Vou enviar o comprovante." : `Dinheiro${changeFor ? ` — Troco para R$ ${changeFor}` : ""}`;

    const message = `*Pedido ${settings.name}* 🍣
*Nº ${order.order_number}*

*Nome:* ${name}
*Telefone:* ${formatPhone(digits)}

*Endereço:*
${finalAddress.street}, ${finalAddress.number}
Bairro: ${finalAddress.neighborhood}
${finalAddress.reference ? `Ref: ${finalAddress.reference}` : ""}

📍 Distância: ${feeResult.distanceKm} km
🛵 Zona: ${feeResult.zone.zone}

*Pedido:*
${itemsText}

Subtotal: R$ ${total.toFixed(2)}
Taxa entrega: R$ ${deliveryFee.toFixed(2)}

*Total: R$ ${grandTotal.toFixed(2)}*

*Pagamento:* ${paymentText}`;

    const encoded = encodeURIComponent(message);
    const whatsappPhone = settings.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${whatsappPhone}?text=${encoded}`, "_blank");
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

        {/* STEP 2: Name + Address + Location */}
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

            {/* Geolocation */}
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" /> Sua Localização
              </h2>
              <button
                onClick={handleGetLocation}
                disabled={geoLoading}
                className="w-full bg-secondary border border-border rounded-lg py-3 flex items-center justify-center gap-2 text-sm text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
              >
                {geoLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Obtendo localização...</>
                ) : customerCoords ? (
                  <><Check className="h-4 w-4 text-primary" /> Localização obtida — Atualizar</>
                ) : (
                  <><Navigation className="h-4 w-4" /> Usar minha localização</>
                )}
              </button>
              {geoError && <p className="text-xs text-destructive">{geoError}</p>}
              {customerCoords && feeResult && (
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                  <p className="text-sm font-bold text-primary">
                    📍 {feeResult.distanceKm} km — 🛵 Frete: R$ {feeResult.fee.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Zona: {feeResult.zone.zone} — {feeResult.zone.description}</p>
                </div>
              )}
              {customerCoords && !feeResult && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm font-bold text-destructive">❌ {OUT_OF_RANGE_MESSAGE}</p>
                  <p className="text-xs text-muted-foreground mt-1">Distância máxima: 5 km</p>
                </div>
              )}
            </div>

            {/* Address */}
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
                      {addr.reference && <p className="text-xs text-muted-foreground">Ref: {addr.reference}</p>}
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
                  <input
                    className={inputClass}
                    placeholder="Bairro *"
                    value={newAddress.neighborhood}
                    onChange={(e) => setNewAddress((p) => ({ ...p, neighborhood: e.target.value }))}
                  />
                  <input
                    className={inputClass}
                    placeholder="Ponto de referência (opcional)"
                    value={newAddress.reference}
                    onChange={(e) => setNewAddress((p) => ({ ...p, reference: e.target.value }))}
                  />

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
            </div>

            {/* Payment */}
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
                    {feeResult ? `R$ ${deliveryFee.toFixed(2)}` : customerCoords ? "Fora da área" : "Use sua localização"}
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
              disabled={!feeResult || submitting}
              className="w-full gradient-red text-primary-foreground py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Enviando...</>
              ) : (
                <><MessageCircle className="h-5 w-5" /> Enviar Pedido no WhatsApp</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Checkout;
