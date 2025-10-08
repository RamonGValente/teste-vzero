"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase, type Message } from "@/lib/supabase"

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles(*)
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    if (!conversationId) return

    // Subscribe to new messages
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data } = await supabase
            .from("messages")
            .select(`
              *,
              sender:profiles(*)
            `)
            .eq("id", payload.new.id)
            .single()

          if (data) {
            setMessages((prev) => [...prev, data])
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => prev.map((msg) => (msg.id === payload.new.id ? { ...msg, ...payload.new } : msg)))
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id))
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [conversationId])

  const sendMessage = async (
    content: string,
    type: Message["message_type"] = "text",
    fileUrl?: string,
    fileName?: string,
    expiresIn?: number,
  ) => {
    if (!conversationId) return

    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      content,
      message_type: type,
      file_url: fileUrl,
      file_name: fileName,
      expires_at: expiresAt,
    })

    return { error }
  }

  const deleteMessage = async (messageId: string, deleteFor: "me" | "everyone" = "me") => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    if (deleteFor === "everyone") {
      const { error } = await supabase.from("messages").update({ is_deleted: true }).eq("id", messageId)
      return { error }
    } else {
      // Add user to deleted_for array
      const message = messages.find((m) => m.id === messageId)
      const deletedFor = message?.deleted_for || []
      if (!deletedFor.includes(user.id)) {
        deletedFor.push(user.id)
      }

      const { error } = await supabase.from("messages").update({ deleted_for: deletedFor }).eq("id", messageId)
      return { error }
    }
  }

  return {
    messages,
    loading,
    sendMessage,
    deleteMessage,
    refetch: fetchMessages,
  }
}
