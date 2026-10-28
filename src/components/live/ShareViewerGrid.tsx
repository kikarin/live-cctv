import { useEffect, useRef, useState } from 'react'
import {
  fetchIceConfig,
  listLiveSessions,
  liveWsUrl,
  type LiveSessionPublic,
  type SignalPayload,
} from '../../lib/live-share-api'
import {
  createPeerConnection,
  resolveIceServers,
  signalIce,
  watchMediaFlow,
} from '../../lib/webrtc'

type ServerMsg =
  | { type: 'joined'; sessionId: string; peerId: string; name: string }
  | { type: 'publisher-left' }
  | { type: 'signal'; from: string; data: SignalPayload }
  | { type: 'error'; error: string }
  | { type: 'pong' }

function WebrtcTile({ session }: { session: LiveSessionPublic }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<ReturnType<typeof createPeerConnection> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const stopWatchRef = useRef<(() => void) | null>(null)
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>(
    'connecting',
  )
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const ws = new WebSocket(liveWsUrl())
    wsRef.current = ws

    const cleanup = () => {
      stopWatchRef.current?.()
      stopWatchRef.current = null
      ws.close()
      peerRef.current?.pc.close()
      peerRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }

    void (async () => {
      const iceServers = await resolveIceServers()
      if (cancelled) return

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'viewer-join', sessionId: session.id }))
      }

      ws.onmessage = (ev) => {
        if (cancelled) return
        let msg: ServerMsg
        try {
          msg = JSON.parse(String(ev.data)) as ServerMsg
        } catch {
          return
        }

        if (msg.type === 'joined') {
          setStatus('connecting')
        } else if (msg.type === 'publisher-left') {
          setStatus('error')
          setErr('Publisher stop')
          cleanup()
        } else if (msg.type === 'error') {
          setStatus('error')
          setErr(msg.error)
        } else if (msg.type === 'signal') {
          void (async () => {
            const data = msg.data
            if (data.type === 'offer') {
              peerRef.current?.pc.close()
              stopWatchRef.current?.()
              const handle = createPeerConnection(iceServers)
              peerRef.current = handle
              const { pc } = handle

              pc.ontrack = (e) => {
                const stream = e.streams[0] ?? new MediaStream([e.track])
                if (videoRef.current) {
                  videoRef.current.srcObject = stream
                  void videoRef.current.play().catch(() => undefined)
                }
                // Jangan bilang LIVE sebelum frame benar-benar mengalir
                setStatus('connecting')
                stopWatchRef.current = watchMediaFlow(
                  pc,
                  () => {
                    setStatus('live')
                    setErr(null)
                  },
                  (reason) => {
                    setStatus('error')
                    setErr(reason)
                  },
                )
              }

              pc.onicecandidate = (iceEv) => {
                signalIce(ws, undefined, iceEv.candidate)
              }

              pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'failed') {
                  setStatus('error')
                  setErr('Koneksi WebRTC gagal — set TURN di server')
                }
              }

              await handle.setRemote(data.sdp)
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              ws.send(
                JSON.stringify({
                  type: 'signal',
                  data: { type: 'answer', sdp: answer } satisfies SignalPayload,
                }),
              )
            } else if (data.type === 'ice') {
              await peerRef.current?.addIce(data.candidate)
            }
          })()
        }
      }

      ws.onerror = () => {
        if (!cancelled) {
          setStatus('error')
          setErr('WebSocket error')
        }
      }
    })()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [session.id])

  return (
    <article className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)]">
      <div className="relative aspect-[3/4] bg-black sm:aspect-video">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          autoPlay
          muted
        />
        {status !== 'live' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-3 text-center text-sm text-[var(--muted)]">
            {status === 'connecting'
              ? 'Menyambung media…'
              : err || 'Error'}
          </div>
        ) : null}
        <div className="absolute left-2 top-2 rounded border border-[var(--accent)]/40 bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
          {status === 'live' ? 'Live 30fps' : status === 'connecting' ? 'ICE…' : 'Error'}
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-medium">{session.name}</p>
        <p className="text-xs text-[var(--muted)]">
          WebRTC
          {typeof session.viewers === 'number'
            ? ` · ${session.viewers} penonton`
            : ''}
        </p>
      </div>
    </article>
  )
}

export function ShareViewerGrid() {
  const [sessions, setSessions] = useState<LiveSessionPublic[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hasTurn, setHasTurn] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const list = await listLiveSessions()
        if (!cancelled) {
          setSessions(list.filter((s) => s.live && s.mode !== 'jpeg'))
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal muat sesi')
        }
      }
    }
    void tick()
    const id = window.setInterval(() => void tick(), 2000)

    void fetchIceConfig()
      .then((cfg) => {
        if (!cancelled) setHasTurn(cfg.hasTurn)
      })
      .catch(() => {
        if (!cancelled) setHasTurn(false)
      })

    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-medium">Yang lagi share sekarang</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Video peer-to-peer WebRTC (~30 fps).
        </p>
        {hasTurn === false ? (
          <p className="mt-2 text-sm text-[var(--warning)]">
            Server belum pakai TURN. Di internet publik layar sering hitam
            meski local aman — set <code>TURN_*</code> di API (lihat{' '}
            <code>docs/DEPLOY.md</code>).
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-[var(--warning)]">{error}</p>
      ) : null}
      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
          Belum ada yang share. Buka tab <strong>Bagikan</strong> di HP untuk
          mulai.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s) => (
            <WebrtcTile key={s.id} session={s} />
          ))}
        </div>
      )}
    </div>
  )
}
