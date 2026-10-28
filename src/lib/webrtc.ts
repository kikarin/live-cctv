import { ICE_SERVERS, fetchIceServers, type SignalPayload } from './live-share-api'

/** Antrikan ICE sampai remote description siap — kritis di NAT publik. */
export function createPeerConnection(iceServers?: RTCIceServer[]) {
  const pc = new RTCPeerConnection({
    iceServers: iceServers?.length ? iceServers : ICE_SERVERS,
    iceCandidatePoolSize: 8,
  })
  const pending: RTCIceCandidateInit[] = []
  let remoteReady = false

  const flush = async () => {
    while (pending.length) {
      const c = pending.shift()
      if (!c) continue
      try {
        await pc.addIceCandidate(c)
      } catch {
        /* ignore stale */
      }
    }
  }

  return {
    pc,
    async setRemote(desc: RTCSessionDescriptionInit) {
      await pc.setRemoteDescription(desc)
      remoteReady = true
      await flush()
    },
    async addIce(candidate: RTCIceCandidateInit | null) {
      if (!candidate) return
      if (!remoteReady) {
        pending.push(candidate)
        return
      }
      try {
        await pc.addIceCandidate(candidate)
      } catch {
        /* ignore */
      }
    },
  }
}

export async function resolveIceServers(): Promise<RTCIceServer[]> {
  try {
    return await fetchIceServers()
  } catch {
    return ICE_SERVERS
  }
}

export function watchMediaFlow(
  pc: RTCPeerConnection,
  onFlowing: () => void,
  onStuck: (reason: string) => void,
) {
  let flowing = false
  const started = Date.now()
  const id = window.setInterval(() => {
    void pc.getStats().then((stats) => {
      let frames = 0
      let bytes = 0
      stats.forEach((r) => {
        if (r.type === 'inbound-rtp' && 'kind' in r && r.kind === 'video') {
          const v = r as { framesDecoded?: number; bytesReceived?: number }
          frames = Number(v.framesDecoded ?? 0)
          bytes = Number(v.bytesReceived ?? 0)
        }
      })
      if (frames > 0 || bytes > 2000) {
        if (!flowing) {
          flowing = true
          onFlowing()
        }
        return
      }
      const ice = pc.iceConnectionState
      const conn = pc.connectionState
      if (
        !flowing &&
        (ice === 'failed' ||
          conn === 'failed' ||
          Date.now() - started > 8000)
      ) {
        window.clearInterval(id)
        onStuck(
          ice === 'failed' || conn === 'failed'
            ? 'Koneksi gagal'
            : 'Video belum masuk',
        )
      }
    })
  }, 1000)
  return () => window.clearInterval(id)
}

export function signalIce(
  ws: WebSocket,
  to: string | undefined,
  candidate: RTCIceCandidate | null,
) {
  if (ws.readyState !== WebSocket.OPEN) return
  const data: SignalPayload = {
    type: 'ice',
    candidate: candidate ? candidate.toJSON() : null,
  }
  ws.send(
    JSON.stringify(
      to ? { type: 'signal', to, data } : { type: 'signal', data },
    ),
  )
}
