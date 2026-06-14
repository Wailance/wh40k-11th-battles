import { copy } from '../lib/copy'

export function RestoreToDeckButton({
  onClick,
  compact = false,
}: {
  onClick: () => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      className={`app-secondary-restore-btn ${compact ? 'is-compact' : ''}`}
      title={copy.game.returnToDeckHint}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <span className="app-secondary-restore-btn-icon" aria-hidden="true">
        ↩
      </span>
      <span className="app-secondary-restore-btn-text">
        <span className="app-secondary-restore-btn-label">{copy.game.returnToDeck}</span>
        {!compact && (
          <span className="app-secondary-restore-btn-hint">{copy.game.returnToDeckActionHint}</span>
        )}
      </span>
    </button>
  )
}
