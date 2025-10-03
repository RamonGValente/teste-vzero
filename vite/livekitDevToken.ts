import { AccessToken } from 'livekit-server-sdk';

const URL = import.meta.env.VITE_LIVEKIT_URL || import.meta.env.LIVEKIT_URL || 'wss://undoingvideochamada-d3fl2c6e.livekit.cloud';
const API_KEY = import.meta.env.LIVEKIT_API_KEY || 'API8cf7rKjdF3P5';
const API_SECRET = import.meta.env.LIVEKIT_API_SECRET || 'TKCegarkZcitpWNesUC8XUG99MYt7PIrVIY3F2tHreB';

export async function createToken({ room, identity, name }:{room:string, identity:string, name:string}) {
  const at = new AccessToken(API_KEY, API_SECRET, { identity, name });
  at.addGrant({ roomJoin: true, roomCreate: true, canPublish: true, canSubscribe: true, room });
  const token = await at.toJwt();
  return { token, url: URL };
}
