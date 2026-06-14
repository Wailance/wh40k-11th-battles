import { Outlet, useLocation } from 'react-router-dom'
import { ActiveGameBanner } from './ActiveGameBanner'
import { BottomNav } from './BottomNav'
import { SupportFooter } from './SupportFooter'

function useFullscreenShell() {
  const { pathname } = useLocation()
  if (pathname === '/game') return 'game'
  if (pathname.startsWith('/lists/')) return 'builder'
  return null
}

export function Layout() {
  const { pathname } = useLocation()
  const shell = useFullscreenShell()
  const isHome = pathname === '/'

  return (
    <div className="app-root flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden">
      <div className="app-bg" aria-hidden />
      <main
        className={`page-shell relative mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col ${
          shell ? 'page-shell-compact' : ''
        } ${shell === 'game' ? 'px-2' : 'px-4'}`}
      >
        {shell !== 'builder' && <ActiveGameBanner />}
        <div
          key={shell ? 'shell' : pathname}
          className={`flex min-h-0 flex-1 flex-col ${
            shell ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]'
          } ${shell ? '' : 'motion-page'}`}
        >
          <Outlet />
        </div>
        {isHome && <SupportFooter />}
      </main>
      <BottomNav compact={Boolean(shell)} />
    </div>
  )
}
