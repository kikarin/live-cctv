import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { AboutPage } from '../pages/AboutPage'
import { ActiveCamerasPage } from '../pages/ActiveCamerasPage'
import { CameraDetailPage } from '../pages/CameraDetailPage'
import { CamerasPage } from '../pages/CamerasPage'
import { DashboardPage } from '../pages/DashboardPage'
import { LiveDemoPage } from '../pages/LiveDemoPage'
import { MapPage } from '../pages/MapPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="active" element={<ActiveCamerasPage />} />
          <Route path="live" element={<LiveDemoPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="cameras" element={<CamerasPage />} />
          <Route path="camera/:id" element={<CameraDetailPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
