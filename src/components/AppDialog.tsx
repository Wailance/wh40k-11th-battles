import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { copy } from '../lib/copy'
import { useOverlayLock } from '../lib/use-overlay'

export function AppDialog({
  open,
  onClose,
  titleId,
  children,
  className = '',
}: {
  open: boolean
  onClose: () => void
  titleId: string
  children: ReactNode
  className?: string
}) {
  useOverlayLock(open, onClose)
  if (!open) return null

  return createPortal(
    <div className="app-overlay app-overlay-dialog motion-dialog-backdrop" role="presentation" onClick={onClose}>
      <button
        type="button"
        className="app-overlay-dismiss"
        aria-label={copy.common.close}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`app-dialog-panel motion-dialog-panel ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
