import { useState, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import { useNeighborhoodsDB } from "@/hooks/useNeighborhoodsDB";
import { useCustomers, CustomerAddress } from "@/hooks/useCustomers";
import { useOrdersDB, PaymentMethod } from "@/hooks/useOrdersDB";
import { useCompanySettings } from "@/hooks/useCompanySettings";

import { OUT_OF_RANGE_MESSAGE } from "@/data/deliveryZones";
import Header from "@/components/Header";
import { toast } from "sonner";
import { MessageCircle, Copy, User, MapPin, Plus, Check, Phone, Navigation, Loader2, AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

type DeliveryMode = "auto" | "manual" | "retirada";

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const { calculateFee } = useDeliveryZones();
  const { activeNeighborhoods, loading: neighbLoading } = useNeighborhoodsDB();
  const { currentCustomer, lookupByPhone, createOrUpdate, addAddress } = useCustomers();
  const { createOrder } = useOrdersDB();
  const { settings } = useCompanySettings();
  const navigate = useNavigate();

  // Step management
  const [step, setStep] = useState<"phone" | "details" | "payment">("phone");
  const [submitting, setSubmitting] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string>("");

  // Phone step
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [phoneLocked, setPhoneLocked] = useState(false);

  // Address
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "", street: "", number: "", neighborhood: "", reference: "" });

  // Delivery mode: auto (GPS) or manual (select neighborhood)
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("auto");

  // Geolocation (auto mode)
  const [geoLoading, setGeoLoading] = useState(false);
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState("");

  // Manual mode
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<string>("");

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

  // Fee calculation based on mode
  const feeResultAuto = useMemo(() => {
    if (!customerCoords) return null;
    return calculateFee(customerCoords.lat, customerCoords.lng);
  }, [customerCoords, calculateFee]);

  const selectedNeighborhood = useMemo(() => {
    if (!selectedNeighborhoodId) return null;
    return activeNeighborhoods.find((n) => n.id === selectedNeighborhoodId) || null;
  }, [selectedNeighborhoodId, activeNeighborhoods]);

  // Unified fee
  const deliveryFee = deliveryMode === "retirada"
    ? 0
    : deliveryMode === "auto"
      ? (feeResultAuto?.fee || 0)
      : (selectedNeighborhood ? Number(selectedNeighborhood.fee) : 0);

  const hasValidDelivery = deliveryMode === "retirada"
    ? true
    : deliveryMode === "auto"
      ? !!feeResultAuto
      : !!selectedNeighborhood;

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

  const switchToManual = () => {
    setDeliveryMode("manual");
    setCustomerCoords(null);
    setGeoError("");
  };

  const switchToAuto = () => {
    setDeliveryMode("auto");
    setSelectedNeighborhoodId("");
  };

  const switchToRetirada = () => {
    setDeliveryMode("retirada");
    setCustomerCoords(null);
    setGeoError("");
    setSelectedNeighborhoodId("");
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
    const addrNeighborhood = deliveryMode === "manual" && selectedNeighborhood
      ? selectedNeighborhood.name
      : newAddress.neighborhood;

    if (!newAddress.street || !newAddress.number || !addrNeighborhood) {
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
      label: newAddress.label || addrNeighborhood,
      street: newAddress.street,
      number: newAddress.number,
      neighborhood: addrNeighborhood,
      reference: newAddress.reference,
    });

    if (success) {
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

    const isPickup = deliveryMode === "retirada";

    let finalAddress: { street: string; number: string; neighborhood: string; reference?: string } | null = null;

    if (isPickup) {
      finalAddress = {
        street: "Retirada no local",
        number: "-",
        neighborhood: "Retirada",
      };
    } else {
      const addrNeighborhood = deliveryMode === "manual" && selectedNeighborhood
        ? selectedNeighborhood.name
        : (selectedAddress?.neighborhood || newAddress.neighborhood);

      finalAddress = selectedAddress ? {
        street: selectedAddress.street,
        number: selectedAddress.number,
        neighborhood: selectedAddress.neighborhood,
        reference: selectedAddress.reference || undefined,
      } : (showNewAddress ? {
        street: newAddress.street,
        number: newAddress.number,
        neighborhood: addrNeighborhood,
        reference: newAddress.reference,
      } : null);

      if (!finalAddress || !finalAddress.street || !finalAddress.neighborhood) {
        toast.error("Selecione ou adicione um endereço!");
        return;
      }
    }

    if (!hasValidDelivery) {
      toast.error("Selecione uma forma de cálculo de frete!");
      return;
    }
    if (items.length === 0) {
      toast.error("Carrinho vazio!");
      return;
    }

    setSubmitting(true);

    const digits = phone.replace(/\D/g, "");
    createOrUpdate(digits, name);

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
        street: finalAddress!.street,
        number: finalAddress!.number,
        neighborhood: finalAddress!.neighborhood,
        reference: finalAddress!.reference,
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

    const deliveryInfo = isPickup
      ? "🏪 *Retirada no local* — Sem taxa de entrega"
      : deliveryMode === "auto" && feeResultAuto
        ? `📍 Distância: ${feeResultAuto.distanceKm} km\n🛵 Zona: ${feeResultAuto.zone.zone}`
        : `📍 Bairro: ${finalAddress!.neighborhood}`;

    const addressBlock = isPickup
      ? `*Modalidade:* Retirada no local`
      : `*Endereço:*\n${finalAddress!.street}, ${finalAddress!.number}\nBairro: ${finalAddress!.neighborhood}${finalAddress!.reference ? `\nRef: ${finalAddress!.reference}` : ""}`;

    const feeLabel = isPickup ? "Retirada: Grátis" : `Taxa entrega: R$ ${deliveryFee.toFixed(2)}`;

    const message = `*Pedido ${settings.name}* 🍣
*Nº ${order.order_number}*

*Nome:* ${name}
*Telefone:* ${formatPhone(digits)}

${addressBlock}

${deliveryInfo}

*Pedido:*
${itemsText}

Subtotal: R$ ${total.toFixed(2)}
${feeLabel}

*Total: R$ ${grandTotal.toFixed(2)}*

*Pagamento:* ${paymentText}`;

    const encoded = encodeURIComponent(message);
    const whatsappPhone = settings.phone.replace(/\D/g, "");
    setWhatsappUrl(`https://wa.me/${whatsappPhone}?text=${encoded}`);
    setWhatsappMessage(message);
    setSubmitting(false);
  };

  const handleOpenWhatsApp = () => {
    window.open(whatsappUrl, "_blank");
    clearCart();
    navigate("/");
    toast.success("Pedido enviado! Verifique o WhatsApp.");
  };
  };

  const inputClass =
    "w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="min-h-screen bg-background pb-10">
      <Header />
      <div className="container py-4 space-y-6">

        {/* WHATSAPP MESSAGE PREVIEW */}
        {whatsappMessage ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWhatsappMessage(null)}
                className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="font-display text-xl font-bold text-foreground">Pedido Pronto!</h1>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" /> Mensagem do Pedido
              </p>
              <div className="bg-secondary rounded-lg p-4 whitespace-pre-wrap text-sm text-foreground leading-relaxed font-mono">
                {whatsappMessage}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(whatsappMessage);
                  toast.success("Mensagem copiada!");
                }}
                className="w-full bg-secondary border border-border rounded-lg py-2.5 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="h-4 w-4" /> Copiar mensagem
              </button>
            </div>

            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-2">
              <p className="text-sm text-primary font-medium">
                📱 Clique no botão abaixo para abrir o WhatsApp com a mensagem já preenchida. Basta apertar <strong>Enviar</strong>!
              </p>
            </div>

            <button
              onClick={handleOpenWhatsApp}
              className="w-full gradient-red text-primary-foreground py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
            >
              <ExternalLink className="h-5 w-5" /> Abrir WhatsApp e Enviar
            </button>
          </div>
        ) : (
        <>
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

        {/* STEP 2: Name + Location/Neighborhood + Address */}
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

            {/* Delivery Mode: Auto (GPS) or Manual (Neighborhood) */}
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" /> Cálculo do Frete
              </h2>

              {/* Mode toggle */}
              <div className="flex gap-2">
                <button
                  onClick={switchToAuto}
                  className={`flex-1 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                    deliveryMode === "auto"
                      ? "gradient-red text-primary-foreground border-primary"
                      : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                  }`}
                >
                  📍 Automática
                </button>
                <button
                  onClick={switchToManual}
                  className={`flex-1 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                    deliveryMode === "manual"
                      ? "gradient-red text-primary-foreground border-primary"
                      : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                  }`}
                >
                  🏘️ Bairro
                </button>
                <button
                  onClick={switchToRetirada}
                  className={`flex-1 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                    deliveryMode === "retirada"
                      ? "gradient-red text-primary-foreground border-primary"
                      : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                  }`}
                >
                  🏪 Retirada
                </button>
              </div>

              {/* AUTO MODE */}
              {deliveryMode === "auto" && (
                <div className="space-y-3">
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
                  {customerCoords && feeResultAuto && (
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                      <p className="text-sm font-bold text-primary">
                        📍 {feeResultAuto.distanceKm} km — 🛵 Frete: R$ {feeResultAuto.fee.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Zona: {feeResultAuto.zone.zone} — {feeResultAuto.zone.description}</p>
                    </div>
                  )}
                  {customerCoords && !feeResultAuto && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                      <p className="text-sm font-bold text-destructive">❌ {OUT_OF_RANGE_MESSAGE}</p>
                      <p className="text-xs text-muted-foreground mt-1">Distância máxima: 5 km</p>
                    </div>
                  )}

                  {/* Hint to switch to manual */}
                  <button
                    onClick={switchToManual}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Localização veio errada? Selecione seu bairro manualmente
                  </button>
                </div>
              )}

              {/* MANUAL MODE */}
              {deliveryMode === "manual" && (
                <div className="space-y-3">
                  <Select value={selectedNeighborhoodId} onValueChange={setSelectedNeighborhoodId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione seu bairro" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeNeighborhoods.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.name} — R$ {Number(n.fee).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedNeighborhood && (
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                      <p className="text-sm font-bold text-primary">
                        🏘️ {selectedNeighborhood.name} — 🛵 Frete: R$ {Number(selectedNeighborhood.fee).toFixed(2)}
                      </p>
                      {selectedNeighborhood.zone && (
                        <p className="text-xs text-muted-foreground mt-1">Zona: {selectedNeighborhood.zone}</p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={switchToAuto}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Usar localização automática
                  </button>
                </div>
              )}

              {/* RETIRADA MODE */}
              {deliveryMode === "retirada" && (
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-2">
                  <p className="text-base font-bold text-primary flex items-center gap-2">
                    🏪 Retirada no Local — Frete: Grátis
                  </p>
                  <div className="bg-card border border-border rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> Endereço para Retirada:
                    </p>
                    <p className="text-sm text-foreground">
                      {settings.address || "Endereço não configurado"}
                    </p>
                    {(settings.city || settings.state) && (
                      <p className="text-sm text-muted-foreground">
                        {[settings.city, settings.state].filter(Boolean).join(" — ")}
                      </p>
                    )}
                    {!settings.address && (
                      <p className="text-xs text-destructive mt-1">
                        ⚠️ O restaurante ainda não cadastrou o endereço. Entre em contato para confirmar o local de retirada.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Address — hidden for pickup */}
            {deliveryMode !== "retirada" && (
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

                  {/* Neighborhood: auto-filled in manual mode, free text in auto mode */}
                  {deliveryMode === "manual" && selectedNeighborhood ? (
                    <div className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground opacity-70">
                      Bairro: {selectedNeighborhood.name}
                    </div>
                  ) : (
                    <input
                      className={inputClass}
                      placeholder="Bairro *"
                      value={newAddress.neighborhood}
                      onChange={(e) => setNewAddress((p) => ({ ...p, neighborhood: e.target.value }))}
                    />
                  )}

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
            )}

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
                  {settings.pix_key && (
                    <div className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Chave PIX</p>
                        <p className="text-sm font-mono text-foreground">{settings.pix_key}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(settings.pix_key || "");
                          toast.success("Chave PIX copiada!");
                        }}
                      >
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                  {settings.pix_bank && (
                    <p className="text-xs text-muted-foreground">{settings.pix_bank}</p>
                  )}
                  {settings.pix_name && (
                    <p className="text-xs text-muted-foreground">{settings.pix_name}</p>
                  )}
                  {!settings.pix_key && (
                    <p className="text-xs text-muted-foreground">Dados PIX não configurados. Entre em contato com o restaurante.</p>
                  )}
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
                  <span className="text-muted-foreground">
                    {deliveryMode === "retirada" ? "Retirada" : "Taxa de entrega"}
                  </span>
                  <span className="text-foreground">
                    {deliveryMode === "retirada"
                      ? "Grátis"
                      : hasValidDelivery
                        ? `R$ ${deliveryFee.toFixed(2)}`
                        : "Selecione o frete"}
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
              disabled={!hasValidDelivery || submitting}
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
        </>
        )}
      </div>
    </div>
  );
};

export default Checkout;
