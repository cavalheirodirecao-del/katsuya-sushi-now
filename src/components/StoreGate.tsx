import { useCompanySettings } from "@/hooks/useCompanySettings";
import { AlertTriangle, Clock } from "lucide-react";

interface StoreGateProps {
  children: React.ReactNode;
  /** If true, shows overlay on top of children instead of replacing them */
  overlay?: boolean;
}

const StoreGate = ({ children, overlay }: StoreGateProps) => {
  const { loading, isOpen, isHighDemand, highDemandMessage, isWithinBusinessHours } =
    useCompanySettings();

  if (loading) return <>{children}</>;
  if (isOpen) return <>{children}</>;

  const message = isHighDemand
    ? highDemandMessage
    : "Estamos fora do horário de funcionamento no momento.";

  const icon = isHighDemand ? (
    <AlertTriangle className="h-10 w-10 text-destructive" />
  ) : (
    <Clock className="h-10 w-10 text-primary" />
  );

  const banner = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-6">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center space-y-4 shadow-xl">
        {icon}
        <h2 className="text-lg font-bold text-foreground">
          {isHighDemand ? "Alta Demanda" : "Fechado"}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
      </div>
    </div>
  );

  if (overlay) {
    return (
      <>
        {children}
        {banner}
      </>
    );
  }

  return banner;
};

export default StoreGate;
