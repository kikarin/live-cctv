import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import type { Camera } from '../../types/camera'
import { MAP_CENTER } from '../../data/cameras'
import { CameraStatusBadge } from '../camera/CameraStatusBadge'
import { statusLabel } from '../../lib/camera-utils'

// Fix default marker icons in Vite bundling
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

function FitBounds({ cameras }: { cameras: Camera[] }) {
  const map = useMap()
  useEffect(() => {
    if (cameras.length === 0) {
      map.setView([MAP_CENTER.lat, MAP_CENTER.lng], MAP_CENTER.zoom)
      return
    }
    const bounds = L.latLngBounds(
      cameras.map((c) => [c.latitude!, c.longitude!] as [number, number]),
    )
    map.fitBounds(bounds.pad(0.2))
  }, [cameras, map])
  return null
}

export function CameraMap({ cameras }: { cameras: Camera[] }) {
  return (
    <div className="h-[min(70vh,560px)] w-full overflow-hidden rounded-lg border border-[var(--border)]">
      <MapContainer
        center={[MAP_CENTER.lat, MAP_CENTER.lng]}
        zoom={MAP_CENTER.zoom}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds cameras={cameras} />
        {cameras.map((camera) => (
          <Marker
            key={camera.id}
            position={[camera.latitude!, camera.longitude!]}
          >
            <Popup>
              <div className="min-w-[180px] space-y-2 text-sm">
                <p className="font-medium text-[var(--text)]">{camera.name}</p>
                <p className="text-xs text-[var(--muted)]">{camera.provider}</p>
                <CameraStatusBadge status={camera.status} />
                <p className="sr-only">{statusLabel(camera.status)}</p>
                {camera.coordinatesApproximate ? (
                  <p className="text-xs text-[var(--warning)]">
                    Koordinat perkiraan
                  </p>
                ) : null}
                <Link
                  to={`/camera/${camera.id}`}
                  className="inline-block text-[var(--accent)] underline"
                >
                  Lihat kamera
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
