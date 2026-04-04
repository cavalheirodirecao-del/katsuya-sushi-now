// 🔥 MANTÉM SEU IMPORT ORIGINAL (NÃO MEXER)
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

// 🔥 FUNÇÃO TELEFONE
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
  const { currentCustomer, lookupByPhone } = useCustomers();
  const { createOrder } = useOrdersDB();
  const { settings } = useCompanySettings();
  const navigate = useNavigate();

  const [step, setStep] = useState<"phone" | "details">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [phoneLocked, setPhoneLocked] = useState(false);

  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("manual");

  const [payment, setPayment] = useState<PaymentMethod>("pix");
  const [changeFor, setChangeFor] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");

  const selectedNeighborhood = useMemo(() => {
    return activeNeighborhoods.find((n) => n.id === selectedNeighborhoodId) || null;
  }, [selectedNeighborhoodId, activeNeighborhoods]);

  const deliveryFee = deliveryMode === "retirada" ? 0 : selectedNeighborhood ? Number(selectedNeighborhood.fee) : 0;

  const cardFee = payment === "cartao" ? (total + deliveryFee) * 0.06 : 0;

  const grandTotal = total + deliveryFee + cardFee;

  const handlePhoneLookup = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return toast.error("Telefone inválido");

    const found = await lookupByPhone(digits);
    if (found) setName(found.name);

    setPhoneLocked(true);
    setStep("details");
  };

  const handleSubmit = async () => {
    if (!name) return toast.error("Informe seu nome");
    if (items.length === 0) return toast.error("Carrinho vazio");

    const digits = phone.replace(/\D/g, "");

    const address =
      deliveryMode === "retirada"
        ? { street: "Retirada", number: "-", neighborhood: "Retirada" }
        : { street: "-", number: "-", neighborhood: selectedNeighborhood?.name || "" };

    setSubmitting(true);

    const order = await createOrder(name, digits, address, items, total, deliveryFee, grandTotal, payment);

    if (!order) {
      setSubmitting(false);
      return toast.error("Erro ao criar pedido");
    }

    const paymentLabel = payment === "pix" ? "PIX" : payment === "cartao" ? `Cartão (+6%)` : "Dinheiro";

    const message = `Pedido ${settings.name}
Nome: ${name}
Total: R$ ${grandTotal.toFixed(2)}
Pagamento: ${paymentLabel}`;

    const encoded = encodeURIComponent(message);
    const phoneNumber = settings.phone.replace(/\D/g, "");

    setWhatsappUrl(`https://wa.me/${phoneNumber}?text=${encoded}`);
    setSubmitting(false);
  };

  return (
    <div className="container">
      <input value={formatPhone(phone)} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" />

      {!phoneLocked && <button onClick={handlePhoneLookup}>Continuar</button>}

      {step !== "phone" && (
        <>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />

          <select onChange={(e) => setSelectedNeighborhoodId(e.target.value)}>
            <option value="">Selecione bairro</option>
            {activeNeighborhoods.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} - R$ {n.fee}
              </option>
            ))}
          </select>

          <div>
            {(["pix", "dinheiro", "cartao"] as const).map((p) => (
              <button key={p} onClick={() => setPayment(p)}>
                {p}
              </button>
            ))}
          </div>

          {payment === "cartao" && <p>Taxa cartão: R$ {cardFee.toFixed(2)}</p>}

          <h2>Total: R$ {grandTotal.toFixed(2)}</h2>

          <button onClick={handleSubmit} disabled={submitting}>
            Finalizar Pedido
          </button>

          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank">
              Enviar no WhatsApp
            </a>
          )}
        </>
      )}
    </div>
  );
};

export default Checkout;
