import { Phone, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCall } from '@/hooks/useCall'

export function CallButtons({ contactId }: { contactId: string }) {
  const { startCall } = useCall()
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => startCall(contactId, 'audio')} title="Chamada de voz">
        <Phone className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => startCall(contactId, 'video')} title="Chamada de vídeo">
        <Video className="h-4 w-4" />
      </Button>
    </div>
  )
}
