import { PRE_BATTLE_STEPS } from '../data/pre-battle-steps'
import { copy } from '../lib/copy'
import { PlayerSeatToggle } from './PlayerSeatToggle'

const DEPLOY_INDEX = 1
const FIRST_TURN_INDEX = 3

export function PreBattleChecklist({
  checks,
  onToggle,
  attacker,
  onAttackerChange,
  firstPlayer,
  onFirstPlayerChange,
  player1Name,
  player2Name,
  compact = false,
}: {
  checks: boolean[]
  onToggle: (index: number) => void
  attacker: 1 | 2
  onAttackerChange: (v: 1 | 2) => void
  firstPlayer: 1 | 2
  onFirstPlayerChange: (v: 1 | 2) => void
  player1Name: string
  player2Name: string
  compact?: boolean
}) {
  const done = checks.filter(Boolean).length
  const allDone = done === PRE_BATTLE_STEPS.length
  const seatOptions = [
    { value: 1 as const, label: player1Name },
    { value: 2 as const, label: player2Name },
  ]

  return (
    <section className={`app-panel ${compact ? 'p-3' : 'p-4'}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-display text-caption tracking-wide text-accent-dim">{copy.preBattle.title}</h2>
        <span className="pre-battle-counter rounded-full px-2 py-0.5 text-micro tabular-nums">
          {done}/{PRE_BATTLE_STEPS.length}
        </span>
      </div>
      {!allDone && (
        <p className="mb-3 text-caption leading-relaxed text-muted">{copy.preBattle.hint}</p>
      )}
      <ul className="motion-stagger space-y-2">
        {PRE_BATTLE_STEPS.map((step, i) => {
          const locked = i > 0 && !checks[i - 1]
          const isDone = checks[i] ?? false
          const isCurrent = !locked && !isDone
          const stepClass = locked
            ? 'pre-battle-step is-locked'
            : isDone
              ? 'pre-battle-step is-done'
              : 'pre-battle-step is-current'
          return (
            <li
              key={step.id}
              className={`motion-check-item rounded-lg px-3 py-2.5 ${stepClass}`}
              data-done={isDone ? 'true' : undefined}
            >
              <label
                className={`flex items-start gap-2.5 touch-manipulation ${
                  locked ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <span
                  className={`pre-battle-check mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-micro font-bold leading-none ${
                    isDone ? 'is-done' : ''
                  }`}
                  aria-hidden
                >
                  {isDone ? '✓' : ''}
                </span>
                <input
                  type="checkbox"
                  checked={isDone}
                  disabled={locked}
                  onChange={() => onToggle(i)}
                  className="sr-only"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`motion-check-title text-body font-semibold transition-colors duration-200 ${
                      isCurrent ? 'text-bone' : isDone ? 'text-accent' : 'text-muted'
                    }`}
                  >
                    {step.step}. {step.title}
                  </span>
                  <span className="mt-0.5 block text-caption leading-snug text-muted">{step.body}</span>
                </span>
              </label>

              {i === DEPLOY_INDEX && !locked && (
                <PlayerSeatToggle
                  compact
                  label={copy.preBattle.setAttacker}
                  hint={copy.preBattle.setAttackerHint}
                  options={seatOptions}
                  value={attacker}
                  onChange={onAttackerChange}
                />
              )}

              {i === FIRST_TURN_INDEX && !locked && (
                <PlayerSeatToggle
                  compact
                  label={copy.preBattle.setFirstTurn}
                  hint={copy.preBattle.setFirstTurnHint}
                  options={seatOptions}
                  value={firstPlayer}
                  onChange={onFirstPlayerChange}
                />
              )}
            </li>
          )
        })}
      </ul>
      {allDone && (
        <p className="mt-3 text-caption text-accent">
          {copy.preBattle.readySummary(
            attacker === 1 ? player1Name : player2Name,
            firstPlayer === 1 ? player1Name : player2Name,
          )}
        </p>
      )}
    </section>
  )
}
