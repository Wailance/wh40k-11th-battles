import { AppDialog } from './AppDialog'
import { copy } from '../lib/copy'

export function NoticeDialog({
  open,
  title,
  body,
  confirmLabel = copy.common.close,
  onClose,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  onClose: () => void
}) {
  return (
    <AppDialog open={open} onClose={onClose} titleId="notice-dialog-title">
      <h2 id="notice-dialog-title" className="font-display text-title text-bone">
        {title}
      </h2>
      <p className="mt-2 text-body leading-relaxed text-muted">{body}</p>
      <button type="button" onClick={onClose} className="app-btn mt-5 w-full py-3 text-body">
        {confirmLabel}
      </button>
    </AppDialog>
  )
}
