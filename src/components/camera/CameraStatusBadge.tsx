import { CircleAlert, CircleHelp, Lock, Signal, SignalZero } from 'lucide-react'
import { statusLabel } from '../../lib/camera-utils'
import type { CameraStatus } from '../../types/camera'

const config: Record<
  CameraStatus,
  { icon: typeof Signal; className: string }
> = {
  online: { icon: Signal, className: 'text-[var(--accent)] border-[var(--accent)]/30 bg-[var(--accent)]/10' },
  offline: { icon: SignalZero, className: 'text-[var(--error)] border-[var(--error)]/30 bg-[var(--error)]/10' },
  unknown: { icon: CircleHelp, className: 'text-[var(--muted)] border-[var(--border)] bg-[var(--panel)]' },
  restricted: { icon: Lock, className: 'text-[var(--warning)] border-[var(--warning)]/30 bg-[var(--warning)]/10' },
  degraded: { icon: CircleAlert, className: 'text-[var(--warning)] border-[var(--warning)]/30 bg-[var(--warning)]/10' },
}

export function CameraStatusBadge({ status }: { status: CameraStatus }) {
  const { icon: Icon, className } = config[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs ${className}`}
    >
      <Icon size={12} aria-hidden />
      <span>{statusLabel(status)}</span>
    </span>
  )
}
