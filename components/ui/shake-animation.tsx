"use client"

import type React from "react"

import { useEffect, useState } from "react"

interface ShakeAnimationProps {
  children: React.ReactNode
  trigger: boolean
  onComplete?: () => void
}

export function ShakeAnimation({ children, trigger, onComplete }: ShakeAnimationProps) {
  const [isShaking, setIsShaking] = useState(false)

  useEffect(() => {
    if (trigger) {
      setIsShaking(true)

      // Play attention sound
      const audio = new Audio("/sounds/alert.mp3")
      audio.play().catch(() => {
        // Fallback to system beep if audio file not available
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance("beep")
          utterance.volume = 0.1
          utterance.rate = 10
          speechSynthesis.speak(utterance)
        }
      })

      const timer = setTimeout(() => {
        setIsShaking(false)
        onComplete?.()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [trigger, onComplete])

  return <div className={`${isShaking ? "animate-shake" : ""}`}>{children}</div>
}
