import { apiBase } from './api'

export type LiveSessionPublic = {
  id: string
  name: string
  updatedAt: string
  live: boolean
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: string }).error || `HTTP ${res.status}`,
    )
  }
  return (await res.json()) as T
}

export async function listLiveSessions(
  signal?: AbortSignal,
): Promise<LiveSessionPublic[]> {
  const res = await fetch(`${apiBase()}/api/live`, { signal })
  const data = await parseJson<{ sessions: LiveSessionPublic[] }>(res)
  return data.sessions
}

export async function joinLiveSession(name: string): Promise<{
  id: string
  token: string
}> {
  const res = await fetch(`${apiBase()}/api/live/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return parseJson(res)
}

/** URL binary JPEG — browser decode langsung via <img>. */
export function liveFrameUrl(id: string, updatedAt: string): string {
  return `${apiBase()}/api/live/${id}/frame?v=${encodeURIComponent(updatedAt)}`
}

/** Kirim JPEG binary (lebih ringan dari JSON base64). */
export async function publishLiveFrameBlob(
  id: string,
  token: string,
  blob: Blob,
): Promise<void> {
  const res = await fetch(`${apiBase()}/api/live/${id}/frame`, {
    method: 'POST',
    headers: {
      'Content-Type': 'image/jpeg',
      'X-Live-Token': token,
    },
    body: blob,
  })
  await parseJson(res)
}

export async function leaveLiveSession(
  id: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${apiBase()}/api/live/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  await parseJson(res)
}
