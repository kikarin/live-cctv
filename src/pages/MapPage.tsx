import { CameraFilters } from '../components/camera/CameraFilters'
import { CameraMap } from '../components/map/CameraMap'
import { Topbar } from '../components/layout/Topbar'
import { useCameras } from '../hooks/useCameras'
import { camerasWithCoordinates } from '../lib/camera-utils'

export function MapPage() {
  const cams = useCameras()
  const mapped = camerasWithCoordinates(cams.filtered)

  return (
    <div>
      <Topbar title="Peta Kamera" />
      <div className="space-y-4 p-4">
        <CameraFilters
          query={cams.query}
          setQuery={cams.setQuery}
          provider={cams.provider}
          setProvider={cams.setProvider}
          area={cams.area}
          setArea={cams.setArea}
          sourceType={cams.sourceType}
          setSourceType={cams.setSourceType}
          providers={cams.providers}
          areas={cams.areas}
          resetFilters={cams.resetFilters}
          count={mapped.length}
          total={camerasWithCoordinates(cams.all).length}
        />
        <p className="text-sm text-[var(--muted)]">
          Hanya kamera dengan koordinat terverifikasi (perkiraan ditandai).
          Pusat peta: Bundaran HI.
        </p>
        {mapped.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
            Tidak ada kamera berkoordinat untuk filter ini.
          </div>
        ) : (
          <CameraMap cameras={mapped} />
        )}
      </div>
    </div>
  )
}
