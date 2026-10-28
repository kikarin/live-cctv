import type { Camera } from '../../types/camera'
import { CameraCard } from './CameraCard'

export const LIVE_WALL_LIMIT = 8

function isPlayableInline(camera: Camera): boolean {
  return (
    (camera.sourceType === 'embed' && Boolean(camera.embedUrl)) ||
    (camera.sourceType === 'hls' && Boolean(camera.streamUrl))
  )
}

export function CameraGrid({
  cameras,
  columns,
  selectedId,
  onSelect,
  liveMode = false,
  liveLimit = LIVE_WALL_LIMIT,
}: {
  cameras: Camera[]
  columns: 1 | 2 | 4
  selectedId?: string
  onSelect?: (id: string) => void
  liveMode?: boolean
  liveLimit?: number
}) {
  if (cameras.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
        Tidak ada kamera yang cocok dengan filter.
      </div>
    )
  }

  const colClass =
    columns === 1
      ? 'grid-cols-1'
      : columns === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'

  let liveSlots = 0

  return (
    <div className={`grid gap-4 ${colClass}`}>
      {cameras.map((camera) => {
        const eligible = liveMode && isPlayableInline(camera)
        const playing = eligible && liveSlots < liveLimit
        if (playing) liveSlots += 1

        return (
          <CameraCard
            key={camera.id}
            camera={camera}
            selected={selectedId === camera.id}
            onSelect={onSelect}
            live={playing}
            liveHint={eligible && !playing}
          />
        )
      })}
    </div>
  )
}
