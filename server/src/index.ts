import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  listActiveCameras,
  probeCameras,
  reportClientHealth,
} from './camera-health.js'
import { fetchJakcctvCameras } from './jakcctv.js'
import { detectBalitowerOutage } from './outage.js'
import {
  getFrame,
  getFrameBuffer,
  joinLiveSession,
  leaveLiveSession,
  listLiveSessions,
  publishFrame,
  publishFrameBinary,
} from './live-share.js'
import { getIceServers } from './ice.js'
import {
  handleWebrtcClose,
  handleWebrtcMessage,
  listWebrtcSessions,
} from './live-webrtc.js'
import { cacheGet, cacheSet, getCacheBackend, initCache } from './redis.js'
import type { Camera } from './types.js'

const PORT = Number(process.env.PORT ?? 8787)
const TTL = Number(process.env.CACHE_TTL_SECONDS ?? 60)
const CACHE_KEY = process.env.CACHE_KEY ?? 'hi-vision:cameras:v1'

const app = new Hono()
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Live-Token', 'Accept'],
    exposeHeaders: ['X-Updated-At', 'X-Live-Name'],
  }),
)

async function getCamerasCached(): Promise<{
  cameras: Camera[]
  cache: 'hit' | 'miss'
  backend: 'redis' | 'memory'
}> {
  const backend = getCacheBackend()
  const hit = await cacheGet(CACHE_KEY)
  if (hit) {
    return {
      cameras: JSON.parse(hit) as Camera[],
      cache: 'hit',
      backend,
    }
  }

  const cameras = await fetchJakcctvCameras()
  await cacheSet(CACHE_KEY, JSON.stringify(cameras), TTL)
  return { cameras, cache: 'miss', backend: getCacheBackend() }
}

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    cacheBackend: getCacheBackend(),
    ttlSeconds: TTL,
  }),
)

app.get('/api/cameras', async (c) => {
  try {
    const { cameras, cache, backend } = await getCamerasCached()
    c.header('X-Cache', cache)
    c.header('X-Cache-Backend', backend)
    return c.json({
      cameras,
      meta: {
        count: cameras.length,
        cache,
        backend,
        ttlSeconds: TTL,
        source: 'jakcctv.jakarta.go.id/publik/data',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: 'Failed to load cameras', detail: message }, 502)
  }
})

/** Kamera aktif + status outage Balitower (jangan hammer host yang mati). */
app.get('/api/cameras/active', async (c) => {
  try {
    const refresh = c.req.query('refresh') === '1'
    const { cameras } = await getCamerasCached()
    const outage = await detectBalitowerOutage(refresh)

    // Saat outage: jangan probe 52 embed — bikin host makin jelek.
    if (outage.active) {
      const active = await listActiveCameras(cameras)
      return c.json({
        cameras: active.cameras,
        health: active.health,
        outage,
        meta: {
          count: active.cameras.length,
          probed: false,
          mode: 'field',
          note:
            outage.reason ??
            'CCTV publik overload. Pakai Share Demo dari HP di lokasi.',
        },
      })
    }

    if (refresh) {
      await probeCameras(cameras)
    }

    let active = await listActiveCameras(cameras)

    if (!refresh && active.cameras.length === 0) {
      void probeCameras(cameras).catch(() => undefined)
      return c.json({
        cameras: [],
        health: [],
        outage,
        meta: {
          count: 0,
          probed: false,
          probing: true,
          mode: 'mixed',
          note: 'Sedang scan host… atau langsung Share Demo dari HP.',
        },
      })
    }

    active = await listActiveCameras(cameras)
    return c.json({
      cameras: active.cameras,
      health: active.health,
      outage,
      meta: {
        count: active.cameras.length,
        probed: refresh,
        mode: active.cameras.length ? 'cctv' : 'field',
        note: 'Hanya kamera yang merespons / laporan putar sukses.',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: 'Failed to load active cameras', detail: message }, 502)
  }
})

app.get('/api/outage', async (c) => {
  const outage = await detectBalitowerOutage(c.req.query('refresh') === '1')
  return c.json({ outage })
})

app.post('/api/cameras/:id/report', async (c) => {
  const id = c.req.param('id')
  const body = (await c.req.json().catch(() => null)) as {
    ok?: boolean
    latencyMs?: number
    embedUrl?: string
  } | null
  if (typeof body?.ok !== 'boolean') {
    return c.json({ error: 'ok boolean wajib' }, 400)
  }
  const record = await reportClientHealth(
    id,
    body.ok,
    body.latencyMs,
    body.embedUrl,
  )
  return c.json({ health: record })
})

app.get('/api/cameras/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { cameras, cache, backend } = await getCamerasCached()
    const camera = cameras.find((cam) => cam.id === id)
    if (!camera) {
      return c.json({ error: 'Camera not found' }, 404)
    }
    c.header('X-Cache', cache)
    c.header('X-Cache-Backend', backend)
    return c.json({ camera, meta: { cache, backend } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: 'Failed to load camera', detail: message }, 502)
  }
})

