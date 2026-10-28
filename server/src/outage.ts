import { cacheGet, cacheSet } from './redis.js'

const OUTAGE_KEY = 'hi-vision:outage:balitower'
const OUTAGE_TTL = 5 * 60 // 5 menit circuit open
const SAMPLE_URLS = [
  'https://dki-jkt.balitower.co.id:7028/',
  'https://cctv-jsc.balitower.co.id:8011/',
]

export type OutageStatus = {
  active: boolean
  checkedAt: string
  reason?: string
  sampleOk?: number
  sampleFail?: number
}

async function ping(url: string, ms = 2000): Promise<boolean> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'HI-VISION-outage/0.1' },
    })
    return res.status < 500
  } catch {
    return false
  } finally {
    clearTimeout(t)
  }
}

export async function getOutage(): Promise<OutageStatus | null> {
  const raw = await cacheGet(OUTAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as OutageStatus
  } catch {
    return null
  }
}

export async function setOutage(status: OutageStatus): Promise<void> {
  await cacheSet(OUTAGE_KEY, JSON.stringify(status), OUTAGE_TTL)
}

/** Cek sampel kecil — jangan hammer semua 52 kamera. */
export async function detectBalitowerOutage(
  force = false,
): Promise<OutageStatus> {
  if (!force) {
    const cached = await getOutage()
    if (cached) return cached
  }

  const results = await Promise.all(SAMPLE_URLS.map((u) => ping(u)))
  const sampleOk = results.filter(Boolean).length
  const sampleFail = results.length - sampleOk
  const active = sampleOk === 0
  const status: OutageStatus = {
    active,
    checkedAt: new Date().toISOString(),
    sampleOk,
    sampleFail,
    reason: active
      ? 'Host Balitower tidak merespons (kemungkinan overload). Mode lapangan: Share Demo HP.'
      : undefined,
  }
  await setOutage(status)
  return status
}
