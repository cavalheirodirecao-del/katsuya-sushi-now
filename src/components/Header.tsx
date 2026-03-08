import { ShoppingCart, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import logo from "@/assets/logo.png";

const Header = () => {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Katsuya" className="h-9 w-9 rounded-full object-cover" />
          <span className="font-display text-sm font-bold tracking-wide text-foreground">KATSUYA</span>
        </Link>
        <div className="flex items-center gap-3">
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
