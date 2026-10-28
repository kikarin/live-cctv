import { useCallback, useEffect, useRef, useState } from 'react'
import { isInJakarta } from '../lib/jakarta-geo'

const STORAGE_KEY = 'hi-vision-demo-live'

export type DemoUnlockMethod = 'gps' | 'self_declare' | 'camera'

export type DemoGpsStatus =
  | 'idle'
  | 'requesting'
  | 'granted_in'
  | 'granted_out'
  | 'denied'
  | 'unavailable'
  | 'error'

export type DemoCameraStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'error'

type StoredDemo = {
  unlocked: true
  method: DemoUnlockMethod
}

function readStored(): StoredDemo | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDemo
    if (
      parsed?.unlocked &&
      (parsed.method === 'gps' ||
        parsed.method === 'self_declare' ||
        parsed.method === 'camera')
    ) {
      return parsed
    }
  } catch {
    /* ignore */
  }
  return null
}

function writeStored(data: StoredDemo | null) {
  try {
    if (!data) sessionStorage.removeItem(STORAGE_KEY)
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

export function useDemoAccess() {
  const initial = readStored()
  const [unlocked, setUnlocked] = useState(Boolean(initial))
  const [method, setMethod] = useState<DemoUnlockMethod | null>(
    initial?.method ?? null,
  )
  const [gpsStatus, setGpsStatus] = useState<DemoGpsStatus>('idle')
  const [cameraStatus, setCameraStatus] = useState<DemoCameraStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setLocalStream(null)
  }, [])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const unlock = useCallback((next: DemoUnlockMethod) => {
    const data: StoredDemo = { unlocked: true, method: next }
    writeStored(data)
    setUnlocked(true)
    setMethod(next)
  }, [])

  const deactivate = useCallback(() => {
    writeStored(null)
    stopCamera()
    setUnlocked(false)
    setMethod(null)
    setGpsStatus('idle')
    setCameraStatus('idle')
    setMessage(null)
  }, [stopCamera])

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable')
      setMessage(
        'Browser tidak mendukung lokasi. Pakai izin kamera atau tombol demo.',
      )
      return
    }

    setGpsStatus('requesting')
    setMessage('Meminta izin lokasi…')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        if (isInJakarta(latitude, longitude)) {
          setGpsStatus('granted_in')
          setMessage('Lokasi Jakarta terdeteksi. Live Demo aktif.')
          unlock('gps')
        } else {
          setGpsStatus('granted_out')
          setMessage(
            'Lokasi di luar area Jakarta. Izinkan kamera atau pakai tombol demo.',
          )
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied')
          setMessage(
            'Izin lokasi ditolak. Izinkan kamera atau pakai tombol demo.',
          )
        } else {
          setGpsStatus('error')
          setMessage(
            'Gagal membaca lokasi. Izinkan kamera atau pakai tombol demo.',
          )
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60_000,
      },
    )
  }, [unlock])

  const requestCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unavailable')
      setMessage(
        'Browser tidak mendukung kamera. Pakai lokasi atau tombol demo.',
      )
      return
    }

    setCameraStatus('requesting')
    setMessage('Meminta izin kamera…')

    try {
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      setLocalStream(stream)
      setCameraStatus('granted')
      setMessage('Izin kamera diberikan. Live Demo aktif.')
      unlock('camera')
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraStatus('denied')
        setMessage(
          'Izin kamera ditolak. Pakai lokasi atau tombol “Saya lagi demo di Jakarta”.',
        )
      } else {
        setCameraStatus('error')
        setMessage(
          'Gagal mengakses kamera. Pakai lokasi atau tombol demo supaya tetap bisa lanjut.',
        )
      }
    }
  }, [stopCamera, unlock])

  const unlockSelfDeclare = useCallback(() => {
    setMessage('Live Demo diaktifkan untuk sesi ini.')
    unlock('self_declare')
  }, [unlock])

  return {
    unlocked,
    method,
    gpsStatus,
    cameraStatus,
    message,
    localStream,
    requestGps,
    requestCamera,
    unlockSelfDeclare,
    deactivate,
    stopCamera,
  }
}
