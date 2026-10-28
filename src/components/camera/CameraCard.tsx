import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Camera } from '../../types/camera'
import { sourceTypeLabel } from '../../lib/camera-utils'
import { CameraPlayer } from './CameraPlayer'
import { CameraStatusBadge } from './CameraStatusBadge'

export function CameraCard({
  camera,
  selected,
  onSelect,
  live = false,
  liveHint = false,
}: {
  camera: Camera
  selected?: boolean
  onSelect?: (id: string) => void
  live?: boolean
  liveHint?: boolean
}) {
  const canInlineLive =
    live &&
    ((Boolean(camera.embedUrl) || Boolean(camera.streamUrl)))

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-lg border bg-[var(--panel)] transition-colors ${
        selected
          ? 'border-[var(--accent)]'
          : 'border-[var(--border)] hover:border-[var(--accent)]/40'
      }`}
    >
      {canInlineLive ? (
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          <div className="absolute left-2 top-2 z-20">
            <span className="rounded border border-[var(--accent)]/40 bg-black/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--accent)]">
              Live
            </span>
          </div>
          <div className="absolute right-2 top-2 z-20">
            <CameraStatusBadge status={camera.status} />
          </div>
          <div className="absolute inset-0 [&_>div]:absolute [&_>div]:inset-0 [&_>div]:aspect-auto [&_>div]:h-full [&_>div]:rounded-none [&_>div]:border-0">
            <CameraPlayer camera={camera} enableAudio />
          </div>
          <button
            type="button"
            onClick={() => onSelect?.(camera.id)}
            className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-left text-xs text-white/90"
            aria-label={`Perbesar ${camera.name}`}
          >
            Perbesar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onSelect?.(camera.id)}
          className="relative aspect-video w-full bg-[#0a1018] text-left"
          aria-label={`Pilih kamera ${camera.name}`}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <span className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]">
              {sourceTypeLabel(camera.sourceType)}
            </span>
            <span className="text-center text-sm text-[var(--muted)]">
              {liveHint ? 'Tap untuk live' : 'Pilih untuk live'}
            </span>
          </div>
          <div className="absolute left-2 top-2">
            <CameraStatusBadge status={camera.status} />
          </div>
        </button>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-medium leading-snug">{camera.name}</h3>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-[var(--muted)]">
            <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden />
            <span>{camera.locationLabel}</span>
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <span className="rounded border border-[var(--border)] px-2 py-0.5">
            {camera.provider}
          </span>
          <span className="rounded border border-[var(--border)] px-2 py-0.5">
            {camera.area}
          </span>
        </div>

        <Link
          to={`/camera/${camera.id}`}
          className="inline-flex w-full items-center justify-center rounded border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
        >
          Detail
        </Link>
      </div>
    </article>
  )
}
