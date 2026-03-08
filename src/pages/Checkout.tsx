import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { useNeighborhoods } from "@/hooks/useNeighborhoods";
import Header from "@/components/Header";
import { toast } from "sonner";
import { MessageCircle, Copy, ChevronDown } from "lucide-react";

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  number: string;
  complement: string;
  reference: string;
}

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const { activeNeighborhoods } = useNeighborhoods();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<CustomerInfo>(() => {
    const saved = localStorage.getItem("katsuya-customer");
    return saved
      ? JSON.parse(saved)
      : { name: "", phone: "", email: "", address: "", number: "", complement: "", reference: "" };
  });

  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState("");
  const [payment, setPayment] = useState<"pix" | "dinheiro">("pix");
  const [changeFor, setChangeFor] = useState("");

  const selectedNeighborhood = activeNeighborhoods.find((n) => n.id === selectedNeighborhoodId);
  const deliveryFee = selectedNeighborhood?.fee || 0;
  const grandTotal = total + deliveryFee;

  const updateField = (field: keyof CustomerInfo, value: string) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!customer.name || !customer.phone || !customer.address || !customer.number) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }
    if (!selectedNeighborhoodId) {
      toast.error("Selecione o bairro de entrega!");
      return;
    }
    if (items.length === 0) {
      toast.error("Carrinho vazio!");
      return;
    }

    localStorage.setItem("katsuya-customer", JSON.stringify(customer));

    const itemsText = items
      .map((i) => `${i.quantity}x ${i.product.name}${i.flavor ? ` (${i.flavor})` : ""}${i.notes ? `\n   _Obs: ${i.notes}_` : ""}`)
      .join("\n");

    const paymentText =
      payment === "pix" ? "PIX — Vou enviar o comprovante." : `Dinheiro${changeFor ? ` — Troco para R$ ${changeFor}` : ""}`;

    const message = `*Pedido Katsuya Sushi* 🍣

*Cliente:* ${customer.name}
*Telefone:* ${customer.phone}

*Endereço:*
${customer.address}, ${customer.number}
Bairro: ${selectedNeighborhood?.name}${customer.complement ? `\nComplemento: ${customer.complement}` : ""}${customer.reference ? `\nPonto de referência: ${customer.reference}` : ""}

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

        {/* Customer info */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">Dados de Entrega</h2>
          <input className={inputClass} placeholder="Nome *" value={customer.name} onChange={(e) => updateField("name", e.target.value)} />
          <input className={inputClass} placeholder="Telefone *" value={customer.phone} onChange={(e) => updateField("phone", e.target.value)} />
          <input className={inputClass} placeholder="Email" value={customer.email} onChange={(e) => updateField("email", e.target.value)} />
          <input className={inputClass} placeholder="Rua *" value={customer.address} onChange={(e) => updateField("address", e.target.value)} />
          <input className={inputClass} placeholder="Número *" value={customer.number} onChange={(e) => updateField("number", e.target.value)} />

          {/* Neighborhood dropdown */}
          <div className="relative">
            <select
              value={selectedNeighborhoodId}
              onChange={(e) => setSelectedNeighborhoodId(e.target.value)}
              className={`${inputClass} appearance-none pr-10 ${!selectedNeighborhoodId ? "text-muted-foreground" : ""}`}
            >
              <option value="">Selecionar bairro *</option>
              {activeNeighborhoods.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} — R$ {n.fee.toFixed(2)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          {selectedNeighborhood && (
            <p className="text-xs text-primary">
              🛵 Taxa de entrega para {selectedNeighborhood.name}: R$ {selectedNeighborhood.fee.toFixed(2)}
            </p>
          )}

          <input className={inputClass} placeholder="Complemento" value={customer.complement} onChange={(e) => updateField("complement", e.target.value)} />
          <input className={inputClass} placeholder="Ponto de referência (ex: próximo ao posto)" value={customer.reference} onChange={(e) => updateField("reference", e.target.value)} />
        </div>

        {/* Payment */}
        <div className="space-y-3">
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
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
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
                {selectedNeighborhood ? `R$ ${deliveryFee.toFixed(2)}` : "Selecione o bairro"}
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
      </div>
    </div>
  );
};

export default Checkout;
