import { Link } from 'react-router-dom'
import { Play, RefreshCw, Volume2, VolumeX, VideoOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { reportCameraHealth } from '../../lib/api'
import type { Camera } from '../../types/camera'

type PlayerState = 'idle' | 'loading' | 'playing' | 'error'

/** Balitower sering lambat; di atas ini onLoad biasanya halaman error Chrome. */
const EMBED_TIMEOUT_MS = 8_000

export function CameraPlayer({
  camera,
  enableAudio = false,
  autoStart = false,
}: {
  camera: Camera
  enableAudio?: boolean
  /** Default false — user klik dulu (lebih cepat & jarang timeout). */
  autoStart?: boolean
}) {
  if (camera.streamUrl) {
    return (
      <HlsPlayer
        streamUrl={camera.streamUrl}
        enableAudio={enableAudio}
      />
    )
  }
  if (camera.embedUrl) {
    return (
      <EmbedPlayer
        camera={camera}
        embedUrl={camera.embedUrl}
        enableAudio={enableAudio}
        autoStart={autoStart}
      />
    )
  }
  return <NoStreamFallback camera={camera} />
}

function NoStreamFallback({ camera }: { camera: Camera }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-lg border border-[var(--border)] bg-[#0a1018] p-6 text-center">
      <VideoOff className="text-[var(--muted)]" size={36} aria-hidden />
      <div className="max-w-md space-y-2">
        <p className="text-sm font-medium">Stream in-app tidak tersedia</p>
        <p className="text-sm text-[var(--muted)]">
          {camera.name} — tautan sumber ada di halaman Direktori.
        </p>
      </div>
      <Link
        to="/cameras"
        className="rounded border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-2 text-sm text-[var(--accent)] hover:bg-[var(--accent)]/20"
      >
        Buka Direktori
      </Link>
    </div>
  )
}

function EmbedPlayer({
  camera,
  embedUrl,
  enableAudio,
  autoStart,
}: {
  camera: Camera
  embedUrl: string
  enableAudio: boolean
  autoStart: boolean
}) {
  const [state, setState] = useState<PlayerState>('idle')
  const [key, setKey] = useState(0)
  const [started, setStarted] = useState(autoStart)
  const loadStartedAt = useRef(0)

  const remountEmbed = () => {
    loadStartedAt.current = Date.now()
    setState('loading')
    setKey((k) => k + 1)
    setStarted(true)
  }

  useEffect(() => {
    if (!started) return
    loadStartedAt.current = Date.now()
    setState('loading')
    const id = window.setTimeout(() => {
      setState((s) => {
        if (s === 'loading') {
          void reportCameraHealth(camera.id, {
            ok: false,
            latencyMs: EMBED_TIMEOUT_MS,
            embedUrl,
          })
          return 'error'
        }
        return s
      })
    }, EMBED_TIMEOUT_MS)
    return () => window.clearTimeout(id)
  }, [key, embedUrl, started, camera.id])

  if (!started) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-lg border border-[var(--border)] bg-[#0a1018] p-6 text-center">
        <div className="max-w-md space-y-2">
          <p className="text-sm font-medium">{camera.name}</p>
          <p className="text-sm text-[var(--muted)]">
            Host Balitower sering overload. Coba putar sekali; kalau timeout,
            pakai Share Demo dari HP di lokasi.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={remountEmbed}
            className="inline-flex items-center gap-2 rounded border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-5 py-2.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/25"
          >
            <Play size={16} aria-hidden />
            Putar embed
          </button>
          <Link
            to="/live?tab=share"
            className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-4 py-2.5 text-sm"
          >
            Share dari HP
          </Link>
        </div>
      </div>
    )
  }

  const allow =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen'

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[var(--border)] bg-black">
      {enableAudio ? (
        <div className="absolute left-2 top-2 z-20 inline-flex items-center gap-1 rounded border border-[var(--accent)]/40 bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
          <Volume2 size={12} aria-hidden />
          Audio
        </div>
      ) : null}

      {state === 'loading' ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70 text-sm text-[var(--muted)]">
          <p>Memuat embed…</p>
          <p className="text-xs">Timeout {EMBED_TIMEOUT_MS / 1000}s</p>
        </div>
      ) : null}

      {state === 'error' ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#0a1018] p-4 text-center">
          <p className="text-sm font-medium">Embed timeout / tidak merespons</p>
          <p className="max-w-sm text-xs text-[var(--muted)]">
            Sumber resmi lagi down/overload. Coba embed ulang sekali, atau
            langsung share kondisi dari HP.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={remountEmbed}
              className="inline-flex items-center gap-2 rounded border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-4 py-2 text-sm font-medium text-[var(--accent)]"
            >
              <RefreshCw size={14} aria-hidden />
              Embed ulang
            </button>
            <Link
              to="/live?tab=share"
              className="rounded border border-[var(--warning)]/40 px-3 py-2 text-sm text-[var(--warning)]"
            >
              Share dari HP
            </Link>
          </div>
        </div>
      ) : null}

      {/* Sembunyikan iframe saat error supaya halaman error Chrome tidak kelihatan */}
      {state !== 'error' ? (
        <iframe
          key={key}
          title={`Live ${camera.name}`}
          src={embedUrl}
          className="h-full w-full"
          allow={allow}
          allowFullScreen
          referrerPolicy="no-referrer"
          onLoad={() => {
            const elapsed = Date.now() - loadStartedAt.current
            // onLoad setelah lama biasanya halaman error Chrome, bukan player.
            if (elapsed >= EMBED_TIMEOUT_MS - 500) {
              setState('error')
              void reportCameraHealth(camera.id, {
                ok: false,
                latencyMs: elapsed,
                embedUrl,
              })
              return
            }
            setState('playing')
            void reportCameraHealth(camera.id, {
              ok: true,
              latencyMs: elapsed,
              embedUrl,
            })
          }}
          onError={() => {
            setState('error')
            void reportCameraHealth(camera.id, {
              ok: false,
              embedUrl,
            })
          }}
        />
      ) : null}

      {state === 'playing' ? (
        <button
          type="button"
          onClick={remountEmbed}
          className="absolute bottom-2 right-2 z-20 inline-flex items-center gap-1.5 rounded border border-[var(--border)] bg-black/70 px-2.5 py-1.5 text-xs text-[var(--text)] hover:border-[var(--accent)]/50"
        >
          <RefreshCw size={12} aria-hidden />
          Embed ulang
        </button>
      ) : null}
    </div>
  )
}

