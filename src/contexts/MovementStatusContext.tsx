import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type MovementStatusType = "stopped" | "moving" | "traveling" | null;

interface MovementStatusContextValue {
  enabled: boolean;
  status: MovementStatusType;
  speedKmh: number | null;
  setEnabled: (value: boolean) => Promise<void>;
}

const MovementStatusContext = createContext<MovementStatusContextValue | undefined>(
  undefined
);

export const MovementStatusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [enabled, setEnabledState] = useState(false);
  const [status, setStatus] = useState<MovementStatusType>(null);
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);
  const statusRef = useRef<MovementStatusType>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Carrega config inicial do perfil
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("movement_status_enabled, movement_status")
        .eq("id", user.id)
        .single();

      if (!isMounted) return;

      if (error) {
        console.error("Erro carregando movement_status:", error);
        return;
      }

      const enabledFromDb = !!data?.movement_status_enabled;
      const statusFromDb = (data?.movement_status ?? null) as MovementStatusType;

      setEnabledState(enabledFromDb);
      setStatus(statusFromDb);
      statusRef.current = statusFromDb;
    };

    loadProfile();

    // Assina atualizações do próprio perfil (se mudar de outro lugar)
    const channel = supabase
      .channel(`movement-status-self-${user.id}`)
      .on(
        "postgres_changes",
        {
          schema: "public",
          table: "profiles",
          event: "UPDATE",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (typeof row.movement_status_enabled === "boolean") {
            setEnabledState(row.movement_status_enabled);
          }
          if (row.movement_status !== undefined) {
            const s = (row.movement_status ?? null) as MovementStatusType;
            setStatus(s);
            statusRef.current = s;
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Haversine pra calcular distância em metros
  const distanceInMeters = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371e3; // raio da Terra em metros
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c;
    return d;
  };

  const lastPointRef = useRef<{
    lat: number;
    lon: number;
    timestamp: number;
  } | null>(null);

  // Observa localização quando enabled = true
  useEffect(() => {
    if (!user) return;

    if (!enabled) {
      // Se desligou, para o watch
      if (watchId !== null && navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      setSpeedKmh(null);
      return;
    }

    if (!("geolocation" in navigator)) {
      toast({
        variant: "destructive",
        title: "Geolocalização não suportada",
        description:
          "Seu navegador não suporta geolocalização. O Status de Movimento não poderá ser usado.",
      });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, speed } = position.coords;
        const now = position.timestamp;

        let speedKmhCalc: number | null = null;

        if (speed != null && !Number.isNaN(speed)) {
          // speed vem em m/s
          speedKmhCalc = speed * 3.6;
        } else if (lastPointRef.current) {
          const dtSeconds = (now - lastPointRef.current.timestamp) / 1000;
          if (dtSeconds > 0) {
            const dMeters = distanceInMeters(
              lastPointRef.current.lat,
              lastPointRef.current.lon,
              latitude,
              longitude
            );
            const speedMs = dMeters / dtSeconds;
            speedKmhCalc = speedMs * 3.6;
          }
        }

        lastPointRef.current = {
          lat: latitude,
          lon: longitude,
          timestamp: now,
        };

        if (speedKmhCalc == null) {
          // sem como estimar, não muda status
          return;
        }

        setSpeedKmh(speedKmhCalc);

        let newStatus: MovementStatusType = "stopped";
        if (speedKmhCalc > 1 && speedKmhCalc <= 10) {
          newStatus = "moving";
        } else if (speedKmhCalc > 10) {
          newStatus = "traveling";
        }

        if (newStatus !== statusRef.current) {
          statusRef.current = newStatus;
          setStatus(newStatus);

          // Atualiza apenas o status no perfil
          const { error } = await supabase
            .from("profiles")
            .update({ movement_status: newStatus })
            .eq("id", user.id);

          if (error) {
            console.error("Erro atualizando movement_status:", error);
          }
        }
      },
      (error) => {
        console.error("Erro no watchPosition:", error);
        toast({
          variant: "destructive",
          title: "Erro de localização",
          description:
            "Não foi possível obter sua localização. Confira as permissões de GPS.",
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      }
    );

    setWatchId(id);

    return () => {
      if (navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user?.id]);

  // Função pública pra ligar/desligar
  const setEnabled = async (value: boolean) => {
    if (!user) return;

    setEnabledState(value);

    try {
      const updates: any = { movement_status_enabled: value };
      if (!value) {
        updates.movement_status = null;
        statusRef.current = null;
        setStatus(null);
        setSpeedKmh(null);
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      toast({
        title: `Status de Movimento ${value ? "ativado" : "desativado"}`,
        description: value
          ? "Seus amigos poderão ver seu status de movimento."
          : "Seu status de movimento ficará oculto para todos.",
      });
    } catch (err: any) {
      console.error("Erro ao atualizar movement_status_enabled:", err);
      toast({
        variant: "destructive",
        title: "Erro ao salvar configuração",
        description:
          err?.message || "Não foi possível atualizar o Status de Movimento.",
      });
    }
  };

  return (
    <MovementStatusContext.Provider
      value={{
        enabled,
        status,
        speedKmh,
        setEnabled,
      }}
    >
      {children}
    </MovementStatusContext.Provider>
  );
};

export const useMovementStatus = () => {
  const ctx = useContext(MovementStatusContext);
  if (!ctx) {
    throw new Error(
      "useMovementStatus deve ser usado dentro de MovementStatusProvider"
    );
  }
  return ctx;
};