/** Live Demo share — WebRTC (utama) + legacy JPEG list */
app.get('/api/live', async (c) => {
  const webrtc = listWebrtcSessions()
  const legacy = await listLiveSessions()
  const sessions = [
    ...webrtc,
    ...legacy.map((s) => ({ ...s, mode: 'jpeg' as const, viewers: 0 })),
  ]
  return c.json({ sessions })
})

app.get('/api/live/ice', (c) => {
  const iceServers = getIceServers()
  const hasTurn = iceServers.some((s) => {
    const u = s.urls
    const list = Array.isArray(u) ? u : [u]
    return list.some((x) => x.startsWith('turn:') || x.startsWith('turns:'))
  })
  return c.json({ iceServers, hasTurn })
})

app.get(
  '/api/live/ws',
  upgradeWebSocket(() => ({
    onMessage(event, ws) {
      const data =
        typeof event.data === 'string'
          ? event.data
          : new TextDecoder().decode(event.data as ArrayBuffer)
      handleWebrtcMessage(ws, data)
    },
    onClose(_event, ws) {
      handleWebrtcClose(ws)
    },
    onError(_event, ws) {
      handleWebrtcClose(ws)
    },
  })),
)

app.post('/api/live/join', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { name?: string } | null
  const name = body?.name?.trim()
  if (!name) return c.json({ error: 'Nama wajib diisi' }, 400)
  const session = await joinLiveSession(name)
  return c.json(session)
})

app.post('/api/live/:id/frame', async (c) => {
  const id = c.req.param('id')
  const contentType = c.req.header('content-type') ?? ''

  // Binary JPEG (cepat) — token di header
  if (
    contentType.includes('image/jpeg') ||
    contentType.includes('application/octet-stream')
  ) {
    const token = c.req.header('x-live-token')
    if (!token) return c.json({ error: 'x-live-token wajib' }, 400)
    const ab = await c.req.arrayBuffer()
    const result = await publishFrameBinary(id, token, Buffer.from(ab))
    if (!result.ok) return c.json({ error: result.error }, result.status)
    return c.json({ ok: true })
  }

  // Legacy JSON data-URL
  const body = (await c.req.json().catch(() => null)) as
    | { token?: string; image?: string }
    | null
  if (!body?.token || !body?.image) {
    return c.json({ error: 'token dan image wajib' }, 400)
  }
  const result = await publishFrame(id, body.token, body.image)
  if (!result.ok) return c.json({ error: result.error }, result.status)
  return c.json({ ok: true })
})

app.get('/api/live/:id/frame', async (c) => {
  const id = c.req.param('id')
  const accept = c.req.header('accept') ?? ''
  const wantJson = accept.includes('application/json') && !c.req.query('raw')

  if (wantJson) {
    const frame = await getFrame(id)
    if (!frame) return c.json({ error: 'Tidak ada frame / sesi habis' }, 404)
    return c.json(frame)
  }

  const frame = await getFrameBuffer(id)
  if (!frame) return c.json({ error: 'Tidak ada frame / sesi habis' }, 404)
  return new Response(frame.buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-store',
      'X-Updated-At': frame.updatedAt,
      'X-Live-Name': encodeURIComponent(frame.name),
    },
  })
})

app.delete('/api/live/:id', async (c) => {
  const id = c.req.param('id')
  const body = (await c.req.json().catch(() => null)) as { token?: string } | null
  if (!body?.token) return c.json({ error: 'token wajib' }, 400)
  const ok = await leaveLiveSession(id, body.token)
  if (!ok) return c.json({ error: 'Gagal stop / unauthorized' }, 401)
  return c.json({ ok: true })
})

const backend = await initCache()
console.log(`[hi-vision-api] cache backend: ${backend}`)

const server = serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[hi-vision-api] http://localhost:${info.port}`)
  console.log(`[hi-vision-api] webrtc ws: ws://localhost:${info.port}/api/live/ws`)
})
injectWebSocket(server)
