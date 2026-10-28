import { Camera, StopCircle, SwitchCamera } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  joinLiveSession,
  leaveLiveSession,
  publishLiveFrameBlob,
} from '../../lib/live-share-api'

/** ~3 fps — cukup smooth untuk demo, tidak numpuk antrean upload */
const FRAME_MS = 350
const MAX_W = 640
const JPEG_QUALITY = 0.55

export function SharePublisher() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const sessionRef = useRef<{ id: string; token: string } | null>(null)
  const inFlightRef = useRef(false)

  const [name, setName] = useState('')
  const [sharing, setSharing] = useState(false)
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(0)

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const stopSharing = useCallback(async () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    const session = sessionRef.current
    sessionRef.current = null
    inFlightRef.current = false
    stopTracks()
    setSharing(false)
    if (session) {
      try {
        await leaveLiveSession(session.id, session.token)
      } catch {
        /* ignore */
      }
    }
  }, [stopTracks])

  useEffect(() => {
    return () => {
      void stopSharing()
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
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }
    },
    [stopTracks],
  )

  const pushFrame = useCallback(() => {
    if (inFlightRef.current) return
    const session = sessionRef.current
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!session || !video || !canvas || video.readyState < 2) return

    const vw = video.videoWidth || 640
    const vh = video.videoHeight || 360
    const scale = Math.min(1, MAX_W / vw)
    canvas.width = Math.round(vw * scale)
    canvas.height = Math.round(vh * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    inFlightRef.current = true
    canvas.toBlob(
      (blob) => {
        if (!blob || !sessionRef.current) {
          inFlightRef.current = false
          return
        }
        const { id, token } = sessionRef.current
        void publishLiveFrameBlob(id, token, blob)
          .then(() => {
            setSent((n) => n + 1)
            setError(null)
          })
          .catch((err) => {
            setError(err instanceof Error ? err.message : 'Gagal kirim frame')
          })
          .finally(() => {
            inFlightRef.current = false
          })
      },
      'image/jpeg',
      JPEG_QUALITY,
    )
  }, [])

  const startSharing = async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Browser tidak mendukung kamera.')
      return
    }
    try {
      const session = await joinLiveSession(name.trim() || 'Mahasiswa')
      sessionRef.current = session
      await startCamera(facing)
      setSharing(true)
      setSent(0)
      timerRef.current = window.setInterval(() => {
        pushFrame()
      }, FRAME_MS)
      pushFrame()
    } catch (err) {
      sessionRef.current = null
      stopTracks()
      setSharing(false)
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
          Arahkan kamera ke lokasi demo. Frame JPEG dikirim ~3×/detik ke HI
          VISION supaya penonton lihat hampir real-time.
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
      <canvas ref={canvasRef} className="hidden" />

      {error ? (
        <p className="text-sm text-[var(--error)]" role="alert">
          {error}
        </p>
      ) : null}
      {sharing ? (
        <p className="text-xs text-[var(--accent)]">
          Live · {sent} frame terkirim
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
              onClick={() => void stopSharing()}
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
