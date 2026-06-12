import { useMemo, useState } from 'react'
import { ForceDispositionBadge } from './ForceDispositionBadge'
import { copy } from '../lib/copy'
import { GW_PDF_LABELS, GW_TOURNAMENT_COMPANION_PDF } from '../lib/gw-links'
import {
  BATTLEFIELD_SETUP_STEPS,
  BATTLEFIELD_TABLE,
  getMatchupBattlefield,
  hasBattlefieldMap,
  suggestAlternativeMatchups,
  type LayoutVariant,
  type MatchupBattlefield,
} from '../lib/battlefield'

type MapProps = {
  battlefield: MatchupBattlefield
  attacker: 1 | 2
  player1Name: string
  player2Name: string
  variantIndex?: number
  onVariantChange?: (index: number) => void
  compact?: boolean
  missionMatchupId?: number
  referenceMatchupId?: number | null
  onReferenceMatchupChange?: (id: number | null) => void
}

export function BattlefieldMap(props: MapProps) {
  const {
    battlefield,
    missionMatchupId = battlefield.matchupId,
    referenceMatchupId = null,
    onReferenceMatchupChange,
    ...mapProps
  } = props

  const missing = !hasBattlefieldMap(battlefield.matchupId)
  const suggestions = useMemo(
    () => suggestAlternativeMatchups(battlefield.matchupId),
    [battlefield.matchupId],
  )
  const reference = referenceMatchupId ? getMatchupBattlefield(referenceMatchupId) : null
  const showReference = missing && reference && hasBattlefieldMap(reference.matchupId)

  if (missing) {
    return (
      <div className="space-y-3">
        <MapUnavailablePanel
          battlefield={battlefield}
          suggestions={suggestions}
          referenceMatchupId={referenceMatchupId}
          onSelectReference={onReferenceMatchupChange}
        />
        {showReference && reference && (
          <>
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs leading-relaxed text-warning">
              <p>{copy.battlefield.referenceBanner(missionMatchupId, reference.matchupId)}</p>
              {onReferenceMatchupChange && (
                <button
                  type="button"
                  onClick={() => onReferenceMatchupChange(null)}
                  className="mt-2 font-medium text-bone underline-offset-2 hover:underline"
                >
                  {copy.battlefield.clearReference}
                </button>
              )}
            </div>
            <BattlefieldMapCanvas battlefield={reference} {...mapProps} />
          </>
        )}
      </div>
    )
  }

  return <BattlefieldMapCanvas battlefield={battlefield} {...mapProps} />
}

function MapUnavailablePanel({
  battlefield,
  suggestions,
  referenceMatchupId,
  onSelectReference,
}: {
  battlefield: MatchupBattlefield
  suggestions: MatchupBattlefield[]
  referenceMatchupId: number | null
  onSelectReference?: (id: number | null) => void
}) {
  const topScore = suggestions.length
    ? (() => {
        const current = battlefield
        const best = suggestions[0]
        let s = 0
        if (best.player1 === current.player1) s += 2
        if (best.player2 === current.player2) s += 2
        if (best.player1 === current.player2) s += 1
        if (best.player2 === current.player1) s += 1
        return s
      })()
    : 0

  return (
    <div className="app-panel space-y-3 p-4 text-sm">
      <div className="rounded-xl border border-warning/25 bg-warning/10 px-3 py-2.5">
        <p className="font-medium text-warning">{copy.battlefield.unavailableTitle}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          {copy.battlefield.unavailableBody(battlefield.matchupId)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ForceDispositionBadge fd={battlefield.player1} short />
          <span className="text-xs text-muted">vs</span>
          <ForceDispositionBadge fd={battlefield.player2} short />
        </div>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {copy.battlefield.suggestedMaps}
          </p>
          <p className="mt-1 text-[11px] text-muted">{copy.battlefield.suggestedHint}</p>
          <ul className="mt-2 space-y-2">
            {suggestions.map((s, i) => {
              const selected = referenceMatchupId === s.matchupId
              return (
                <li key={s.matchupId}>
                  <button
                    type="button"
                    disabled={!onSelectReference}
                    onClick={() => onSelectReference?.(s.matchupId)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left touch-manipulation transition-colors ${
                      selected
                        ? 'border-accent/40 bg-accent/15'
                        : 'border-border bg-black/20 hover:border-white/15'
                    } ${!onSelectReference ? 'opacity-70' : ''}`}
                  >
                    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="shrink-0 font-display text-xs text-accent">
                        #{s.matchupId}
                      </span>
                      <ForceDispositionBadge fd={s.player1} short />
                      <span className="text-muted">vs</span>
                      <ForceDispositionBadge fd={s.player2} short />
                    </span>
                    <span className="shrink-0 text-[10px] text-muted">
                      {s.variants.length} var.
                      {i === 0 && topScore > 0 ? ` · ${copy.battlefield.recommended}` : ''}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {GW_TOURNAMENT_COMPANION_PDF && (
        <a
          href={GW_TOURNAMENT_COMPANION_PDF}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-xs text-accent"
        >
          {GW_PDF_LABELS.tournament} (PDF) →
        </a>
      )}
    </div>
  )
}

function BattlefieldMapCanvas({
  battlefield,
  attacker,
  player1Name,
  player2Name,
  variantIndex: variantIndexProp,
  onVariantChange,
  compact = false,
}: Omit<MapProps, 'missionMatchupId' | 'referenceMatchupId' | 'onReferenceMatchupChange'>) {
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
  const active: LayoutVariant | undefined = variants[variantIndex]

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
            <ForceDispositionBadge fd={battlefield.player1} short />
            <span className="text-xs text-muted">vs</span>
            <ForceDispositionBadge fd={battlefield.player2} short />
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
              className={`w-full ${flipped ? 'rotate-180' : ''}`}
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

      <p className="text-[11px] leading-relaxed text-muted">{copy.battlefield.legend}</p>

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
