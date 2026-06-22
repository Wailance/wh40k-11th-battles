import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { copy } from '../lib/copy'
import { useOverlayLock } from '../lib/use-overlay'

export function AppSheet({
  open,
  onClose,
  titleId,
  children,
  showHandle = true,
  className = '',
}: {
  open: boolean
  onClose: () => void
  titleId?: string
  children: ReactNode
  showHandle?: boolean
  className?: string
}) {
  useOverlayLock(open, onClose)
  if (!open) return null

  return createPortal(
    <div
      className="app-overlay app-overlay-sheet motion-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <button
        type="button"
        className="app-overlay-dismiss"
        aria-label={copy.common.close}
        onClick={onClose}
      />
      <div className={`app-sheet ${className}`.trim()} onClick={(e) => e.stopPropagation()}>
        {showHandle && <div className="app-sheet-handle" aria-hidden="true" />}
        {children}
      </div>
    </div>,
    document.body,
  )
}
