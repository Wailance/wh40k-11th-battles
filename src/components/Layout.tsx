import { Outlet } from 'react-router-dom'
import { ActiveGameBanner } from './ActiveGameBanner'
import { BottomNav } from './BottomNav'

export function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="app-bg" aria-hidden />
      <main className="page-shell relative mx-auto w-full max-w-lg flex-1 px-4">
        <ActiveGameBanner />
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
