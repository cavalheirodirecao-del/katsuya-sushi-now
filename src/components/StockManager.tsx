import { useState } from "react";
import { ProductDB } from "@/hooks/useProductsDB";
import { Package, AlertTriangle, Minus, Plus, Power, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StockManagerProps {
  products: ProductDB[];
  onUpdateStock: (id: string, stock: number) => Promise<boolean>;
  onToggleActive: (id: string, active: boolean) => Promise<boolean>;
}

const CATEGORIES = [
  { id: "all", label: "Todos" },
  { id: "combos", label: "Combos" },
  { id: "porcoes", label: "Porções" },
  { id: "bebidas", label: "Bebidas" },
  { id: "sobremesas", label: "Sobremesas" },
];

export const StockManager = ({ products, onUpdateStock, onToggleActive }: StockManagerProps) => {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter((p) => {
    const matchesCategory = category === "all" || p.category === category;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const lowStockCount = products.filter((p) => p.stock >= 0 && p.stock <= 5).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  const handleStockChange = async (product: ProductDB, delta: number) => {
    if (product.stock === -1) {
      // Changing from unlimited
      const newStock = delta > 0 ? delta : 0;
      const success = await onUpdateStock(product.id, newStock);
      if (success) toast.success(`Estoque de ${product.name} definido como ${newStock}`);
    } else {
      const newStock = Math.max(0, product.stock + delta);
      const success = await onUpdateStock(product.id, newStock);
      if (success) toast.success(`Estoque de ${product.name}: ${newStock}`);
    }
  };

  const setUnlimited = async (product: ProductDB) => {
    const success = await onUpdateStock(product.id, -1);
    if (success) toast.success(`${product.name} agora tem estoque ilimitado`);
  };

  const handleToggle = async (product: ProductDB) => {
    const success = await onToggleActive(product.id, !product.active);
    if (success) {
      toast.success(product.active ? `${product.name} desativado` : `${product.name} ativado`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="flex gap-3 flex-wrap">
          {outOfStockCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              {outOfStockCount} sem estoque
            </div>
          )}
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              {lowStockCount} com estoque baixo
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                category === cat.id
                  ? "gradient-red text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products List */}
      <div className="space-y-2">
        {filteredProducts.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhum produto encontrado</p>
        )}

        {filteredProducts.map((product) => {
          const isUnlimited = product.stock === -1;
          const isLowStock = !isUnlimited && product.stock <= 5;
          const isOutOfStock = product.stock === 0;

          return (
            <div
              key={product.id}
              className={cn(
                "bg-card border rounded-lg p-4 flex items-center gap-4",
                isOutOfStock && "border-red-500/50 bg-red-500/5",
                isLowStock && !isOutOfStock && "border-yellow-500/50 bg-yellow-500/5",
                !product.active && "opacity-50"
              )}
            >
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-foreground text-sm truncate">{product.name}</h4>
                  {!product.active && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      Inativo
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{product.description}</p>
                <p className="text-sm font-bold text-primary mt-1">R$ {Number(product.price).toFixed(2)}</p>
              </div>

              {/* Stock Controls */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStockChange(product, -1)}
                      disabled={isUnlimited || product.stock === 0}
                      className="p-1.5 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className={cn(
                      "w-16 text-center py-1.5 rounded font-bold text-sm",
                      isOutOfStock && "bg-red-500/20 text-red-400",
                      isLowStock && !isOutOfStock && "bg-yellow-500/20 text-yellow-400",
                      !isLowStock && !isOutOfStock && "bg-secondary text-foreground"
                    )}>
                      {isUnlimited ? "∞" : product.stock}
                    </div>
                    <button
                      onClick={() => handleStockChange(product, 1)}
                      className="p-1.5 rounded bg-secondary hover:bg-secondary/80"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => setUnlimited(product)}
                    className={cn(
                      "text-xs px-2 py-0.5 rounded transition-colors",
                      isUnlimited
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Ilimitado
                  </button>
                </div>

                {/* Toggle Active */}
                <button
                  onClick={() => handleToggle(product)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    product.active
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  )}
                  title={product.active ? "Desativar produto" : "Ativar produto"}
                >
                  <Power className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StockManager;
