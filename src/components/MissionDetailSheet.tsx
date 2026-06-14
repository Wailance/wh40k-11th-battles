import { copy } from '../lib/copy'
import { getMissionDetail } from '../lib/mission-details'
import { AppSheet } from './AppSheet'

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
  if (!open || !name || !detail) return null

  return (
    <AppSheet open={open} onClose={onClose} titleId="mission-detail-title" showHandle={false}>
      <div className="app-sheet-scroll app-sheet-body" data-allow-select>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={`mission-sheet-badge ${
                detail.type === 'primary' ? 'mission-sheet-badge-primary' : 'mission-sheet-badge-secondary'
              }`}
            >
              {detail.type === 'primary' ? 'Primary' : 'Secondary'}
            </span>
            <h2 id="mission-detail-title" className="mt-2 font-display text-display text-accent">
              {name}
            </h2>
            {detail.cap && <p className="mt-1 text-caption text-muted">{detail.cap}</p>}
          </div>
          <button type="button" onClick={onClose} className="app-btn-ghost shrink-0 px-3 py-1.5 text-caption">
            {copy.common.close}
          </button>
        </div>

        <p className="text-body leading-relaxed text-bone">{detail.summary}</p>

        {detail.whenDrawn && (
          <div className="mt-4 app-panel p-3">
            <p className="text-micro font-medium uppercase tracking-wide text-accent-dim">When Drawn</p>
            <p className="mt-1 text-body leading-relaxed text-bone">{detail.whenDrawn}</p>
          </div>
        )}

        {detail.actions && detail.actions.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-micro font-medium uppercase tracking-wide text-accent-dim">Actions</p>
            {detail.actions.map((action) => (
              <div key={action} className="app-panel p-3">
                <p className="text-body leading-relaxed text-muted">{action}</p>
              </div>
            ))}
          </div>
        )}

        {detail.blocks.length > 0 && (
          <div className="mt-4 space-y-3">
            {detail.blocks.map((block) => (
              <div key={block.label} className="app-panel p-3">
                <p className="text-micro font-medium uppercase tracking-wide text-accent-dim">{block.label}</p>
                <p className="mt-1 text-body leading-relaxed text-muted">{block.text}</p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-micro leading-relaxed text-muted/70">
          Summaries from the Chapter Approved deck. Use your physical cards or the Tournament
          Companion PDF (Rules tab) for exact wording.
        </p>
      </div>
    </AppSheet>
  )
}
