import { useEffect, useRef } from 'react'
import { AppDialog } from './AppDialog'
import { copy } from '../lib/copy'

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = copy.common.cancel,
  danger = false,
  extraAction,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  extraAction?: { label: string; onClick: () => void }
  onConfirm: () => void
  onCancel: () => void
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
  }, [open])

  return (
    <AppDialog open={open} onClose={onCancel} titleId="confirm-dialog-title">
      <h2 id="confirm-dialog-title" className="font-display text-title text-bone">
        {title}
      </h2>
      <p className="mt-2 text-body leading-relaxed text-muted">{body}</p>
      <div className={`mt-5 flex gap-3 ${extraAction ? 'flex-col' : ''}`}>
        {extraAction && (
          <button type="button" onClick={extraAction.onClick} className="app-btn w-full py-3 text-body">
            {extraAction.label}
          </button>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="app-btn-ghost flex-1 py-3 text-body">
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="app-btn flex-1 py-3 text-body"
            data-danger={danger || undefined}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </AppDialog>
  )
}
