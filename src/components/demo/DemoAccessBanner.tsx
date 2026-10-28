import { Camera, MapPinned, Radio, ShieldCheck } from 'lucide-react'
import type {
  DemoCameraStatus,
  DemoGpsStatus,
  DemoUnlockMethod,
} from '../../hooks/useDemoAccess'

export function DemoAccessBanner({
  unlocked,
  method,
  gpsStatus,
  cameraStatus,
  message,
  onRequestGps,
  onRequestCamera,
  onSelfDeclare,
  onDeactivate,
}: {
  unlocked: boolean
  method: DemoUnlockMethod | null
  gpsStatus: DemoGpsStatus
  cameraStatus: DemoCameraStatus
  message: string | null
  onRequestGps: () => void
  onRequestCamera: () => void
  onSelfDeclare: () => void
  onDeactivate: () => void
}) {
  if (unlocked) {
    const how =
      method === 'gps'
        ? 'Dibuka via lokasi GPS.'
        : method === 'camera'
          ? 'Dibuka via izin kamera perangkat.'
          : 'Dibuka via deklarasi demo di Jakarta.'

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-4 py-3 text-sm">
        <div className="flex items-start gap-2">
          <Radio
            size={18}
            className="mt-0.5 shrink-0 text-[var(--accent)]"
            aria-hidden
          />
          <div>
            <p className="font-medium text-[var(--accent)]">
              Live Demo aktif · Jakarta
            </p>
            <p className="text-[var(--muted)]">
              {how} Pilih kamera untuk live + audio. Tautan sumber ada di
              Direktori.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDeactivate}
          className="rounded border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
        >
          Nonaktifkan Live Demo
        </button>
      </div>
    )
  }

  const gpsBusy = gpsStatus === 'requesting'
  const camBusy = cameraStatus === 'requesting'

  return (
    <div className="space-y-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--panel)] px-4 py-4">
      <div className="flex items-start gap-2">
        <ShieldCheck
          size={18}
          className="mt-0.5 shrink-0 text-[var(--accent)]"
          aria-hidden
        />
        <div className="space-y-1">
          <p className="font-medium">Aktifkan Live Demo untuk Jakarta</p>
          <p className="text-sm text-[var(--muted)]">
            Izinkan kamera atau lokasi, atau deklarasi langsung kalau kamu lagi
            demo di Jakarta. Tidak perlu login.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRequestCamera}
          disabled={camBusy}
          className="inline-flex items-center gap-2 rounded border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--accent)]/25 disabled:opacity-60"
        >
          <Camera size={16} aria-hidden />
          {camBusy ? 'Meminta kamera…' : 'Izinkan kamera'}
        </button>
        <button
          type="button"
          onClick={onRequestGps}
          disabled={gpsBusy}
          className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--accent)]/40 hover:text-[var(--accent)] disabled:opacity-60"
        >
          <MapPinned size={16} aria-hidden />
          {gpsBusy ? 'Meminta lokasi…' : 'Izinkan lokasi'}
        </button>
        <button
          type="button"
          onClick={onSelfDeclare}
          className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
        >
          Saya lagi demo di Jakarta
        </button>
      </div>

      {message ? (
        <p className="text-xs text-[var(--muted)]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
