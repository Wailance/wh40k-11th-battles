import { Link } from 'react-router-dom'
import { DetachmentPicker } from './DetachmentPicker'
import { copy } from '../lib/copy'
import { findArmy } from '../lib/army-allegiance'
import {
  ALLEGIANCES,
  armiesForAllegiance,
  type Allegiance,
} from '../lib/army-allegiance'
import type { ArmyRoster } from '../types/roster'

export type SetupStep = 'allegiance' | 'faction' | 'detachment'

const STEPS: SetupStep[] = ['allegiance', 'faction', 'detachment']

export function ListSetupWizard({
  step,
  allegiance,
  roster,
  dpUsed,
  onAllegiance,
  onFaction,
  onStep,
  onPersist,
  onComplete,
}: {
  step: SetupStep
  allegiance: Allegiance | null
  roster: ArmyRoster | null
  dpUsed: number
  onAllegiance: (a: Allegiance) => void
  onFaction: (army: string) => void
  onStep: (s: SetupStep) => void
  onPersist: (r: ArmyRoster) => void
  onComplete: () => void
}) {
  const stepIndex = STEPS.indexOf(step)
  const armyEntry = roster ? findArmy(roster.army) : undefined

  return (
    <div className="bf-viewport -mx-2 flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-white/[0.08] px-2 py-2">
        <Link to="/lists" className="text-xs text-muted hover:text-[var(--color-gw-gold)]">
          ← {copy.armyLists.back}
        </Link>
        <h1 className="mt-2 font-display text-lg tracking-wide text-[var(--color-gw-gold)]">
          {copy.armyLists.newList}
        </h1>
        <div className="mt-3 flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                i <= stepIndex ? 'bg-[var(--color-gw-gold)]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] uppercase tracking-widest text-muted">
          {step === 'allegiance' && copy.armyLists.stepAllegiance}
          {step === 'faction' && copy.armyLists.stepFaction}
          {step === 'detachment' && copy.armyLists.stepDetachment}
        </p>
      </header>

      <div className="bf-scroll flex-1 px-2 py-3">
        {step === 'allegiance' && (
          <div className="grid gap-3">
            {ALLEGIANCES.map(({ id, labelKey }) => (
              <button
                key={id}
                type="button"
                onClick={() => onAllegiance(id)}
                className={`app-panel p-5 text-left transition-colors ${
                  allegiance === id ? 'ring-1 ring-[var(--color-gw-gold)]/50' : ''
                }`}
              >
                <p className="font-display text-xl tracking-wide text-bone">{copy.armyLists[labelKey]}</p>
                <p className="mt-1 text-xs text-muted">
                  {armiesForAllegiance(id).length} {copy.armyLists.factionsCount}
                </p>
              </button>
            ))}
          </div>
        )}

        {step === 'faction' && allegiance && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onStep('allegiance')}
              className="mb-2 text-xs text-muted hover:text-bone"
            >
              ← {copy.armyLists.changeAllegiance}
            </button>
            {armiesForAllegiance(allegiance).map((a) => (
              <button
                key={a.army}
                type="button"
                onClick={() => onFaction(a.army)}
                className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${
                  roster?.army === a.army
                    ? 'border-[var(--color-gw-gold)]/40 bg-[var(--color-gw-gold)]/10'
                    : 'border-white/8'
                }`}
              >
                <span className="font-medium text-bone">{a.army}</span>
                <span className="text-xs text-muted">{a.detachments.length} det.</span>
              </button>
            ))}
          </div>
        )}

        {step === 'detachment' && roster && armyEntry && (
          <div>
            <button
              type="button"
              onClick={() => onStep('faction')}
              className="mb-3 text-xs text-muted hover:text-bone"
            >
              ← {copy.armyLists.changeFaction}
            </button>
            <p className="mb-3 font-display text-base text-bone">{roster.army}</p>
            <DetachmentPicker
              roster={roster}
              armyEntry={armyEntry}
              dpUsed={dpUsed}
              onPersist={onPersist}
              battleSize={roster.battleSize}
              onBattleSize={(size) => onPersist({ ...roster, battleSize: size })}
            />
          </div>
        )}
      </div>

      {step === 'detachment' && (
        <footer className="shrink-0 border-t border-white/[0.08] px-2 py-2">
          <button
            type="button"
            disabled={!roster?.detachments.length}
            onClick={onComplete}
            className="app-btn flex w-full py-3.5 text-sm disabled:opacity-40"
          >
            {copy.armyLists.startBuilding}
          </button>
        </footer>
      )}
    </div>
  )
}
