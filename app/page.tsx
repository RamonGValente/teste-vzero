"use client"

import { useAuth } from "@/hooks/useAuth"
import { AuthForm } from "@/components/auth/auth-form"
import { MainLayout } from "@/components/layout/main-layout"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return user ? <MainLayout /> : <AuthForm />
}
