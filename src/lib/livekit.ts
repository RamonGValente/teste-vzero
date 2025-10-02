import { Room, RoomEvent, RemoteTrackPublication, createLocalTracks } from 'livekit-client'

export async function connectAndAttach(token: string, container: HTMLElement) {
  const room = new Room()
  await room.connect(import.meta.env.VITE_LIVEKIT_URL, token, { autoSubscribe: true })

  try {
    const localTracks = await createLocalTracks({ audio: true, video: true })
    for (const t of localTracks) await room.localParticipant.publishTrack(t)
  } catch (e) {
    console.warn('Local tracks não publicados (ok para voz):', e)
  }

  const addEl = (mediaStreamTrack: MediaStreamTrack) => {
    const el = document.createElement(mediaStreamTrack.kind === 'video' ? 'video' : 'audio')
    el.autoplay = true
    el.playsInline = true
    if (mediaStreamTrack.kind === 'video') (el as HTMLVideoElement).muted = false
    el.srcObject = new MediaStream([mediaStreamTrack])
    container.appendChild(el)
  }

  room.on(RoomEvent.TrackSubscribed, (_track, pub: RemoteTrackPublication) => {
    const t = pub.track?.mediaStreamTrack
    if (t) addEl(t)
  })
  room.on(RoomEvent.Disconnected, () => { container.innerHTML = '' })

  return room
}
