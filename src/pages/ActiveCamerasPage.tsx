import { Activity, AlertTriangle, RefreshCw, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { CameraPlayer } from '../components/camera/CameraPlayer'
import { ShareViewerGrid } from '../components/live/ShareViewerGrid'
import { Topbar } from '../components/layout/Topbar'
import {
  fetchActiveCameras,
  type OutageStatus,
} from '../lib/api'
import type { Camera } from '../types/camera'

export function ActiveCamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [outage, setOutage] = useState<OutageStatus | null>(null)
  const [mode, setMode] = useState<'field' | 'cctv' | 'mixed'>('field')
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [probing, setProbing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async (refresh = false) => {
    setError(null)
    if (refresh) setProbing(true)
    else setLoading(true)
    try {
      const active = await fetchActiveCameras(refresh)
      setCameras(active.cameras)
      setOutage(active.outage ?? null)
      setMode(active.meta?.mode ?? (active.outage?.active ? 'field' : 'mixed'))
      setNote(active.meta?.note ?? null)
      setSelectedId((cur) =>
        cur && active.cameras.some((c) => c.id === cur) ? cur : undefined,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat')
      // Anggap outage kalau API aktif gagal — tetap andalkan share HP.
      setOutage({
        active: true,
        checkedAt: new Date().toISOString(),
        reason: 'Tidak bisa cek CCTV. Pakai Share Demo dari HP.',
      })
      setMode('field')
    } finally {
      setLoading(false)
      setProbing(false)
    }
  }, [])

  useEffect(() => {
    void load(false)
    const id = window.setInterval(() => void load(false), 20_000)
    return () => window.clearInterval(id)
  }, [load])

  const selected = cameras.find((c) => c.id === selectedId)
  const fieldMode = outage?.active || cameras.length === 0

  return (
    <div>
      <Topbar
        title="Kamera Aktif"
        actions={
          <button
            type="button"
            disabled={probing}
            onClick={() => void load(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1.5 text-xs text-[var(--accent)] disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              className={probing ? 'animate-spin' : undefined}
              aria-hidden
            />
            {probing ? 'Cek…' : 'Cek status'}
          </button>
        }
      />

      <div className="space-y-4 p-4">
        {outage?.active ? (
          <div className="rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-4 py-3 text-sm">
            <p className="flex items-start gap-2 font-medium text-[var(--warning)]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
              CCTV publik DKI sedang overload / mati
            </p>
            <p className="mt-1 text-[var(--muted)]">
              {outage.reason ??
                'Host Balitower tidak merespons (banyak akses). Jangan spam embed — bikin makin parah.'}{' '}
              Akali dengan <strong>Share Demo dari HP</strong> di lokasi: feed
              lapangan tetap masuk ke web ini.
            </p>
            <Link
              to="/live?tab=share"
              className="mt-3 inline-flex items-center gap-2 rounded border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-4 py-2.5 text-sm font-medium text-[var(--accent)]"
            >
              <Smartphone size={16} aria-hidden />
              Buka Share dari HP
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3 text-sm">
            <p className="flex items-start gap-2 font-medium text-[var(--accent)]">
              <Activity size={16} className="mt-0.5 shrink-0" aria-hidden />
              Mode {mode === 'cctv' ? 'CCTV aktif' : 'campuran'}
            </p>
            <p className="mt-1 text-[var(--muted)]">
              {note ??
                'Menampilkan kamera yang terbukti hidup + share HP peserta.'}
            </p>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--muted)]">Memuat status…</p>
        ) : null}
        {error ? (
          <p className="text-sm text-[var(--warning)]">{error}</p>
        ) : null}

        {/* Prioritas utama saat sumber resmi mati: wall share HP */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-medium">
                {fieldMode
                  ? 'Pantauan lapangan (HP peserta)'
                  : 'Share HP + CCTV aktif'}
              </h2>
              <p className="text-sm text-[var(--muted)]">
                Ini jalur cadangan saat portal jakcctv/Balitower down.
              </p>
            </div>
            <Link
              to="/live?tab=share"
              className="text-sm text-[var(--accent)] underline"
            >
              Saya mau share dari HP
            </Link>
          </div>
          <ShareViewerGrid />
        </section>

        {cameras.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-medium">
              CCTV yang masih merespons ({cameras.length})
            </h2>
            {selected ? (
              <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{selected.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {selected.statusNote}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-[var(--muted)]"
                    onClick={() => setSelectedId(undefined)}
                  >
                    Tutup
                  </button>
                </div>
                <CameraPlayer
                  key={selected.id}
                  camera={selected}
                  enableAudio
                  autoStart={false}
                />
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cameras.map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setSelectedId(cam.id)}
                  className={`rounded-lg border p-4 text-left ${
                    selectedId === cam.id
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                      : 'border-[var(--border)] bg-[var(--panel)]'
                  }`}
                >
                  <span className="text-[10px] uppercase text-[var(--accent)]">
                    Aktif
                  </span>
                  <p className="mt-1 font-medium">{cam.name}</p>
                  <p className="text-xs text-[var(--muted)]">{cam.area}</p>
                </button>
              ))}
            </div>
          </section>
        ) : !loading ? (
          <p className="text-sm text-[var(--muted)]">
            Belum ada embed CCTV yang lolos. Andalkan share HP di atas — minta
            teman di lokasi buka link Share Demo.
          </p>
        ) : null}
      </div>
    </div>
  )
}
