import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { toast } from "sonner";
import { MessageCircle, Copy } from "lucide-react";

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  number: string;
  neighborhood: string;
  complement: string;
  reference: string;
}

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<CustomerInfo>(() => {
    const saved = localStorage.getItem("katsuya-customer");
    return saved
      ? JSON.parse(saved)
      : { name: "", phone: "", email: "", address: "", number: "", neighborhood: "", complement: "", reference: "" };
  });

  const [payment, setPayment] = useState<"pix" | "dinheiro">("pix");
  const [changeFor, setChangeFor] = useState("");

  const updateField = (field: keyof CustomerInfo, value: string) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!customer.name || !customer.phone || !customer.address || !customer.number || !customer.neighborhood) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }
    if (items.length === 0) {
      toast.error("Carrinho vazio!");
      return;
    }

    localStorage.setItem("katsuya-customer", JSON.stringify(customer));

    const itemsText = items
      .map((i) => `${i.quantity}x ${i.product.name}${i.flavor ? ` (${i.flavor})` : ""} - R$ ${(i.product.price * i.quantity).toFixed(2)}`)
      .join("\n");

    const paymentText =
      payment === "pix" ? "PIX — Vou enviar o comprovante." : `Dinheiro${changeFor ? ` — Troco para R$ ${changeFor}` : ""}`;

    const message = `*Pedido Katsuya Sushi* 🍣

*Cliente:* ${customer.name}
*Telefone:* ${customer.phone}

*Endereço:*
${customer.address}, ${customer.number}
${customer.neighborhood}${customer.complement ? ` — ${customer.complement}` : ""}${customer.reference ? `\nReferência: ${customer.reference}` : ""}

*Itens do pedido:*
${itemsText}

*Total: R$ ${total.toFixed(2)}*

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
          <input className={inputClass} placeholder="Endereço *" value={customer.address} onChange={(e) => updateField("address", e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Número *" value={customer.number} onChange={(e) => updateField("number", e.target.value)} />
            <input className={inputClass} placeholder="Bairro *" value={customer.neighborhood} onChange={(e) => updateField("neighborhood", e.target.value)} />
          </div>
          <input className={inputClass} placeholder="Complemento" value={customer.complement} onChange={(e) => updateField("complement", e.target.value)} />
          <input className={inputClass} placeholder="Referência" value={customer.reference} onChange={(e) => updateField("reference", e.target.value)} />
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
          <div className="border-t border-border pt-2 flex justify-between font-bold">
            <span className="text-foreground">Total</span>
            <span className="text-primary">R$ {total.toFixed(2)}</span>
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
