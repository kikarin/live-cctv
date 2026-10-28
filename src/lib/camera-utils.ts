import type { Camera, CameraSourceType, CameraStatus } from '../types/camera'

export function getCameraById(
  cameras: Camera[],
  id: string,
): Camera | undefined {
  return cameras.find((c) => c.id === id)
}

export function filterCameras(
  cameras: Camera[],
  opts: {
    query?: string
    provider?: string
    area?: string
    sourceType?: CameraSourceType | ''
  },
): Camera[] {
  const q = opts.query?.trim().toLowerCase() ?? ''
  return cameras.filter((c) => {
    if (opts.provider && c.provider !== opts.provider) return false
    if (opts.area && c.area !== opts.area) return false
    if (opts.sourceType && c.sourceType !== opts.sourceType) return false
    if (!q) return true
    const hay = `${c.name} ${c.locationLabel} ${c.area} ${c.provider}`.toLowerCase()
    return hay.includes(q)
  })
}

export function uniqueValues(cameras: Camera[], key: keyof Camera): string[] {
  return [...new Set(cameras.map((c) => String(c[key])).filter(Boolean))].sort()
}

export function statusLabel(status: CameraStatus): string {
  switch (status) {
    case 'online':
      return 'Online'
    case 'offline':
      return 'Offline'
    case 'restricted':
      return 'Terbatas'
    case 'degraded':
      return 'Terganggu'
    default:
      return 'Tidak diketahui'
  }
}

export function sourceTypeLabel(type: CameraSourceType): string {
  switch (type) {
    case 'hls':
      return 'HLS'
    case 'embed':
      return 'Embed'
    default:
      return 'Eksternal'
  }
}

export function formatCheckedAt(iso?: string): string | null {
  if (!iso) return null
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(iso))
  } catch {
    return null
  }
}

export function camerasWithCoordinates(cameras: Camera[]): Camera[] {
  return cameras.filter(
    (c) =>
      typeof c.latitude === 'number' &&
      typeof c.longitude === 'number' &&
      Number.isFinite(c.latitude) &&
      Number.isFinite(c.longitude),
  )
}
