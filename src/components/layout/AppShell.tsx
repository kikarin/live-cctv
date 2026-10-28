import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { StatusBar } from './StatusBar'

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1">
          <Outlet />
        </main>
        <StatusBar />
      </div>
    </div>
  )
}
