import { Link } from "react-router-dom";
import { MapPin, Clock, Instagram, MessageCircle } from "lucide-react";
import heroImg from "@/assets/hero-sushi.jpg";
import logo from "@/assets/logo.png";
import StoreGate from "@/components/StoreGate";

const Index = () => {
  return (
    <StoreGate overlay>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative h-[85vh] flex items-end">
          <img src={heroImg} alt="Sushi" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 gradient-hero" />
          <div className="relative z-10 container pb-10 flex flex-col items-center text-center gap-4">
            <img src={logo} alt="Katsuya Sushi" className="h-24 w-24 rounded-full border-2 border-primary shadow-lg" />
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-wide">
              Katsuya Sushi Delivery
            </h1>
            <p className="text-muted-foreground text-base max-w-xs">
              O melhor sushi de Caruaru direto na sua casa
            </p>
            <Link
              to="/cardapio"
              className="gradient-red text-primary-foreground px-8 py-3.5 rounded-full font-bold text-lg shadow-lg hover:opacity-90 transition-opacity active:scale-95"
            >
              Ver Cardápio
            </Link>
          </div>
        </section>

        {/* Info */}
        <section className="container py-10 space-y-6">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-foreground text-sm">Horário de Funcionamento</h3>
                <p className="text-muted-foreground text-sm mt-1">Quarta a Domingo</p>
                <p className="text-muted-foreground text-sm">12:00 – 14:00 | 17:00 – 22:00</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-foreground text-sm">Endereço</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Rua Carlos Laert, 254 A — Indianópolis, Caruaru – PE
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href="https://instagram.com/katsuyasushidelivery"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-card border border-border rounded-xl py-3.5 flex items-center justify-center gap-2 text-foreground font-medium text-sm hover:border-primary/50 transition-colors"
            >
              <Instagram className="h-5 w-5 text-primary" />
              Instagram
            </a>
            <a
              href="https://wa.me/5581982522785"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 gradient-red rounded-xl py-3.5 flex items-center justify-center gap-2 text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="h-5 w-5" />
              WhatsApp
            </a>
          </div>
        </section>
      </div>
    </StoreGate>
  );
};

export default Index;
