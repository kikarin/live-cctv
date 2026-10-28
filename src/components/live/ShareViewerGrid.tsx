import { useEffect, useState } from 'react'
import {
  liveFrameUrl,
  listLiveSessions,
  type LiveSessionPublic,
} from '../../lib/live-share-api'

function SessionTile({ session }: { session: LiveSessionPublic }) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null)
  const ageMs = Date.now() - new Date(session.updatedAt).getTime()
  const stale = ageMs > 4000

  useEffect(() => {
    if (!session.live) {
      setDisplaySrc(null)
      return
    }
    const url = liveFrameUrl(session.id, session.updatedAt)
    const img = new Image()
    let cancelled = false
    img.onload = () => {
      if (!cancelled) setDisplaySrc(url)
    }
    img.onerror = () => {
      /* keep last good frame */
    }
    img.src = url
    return () => {
      cancelled = true
    }
  }, [session.id, session.live, session.updatedAt])

  return (
    <article className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)]">
      <div className="relative aspect-[3/4] bg-black sm:aspect-video">
        {displaySrc ? (
          <img
            src={displaySrc}
            alt={`Share ${session.name}`}
            className="h-full w-full object-cover"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
            Menunggu frame…
          </div>
        )}
        <div className="absolute left-2 top-2 rounded border border-[var(--accent)]/40 bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
          {stale ? 'Stale' : 'Live'}
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-medium">{session.name}</p>
        <p className="text-xs text-[var(--muted)]">
          Update {new Date(session.updatedAt).toLocaleTimeString('id-ID')}
        </p>
      </div>
    </article>
  )
}

export function ShareViewerGrid() {
  const [sessions, setSessions] = useState<LiveSessionPublic[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const list = await listLiveSessions()
        if (!cancelled) {
          setSessions(list)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal muat sesi')
        }
      }
    }
    void tick()
    const id = window.setInterval(() => void tick(), 400)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-medium">Yang lagi share sekarang</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Feed dari HP peserta demo. Refresh ~2–3×/detik.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-[var(--warning)]">{error}</p>
      ) : null}
      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
          Belum ada yang share. Buka tab <strong>Bagikan</strong> di HP untuk
          mulai.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s) => (
            <SessionTile key={s.id} session={s} />
          ))}
        </div>
      )}
    </div>
  )
}
