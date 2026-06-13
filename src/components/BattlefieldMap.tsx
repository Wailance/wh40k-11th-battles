import { useMemo, useState } from 'react'
import { ForceDispositionBadge } from './ForceDispositionBadge'
import { copy } from '../lib/copy'
import { GW_EVENT_COMPANION_PDF, GW_PDF_LABELS } from '../lib/gw-links'
import { BATTLEFIELD_SETUP_STEPS, BATTLEFIELD_TABLE, type LayoutVariant } from '../lib/battlefield'

type MapProps = {
  battlefield: {
    matchupId: number
    player1: string
    player2: string
    variants: LayoutVariant[]
  }
  attacker: 1 | 2
  player1Name: string
  player2Name: string
  variantIndex?: number
  onVariantChange?: (index: number) => void
  compact?: boolean
}

export function BattlefieldMap({
  battlefield,
  attacker,
  player1Name,
  player2Name,
  variantIndex: variantIndexProp,
  onVariantChange,
  compact = false,
}: MapProps) {
  const [internalVariantIndex, setInternalVariantIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const variants = battlefield.variants
  const variantIndex = Math.min(
    variantIndexProp ?? internalVariantIndex,
    Math.max(0, variants.length - 1),
  )
  const setVariantIndex = (index: number) => {
    if (onVariantChange) onVariantChange(index)
    else setInternalVariantIndex(index)
  }
  const active = variants[variantIndex]

  const attackerName = attacker === 1 ? player1Name : player2Name
  const defenderName = attacker === 1 ? player2Name : player1Name

  const flipHint = useMemo(() => {
    if (!flipped) return copy.battlefield.flipToDefender
    return copy.battlefield.flipToAttacker
  }, [flipped])

  return (
    <div className="app-panel space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {copy.battlefield.title}
          </p>
          <p className="mt-1 text-sm text-muted">
            {copy.battlefield.matchupLabel(battlefield.matchupId)} ·{' '}
            {BATTLEFIELD_TABLE.widthIn}&quot; × {BATTLEFIELD_TABLE.heightIn}&quot;
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ForceDispositionBadge fd={battlefield.player1 as never} short />
            <span className="text-xs text-muted">vs</span>
            <ForceDispositionBadge fd={battlefield.player2 as never} short />
          </div>
        </div>
        {!compact && (
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className="app-btn-ghost rounded-lg px-2.5 py-1.5 text-[11px]"
            title={flipHint}
          >
            {flipped ? copy.battlefield.viewAttackerTop : copy.battlefield.viewDefenderBottom}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {variants.map((v, i) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVariantIndex(i)}
            className={`rounded-lg border px-2.5 py-1 text-[11px] touch-manipulation ${
              i === variantIndex
                ? 'border-accent/40 bg-accent/15 text-accent'
                : 'border-border text-muted'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {active && (
        <>
          <p className="text-sm font-medium text-bone">{active.title}</p>
          <p className="text-xs text-muted">{active.deployment}</p>

          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/30">
            <img
              src={active.image}
              alt={active.title}
              className={`w-full object-contain ${flipped ? 'rotate-180' : ''}`}
              loading="lazy"
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-2">
          <span className="font-medium text-red-300">{copy.battlefield.attacker}</span>
          <p className="mt-0.5 text-muted">{attackerName}</p>
        </div>
        <div className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-2.5 py-2">
          <span className="font-medium text-blue-300">{copy.battlefield.defender}</span>
          <p className="mt-0.5 text-muted">{defenderName}</p>
        </div>
      </div>

      {!compact && (
        <a href={GW_EVENT_COMPANION_PDF} target="_blank" rel="noreferrer" className="text-xs text-accent">
          {GW_PDF_LABELS.eventCompanion} ↗
        </a>
      )}

      {!compact && (
        <details className="text-xs text-muted">
          <summary className="cursor-pointer font-medium text-bone">{copy.battlefield.setupTitle}</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-4 leading-relaxed">
            {BATTLEFIELD_SETUP_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </details>
      )}
    </div>
  )
}
