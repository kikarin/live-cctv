import { createHash, randomBytes } from 'node:crypto'
import {
  cacheGet,
  cacheGetBuffer,
  cacheSet,
  cacheSetBuffer,
} from './redis.js'

const INDEX_KEY = 'hi-vision:live:index'
const META_PREFIX = 'hi-vision:live:meta:'
const FRAME_PREFIX = 'hi-vision:live:frame:'
const SESSION_TTL = 45
const MAX_FRAME_BYTES = 350_000

export type LiveSessionMeta = {
  id: string
  name: string
  tokenHash: string
  createdAt: string
  updatedAt: string
  hasFrame?: boolean
}

export type LiveSessionPublic = {
  id: string
  name: string
  updatedAt: string
  live: boolean
}

function metaKey(id: string) {
  return `${META_PREFIX}${id}`
}

function frameKey(id: string) {
  return `${FRAME_PREFIX}${id}`
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

async function readIndex(): Promise<string[]> {
  const raw = await cacheGet(INDEX_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeIndex(ids: string[]) {
  await cacheSet(INDEX_KEY, JSON.stringify([...new Set(ids)]), SESSION_TTL * 4)
}

async function authSession(
  id: string,
  token: string,
): Promise<LiveSessionMeta | { error: string; status: number }> {
  const raw = await cacheGet(metaKey(id))
  if (!raw) return { error: 'Session expired', status: 404 }
  try {
    const meta = JSON.parse(raw) as LiveSessionMeta
    if (meta.tokenHash !== hashToken(token)) {
      return { error: 'Unauthorized', status: 401 }
    }
    return meta
  } catch {
    return { error: 'Corrupt session', status: 500 }
  }
}

export async function joinLiveSession(name: string): Promise<{
  id: string
  token: string
  meta: LiveSessionPublic
}> {
  const clean = name.trim().slice(0, 40) || 'Peserta'
  const id = randomBytes(8).toString('hex')
  const token = randomBytes(16).toString('hex')
  const now = new Date().toISOString()
  const meta: LiveSessionMeta = {
    id,
    name: clean,
    tokenHash: hashToken(token),
    createdAt: now,
    updatedAt: now,
  }
  await cacheSet(metaKey(id), JSON.stringify(meta), SESSION_TTL)
  const index = await readIndex()
  index.push(id)
  await writeIndex(index)
  return {
    id,
    token,
    meta: { id, name: clean, updatedAt: now, live: false },
  }
}

export async function listLiveSessions(): Promise<LiveSessionPublic[]> {
  const index = await readIndex()
  const alive: string[] = []
  const out: LiveSessionPublic[] = []

  for (const id of index) {
    const raw = await cacheGet(metaKey(id))
    if (!raw) continue
    try {
      const meta = JSON.parse(raw) as LiveSessionMeta
      alive.push(id)
      out.push({
        id: meta.id,
        name: meta.name,
        updatedAt: meta.updatedAt,
        live: Boolean(meta.hasFrame),
      })
    } catch {
      /* skip */
    }
  }

  await writeIndex(alive)
  out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return out
}

export async function publishFrameBinary(
  id: string,
  token: string,
  jpeg: Buffer,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!jpeg?.length) return { ok: false, error: 'Empty frame', status: 400 }
  if (jpeg.length > MAX_FRAME_BYTES) {
    return { ok: false, error: 'Frame too large', status: 413 }
  }

  const auth = await authSession(id, token)
  if ('error' in auth) return { ok: false, error: auth.error, status: auth.status }

  auth.updatedAt = new Date().toISOString()
  auth.hasFrame = true
  await cacheSet(metaKey(id), JSON.stringify(auth), SESSION_TTL)
  await cacheSetBuffer(frameKey(id), jpeg, SESSION_TTL)

  const index = await readIndex()
  if (!index.includes(id)) {
    index.push(id)
    await writeIndex(index)
  }

  return { ok: true }
}

/** Legacy JSON data-URL path (masih diterima). */
export async function publishFrame(
  id: string,
  token: string,
  imageDataUrl: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!imageDataUrl.startsWith('data:image/')) {
    return { ok: false, error: 'Invalid image payload', status: 400 }
  }
  const b64 = imageDataUrl.split(',')[1]
  if (!b64) return { ok: false, error: 'Invalid image payload', status: 400 }
  return publishFrameBinary(id, token, Buffer.from(b64, 'base64'))
}

export async function getFrameBuffer(
  id: string,
): Promise<{ buffer: Buffer; updatedAt: string; name: string } | null> {
  const raw = await cacheGet(metaKey(id))
  const frame = await cacheGetBuffer(frameKey(id))
  if (!raw || !frame?.length) return null
  try {
    const meta = JSON.parse(raw) as LiveSessionMeta
    return { buffer: frame, updatedAt: meta.updatedAt, name: meta.name }
  } catch {
    return null
  }
}

export async function getFrame(
  id: string,
): Promise<{ image: string; updatedAt: string; name: string } | null> {
  const frame = await getFrameBuffer(id)
  if (!frame) return null
  return {
    image: `data:image/jpeg;base64,${frame.buffer.toString('base64')}`,
    updatedAt: frame.updatedAt,
    name: frame.name,
  }
}

export async function leaveLiveSession(
  id: string,
  token: string,
): Promise<boolean> {
  const auth = await authSession(id, token)
  if ('error' in auth) return false
  await cacheSet(metaKey(id), '', 1)
  await cacheSetBuffer(frameKey(id), Buffer.alloc(0), 1)
  const index = (await readIndex()).filter((x) => x !== id)
  await writeIndex(index)
  return true
}
