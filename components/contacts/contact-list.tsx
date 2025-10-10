"use client"

import { useState } from "react"
import { useContacts } from "@/hooks/useContacts"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, UserPlus, Search, Trash2 } from "lucide-react"
import type { Profile } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"

interface ContactListProps {
  onSelectContact: (contact: Profile, conversationId: string) => void
}

export function ContactList({ onSelectContact }: ContactListProps) {
  const [searchCode, setSearchCode] = useState("")
  const [searchFilter, setSearchFilter] = useState("")
  const { contacts, loading, addContact, removeContact } = useContacts()

  const handleAddContact = async () => {
    if (!searchCode.match(/^UDG\d{7}$/)) {
      alert("Código deve ter formato UDG + 7 números (ex: UDG1234567)")
      return
    }

    const { error, profile } = await addContact(searchCode)
    if (error) {
      alert(error.message)
    } else {
      setSearchCode("")
      alert(`Contato ${profile?.full_name} adicionado!`)
    }
  }

  const handleStartChat = async (contact: Profile) => {
    // Get or create conversation
    const { data } = await supabase.rpc("get_or_create_conversation", {
      other_user_id: contact.id,
    })

    if (data) {
      onSelectContact(contact, data)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "busy":
        return "bg-red-500"
      default:
        return "bg-gray-400"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "Online"
      case "busy":
        return "Ocupado"
      default:
        return "Offline"
    }
  }

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.contact?.full_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      contact.contact?.username?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      contact.contact?.user_code?.toLowerCase().includes(searchFilter.toLowerCase()),
  )

  return (
    <div className="h-full flex flex-col">
      {/* Add Contact Section */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Adicionar Contato</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="UDG1234567"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              maxLength={10}
            />
            <Button onClick={handleAddContact} disabled={loading}>
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Filter */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar contatos..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredContacts.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {contacts.length === 0 ? "Nenhum contato adicionado" : "Nenhum contato encontrado"}
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <Card key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={contact.contact?.avatar_url || undefined} />
                        <AvatarFallback>
                          {contact.contact?.full_name?.charAt(0) || contact.contact?.username?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(contact.contact?.status || "offline")}`}
                      />
                    </div>

                    <div>
                      <h4 className="font-semibold">{contact.contact?.full_name || contact.contact?.username}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {contact.contact?.user_code}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {getStatusText(contact.contact?.status || "offline")}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => contact.contact && handleStartChat(contact.contact)}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => removeContact(contact.contact_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
