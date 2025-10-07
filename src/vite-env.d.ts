/// <reference types="vite/client" />

// Tipos para o Robô Assistente
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Tipos para os componentes do Robô
declare module '@/components/RobotChat' {
  const RobotChat: React.ComponentType
  export default RobotChat
}

declare module '@/components/AnimatedRobot' {
  interface AnimatedRobotProps {
    currentAnimation?: 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy'
    onClick?: () => void
    size?: 'small' | 'medium' | 'large'
  }
  const AnimatedRobot: React.ComponentType<AnimatedRobotProps>
  export default AnimatedRobot
}

declare module '@/hooks/useRobotAssistant' {
  interface Message {
    type: 'user' | 'robot'
    content: string
    timestamp: Date
  }

  interface RobotConfig {
    name: string
    personality: string
    voice: string
    capabilities: string[]
  }

  export const useRobotAssistant: () => {
    isRobotActive: boolean
    setIsRobotActive: (active: boolean) => void
    conversation: Message[]
    setConversation: (conversation: Message[]) => void
    isProcessing: boolean
    robotAnimation: 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy'
    setRobotAnimation: (animation: 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy') => void
    robotConfig: RobotConfig
    sendMessageToRobot: (message: string) => Promise<void>
    startConversation: () => void
    closeConversation: () => void
  }
}