import { Room, RoomEvent, createLocalTracks } from 'livekit-client'

export async function joinRoom(roomName: string, identity: string) {
  const res = await fetch(import.meta.env.VITE_GENERATE_TOKEN_ENDPOINT || '/functions/v1/generate-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ roomName, identity }),
  })
  if (!res.ok) throw new Error('Falha ao gerar token')
  const { token, url } = await res.json()

  const room = new Room()
  await room.connect(url, token)

  const tracks = await createLocalTracks({ audio: true, video: true })
  for (const t of tracks) await room.localParticipant.publishTrack(t)

  room.on(RoomEvent.ParticipantConnected, p => console.log('Entrou:', p.identity))
  room.on(RoomEvent.Disconnected, () => console.log('Saiu da sala'))

  return room
}
