"use client"

import { useEffect, useState } from "react"
import { supabase, type Contact } from "@/lib/supabase"

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select(`
          *,
          contact:profiles(*)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setContacts(data || [])
    } catch (error) {
      console.error("Error fetching contacts:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()

    // Subscribe to contact changes
    const subscription = supabase
      .channel("contacts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contacts",
        },
        () => {
          fetchContacts()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const addContact = async (userCode: string) => {
    try {
      // Find user by code
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_code", userCode)
        .single()

      if (profileError || !profile) {
        return { error: new Error("Usuário não encontrado") }
      }

      // Check if contact already exists
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("*")
        .eq("contact_id", profile.id)
        .single()

      if (existingContact) {
        return { error: new Error("Contato já adicionado") }
      }

      // Add contact
      const { error } = await supabase.from("contacts").insert({
        contact_id: profile.id,
      })

      return { error, profile }
    } catch (error) {
      return { error }
    }
  }

  const removeContact = async (contactId: string) => {
    const { error } = await supabase.from("contacts").delete().eq("contact_id", contactId)

    return { error }
  }

  return {
    contacts,
    loading,
    addContact,
    removeContact,
    refetch: fetchContacts,
  }
}
