import type { Camera } from '../types/camera'

const DEFAULT_API = ''

export function apiBase(): string {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined
  if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/$/, '')
  return DEFAULT_API
}

export type CamerasApiResponse = {
  cameras: Camera[]
  meta?: {
    count: number
    cache: 'hit' | 'miss'
    backend: 'redis' | 'memory'
    ttlSeconds: number
    source: string
  }
  error?: string
}

export async function fetchApiCameras(
  signal?: AbortSignal,
): Promise<CamerasApiResponse> {
  const base = apiBase()
  const url = `${base}/api/cameras`
  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`API ${res.status}`)
  }
  return (await res.json()) as CamerasApiResponse
}

export type OutageStatus = {
  active: boolean
  checkedAt: string
  reason?: string
  sampleOk?: number
  sampleFail?: number
}

export type ActiveCamerasResponse = {
  cameras: Camera[]
  health?: Array<{
    id: string
    ok: boolean
    source: 'probe' | 'client'
    checkedAt: string
    latencyMs?: number
    host?: string
  }>
  outage?: OutageStatus
  meta?: {
    count: number
    probed?: boolean
    probing?: boolean
    mode?: 'field' | 'cctv' | 'mixed'
    note?: string
  }
}

export async function fetchOutage(
  refresh = false,
  signal?: AbortSignal,
): Promise<OutageStatus> {
  const q = refresh ? '?refresh=1' : ''
  const res = await fetch(`${apiBase()}/api/outage${q}`, { signal })
  if (!res.ok) throw new Error(`API ${res.status}`)
  const data = (await res.json()) as { outage: OutageStatus }
  return data.outage
}

export async function fetchActiveCameras(
  refresh = false,
  signal?: AbortSignal,
): Promise<ActiveCamerasResponse> {
  const q = refresh ? '?refresh=1' : ''
  const res = await fetch(`${apiBase()}/api/cameras/active${q}`, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return (await res.json()) as ActiveCamerasResponse
}

/** Laporkan embed sukses/gagal dari browser (crowd health). */
export async function reportCameraHealth(
  id: string,
  payload: { ok: boolean; latencyMs?: number; embedUrl?: string },
): Promise<void> {
  try {
    await fetch(`${apiBase()}/api/cameras/${encodeURIComponent(id)}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    /* ignore — jangan ganggu player */
  }
}
