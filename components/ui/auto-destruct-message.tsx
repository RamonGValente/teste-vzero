"use client"

import { useEffect, useState } from "react"
import type { Message } from "@/lib/supabase"

interface AutoDestructMessageProps {
  message: Message
  onDestruct: () => void
}

export function AutoDestructMessage({ message, onDestruct }: AutoDestructMessageProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isDestructing, setIsDestructing] = useState(false)
  const [visibleText, setVisibleText] = useState(message.content || "")

  useEffect(() => {
    if (!message.expires_at) return

    const expiresAt = new Date(message.expires_at).getTime()
    const now = Date.now()
    const remaining = Math.max(0, expiresAt - now)

    setTimeLeft(Math.floor(remaining / 1000))

    if (remaining <= 0) {
      startDestruction()
      return
    }

    const interval = setInterval(() => {
      const newRemaining = Math.max(0, expiresAt - Date.now())
      const newTimeLeft = Math.floor(newRemaining / 1000)

      setTimeLeft(newTimeLeft)

      if (newTimeLeft <= 0) {
        clearInterval(interval)
        startDestruction()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [message.expires_at])

  const startDestruction = () => {
    if (isDestructing) return

    setIsDestructing(true)
    const text = message.content || ""
    let currentText = text

    const destructInterval = setInterval(() => {
      if (currentText.length > 0) {
        currentText = currentText.slice(0, -1)
        setVisibleText(currentText)
      } else {
        clearInterval(destructInterval)
        onDestruct()
      }
    }, 50) // Remove one character every 50ms
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (message.message_type === "self_destruct") {
    return (
      <div className="relative">
        <div className="text-sm text-red-500 mb-1">🔥 Autodestruição: {formatTime(timeLeft)}</div>
        <div className={`${isDestructing ? "text-red-400" : ""}`}>
          {visibleText}
          {isDestructing && <span className="animate-pulse">|</span>}
        </div>
      </div>
    )
  }

  return (
    <div>
      {message.content}
      {message.expires_at && <div className="text-xs text-gray-500 mt-1">⏰ Expira em: {formatTime(timeLeft)}</div>}
    </div>
  )
}
