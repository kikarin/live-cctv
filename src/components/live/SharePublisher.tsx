import { Camera, StopCircle, SwitchCamera, Users } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { liveWsUrl, tuneVideoSender, type SignalPayload } from '../../lib/live-share-api'
import {
  createPeerConnection,
  resolveIceServers,
  signalIce,
} from '../../lib/webrtc'

type ServerMsg =
  | { type: 'ready'; sessionId: string; peerId: string; name: string }
  | { type: 'viewer-joined'; viewerId: string }
  | { type: 'viewer-left'; viewerId: string }
  | { type: 'signal'; from: string; data: SignalPayload }
  | { type: 'pong' }
  | { type: 'error'; error: string }

type PeerHandle = ReturnType<typeof createPeerConnection>

export function SharePublisher() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const peersRef = useRef<Map<string, PeerHandle>>(new Map())
  const iceServersRef = useRef<RTCIceServer[]>([])
  const pingRef = useRef<number | null>(null)

  const [name, setName] = useState('')
  const [sharing, setSharing] = useState(false)
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')
  const [error, setError] = useState<string | null>(null)
  const [viewers, setViewers] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const closePeers = useCallback(() => {
    for (const peer of peersRef.current.values()) {
      peer.pc.close()
    }
    peersRef.current.clear()
    setViewers(0)
  }, [])

  const stopSharing = useCallback(() => {
    if (pingRef.current) {
      window.clearInterval(pingRef.current)
      pingRef.current = null
    }
    try {
      wsRef.current?.send(JSON.stringify({ type: 'leave' }))
    } catch {
      /* ignore */
    }
    wsRef.current?.close()
    wsRef.current = null
    closePeers()
    stopTracks()
    setSharing(false)
    setSessionId(null)
  }, [closePeers, stopTracks])

  useEffect(() => {
    return () => {
      stopSharing()
    }
  }, [stopSharing])

  const startCamera = useCallback(
    async (mode: 'user' | 'environment') => {
      stopTracks()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }
      for (const peer of peersRef.current.values()) {
        const track = stream.getVideoTracks()[0]
        const sender = peer.pc.getSenders().find((s) => s.track?.kind === 'video')
        if (sender && track) await sender.replaceTrack(track)
      }
    },
    [stopTracks],
  )

  const createPeerForViewer = useCallback(async (viewerId: string) => {
    const stream = streamRef.current
    const ws = wsRef.current
    if (!stream || !ws || ws.readyState !== WebSocket.OPEN) return

    const existing = peersRef.current.get(viewerId)
    if (existing) {
      existing.pc.close()
      peersRef.current.delete(viewerId)
    }

    const handle = createPeerConnection(iceServersRef.current)
    peersRef.current.set(viewerId, handle)
    setViewers(peersRef.current.size)
    const { pc } = handle

    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream)
    }
    await tuneVideoSender(pc)

    pc.onicecandidate = (ev) => {
      signalIce(ws, viewerId, ev.candidate)
    }

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        pc.close()
        peersRef.current.delete(viewerId)
        setViewers(peersRef.current.size)
      }
    }

    const offer = await pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    })
    await pc.setLocalDescription(offer)
    ws.send(
      JSON.stringify({
        type: 'signal',
        to: viewerId,
        data: { type: 'offer', sdp: offer } satisfies SignalPayload,
      }),
    )
  }, [])

  const onSignal = useCallback(async (from: string, data: SignalPayload) => {
    const handle = peersRef.current.get(from)
    if (!handle) return
    if (data.type === 'answer') {
      await handle.setRemote(data.sdp)
    } else if (data.type === 'ice') {
      await handle.addIce(data.candidate)
    }
  }, [])

  const startSharing = async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Browser tidak mendukung kamera.')
      return
    }
    try {
      iceServersRef.current = await resolveIceServers()
      await startCamera(facing)

      const ws = new WebSocket(liveWsUrl())
      wsRef.current = ws

      await new Promise<void>((resolve, reject) => {
        const t = window.setTimeout(
          () => reject(new Error('WebSocket timeout')),
          8000,
        )
        ws.onopen = () => {
          window.clearTimeout(t)
          resolve()
        }
        ws.onerror = () => {
          window.clearTimeout(t)
          reject(new Error('WebSocket gagal — pastikan API jalan'))
        }
      })

      ws.onmessage = (ev) => {
        let msg: ServerMsg
        try {
          msg = JSON.parse(String(ev.data)) as ServerMsg
        } catch {
          return
        }
        if (msg.type === 'ready') {
          setSessionId(msg.sessionId)
          setSharing(true)
        } else if (msg.type === 'viewer-joined') {
          void createPeerForViewer(msg.viewerId)
        } else if (msg.type === 'viewer-left') {
          const peer = peersRef.current.get(msg.viewerId)
          peer?.pc.close()
          peersRef.current.delete(msg.viewerId)
          setViewers(peersRef.current.size)
        } else if (msg.type === 'signal') {
          void onSignal(msg.from, msg.data)
        } else if (msg.type === 'error') {
          setError(msg.error)
        }
      }

      ws.onclose = () => {
        if (wsRef.current === ws) {
          closePeers()
          stopTracks()
          setSharing(false)
          setSessionId(null)
        }
      }

      ws.send(
        JSON.stringify({
          type: 'publisher-start',
          name: name.trim() || 'Mahasiswa',
        }),
      )

      pingRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 10000)
    } catch (err) {
      stopSharing()
      setError(err instanceof Error ? err.message : 'Gagal mulai share')
    }
  }

  const flipCamera = async () => {
    const next = facing === 'environment' ? 'user' : 'environment'
    setFacing(next)
    if (!sharing) return
    try {
      await startCamera(next)
    } catch {
      setError('Gagal ganti kamera')
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
      <div>
        <h2 className="font-medium">Bagikan dari HP kamu</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Stream WebRTC ~30 fps. Di internet publik biasanya perlu TURN di
          server (kalau hitam di production, itu penyebabnya).
        </p>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-[var(--muted)]">Nama tampilan</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={sharing}
          placeholder="Mis. Ilham · Bundaran HI"
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5"
          maxLength={40}
        />
      </label>

      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-black sm:aspect-video">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {!sharing ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a1018] text-sm text-[var(--muted)]">
            Preview kamera muncul setelah mulai share
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-[var(--error)]" role="alert">
          {error}
        </p>
      ) : null}
      {sharing ? (
        <p className="flex flex-wrap items-center gap-3 text-xs text-[var(--accent)]">
          <span>
            Live WebRTC{sessionId ? ` · ${sessionId.slice(0, 6)}` : ''}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={12} aria-hidden />
            {viewers} penonton
          </span>
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!sharing ? (
          <button
            type="button"
            onClick={() => void startSharing()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-4 py-3 text-sm font-medium text-[var(--accent)]"
          >
            <Camera size={18} aria-hidden />
            Mulai share kamera
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => stopSharing()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-[var(--error)]/40 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)]"
            >
              <StopCircle size={18} aria-hidden />
              Stop share
            </button>
            <button
              type="button"
              onClick={() => void flipCamera()}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] px-4 py-3 text-sm"
              aria-label="Ganti kamera depan/belakang"
            >
              <SwitchCamera size={18} aria-hidden />
              Flip
            </button>
          </>
        )}
      </div>
    </div>
  )
}
