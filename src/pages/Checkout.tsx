import { useState, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { useNeighborhoodsDB } from "@/hooks/useNeighborhoodsDB";
import { useCustomers, CustomerAddress } from "@/hooks/useCustomers";
import { useOrdersDB, PaymentMethod } from "@/hooks/useOrdersDB";
import { useCompanySettings } from "@/hooks/useCompanySettings";

import Header from "@/components/Header";
import { toast } from "sonner";
import {
  MessageCircle,
  Copy,
  User,
  MapPin,
  Plus,
  Check,
  Phone,
  Navigation,
  Loader2,
  ArrowLeft,
  ExternalLink,
  Trash2,
  CreditCard,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

type DeliveryMode = "manual" | "retirada";

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const { activeNeighborhoods } = useNeighborhoodsDB();
  const { currentCustomer, lookupByPhone, createOrUpdate, addAddress, deleteAddress } = useCustomers();
  const { createOrder } = useOrdersDB();
  const { settings, isOpen: storeIsOpen } = useCompanySettings();
  const navigate = useNavigate();

  const [step, setStep] = useState<"phone" | "details" | "payment">("phone");
  const [submitting, setSubmitting] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string>("");

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [phoneLocked, setPhoneLocked] = useState(false);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "", street: "", number: "", neighborhood: "", reference: "" });
  const [deleteAddrId, setDeleteAddrId] = useState<string | null>(null);

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("manual");
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<string>("");

  const [payment, setPayment] = useState<PaymentMethod>("pix");
  const [changeFor, setChangeFor] = useState("");

  const selectedAddress = useMemo(() => {
    if (selectedAddressId && currentCustomer) return currentCustomer.addresses.find((a) => a.id === selectedAddressId);
    return null;
  }, [selectedAddressId, currentCustomer]);

  const selectedNeighborhood = useMemo(() => {
    if (!selectedNeighborhoodId) return null;
    return activeNeighborhoods.find((n) => n.id === selectedNeighborhoodId) || null;
  }, [selectedNeighborhoodId, activeNeighborhoods]);

  const deliveryFee = deliveryMode === "retirada" ? 0 : selectedNeighborhood ? Number(selectedNeighborhood.fee) : 0;
  const hasValidDelivery = deliveryMode === "retirada" || !!selectedNeighborhood;
  const cardFee = payment === "cartao" ? (total + deliveryFee) * 0.06 : 0;
  const grandTotal = total + deliveryFee + cardFee;

  const switchToRetirada = () => {
    setDeliveryMode("retirada");
    setSelectedNeighborhoodId("");
  };
  const switchToManual = () => setDeliveryMode("manual");

  const handleSelectAddress = (addr: CustomerAddress) => {
    setSelectedAddressId(addr.id);
    setShowNewAddress(false);
    setDeliveryMode("manual");
    const match = activeNeighborhoods.find(
      (n) => n.name.toLowerCase().trim() === addr.neighborhood.toLowerCase().trim(),
    );
    if (match) setSelectedNeighborhoodId(match.id);
  };

  const handleConfirmDeleteAddress = async () => {
    if (!deleteAddrId) return;
    const digits = phone.replace(/\D/g, "");
    const success = await deleteAddress(deleteAddrId, digits);
    if (success) {
      if (selectedAddressId === deleteAddrId) {
        setSelectedAddressId(null);
        setSelectedNeighborhoodId("");
      }
      toast.success("Endereço removido!");
    } else toast.error("Erro ao remover endereço.");
    setDeleteAddrId(null);
  };

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
      if (found.addresses.length > 0) handleSelectAddress(found.addresses[0]);
    }
    setPhoneLocked(true);
    setStep("details");
  };

  const handleAddNewAddress = async () => {
    const addrNeighborhood = selectedNeighborhood ? selectedNeighborhood.name : newAddress.neighborhood;
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
      if (updated && updated.addresses.length > 0) handleSelectAddress(updated.addresses[0]);
    }
    setShowNewAddress(false);
    setNewAddress({ label: "", street: "", number: "", neighborhood: "", reference: "" });
    toast.success("Endereço salvo! ✅");
  };

  const handleSubmit = async () => {
    if (!storeIsOpen) {
      toast.error("Não é possível finalizar o pedido — restaurante fechado ou em alta demanda.");
      return;
    }
    if (!name) {
      toast.error("Informe seu nome!");
      return;
    }
    const isPickup = deliveryMode === "retirada";
    let finalAddress: { street: string; number: string; neighborhood: string; reference?: string } | null = null;

    if (isPickup) {
      finalAddress = { street: "Retirada no local", number: "-", neighborhood: "Retirada" };
    } else {
      const addrNeighborhood = selectedNeighborhood
        ? selectedNeighborhood.name
        : selectedAddress?.neighborhood || newAddress.neighborhood;
      finalAddress = selectedAddress
        ? {
            street: selectedAddress.street,
            number: selectedAddress.number,
            neighborhood: selectedAddress.neighborhood,
            reference: selectedAddress.reference || undefined,
          }
        : showNewAddress
          ? {
              street: newAddress.street,
              number: newAddress.number,
              neighborhood: addrNeighborhood,
              reference: newAddress.reference,
            }
          : null;
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

    // cardFee salvo separado no banco
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
      cardFee,
      grandTotal,
      payment,
    );

    if (!order) {
      setSubmitting(false);
      toast.error("Erro ao criar pedido. Tente novamente.");
      return;
    }

    const paymentLabel =
      payment === "pix"
        ? "PIX — Vou enviar o comprovante."
        : payment === "cartao"
          ? `Cartão (+6% taxa: R$ ${cardFee.toFixed(2)})`
          : `Dinheiro${changeFor ? ` — Troco para R$ ${changeFor}` : ""}`;

    const addressBlock = isPickup
      ? `*Modalidade:* Retirada no local`
      : `*Endereço:*\n${finalAddress!.street}, ${finalAddress!.number}\nBairro: ${finalAddress!.neighborhood}${finalAddress!.reference ? `\nRef: ${finalAddress!.reference}` : ""}`;

    const deliveryInfo = isPickup
      ? "🏪 *Retirada no local* — Sem taxa de entrega"
      : `📍 Bairro: ${finalAddress!.neighborhood}`;
    const feeLabel = isPickup ? "Retirada: Grátis" : `Taxa entrega: R$ ${deliveryFee.toFixed(2)}`;
    const cardFeeLabel = payment === "cartao" ? `\nTaxa cartão (6%): R$ ${cardFee.toFixed(2)}` : "";

    const buildMessage = (withNotes: boolean) => {
      const text = items
        .map((i) =>
          `${i.quantity}x ${i.product.name}${i.flavor ? ` (${i.flavor})` : ""}${withNotes && i.notes ? `\n   _Obs: ${i.notes}_` : ""}`
        )
        .join("\n");
      return `*Pedido ${settings.name}* 🍣\n*Nº ${order.order_number}*\n\n*Nome:* ${name}\n*Telefone:* ${formatPhone(digits)}\n\n${addressBlock}\n\n${deliveryInfo}\n\n*Pedido:*\n${text}\n\nSubtotal: R$ ${total.toFixed(2)}\n${feeLabel}${cardFeeLabel}\n\n*Total: R$ ${grandTotal.toFixed(2)}*\n\n*Pagamento:* ${paymentLabel}`;
    };

    // Mensagens muito longas travam o WhatsApp no Android — trunca observações se necessário
    let message = buildMessage(true);
    if (message.length > 1500) message = buildMessage(false);

    const encoded = encodeURIComponent(message);
    const whatsappPhone = (settings.phone || "").replace(/\D/g, "");
    setWhatsappUrl(`https://wa.me/${whatsappPhone}?text=${encoded}`);
    setWhatsappMessage(message);
    setSubmitting(false);
  };

  const [whatsappFallback, setWhatsappFallback] = useState(false);

  const handleOpenWhatsApp = () => {
    clearCart();
    toast.success("Pedido enviado! Verifique o WhatsApp.");
    setWhatsappFallback(false);
    // Delay for Android stability
    setTimeout(() => {
      window.location.href = whatsappUrl;
    }, 100);
    // Fallback: if still on page after 3s, show retry button
    setTimeout(() => {
      setWhatsappFallback(true);
    }, 3000);
  };

  const inputClass =
    "w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="min-h-screen bg-background pb-10">
      <Header />
      <div className="container py-4 space-y-6">
        <AlertDialog open={!!deleteAddrId} onOpenChange={(open) => !open && setDeleteAddrId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover endereço?</AlertDialogTitle>
              <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteAddress}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
              <p className="text-sm text-primary font-medium">
                📱 Clique abaixo para abrir o WhatsApp com a mensagem já preenchida.
              </p>
            </div>
            <button
              onClick={handleOpenWhatsApp}
              className="w-full gradient-red text-primary-foreground py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
            >
              <ExternalLink className="h-5 w-5" /> Abrir WhatsApp e Enviar
            </button>
            {whatsappFallback && (
              <div className="space-y-2 animate-fade-in">
                <p className="text-sm text-muted-foreground text-center">Não abriu? Tente novamente ou copie a mensagem acima.</p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full block bg-secondary text-foreground py-3 rounded-full font-bold text-center text-sm hover:bg-accent transition-colors"
                >
                  Tentar novamente
                </a>
              </div>
            )}
          </div>
        ) : (
          <>
            <h1 className="font-display text-xl font-bold text-foreground">Finalizar Pedido</h1>

            {/* Telefone */}
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
                    onClick={() => {
                      setPhoneLocked(false);
                      setStep("phone");
                    }}
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

            {step !== "phone" && (
              <>
                {/* Nome */}
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

                {/* Frete */}
                <div className="space-y-3 animate-fade-in">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-primary" /> Cálculo do Frete
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={switchToManual}
                      className={`flex-1 py-2.5 rounded-lg border text-xs font-medium transition-colors ${deliveryMode === "manual" ? "gradient-red text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"}`}
                    >
                      🏘️ Bairro
                    </button>
                    <button
                      onClick={switchToRetirada}
                      className={`flex-1 py-2.5 rounded-lg border text-xs font-medium transition-colors ${deliveryMode === "retirada" ? "gradient-red text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"}`}
                    >
                      🏪 Retirada
                    </button>
                  </div>

                  {deliveryMode === "manual" && (
                    <div className="space-y-3">
                      <select
                        value={selectedNeighborhoodId}
                        onChange={(e) => setSelectedNeighborhoodId(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                      >
                        <option value="" disabled>Selecione seu bairro</option>
                        {activeNeighborhoods.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name} — R$ {Number(n.fee).toFixed(2)}
                          </option>
                        ))}
                      </select>
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
                    </div>
                  )}

                  {deliveryMode === "retirada" && (
                    <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-2">
                      <p className="text-base font-bold text-primary flex items-center gap-2">
                        🏪 Retirada no Local — Frete: Grátis
                      </p>
                      <div className="bg-card border border-border rounded-lg p-3 space-y-1">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary" /> Endereço para Retirada:
                        </p>
                        <p className="text-sm text-foreground">{settings.address || "Endereço não configurado"}</p>
                        {(settings.city || settings.state) && (
                          <p className="text-sm text-muted-foreground">
                            {[settings.city, settings.state].filter(Boolean).join(" — ")}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Endereço */}
                {deliveryMode !== "retirada" && (
                  <div className="space-y-3 animate-fade-in">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" /> Endereço de Entrega
                    </h2>
                    {currentCustomer && currentCustomer.addresses.length > 0 && (
                      <div className="space-y-2">
                        {currentCustomer.addresses.map((addr) => (
                          <div
                            key={addr.id}
                            className={`relative w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${selectedAddressId === addr.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}
                            onClick={() => handleSelectAddress(addr)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-foreground">{addr.label}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteAddrId(addr.id);
                                  }}
                                  className="p-1 rounded hover:bg-destructive/10 transition-colors"
                                  title="Remover endereço"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </button>
                                {selectedAddressId === addr.id && <Check className="h-4 w-4 text-primary" />}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {addr.street}, {addr.number} — {addr.neighborhood}
                            </p>
                            {addr.reference && <p className="text-xs text-muted-foreground">Ref: {addr.reference}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    {!showNewAddress && (
                      <button
                        onClick={() => {
                          setShowNewAddress(true);
                          setSelectedAddressId(null);
                        }}
                        className="w-full bg-secondary border border-dashed border-border rounded-lg py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                      >
                        <Plus className="h-4 w-4" /> Adicionar novo endereço
                      </button>
                    )}
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
                        {selectedNeighborhood ? (
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

                {/* Pagamento */}
                <div className="space-y-3 animate-fade-in">
                  <h2 className="text-sm font-bold text-foreground">Forma de Pagamento</h2>
                  <div className="flex gap-2">
                    {(["pix", "dinheiro", "cartao"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPayment(p)}
                        className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${payment === p ? "gradient-red text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"}`}
                      >
                        {p === "pix" ? "PIX" : p === "dinheiro" ? "Dinheiro" : "Cartão"}
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
                      {settings.pix_bank && <p className="text-xs text-muted-foreground">{settings.pix_bank}</p>}
                      {settings.pix_name && <p className="text-xs text-muted-foreground">{settings.pix_name}</p>}
                      {!settings.pix_key && (
                        <p className="text-xs text-muted-foreground">Dados PIX não configurados.</p>
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
                  {payment === "cartao" && (
                    <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" /> Pagamento no Cartão
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pagamentos no cartão possuem acréscimo de <strong>6%</strong> sobre o valor total do pedido.
                      </p>
                      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                        <p className="text-sm font-bold text-primary">Taxa do cartão: R$ {cardFee.toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resumo */}
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
                    {payment === "cartao" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Taxa cartão (6%)</span>
                        <span className="text-foreground">R$ {cardFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-2 flex justify-between font-bold">
                      <span className="text-foreground">Total</span>
                      <span className="text-primary">R$ {grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!hasValidDelivery || submitting}
                  className="w-full gradient-red text-primary-foreground py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-5 w-5" /> Enviar Pedido no WhatsApp
                    </>
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
