import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Radio } from 'lucide-react'
import { CameraFilters } from '../components/camera/CameraFilters'
import { CameraGrid } from '../components/camera/CameraGrid'
import { CameraPlayer } from '../components/camera/CameraPlayer'
import { Topbar } from '../components/layout/Topbar'
import { useCameras } from '../hooks/useCameras'
import { getCameraById } from '../lib/camera-utils'

export function DashboardPage() {
  const cams = useCameras()
  const [columns, setColumns] = useState<1 | 2 | 4>(2)
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const selected = selectedId
    ? (getCameraById(cams.filtered, selectedId) ??
      getCameraById(cams.all, selectedId))
    : undefined

  return (
    <div>
      <Topbar
        title="Live Monitoring"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/live"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-2.5 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/25"
            >
              <Radio size={12} aria-hidden />
              Share Demo
            </Link>
            <div className="flex items-center gap-1 rounded-md border border-[var(--border)] p-1">
              {([1, 2, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setColumns(n)}
                  className={`rounded px-2.5 py-1 text-xs ${
                    columns === n
                      ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                  aria-pressed={columns === n}
                  aria-label={`Tampilan ${n} kolom`}
                >
                  {n}×
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="space-y-4 p-4">
        <div className="space-y-2 rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-4 py-3 text-sm text-[var(--warning)]">
          <p>
            Portal CCTV DKI / Balitower sering overload saat ramai — embed bisa
            mati total di sumbernya. Jangan spam putar terus.
          </p>
          <p>
            Akali: pantau di{' '}
            <Link to="/active" className="underline">
              Kamera Aktif
            </Link>{' '}
            + minta orang di lokasi share HP lewat{' '}
            <Link to="/live?tab=share" className="underline">
              Share Demo
            </Link>
            .
          </p>
        </div>

        {cams.loading ? (
          <p className="text-sm text-[var(--muted)]">Memuat katalog kamera…</p>
        ) : null}
        {cams.error ? (
          <p className="text-sm text-[var(--warning)]">{cams.error}</p>
        ) : null}
        {cams.cacheMeta ? (
          <p className="text-xs text-[var(--muted)]">
            Cache API: {cams.cacheMeta}
          </p>
        ) : null}

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
          count={cams.filtered.length}
          total={cams.all.length}
        />

        {selected ? (
          <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-medium">{selected.name}</h2>
                <p className="text-sm text-[var(--muted)]">
                  {selected.locationLabel} · {selected.provider}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(undefined)}
                className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
              >
                Tutup live
              </button>
            </div>
            <CameraPlayer
              key={selected.id}
              camera={selected}
              enableAudio
              autoStart={false}
            />
          </section>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Pilih kartu, lalu tekan Putar embed. Kalau timeout, pakai Embed
            ulang.
          </p>
        )}

        <CameraGrid
          cameras={cams.filtered}
          columns={columns}
          selectedId={selectedId}
          onSelect={setSelectedId}
          liveMode={false}
        />
      </div>
    </div>
  )
}
