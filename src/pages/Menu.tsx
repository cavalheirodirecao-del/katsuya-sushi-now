import { useState } from "react";
import { categories } from "@/data/products";
import { useProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import Header from "@/components/Header";

const Menu = () => {
  const [activeCategory, setActiveCategory] = useState("combos");
  const { getByCategory } = useProducts();
  const items = getByCategory(activeCategory);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      {/* Category tabs */}
      <div className="sticky top-14 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="container flex gap-1 overflow-x-auto py-3 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? "gradient-red text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="container mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">Nenhum item disponível nesta categoria.</p>
        ) : (
          items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>
    </div>
  );
};

export default Menu;
