import { Plus, AlertCircle, Clock } from "lucide-react";
import { Product } from "@/hooks/useProductsDB";
import { useCart } from "@/contexts/CartContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  product: Product;
}

const ProductCard = ({ product }: Props) => {
  const { addItem } = useCart();
  const { isOpen } = useCompanySettings();
  const [selectedFlavor, setSelectedFlavor] = useState(product.flavors?.[0] || "");

  const isOutOfStock = product.stock === 0;
  const isDisabled = isOutOfStock || !isOpen;

  const handleAdd = () => {
    if (isOutOfStock) {
      toast.error("Produto esgotado!");
      return;
    }
    if (!isOpen) {
      toast.error("Fora do horário de funcionamento.");
      return;
    }
    addItem(product, selectedFlavor || undefined);
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const buttonLabel = isOutOfStock ? "Esgotado" : !isOpen ? "Fora do horário" : "Adicionar";

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden animate-fade-in">
      {product.image && (
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full shadow-lg">
            R$ {product.price.toFixed(2)}
          </div>
          {isOutOfStock && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <span className="flex items-center gap-2 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-full text-sm font-bold">
                <AlertCircle className="h-4 w-4" /> Esgotado
              </span>
            </div>
          )}
        </div>
      )}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-bold text-foreground text-base">{product.name}</h3>
            <p className="text-muted-foreground text-sm mt-1">{product.description}</p>
          </div>
          {!product.image && (
            <span className="text-primary font-bold text-lg whitespace-nowrap ml-3">
              R$ {product.price.toFixed(2)}
            </span>
          )}
        </div>

        {product.flavors && product.flavors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {product.flavors.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFlavor(f)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedFlavor === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={isDisabled}
          className="mt-2 gradient-red text-primary-foreground rounded-lg py-2.5 flex items-center justify-center gap-2 font-medium text-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!isOpen ? <Clock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {buttonLabel}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
