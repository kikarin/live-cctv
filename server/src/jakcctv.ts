import type { Camera } from './types.js'

const PORTAL = 'https://jakcctv.jakarta.go.id/publik'
const DATA_URL = `${PORTAL}/data`

type PagePayload = {
  cards?: string
  pagination?: string
  count?: string
  total?: number
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function inferArea(name: string): string {
  const n = name.toUpperCase()
  if (n.includes('THAMRIN') || n.includes('UOB') || n.includes('KEBON MELATI')) {
    return n.includes('SIMPANG') || n.includes('UOB') || n.includes('KEBON')
      ? 'Bundaran HI'
      : 'Jalan M.H. Thamrin'
  }
  if (
    n.includes('SEMANGGI') ||
    n.includes('SENAYAN') ||
    n.includes('GATOT') ||
    n.includes('GERBANG PEMUDA') ||
    n.includes('BENDUNGAN') ||
    n.includes('PARMAN')
  ) {
    return 'Semanggi'
  }
  if (n.includes('MONAS') || n.includes('MERDEKA')) return 'Monas'
  if (n.includes('TANAH ABANG')) return 'Jakarta'
  return 'Jakarta'
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '')
    .trim()
}

function parseCards(html: string, fetchedAt: string): Camera[] {
  if (!html) return []

  const titles = [...html.matchAll(/class="title"[^>]*>([\s\S]*?)<\/div>/g)].map(
    (m) => decodeHtml(m[1] ?? ''),
  )
  const iframes = [...html.matchAll(/<iframe[^>]+src="([^"]+)"/g)].map(
    (m) => m[1] ?? '',
  )
  const badges = [...html.matchAll(/class="badge"[^>]*>([\s\S]*?)</g)].map((m) =>
    decodeHtml(m[1] ?? ''),
  )

  const cams: Camera[] = []
  const used = new Set<string>()

  for (let i = 0; i < titles.length; i++) {
    const name = titles[i]
    const embedUrl = iframes[i]
    const badge = badges[i] || `CCTV-${i + 1}`
    if (!name || !embedUrl) continue

    const base = `jsc-${slugify(name)}-${slugify(badge)}`
    let id = base
    let n = 2
    while (used.has(id)) {
      id = `${base}-${n++}`
    }
    used.add(id)

    cams.push({
      id,
      name: badge && !name.includes(badge) ? `${name} (${badge})` : name,
      locationLabel: name,
      area: inferArea(name),
      provider: 'Jakarta Smart City',
      sourceUrl: PORTAL,
      // Catalog uses public Balitower embeds; keep as external default because
      // non-standard ports often timeout — embedUrl retained for optional try.
      sourceType: 'external',
      status: 'unknown',
      embedUrl,
      attribution: 'Jakarta Smart City / Pemprov DKI Jakarta (Balitower)',
      lastCheckedAt: fetchedAt,
      statusNote:
        'Dari portal publik jakcctv (cached). Embed Balitower sering timeout; buka portal asli.',
    })
  }

  return cams
}

async function fetchPage(page: number, signal?: AbortSignal): Promise<PagePayload> {
  const url = `${DATA_URL}?q=&page=${page}`
  const res = await fetch(url, {
    signal,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'HI-VISION/0.1 (public catalog cache)',
    },
  })
  if (!res.ok) {
    throw new Error(`jakcctv page ${page} HTTP ${res.status}`)
  }
  return (await res.json()) as PagePayload
}

export async function fetchJakcctvCameras(): Promise<Camera[]> {
  const fetchedAt = new Date().toISOString()
  const first = await fetchPage(1)
  const total = typeof first.total === 'number' ? first.total : 0
  const perPage = Math.max(parseCards(first.cards ?? '', fetchedAt).length, 1)
  const pages = Math.max(1, Math.ceil(total / perPage) || 1)

  const all = [...parseCards(first.cards ?? '', fetchedAt)]

  for (let page = 2; page <= pages; page++) {
    try {
      const payload = await fetchPage(page)
      all.push(...parseCards(payload.cards ?? '', fetchedAt))
    } catch {
      // Keep partial catalog if a later page fails.
      break
    }
  }

  // Dedupe by embedUrl
  const seen = new Set<string>()
  const unique: Camera[] = []
  for (const cam of all) {
    const key = cam.embedUrl ?? cam.id
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(cam)
  }

  return unique
}
