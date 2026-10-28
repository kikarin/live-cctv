import { randomBytes } from 'node:crypto'

export type LiveSessionPublic = {
  id: string
  name: string
  updatedAt: string
  live: boolean
  mode: 'webrtc'
  viewers: number
}

type ClientRole = 'publisher' | 'viewer'

type WsLike = {
  raw?: unknown
  send: (data: string) => void
  readyState?: number
}

type Peer = {
  id: string
  role: ClientRole
  ws: WsLike
  sessionId: string
}

type Room = {
  id: string
  name: string
  publisher: Peer | null
  viewers: Map<string, Peer>
  updatedAt: string
}

const rooms = new Map<string, Room>()
const peerByWs = new WeakMap<object, Peer>()

function nowIso() {
  return new Date().toISOString()
}

function send(ws: WsLike, msg: unknown) {
  try {
    ws.send(JSON.stringify(msg))
  } catch {
    /* closed */
  }
}

function roomPublic(room: Room): LiveSessionPublic {
  return {
    id: room.id,
    name: room.name,
    updatedAt: room.updatedAt,
    live: Boolean(room.publisher),
    mode: 'webrtc',
    viewers: room.viewers.size,
  }
}

export function listWebrtcSessions(): LiveSessionPublic[] {
  const out: LiveSessionPublic[] = []
  for (const room of rooms.values()) {
    if (!room.publisher) continue
    out.push(roomPublic(room))
  }
  out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return out
}

function detachPeer(peer: Peer) {
  const room = rooms.get(peer.sessionId)
  if (!room) return

  if (peer.role === 'publisher') {
    for (const viewer of room.viewers.values()) {
      send(viewer.ws, { type: 'publisher-left' })
    }
    room.publisher = null
    room.viewers.clear()
    rooms.delete(room.id)
    return
  }

  room.viewers.delete(peer.id)
  room.updatedAt = nowIso()
  if (room.publisher) {
    send(room.publisher.ws, { type: 'viewer-left', viewerId: peer.id })
  }
  if (!room.publisher && room.viewers.size === 0) {
    rooms.delete(room.id)
  }
}

export function handleWebrtcMessage(ws: WsLike, raw: string) {
  let msg: Record<string, unknown>
  try {
    msg = JSON.parse(raw) as Record<string, unknown>
  } catch {
    send(ws, { type: 'error', error: 'Invalid JSON' })
    return
  }

  const type = String(msg.type ?? '')

  if (type === 'publisher-start') {
    const name = String(msg.name ?? 'Peserta').trim().slice(0, 40) || 'Peserta'
    const sessionId = randomBytes(8).toString('hex')
    const peerId = randomBytes(4).toString('hex')
    const peer: Peer = {
      id: peerId,
      role: 'publisher',
      ws,
      sessionId,
    }
    const room: Room = {
      id: sessionId,
      name,
      publisher: peer,
      viewers: new Map(),
      updatedAt: nowIso(),
    }
    rooms.set(sessionId, room)
    const key = (ws.raw ?? ws) as object
    peerByWs.set(key, peer)
    send(ws, { type: 'ready', sessionId, peerId, name })
    return
  }

  if (type === 'viewer-join') {
    const sessionId = String(msg.sessionId ?? '')
    const room = rooms.get(sessionId)
    if (!room?.publisher) {
      send(ws, { type: 'error', error: 'Sesi tidak ditemukan / publisher offline' })
      return
    }
    const peerId = randomBytes(4).toString('hex')
    const peer: Peer = {
      id: peerId,
      role: 'viewer',
      ws,
      sessionId,
    }
    room.viewers.set(peerId, peer)
    room.updatedAt = nowIso()
    peerByWs.set((ws.raw ?? ws) as object, peer)
    send(ws, {
      type: 'joined',
      sessionId,
      peerId,
      name: room.name,
    })
    send(room.publisher.ws, { type: 'viewer-joined', viewerId: peerId })
    return
  }

  if (type === 'ping') {
    const peer = peerByWs.get((ws.raw ?? ws) as object)
    if (peer) {
      const room = rooms.get(peer.sessionId)
      if (room) room.updatedAt = nowIso()
    }
    send(ws, { type: 'pong' })
    return
  }

  // Relay WebRTC signal: offer / answer / ice
  if (type === 'signal') {
    const peer = peerByWs.get((ws.raw ?? ws) as object)
    if (!peer) {
      send(ws, { type: 'error', error: 'Belum join' })
      return
    }
    const room = rooms.get(peer.sessionId)
    if (!room) {
      send(ws, { type: 'error', error: 'Room hilang' })
      return
    }

    const to = String(msg.to ?? '')
    const payload = msg.data
    let target: Peer | undefined

    if (peer.role === 'publisher') {
      target = room.viewers.get(to)
    } else if (room.publisher) {
      // viewer → publisher; `to` optional
      target = room.publisher
    }

    if (!target) {
      send(ws, { type: 'error', error: 'Peer tujuan tidak ada' })
      return
    }

    send(target.ws, {
      type: 'signal',
      from: peer.id,
      data: payload,
    })
    room.updatedAt = nowIso()
    return
  }

  if (type === 'leave') {
    handleWebrtcClose(ws)
    return
  }

  send(ws, { type: 'error', error: `Unknown type: ${type}` })
}

export function handleWebrtcClose(ws: WsLike) {
  const key = (ws.raw ?? ws) as object
  const peer = peerByWs.get(key)
  if (!peer) return
  peerByWs.delete(key)
  detachPeer(peer)
}
