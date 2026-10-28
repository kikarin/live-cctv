import { cacheGet, cacheSet } from './redis.js'
import type { Camera } from './types.js'

const HEALTH_PREFIX = 'hi-vision:health:'
const ACTIVE_INDEX = 'hi-vision:health:active-ids'
const PROBE_TTL = 15 * 60 // 15 menit
const CLIENT_TTL = 45 * 60 // laporan browser lebih lama
const PROBE_TIMEOUT_MS = 2_500
const CONCURRENCY = 8

export type HealthRecord = {
  id: string
  ok: boolean
  source: 'probe' | 'client'
  checkedAt: string
  latencyMs?: number
  host?: string
}

function healthKey(id: string) {
  return `${HEALTH_PREFIX}${id}`
}

function hostOf(url?: string) {
  if (!url) return undefined
  try {
    return new URL(url).host
  } catch {
    return undefined
  }
}

async function readActiveIds(): Promise<string[]> {
  const raw = await cacheGet(ACTIVE_INDEX)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeActiveIds(ids: string[]) {
  await cacheSet(ACTIVE_INDEX, JSON.stringify([...new Set(ids)]), CLIENT_TTL)
}

export async function getHealth(id: string): Promise<HealthRecord | null> {
  const raw = await cacheGet(healthKey(id))
  if (!raw) return null
  try {
    return JSON.parse(raw) as HealthRecord
  } catch {
    return null
  }
}

export async function saveHealth(
  record: HealthRecord,
  ttl = PROBE_TTL,
): Promise<void> {
  await cacheSet(healthKey(record.id), JSON.stringify(record), ttl)
  const ids = await readActiveIds()
  if (record.ok) {
    if (!ids.includes(record.id)) ids.push(record.id)
  } else {
    const next = ids.filter((x) => x !== record.id)
    await writeActiveIds(next)
    return
  }
  await writeActiveIds(ids)
}

export async function reportClientHealth(
  id: string,
  ok: boolean,
  latencyMs?: number,
  embedUrl?: string,
): Promise<HealthRecord> {
  const record: HealthRecord = {
    id,
    ok,
    source: 'client',
    checkedAt: new Date().toISOString(),
    latencyMs,
    host: hostOf(embedUrl),
  }
  await saveHealth(record, ok ? CLIENT_TTL : 60)
  return record
}

async function probeUrl(url: string): Promise<{ ok: boolean; latencyMs: number }> {
  const started = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'HI-VISION-healthcheck/0.1',
      },
    })
    const latencyMs = Date.now() - started
    // 2xx/3xx = reachable. 401/403 still means host hidup.
    const ok = res.status < 500
    return { ok, latencyMs }
  } catch {
    return { ok: false, latencyMs: Date.now() - started }
  } finally {
    clearTimeout(timer)
  }
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = []
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx]!)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  )
  return out
}

/** Probe parallel embed URLs; simpan yang merespons. */
export async function probeCameras(cameras: Camera[]): Promise<HealthRecord[]> {
  const withEmbed = cameras.filter((c) => Boolean(c.embedUrl))
  const results = await mapPool(withEmbed, CONCURRENCY, async (cam) => {
    const existing = await getHealth(cam.id)
    // Skip re-probe if fresh client success
    if (
      existing?.ok &&
      existing.source === 'client' &&
      Date.now() - new Date(existing.checkedAt).getTime() < 5 * 60_000
    ) {
      return existing
    }
    const { ok, latencyMs } = await probeUrl(cam.embedUrl!)
    const record: HealthRecord = {
      id: cam.id,
      ok,
      source: 'probe',
      checkedAt: new Date().toISOString(),
      latencyMs,
      host: hostOf(cam.embedUrl),
    }
    await saveHealth(record, PROBE_TTL)
    return record
  })
  return results
}

export async function listActiveCameras(
  cameras: Camera[],
): Promise<{ cameras: Camera[]; health: HealthRecord[] }> {
  const ids = await readActiveIds()
  const health: HealthRecord[] = []
  const active: Camera[] = []

  const considered = ids.length
    ? ids
    : cameras.filter((c) => c.embedUrl).map((c) => c.id)

  for (const id of considered) {
    const h = await getHealth(id)
    if (!h?.ok) continue
    const cam = cameras.find((c) => c.id === id)
    if (!cam) continue
    health.push(h)
    active.push({
      ...cam,
      status: 'online',
      statusNote: `Terverifikasi ${h.source} · ${h.latencyMs ?? '?'}ms · ${h.checkedAt}`,
      lastCheckedAt: h.checkedAt,
    })
  }

  // Urutkan: client reports dulu, lalu latency terendah
  active.sort((a, b) => {
    const ha = health.find((h) => h.id === a.id)!
    const hb = health.find((h) => h.id === b.id)!
    if (ha.source !== hb.source) return ha.source === 'client' ? -1 : 1
    return (ha.latencyMs ?? 99999) - (hb.latencyMs ?? 99999)
  })

  return { cameras: active, health }
}
