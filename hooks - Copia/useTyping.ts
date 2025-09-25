"use client"

import { useEffect, useState } from "react"
import { supabase, type TypingStatus } from "@/lib/supabase"

export function useTyping(conversationId: string | null) {
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([])

  useEffect(() => {
    if (!conversationId) return

    // Fetch initial typing status
    const fetchTypingStatus = async () => {
      const { data } = await supabase
        .from("typing_status")
        .select(`
          *,
          user:profiles(*)
        `)
        .eq("conversation_id", conversationId)
        .eq("is_typing", true)

      setTypingUsers(data || [])
    }

    fetchTypingStatus()

    // Subscribe to typing status changes
    const subscription = supabase
      .channel(`typing:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_status",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchTypingStatus()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [conversationId])

  const setTyping = async (isTyping: boolean) => {
    if (!conversationId) return

    await supabase.rpc("update_typing_status", {
      conv_id: conversationId,
      is_typing_now: isTyping,
    })
  }

  return {
    typingUsers,
    setTyping,
  }
}
