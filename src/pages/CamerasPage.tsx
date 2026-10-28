import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { CameraFilters } from '../components/camera/CameraFilters'
import { CameraStatusBadge } from '../components/camera/CameraStatusBadge'
import { Topbar } from '../components/layout/Topbar'
import { useCameras } from '../hooks/useCameras'
import {
  formatCheckedAt,
  sourceTypeLabel,
} from '../lib/camera-utils'
import type { Camera } from '../types/camera'

type SortKey = 'name' | 'status'

export function CamerasPage() {
  const cams = useCameras()
  const [sort, setSort] = useState<SortKey>('name')

  const rows = useMemo(() => {
    const list = [...cams.filtered]
    list.sort((a, b) => {
      if (sort === 'status') return a.status.localeCompare(b.status)
      return a.name.localeCompare(b.name, 'id')
    })
    return list
  }, [cams.filtered, sort])

  return (
    <div>
      <Topbar
        title="Direktori Kamera"
        actions={
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
            aria-label="Urutkan"
          >
            <option value="name">Urut nama</option>
            <option value="status">Urut status</option>
          </select>
        }
      />
      <div className="space-y-4 p-4">
        <p className="text-sm text-[var(--muted)]">
          Halaman ini menyimpan tombol <strong>Sumber</strong> ke portal asli
          masing-masing kamera. Live in-app ada di Dashboard / Live Demo.
        </p>
        <CameraFilters
          query={cams.query}
          setQuery={cams.setQuery}
          provider={cams.provider}
          setProvider={cams.setProvider}
          area={cams.area}
          setArea={cams.setArea}
          sourceType={cams.sourceType}
          setSourceType={cams.setSourceType}
          providers={cams.providers}
          areas={cams.areas}
          resetFilters={cams.resetFilters}
          count={rows.length}
          total={cams.all.length}
        />

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
            Tidak ada hasil.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-lg border border-[var(--border)] md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--panel)] text-xs text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Area</th>
                    <th className="px-4 py-3 font-medium">Penyedia</th>
                    <th className="px-4 py-3 font-medium">Tipe</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Dicek</th>
                    <th className="px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((camera) => (
                    <DirectoryRow key={camera.id} camera={camera} />
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden">
              {rows.map((camera) => (
                <li
                  key={camera.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4"
                >
                  <p className="font-medium">{camera.name}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {camera.area} · {camera.provider}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <CameraStatusBadge status={camera.status} />
                    <span className="text-xs text-[var(--muted)]">
                      {sourceTypeLabel(camera.sourceType)}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      to={`/camera/${camera.id}`}
                      className="rounded border border-[var(--border)] px-3 py-1.5 text-sm"
                    >
                      Detail
                    </Link>
                    <a
                      href={camera.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-[var(--accent)]/30 px-3 py-1.5 text-sm text-[var(--accent)]"
                    >
                      <ExternalLink size={14} aria-hidden />
                      Sumber
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

function DirectoryRow({ camera }: { camera: Camera }) {
  const checked = formatCheckedAt(camera.lastCheckedAt)
  return (
    <tr className="border-b border-[var(--border)]/70 hover:bg-white/[0.02]">
      <td className="px-4 py-3">
        <Link
          to={`/camera/${camera.id}`}
          className="font-medium hover:text-[var(--accent)]"
        >
          {camera.name}
        </Link>
        <p className="text-xs text-[var(--muted)]">{camera.locationLabel}</p>
      </td>
      <td className="px-4 py-3 text-[var(--muted)]">{camera.area}</td>
      <td className="px-4 py-3">{camera.provider}</td>
      <td className="px-4 py-3">{sourceTypeLabel(camera.sourceType)}</td>
      <td className="px-4 py-3">
        <CameraStatusBadge status={camera.status} />
      </td>
      <td className="px-4 py-3 text-[var(--muted)]">
        {checked ?? 'Belum dicek'}
      </td>
      <td className="px-4 py-3">
        <a
          href={camera.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[var(--accent)]"
        >
          <ExternalLink size={14} aria-hidden />
          Sumber
        </a>
      </td>
    </tr>
  )
}
