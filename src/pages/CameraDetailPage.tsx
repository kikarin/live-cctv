import { ArrowLeft, MapPin } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { CameraPlayer } from '../components/camera/CameraPlayer'
import { CameraStatusBadge } from '../components/camera/CameraStatusBadge'
import { Topbar } from '../components/layout/Topbar'
import { cameras } from '../data/cameras'
import {
  formatCheckedAt,
  getCameraById,
  sourceTypeLabel,
} from '../lib/camera-utils'

export function CameraDetailPage() {
  const { id } = useParams()
  const camera = id ? getCameraById(cameras, id) : undefined

  if (!camera) {
    return (
      <div>
        <Topbar title="Kamera tidak ditemukan" />
        <div className="space-y-4 p-4">
          <p className="text-sm text-[var(--muted)]">
            ID kamera tidak ada di registry.
          </p>
          <Link
            to="/cameras"
            className="inline-flex items-center gap-2 text-sm text-[var(--accent)]"
          >
            <ArrowLeft size={16} aria-hidden />
            Kembali ke direktori
          </Link>
        </div>
      </div>
    )
  }

  const checked = formatCheckedAt(camera.lastCheckedAt)
  const nearby = cameras.filter(
    (c) =>
      c.id !== camera.id &&
      typeof c.latitude === 'number' &&
      typeof camera.latitude === 'number' &&
      typeof c.longitude === 'number' &&
      typeof camera.longitude === 'number' &&
      haversineKm(camera.latitude, camera.longitude, c.latitude, c.longitude) <
        3,
  )

  return (
    <div>
      <Topbar
        title={camera.name}
        actions={
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)]"
          >
            <ArrowLeft size={14} aria-hidden />
            Dashboard
          </Link>
        }
      />
      <div className="space-y-4 p-4">
        <CameraPlayer camera={camera} enableAudio autoStart={false} />

        <section className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <CameraStatusBadge status={camera.status} />
              <span className="rounded border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">
                {sourceTypeLabel(camera.sourceType)}
              </span>
            </div>
            <p className="flex items-start gap-2 text-sm text-[var(--muted)]">
              <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden />
              {camera.locationLabel}
              {camera.coordinatesApproximate ? (
                <span className="text-[var(--warning)]">(perkiraan)</span>
              ) : null}
            </p>
            <p className="text-sm">
              Penyedia: <span className="text-[var(--muted)]">{camera.provider}</span>
            </p>
            {camera.attribution ? (
              <p className="text-sm">
                Atribusi:{' '}
                <span className="text-[var(--muted)]">{camera.attribution}</span>
              </p>
            ) : null}
            <p className="text-sm">
              Terakhir dicek:{' '}
              <span className="text-[var(--muted)]">
                {checked ?? 'Belum dicek'}
              </span>
            </p>
            {camera.statusNote ? (
              <p className="text-sm text-[var(--muted)]">{camera.statusNote}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Link
              to="/cameras"
              className="inline-flex items-center justify-center rounded border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-2.5 text-sm text-[var(--accent)] hover:bg-[var(--accent)]/20"
            >
              Tautan sumber di Direktori
            </Link>
            {typeof camera.latitude === 'number' ? (
              <Link
                to="/map"
                className="inline-flex items-center justify-center rounded border border-[var(--border)] px-4 py-2.5 text-sm hover:border-[var(--accent)]/40"
              >
                Lihat di peta
              </Link>
            ) : null}
            <Link
              to="/live"
              className="inline-flex items-center justify-center rounded border border-[var(--border)] px-4 py-2.5 text-sm hover:border-[var(--accent)]/40"
            >
              Share Demo (HP)
            </Link>
          </div>
        </section>

        {nearby.length > 0 ? (
          <section>
            <h2 className="mb-3 text-sm font-medium">Kamera terdekat</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {nearby.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/camera/${c.id}`}
                    className="block rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-sm hover:border-[var(--accent)]/40"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="mt-1 block text-xs text-[var(--muted)]">
                      {c.area} · {c.provider}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
