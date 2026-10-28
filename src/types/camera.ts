export type CameraStatus =
  | 'online'
  | 'offline'
  | 'unknown'
  | 'restricted'
  | 'degraded'

export type CameraSourceType = 'hls' | 'embed' | 'external'

export interface Camera {
  id: string
  name: string
  locationLabel: string
  area: string
  provider: string
  sourceUrl: string
  sourceType: CameraSourceType
  status: CameraStatus
  latitude?: number
  longitude?: number
  coordinatesApproximate?: boolean
  streamUrl?: string
  embedUrl?: string
  attribution?: string
  lastCheckedAt?: string
  statusNote?: string
}