function HlsPlayer({
  streamUrl,
  enableAudio,
}: {
  streamUrl: string
  enableAudio: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [state, setState] = useState<PlayerState>('idle')
  const [retry, setRetry] = useState(0)
  const [audioOn, setAudioOn] = useState(enableAudio)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setState('loading')
    let cancelled = false

    const onPlaying = () => {
      if (!cancelled) setState('playing')
    }
    const onError = () => {
      if (!cancelled) setState('error')
    }

    video.addEventListener('playing', onPlaying)
    video.addEventListener('error', onError)
    video.muted = !audioOn

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl
      video.load()
      void video.play().catch(() => {
        if (audioOn) {
          video.muted = true
          setAudioOn(false)
          void video.play().catch(() => setState('error'))
        } else {
          setState('error')
        }
      })
    } else if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true })
      hlsRef.current = hls
      hls.loadSource(streamUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void video.play().catch(() => {
          if (audioOn) {
            video.muted = true
            setAudioOn(false)
            void video.play().catch(() => {
              if (!cancelled) setState('error')
            })
          } else if (!cancelled) {
            setState('error')
          }
        })
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal && !cancelled) setState('error')
      })
    } else {
      setState('error')
    }

    return () => {
      cancelled = true
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('error', onError)
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      video.removeAttribute('src')
      video.load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl, retry])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !audioOn
    if (audioOn) {
      void video.play().catch(() => {
        video.muted = true
        setAudioOn(false)
      })
    }
  }, [audioOn])

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[var(--border)] bg-black">
      {state === 'loading' ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 text-sm text-[var(--muted)]">
          Memuat stream…
        </div>
      ) : null}
      {state === 'error' ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0a1018] p-4 text-center">
          <p className="text-sm">Stream gagal diputar.</p>
          <button
            type="button"
            onClick={() => setRetry((n) => n + 1)}
            className="inline-flex items-center gap-2 rounded border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-4 py-2 text-sm text-[var(--accent)]"
          >
            <RefreshCw size={14} aria-hidden />
            Coba lagi
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setAudioOn((v) => !v)}
        className="absolute right-2 top-2 z-20 inline-flex items-center gap-1 rounded border border-[var(--border)] bg-black/70 px-2 py-1 text-xs text-[var(--text)]"
        aria-label={audioOn ? 'Matikan audio' : 'Nyalakan audio'}
      >
        {audioOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
        {audioOn ? 'Audio' : 'Mute'}
      </button>
      <video
        ref={videoRef}
        className="h-full w-full"
        controls
        playsInline
        muted={!audioOn}
        preload="metadata"
      />
    </div>
  )
}
