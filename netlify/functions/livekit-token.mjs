import { AccessToken } from 'livekit-server-sdk'

export async function handler(event) {
  try {
    const params = event.queryStringParameters || {}
    const room = params.room || 'udg'
    const identity = params.identity || 'user'
    const name = params.name || identity

    const url = process.env.LIVEKIT_URL || process.env.VITE_LIVEKIT_URL
    const key = process.env.LIVEKIT_API_KEY
    const secret = process.env.LIVEKIT_API_SECRET
    if (!url || !key || !secret) {
      return { statusCode: 500, body: JSON.stringify({ error: 'LIVEKIT envs não configuradas' }) }
    }

    const at = new AccessToken(key, secret, { identity, name })
    at.addGrant({ roomJoin: true, roomCreate: true, canPublish: true, canSubscribe: true, room })
    const token = await at.toJwt()

    return { statusCode: 200, body: JSON.stringify({ token, url }) }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) }
  }
}
