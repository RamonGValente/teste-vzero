"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase, type Profile } from "@/lib/supabase"
import { ContactList } from "@/components/contacts/contact-list"
import { ChatWindow } from "@/components/chat/chat-window"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Users, Settings, LogOut, Moon, Sun, Menu, X } from "lucide-react"
import { useTheme } from "next-themes"

export function MainLayout() {
  const { user, profile, signOut, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const [activeView, setActiveView] = useState<"contacts" | "chat">("contacts")
  const [selectedContact, setSelectedContact] = useState<Profile | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Update user status on mount and visibility change
  useEffect(() => {
    const updateStatus = (status: "online" | "offline") => {
      supabase.rpc("update_user_status", { new_status: status })
    }

    updateStatus("online")

    const handleVisibilityChange = () => {
      updateStatus(document.hidden ? "offline" : "online")
    }

    const handleBeforeUnload = () => {
      updateStatus("offline")
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      updateStatus("offline")
    }
  }, [])

  const handleSelectContact = (contact: Profile, convId: string) => {
    setSelectedContact(contact)
    setConversationId(convId)
    setActiveView("chat")
    setSidebarOpen(false)
  }

  const handleBackToContacts = () => {
    setActiveView("contacts")
    setSelectedContact(null)
    setConversationId(null)
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const toggleStatus = async () => {
    const newStatus = profile?.status === "online" ? "busy" : "online"
    await updateProfile({ status: newStatus })
  }

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:relative z-30 w-80 h-full bg-white dark:bg-gray-800 border-r transition-transform duration-300 ease-in-out`}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold">UndoinG</h1>
            </div>
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar>
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback>{profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
              <button
                onClick={toggleStatus}
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white cursor-pointer ${
                  profile?.status === "online" ? "bg-green-500" : "bg-red-500"
                }`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{profile?.full_name || "Usuário"}</p>
              <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              <Badge variant="outline" className="text-xs mt-1">
                {profile?.user_code}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 border-b">
          <div className="flex space-x-2">
            <Button
              variant={activeView === "contacts" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveView("contacts")}
              className="flex-1"
            >
              <Users className="h-4 w-4 mr-2" />
              Contatos
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeView === "contacts" && (
            <div className="p-4 h-full">
              <ContactList onSelectContact={handleSelectContact} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold">UndoinG</h1>
          <div className="w-8" /> {/* Spacer */}
        </div>

        {/* Chat Area */}
        <div className="flex-1">
          {selectedContact && conversationId ? (
            <ChatWindow contact={selectedContact} conversationId={conversationId} onBack={handleBackToContacts} />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">Selecione um contato</h2>
                <p className="text-gray-500">Escolha um contato para começar a conversar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
