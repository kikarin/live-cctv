/** Soft demo bounding box for DKI Jakarta — not an official geofence. */
export const JAKARTA_BBOX = {
  minLat: -6.4,
  maxLat: -5.95,
  minLng: 106.68,
  maxLng: 107.05,
} as const

export function isInJakarta(lat: number, lng: number): boolean {
  return (
    lat >= JAKARTA_BBOX.minLat &&
    lat <= JAKARTA_BBOX.maxLat &&
    lng >= JAKARTA_BBOX.minLng &&
    lng <= JAKARTA_BBOX.maxLng
  )
}
