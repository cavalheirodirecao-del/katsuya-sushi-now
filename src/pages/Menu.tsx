import { useState } from "react";
import { Link } from "react-router-dom";
import { Settings, Loader2, AlertTriangle, Clock } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useProductsDB } from "@/hooks/useProductsDB";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import ProductCard from "@/components/ProductCard";
import Header from "@/components/Header";

const Menu = () => {
  const { activeCategories, loading: catLoading } = useCategories();
  const { getByCategory, loading: prodLoading } = useProductsDB();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const currentCategory = activeCategory || (activeCategories.length > 0 ? activeCategories[0].name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-") : "");

  const getCategorySlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/ç/g, "c");

  const items = activeCategories.length > 0
    ? getByCategory(activeCategory || getCategorySlug(activeCategories[0].name))
    : [];

  const loading = catLoading || prodLoading;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      {/* Category tabs */}
      <div className="sticky top-14 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="container flex gap-1 overflow-x-auto py-3 scrollbar-hide">
          {activeCategories.map((cat) => {
            const slug = getCategorySlug(cat.name);
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(slug)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  (activeCategory || getCategorySlug(activeCategories[0]?.name || "")) === slug
                    ? "gradient-red text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products */}
      <div className="container mt-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">Nenhum item disponível nesta categoria.</p>
        ) : (
          items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>

      {/* Admin quick access */}
      <Link
        to="/admin"
        className="fixed bottom-6 right-6 z-50 bg-secondary text-secondary-foreground p-3 rounded-full shadow-lg hover:bg-accent transition-colors"
        title="Área Administrativa"
      >
        <Settings className="h-5 w-5" />
      </Link>
    </div>
  );
};

export default Menu;
