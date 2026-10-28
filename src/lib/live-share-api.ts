import { apiBase } from './api'

export type LiveSessionPublic = {
  id: string
  name: string
  updatedAt: string
  live: boolean
  mode?: 'webrtc' | 'jpeg'
  viewers?: number
}

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: string }).error || `HTTP ${res.status}`,
    )
  }
  return (await res.json()) as T
}

export async function listLiveSessions(
  signal?: AbortSignal,
): Promise<LiveSessionPublic[]> {
  const res = await fetch(`${apiBase()}/api/live`, { signal })
  const data = await parseJson<{ sessions: LiveSessionPublic[] }>(res)
  return data.sessions
}

/** WebSocket signaling URL (same-origin via Vite proxy, atau VITE_API_URL). */
export function liveWsUrl(): string {
  const base = apiBase().trim()
  if (base) {
    const u = new URL(base)
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
    u.pathname = '/api/live/ws'
    u.search = ''
    u.hash = ''
    return u.toString()
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/api/live/ws`
}

export type SignalPayload =
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; candidate: RTCIceCandidateInit | null }

export async function tuneVideoSender(pc: RTCPeerConnection) {
  const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
  if (!sender) return
  try {
    const params = sender.getParameters()
    if (!params.encodings?.length) params.encodings = [{}]
    params.encodings[0].maxBitrate = 2_500_000
    params.encodings[0].maxFramerate = 30
    await sender.setParameters(params)
  } catch {
    /* browser may reject */
  }
}
