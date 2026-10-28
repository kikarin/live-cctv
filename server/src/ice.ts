export function getIceServers(): RTCIceServerLike[] {
  const stun = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]

  const turnUrls = (process.env.TURN_URLS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const username = process.env.TURN_USERNAME?.trim()
  const credential = process.env.TURN_CREDENTIAL?.trim()

  if (!turnUrls.length || !username || !credential) {
    return stun
  }

  return [
    ...stun,
    {
      urls: turnUrls.length === 1 ? turnUrls[0]! : turnUrls,
      username,
      credential,
    },
  ]
}

type RTCIceServerLike = {
  urls: string | string[]
  username?: string
  credential?: string
}
