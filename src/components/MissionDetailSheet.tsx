import { useEffect } from 'react'
import { copy } from '../lib/copy'
import { getMissionDetail } from '../lib/mission-details'

export function MissionDetailSheet({
  name,
  open,
  onClose,
}: {
  name: string | null
  open: boolean
  onClose: () => void
}) {
  const detail = name ? getMissionDetail(name) : null

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !name || !detail) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label={copy.common.close}
        onClick={onClose}
      />
      <div className="mission-sheet relative mx-auto max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/[0.08] bg-void-raised p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={`mission-sheet-badge ${
                detail.type === 'primary' ? 'mission-sheet-badge-primary' : 'mission-sheet-badge-secondary'
              }`}
            >
              {detail.type === 'primary' ? 'Primary' : 'Secondary'}
            </span>
            <h2 className="mt-2 font-display text-xl text-accent">{name}</h2>
            {detail.cap && <p className="mt-1 text-xs text-muted">{detail.cap}</p>}
          </div>
          <button type="button" onClick={onClose} className="app-btn-ghost shrink-0 px-3 py-1.5 text-xs">
            {copy.common.close}
          </button>
        </div>

        <p className="text-sm leading-relaxed text-bone">{detail.summary}</p>

        {detail.whenDrawn && (
          <div className="mt-4 app-panel p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-accent-dim">When Drawn</p>
            <p className="mt-1 text-sm leading-relaxed text-bone">{detail.whenDrawn}</p>
          </div>
        )}

        {detail.actions && detail.actions.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-accent-dim">Actions</p>
            {detail.actions.map((action) => (
              <div key={action} className="app-panel p-3">
                <p className="text-sm leading-relaxed text-muted">{action}</p>
              </div>
            ))}
          </div>
        )}

        {detail.blocks.length > 0 && (
          <div className="mt-4 space-y-3">
            {detail.blocks.map((block) => (
              <div key={block.label} className="app-panel p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-accent-dim">{block.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{block.text}</p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-[10px] leading-relaxed text-muted/70">
          Summaries from the Chapter Approved deck. Use your physical cards or the Tournament
          Companion PDF (Rules tab) for exact wording.
        </p>
      </div>
    </div>
  )
}
