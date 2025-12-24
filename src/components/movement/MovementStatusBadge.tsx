import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User, Footprints, Car } from "lucide-react";

type MovementStatusType = "stopped" | "moving" | "traveling" | null;

interface MovementStatusBadgeProps {
  userId: string | undefined;
}

export const MovementStatusBadge: React.FC<MovementStatusBadgeProps> = ({
  userId,
}) => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["movement-status", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("movement_status, movement_status_enabled")
        .eq("id", userId)
        .single();

      if (error) throw error;

      return data as {
        movement_status: MovementStatusType;
        movement_status_enabled: boolean;
      };
    },
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`movement-status-listen-${userId}`)
      .on(
        "postgres_changes",
        {
          schema: "public",
          table: "profiles",
          event: "UPDATE",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as any;
          queryClient.setQueryData(
            ["movement-status", userId],
            (old: any | undefined) => ({
              ...(old ?? {}),
              movement_status:
                (row.movement_status ?? null) as MovementStatusType,
              movement_status_enabled: !!row.movement_status_enabled,
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  if (!userId || isLoading) return null;

  if (!data?.movement_status_enabled || !data.movement_status) {
    // Usuário não permite mostrar status ou está desligado
    return null;
  }

  const status = data.movement_status;

  let IconComp = User;
  let label = "Parado";

  if (status === "moving") {
    IconComp = Footprints;
    label = "Em movimento";
  } else if (status === "traveling") {
    IconComp = Car;
    label = "Viajando";
  }

  return (
    <div className="ml-2 inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-1 text-xs text-muted-foreground">
      <IconComp className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );
};
