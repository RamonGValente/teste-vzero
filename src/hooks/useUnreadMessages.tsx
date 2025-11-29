import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUnreadMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return 0;

      // Get last viewed time for messages
      const { data: lastViewed } = await supabase
        .from("last_viewed")
        .select("viewed_at")
        .eq("user_id", user.id)
        .eq("section", "messages")
        .maybeSingle();

      const lastViewedTime = lastViewed?.viewed_at || new Date(0).toISOString();

      // Get user's conversations
      const { data: userConversations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (!userConversations || userConversations.length === 0) {
        return 0;
      }

      const conversationIds = userConversations.map((c) => c.conversation_id);

      // Count messages from others created after last view
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .neq("user_id", user.id)
        .gt("created_at", lastViewedTime);

      return count || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("last_viewed")
        .upsert({
          user_id: user.id,
          section: "messages",
          viewed_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Error marking messages as read:", error);
      } else {
        // Invalidate and refetch the query to update the count
        queryClient.invalidateQueries({ queryKey: ["unread-messages", user.id] });
      }
    } catch (error) {
      console.error("Error in markAsRead:", error);
    }
  };

  return { unreadCount, markAsRead };
}