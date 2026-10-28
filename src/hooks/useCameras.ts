import { useEffect, useMemo, useState } from 'react'
import { cameras as registry } from '../data/cameras'
import { fetchApiCameras } from '../lib/api'
import { filterCameras, uniqueValues } from '../lib/camera-utils'
import type { Camera, CameraSourceType } from '../types/camera'

function staticNonJsc(): Camera[] {
  return registry.filter((c) => c.provider !== 'Jakarta Smart City')
}

export function useCameras() {
  const [query, setQuery] = useState('')
  const [provider, setProvider] = useState('')
  const [area, setArea] = useState('')
  const [sourceType, setSourceType] = useState<CameraSourceType | ''>('')
  const [remote, setRemote] = useState<Camera[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cacheMeta, setCacheMeta] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)

    fetchApiCameras(ctrl.signal)
      .then((data) => {
        setRemote(data.cameras ?? [])
        if (data.meta) {
          setCacheMeta(
            `${data.meta.cache} · ${data.meta.backend} · TTL ${data.meta.ttlSeconds}s`,
          )
        } else {
          setCacheMeta(null)
        }
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return
        // Fallback: use static JSC seed so UI tetap jalan tanpa API.
        setRemote(
          registry.filter((c) => c.provider === 'Jakarta Smart City'),
        )
        setError(
          err instanceof Error
            ? `API offline (${err.message}) — pakai registry lokal`
            : 'API offline — pakai registry lokal',
        )
        setCacheMeta(null)
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })

    return () => ctrl.abort()
  }, [])

  const all = useMemo(() => {
    const merged = [...remote, ...staticNonJsc()]
    const seen = new Set<string>()
    return merged.filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  }, [remote])

  const providers = useMemo(() => uniqueValues(all, 'provider'), [all])
  const areas = useMemo(() => uniqueValues(all, 'area'), [all])

  const filtered = useMemo(
    () => filterCameras(all, { query, provider, area, sourceType }),
    [all, query, provider, area, sourceType],
  )

  const resetFilters = () => {
    setQuery('')
    setProvider('')
    setArea('')
    setSourceType('')
  }

  return {
    all,
    filtered,
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
    loading,
    error,
    cacheMeta,
  }
}
