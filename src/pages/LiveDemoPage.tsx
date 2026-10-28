import { Share2, Eye, Copy, Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SharePublisher } from '../components/live/SharePublisher'
import { ShareViewerGrid } from '../components/live/ShareViewerGrid'
import { Topbar } from '../components/layout/Topbar'

type Tab = 'view' | 'share'

export function LiveDemoPage() {
  const [params] = useSearchParams()
  const initial: Tab = params.get('tab') === 'share' ? 'share' : 'view'
  const [tab, setTab] = useState<Tab>(initial)
  const [copied, setCopied] = useState(false)
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/live?tab=share'
    return `${window.location.origin}/live?tab=share`
  }, [])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <Topbar title="Share Demo · HP" />

      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <section className="space-y-3 rounded-lg border border-[var(--warning)]/35 bg-[var(--warning)]/10 px-4 py-3 text-sm">
          <p className="font-medium text-[var(--warning)]">
            CCTV resmi sering mati karena overload
          </p>
          <p className="text-[var(--muted)]">
            Kalau portal jakcctv/Balitower timeout, jalur ini yang dipakai:
            peserta di lapangan share kamera HP → semua orang pantau di web yang
            sama. Cocok saat kondisi ramai / cipta kondisi.
          </p>
        </section>

        <section className="space-y-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--panel)] p-4">
          <h2 className="text-base font-medium">
            Bagikan kondisi dari HP kamu
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Kirim link ini ke grup mahasiswa. Buka di HP → izinkan kamera →
            share. Tidak bergantung ke server CCTV pemerintah.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--accent)]">
              {shareUrl}
            </code>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] px-3 py-2 text-xs hover:border-[var(--accent)]/40"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Tersalin' : 'Salin link HP'}
            </button>
          </div>
        </section>

        <div className="flex rounded-lg border border-[var(--border)] p-1">
          <button
            type="button"
            onClick={() => setTab('view')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm ${
              tab === 'view'
                ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                : 'text-[var(--muted)]'
            }`}
          >
            <Eye size={16} aria-hidden />
            Lihat share
          </button>
          <button
            type="button"
            onClick={() => setTab('share')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm ${
              tab === 'share'
                ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                : 'text-[var(--muted)]'
            }`}
          >
            <Share2 size={16} aria-hidden />
            Bagikan dari HP
          </button>
        </div>

        {tab === 'view' ? <ShareViewerGrid /> : <SharePublisher />}
      </div>
    </div>
  )
}
