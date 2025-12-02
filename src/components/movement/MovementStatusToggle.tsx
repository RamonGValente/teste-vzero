import { Activity, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMovementStatus } from "@/contexts/MovementStatusContext";

export const MovementStatusToggle: React.FC = () => {
  const { enabled, status, speedKmh, setEnabled } = useMovementStatus();

  const handleClick = () => {
    setEnabled(!enabled);
  };

  let statusLabel = "Desligado";

  if (enabled) {
    if (status === "stopped") statusLabel = "Ligado • Parado";
    else if (status === "moving") statusLabel = "Ligado • Em movimento";
    else if (status === "traveling") statusLabel = "Ligado • Viajando";
    else statusLabel = "Ligado";
  }

  return (
    <div className="mt-4 flex items-center justify-between rounded-lg border bg-card px-4 py-3">
      <div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <span className="font-medium text-sm">Status de Movimento</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Quando ativado, seus amigos podem ver se você está parado, em
          movimento ou viajando.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Atual: <span className="font-medium">{statusLabel}</span>
          {enabled && speedKmh != null && (
            <span className="ml-1">({speedKmh.toFixed(1)} km/h)</span>
          )}
        </p>
      </div>

      <Button
        variant={enabled ? "destructive" : "outline"}
        size="sm"
        onClick={handleClick}
      >
        <Power className="h-4 w-4 mr-1" />
        {enabled ? "Desligar" : "Ligar"}
      </Button>
    </div>
  );
};
