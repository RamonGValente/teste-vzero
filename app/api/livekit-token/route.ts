
import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const { roomId, userId } = await req.json()
    if (!roomId || !userId) {
      return NextResponse.json({ error: 'Missing roomId or userId' }, { status: 400 })
    }

    const apiKey = process.env.VITE_LIVEKIT_API_KEY || process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.VITE_LIVEKIT_API_SECRET || process.env.LIVEKIT_API_SECRET
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit credentials not configured' }, { status: 500 })
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: userId,
      ttl: 2 * 60 * 60,
    })
    at.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canPublishSources: ['camera', 'microphone'],
    })
    const token = await at.toJwt()
    return NextResponse.json({ token })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
