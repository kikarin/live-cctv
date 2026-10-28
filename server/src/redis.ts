import Redis from 'ioredis'

type MemoryEntry = { value: string | Buffer; expiresAt: number }

const memory = new Map<string, MemoryEntry>()

let redis: Redis | null = null
let redisReady = false
let redisFailed = false

function getRedisUrl() {
  return process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'
}

export function getCacheBackend(): 'redis' | 'memory' {
  return redisReady && !redisFailed ? 'redis' : 'memory'
}

export async function initCache(): Promise<'redis' | 'memory'> {
  if (redisFailed) return 'memory'

  try {
    redis = new Redis(getRedisUrl(), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableOfflineQueue: false,
    })
    redis.on('error', () => {
      redisFailed = true
      redisReady = false
    })
    await redis.connect()
    await redis.ping()
    redisReady = true
    redisFailed = false
    return 'redis'
  } catch {
    redisFailed = true
    redisReady = false
    try {
      await redis?.quit()
    } catch {
      /* ignore */
    }
    redis = null
    return 'memory'
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  if (redisReady && redis) {
    try {
      return await redis.get(key)
    } catch {
      redisFailed = true
      redisReady = false
    }
  }

  const entry = memory.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memory.delete(key)
    return null
  }
  return typeof entry.value === 'string' ? entry.value : null
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  if (redisReady && redis) {
    try {
      await redis.set(key, value, 'EX', ttlSeconds)
      return
    } catch {
      redisFailed = true
      redisReady = false
    }
  }

  memory.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

export async function cacheGetBuffer(key: string): Promise<Buffer | null> {
  if (redisReady && redis) {
    try {
      const buf = await redis.getBuffer(key)
      return buf
    } catch {
      redisFailed = true
      redisReady = false
    }
  }

  const entry = memory.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memory.delete(key)
    return null
  }
  if (Buffer.isBuffer(entry.value)) return entry.value
  if (typeof entry.value === 'string' && entry.value.startsWith('data:image/')) {
    const b64 = entry.value.split(',')[1]
    return b64 ? Buffer.from(b64, 'base64') : null
  }
  return null
}

export async function cacheSetBuffer(
  key: string,
  value: Buffer,
  ttlSeconds: number,
): Promise<void> {
  if (redisReady && redis) {
    try {
      await redis.set(key, value, 'EX', ttlSeconds)
      return
    } catch {
      redisFailed = true
      redisReady = false
    }
  }

  memory.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}
