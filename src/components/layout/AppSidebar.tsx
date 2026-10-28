import {
  Activity,
  Camera,
  Info,
  LayoutGrid,
  Map,
  Menu,
  Monitor,
  Radio,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useState } from 'react'

const links = [
  { to: '/', label: 'Live Monitor', icon: Monitor, end: true },
  { to: '/active', label: 'Kamera Aktif', icon: Activity },
  { to: '/live', label: 'Share Demo', icon: Radio },
  { to: '/map', label: 'Peta', icon: Map },
  { to: '/cameras', label: 'Direktori', icon: LayoutGrid },
  { to: '/about', label: 'Tentang', icon: Info },
]

export function AppSidebar() {
  const [open, setOpen] = useState(false)

  const nav = (
    <nav className="flex flex-col gap-1 p-3" aria-label="Navigasi utama">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
              isActive
                ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]'
            }`
          }
        >
          <Icon size={18} aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <>
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 lg:hidden">
        <Brand />
        <button
          type="button"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          onClick={() => setOpen((v) => !v)}
          className="rounded border border-[var(--border)] p-2 text-[var(--muted)]"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open ? (
        <div className="border-b border-[var(--border)] bg-[var(--panel)] lg:hidden">
          {nav}
        </div>
      ) : null}

      <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel)] lg:flex">
        <div className="border-b border-[var(--border)] px-4 py-4">
          <Brand />
        </div>
        {nav}
        <div className="mt-auto border-t border-[var(--border)] p-4 text-xs text-[var(--muted)]">
          <p className="flex items-center gap-2">
            <Camera size={14} aria-hidden />
            Aggregator independen
          </p>
        </div>
      </aside>
    </>
  )
}

function Brand() {
  return (
    <div>
      <p className="text-sm font-semibold tracking-wide text-[var(--accent)]">
        HI VISION
      </p>
      <p className="text-xs text-[var(--muted)]">Public Camera Monitoring</p>
    </div>
  )
}
