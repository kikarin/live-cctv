import { Search, X } from 'lucide-react'
import type { CameraSourceType } from '../../types/camera'

export function CameraFilters({
  query,
  setQuery,
  provider,
  setProvider,
  area,
  setArea,
  sourceType,
  setSourceType,
  providers,
  areas,
  resetFilters,
  count,
  total,
}: {
  query: string
  setQuery: (v: string) => void
  provider: string
  setProvider: (v: string) => void
  area: string
  setArea: (v: string) => void
  sourceType: CameraSourceType | ''
  setSourceType: (v: CameraSourceType | '') => void
  providers: string[]
  areas: string[]
  resetFilters: () => void
  count: number
  total: number
}) {
  const dirty = Boolean(query || provider || area || sourceType)

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari kamera, lokasi, atau penyedia…"
          className="w-full rounded-md border border-[var(--border)] bg-[var(--panel)] py-2.5 pl-9 pr-3 text-sm placeholder:text-[var(--muted)]"
          aria-label="Cari kamera"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
          aria-label="Filter penyedia"
        >
          <option value="">Semua penyedia</option>
          {providers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
          aria-label="Filter area"
        >
          <option value="">Semua area</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          value={sourceType}
          onChange={(e) =>
            setSourceType(e.target.value as CameraSourceType | '')
          }
          className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
          aria-label="Filter tipe sumber"
        >
          <option value="">Semua tipe</option>
          <option value="hls">HLS</option>
          <option value="embed">Embed</option>
          <option value="external">Eksternal</option>
        </select>

        {dirty ? (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)]"
          >
            <X size={14} aria-hidden />
            Reset
          </button>
        ) : null}

        <span className="ml-auto self-center text-xs text-[var(--muted)]">
          {count} / {total} kamera
        </span>
      </div>
    </div>
  )
}
