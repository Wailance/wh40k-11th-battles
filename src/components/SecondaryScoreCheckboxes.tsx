import { copy } from '../lib/copy'
import {
  getMissionScoreOptions,
  scoreOptionUsesCounter,
  scoreOptionsForRound,
  tacticalScoreHint,
  type MissionScoreOption,
} from '../lib/mission-scoring'
import type { SecondaryMode } from '../types/game'

type CardScoring = {
  getCount: (card: string, optionId: string) => number
  canScore: (card: string, optionId: string, delta: 1 | -1) => { allowed: boolean; reason?: string }
  onScore: (card: string, optionId: string, delta: 1 | -1) => void
}

export function SecondaryScoreCheckboxes({
  card,
  mode,
  battleRound,
  cardScoring,
}: {
  card: string
  mode: SecondaryMode
  battleRound: number
  cardScoring: CardScoring
}) {
  const options = scoreOptionsForRound(getMissionScoreOptions(card, mode), battleRound)
  if (!options.length) return null

  return (
    <div className="app-secondary-score-conditions">
      {options.map((opt) =>
        mode === 'fixed' && scoreOptionUsesCounter(opt) ? (
          <ScoreConditionCounter
            key={opt.id}
            card={card}
            option={opt}
            options={options}
            cardScoring={cardScoring}
          />
        ) : (
          <ScoreConditionCheckbox
            key={opt.id}
            card={card}
            option={opt}
            options={options}
            cardScoring={cardScoring}
          />
        ),
      )}
    </div>
  )
}

function ScoreConditionCounter({
  card,
  option,
  options,
  cardScoring,
}: {
  card: string
  option: MissionScoreOption
  options: MissionScoreOption[]
  cardScoring: CardScoring
}) {
  const count = cardScoring.getCount(card, option.id)
  const plus = cardScoring.canScore(card, option.id, 1)
  const minus = cardScoring.canScore(card, option.id, -1)
  const inactive = !plus.allowed && count === 0
  const hint = tacticalScoreHint(card, option, options)
  const roundVp = count * option.vp

  return (
    <div
      className={`app-secondary-score-row app-secondary-score-counter ${count > 0 ? 'is-checked' : ''} ${inactive ? 'is-inactive' : ''}`}
      title={inactive ? plus.reason : undefined}
    >
      <span className="app-secondary-score-label">
        +{option.vp} · {hint}
        {count > 0 && (
          <span className="app-secondary-score-total text-muted">
            {' '}
            ×{count} = {roundVp}
          </span>
        )}
      </span>
      <div className="app-secondary-score-counter-controls">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (minus.allowed) cardScoring.onScore(card, option.id, -1)
          }}
          disabled={!minus.allowed}
          className="app-score-row-btn app-score-row-btn-sm"
          aria-label={`Undo +${option.vp} · ${hint}`}
          title={minus.reason}
        >
          −
        </button>
        <span className="app-secondary-score-count tabular-nums">{count}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (plus.allowed) cardScoring.onScore(card, option.id, 1)
          }}
          disabled={!plus.allowed}
          className="app-score-row-btn app-score-row-btn-sm app-score-row-btn-plus"
          aria-label={`Score +${option.vp} · ${hint}`}
          title={plus.reason}
        >
          +
        </button>
      </div>
    </div>
  )
}

function ScoreConditionCheckbox({
  card,
  option,
  options,
  cardScoring,
}: {
  card: string
  option: MissionScoreOption
  options: MissionScoreOption[]
  cardScoring: CardScoring
}) {
  const count = cardScoring.getCount(card, option.id)
  const checked = count > 0
  const plus = cardScoring.canScore(card, option.id, 1)
  const minus = cardScoring.canScore(card, option.id, -1)
  const inactive = !checked && !plus.allowed
  const hint = tacticalScoreHint(card, option, options)
  const canToggle = checked ? minus.allowed : plus.allowed
  const blockedReason = inactive ? plus.reason : checked && !minus.allowed ? minus.reason : undefined

  const toggle = () => {
    if (checked) {
      if (minus.allowed) cardScoring.onScore(card, option.id, -1)
    } else if (plus.allowed) {
      cardScoring.onScore(card, option.id, 1)
    }
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={`${checked ? copy.game.secondaryScoreUncheck : copy.game.secondaryScoreCheck} +${option.vp} VP · ${hint}`}
      title={blockedReason}
      disabled={!canToggle}
      className={`app-secondary-score-row ${checked ? 'is-checked' : ''} ${inactive ? 'is-inactive' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        toggle()
      }}
    >
      <span className="app-secondary-score-label">
        +{option.vp} · {hint}
      </span>
      <span className="app-secondary-score-check" aria-hidden="true">
        {checked ? '✓' : ''}
      </span>
    </button>
  )
}
