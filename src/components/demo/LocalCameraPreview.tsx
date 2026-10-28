import { useEffect, useRef } from 'react'

export function LocalCameraPreview({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.srcObject = stream
    void el.play().catch(() => {
      /* autoplay policy — muted should allow */
    })
    return () => {
      el.srcObject = null
    }
  }, [stream])

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-black">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
        <span>Kamera perangkat (lokal)</span>
        <span className="text-[var(--accent)]">Preview saja · tidak diunggah</span>
      </div>
      <video
        ref={ref}
        className="aspect-video w-full object-cover"
        playsInline
        muted
        autoPlay
      />
    </div>
  )
}
