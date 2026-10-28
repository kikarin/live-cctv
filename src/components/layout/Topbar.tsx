import { useEffect, useState, type ReactNode } from 'react'

export function Topbar({ title, actions }: { title: string; actions?: ReactNode }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const time = new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(now)

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-3">
      <div>
        <h1 className="text-base font-medium sm:text-lg">{title}</h1>
        <p className="text-xs text-[var(--muted)]">Waktu lokal WIB · {time}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
