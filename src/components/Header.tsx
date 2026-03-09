import { ShoppingCart, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import logo from "@/assets/logo.png";

const Header = () => {
  const { itemCount } = useCart();
  const { settings } = useCompanySettings();

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2">
          <img src={settings.logo_url || logo} alt={settings.name} className="h-9 w-9 rounded-full object-cover" />
          <span className="font-display text-sm font-bold tracking-wide text-foreground">
            {settings.name.toUpperCase().split(" ")[0] || "KATSUYA"}
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 text-muted-foreground hover:text-foreground transition-colors" title="Dashboard">
            <LayoutDashboard className="h-5 w-5" />
          </Link>
          <Link to="/cardapio" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cardápio
          </Link>
          <Link to="/carrinho" className="relative p-2">
            <ShoppingCart className="h-5 w-5 text-foreground" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
