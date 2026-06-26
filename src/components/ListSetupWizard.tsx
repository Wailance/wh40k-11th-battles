import { Link } from 'react-router-dom'
import { AllegianceIcon, FactionIcon } from './AllegianceIcon'
import { DetachmentPicker } from './DetachmentPicker'
import { copy } from '../lib/copy'
import type { Army } from '../types/game'
import { ALLEGIANCES, type Allegiance } from '../lib/army-allegiance'
import {
  builderFactionCount,
  builderFactionsForAllegiance,
  type BuilderFaction,
} from '../lib/space-marine-chapters'
import { woBuilderDetachmentCount } from '../lib/warorgan-builder-meta'
import type { ArmyRoster } from '../types/roster'

export type SetupStep = 'allegiance' | 'faction' | 'detachment'

const STEPS: SetupStep[] = ['allegiance', 'faction', 'detachment']

function FactionRow({
  faction,
  allegiance,
  selected,
  loading,
  disabled,
  onSelect,
}: {
  faction: BuilderFaction
  allegiance: Allegiance
  selected: boolean
  loading?: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left sm:p-4 disabled:opacity-50 ${
        selected ? 'border-crimson/35 bg-crimson-soft' : 'border-white/8'
      }`}
    >
      <FactionIcon army={faction.name} allegiance={allegiance} className="h-8 w-8" />
      <span className="min-w-0 flex-1 font-medium text-bone">{faction.name}</span>
      {loading ? (
        <span className="motion-loading h-5 w-5 shrink-0 rounded-full border-2 border-accent/20 border-t-crimson-bright" />
      ) : (
        <span className="shrink-0 text-caption text-muted">
          {woBuilderDetachmentCount(faction.name) ?? faction.detachmentCount} det.
        </span>
      )}
    </button>
  )
}

export function ListSetupWizard({
  step,
  allegiance,
  roster,
  armyEntry,
  dpUsed,
  onAllegiance,
  onFaction,
  onStep,
  onPersist,
  onComplete,
  loadingFaction,
  factionError,
  detachmentsRaw,
  catalogEnhancements,
}: {
  step: SetupStep
  allegiance: Allegiance | null
  roster: ArmyRoster | null
  armyEntry?: Army
  dpUsed: number
  onAllegiance: (a: Allegiance) => void
  onFaction: (army: string) => void
  onStep: (s: SetupStep) => void
  onPersist: (r: ArmyRoster) => void
  onComplete: () => void
  loadingFaction?: string | null
  factionError?: string | null
  detachmentsRaw?: import('../types/warorgan').WoDetachment[]
  catalogEnhancements?: import('../types/faction-data').Enhancement[]
}) {
  const stepIndex = STEPS.indexOf(step)
  const factions = allegiance ? builderFactionsForAllegiance(allegiance) : []
  const codexChapters = factions.filter((f) => f.kind === 'chapter')
  const otherFactions = factions.filter((f) => f.kind === 'army')

  return (
    <div className="bf-viewport -mx-2 flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-white/[0.08] px-2 py-2">
        <Link to="/lists" className="text-caption text-muted hover:text-accent">
          ← {copy.armyLists.back}
        </Link>
        <h1 className="mt-2 font-display text-display tracking-wide text-accent">
          {copy.armyLists.newList}
        </h1>
        <div className="mt-3 flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < stepIndex
                  ? 'bg-crimson-bright'
                  : i === stepIndex
                    ? 'bg-accent/50'
                    : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-caption uppercase tracking-widest text-muted">
          {step === 'allegiance' && copy.armyLists.stepAllegiance}
          {step === 'faction' && copy.armyLists.stepFaction}
          {step === 'detachment' && copy.armyLists.stepDetachment}
        </p>
      </header>

      <div className="bf-scroll flex-1 px-2 py-3">
        {step === 'allegiance' && (
          <div className="space-y-2">
            {ALLEGIANCES.map(({ id, labelKey }) => (
              <button
                key={id}
                type="button"
                onClick={() => onAllegiance(id)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/8 p-3.5 text-left transition-colors sm:p-4"
              >
                <AllegianceIcon id={id} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-body font-semibold tracking-wide text-bone sm:text-title">
                    {copy.armyLists[labelKey]}
                  </p>
                  <p className="mt-0.5 text-micro text-muted sm:text-caption">
                    {builderFactionCount(id)} {copy.armyLists.factionsCount}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 'faction' && allegiance && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => onStep('allegiance')}
              disabled={!!loadingFaction}
              className="text-caption text-muted hover:text-bone disabled:opacity-50"
            >
              ← {copy.armyLists.changeAllegiance}
            </button>

            {factionError && (
              <p className="rounded-lg border border-crimson/30 bg-crimson-soft px-3 py-2 text-caption text-crimson-bright">
                {factionError}
              </p>
            )}

            {allegiance === 'space-marines' ? (
              <>
                {codexChapters.length > 0 && (
                  <section className="space-y-2">
                    <p className="px-1 text-micro uppercase tracking-widest text-muted">
                      {copy.armyLists.codexChapters}
                    </p>
                    {codexChapters.map((faction) => (
                      <FactionRow
                        key={faction.name}
                        faction={faction}
                        allegiance={allegiance}
                        selected={roster?.army === faction.name}
                        loading={loadingFaction === faction.name}
                        disabled={!!loadingFaction}
                        onSelect={() => onFaction(faction.name)}
                      />
                    ))}
                  </section>
                )}
                {otherFactions.length > 0 && (
                  <section className="space-y-2">
                    <p className="px-1 text-micro uppercase tracking-widest text-muted">
                      {copy.armyLists.otherSpaceMarines}
                    </p>
                    {otherFactions.map((faction) => (
                      <FactionRow
                        key={faction.name}
                        faction={faction}
                        allegiance={allegiance}
                        selected={roster?.army === faction.name}
                        loading={loadingFaction === faction.name}
                        disabled={!!loadingFaction}
                        onSelect={() => onFaction(faction.name)}
                      />
                    ))}
                  </section>
                )}
              </>
            ) : (
              <div className="space-y-2">
                {factions.map((faction) => (
                  <FactionRow
                    key={faction.name}
                    faction={faction}
                    allegiance={allegiance}
                    selected={roster?.army === faction.name}
                    loading={loadingFaction === faction.name}
                    disabled={!!loadingFaction}
                    onSelect={() => onFaction(faction.name)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'detachment' && roster && (
          <div>
            <button
              type="button"
              onClick={() => onStep('faction')}
              disabled={!!loadingFaction}
              className="mb-3 text-caption text-muted hover:text-bone disabled:opacity-50"
            >
              ← {copy.armyLists.changeFaction}
            </button>
            <p className="mb-3 font-display text-title text-bone">{roster.army}</p>
            {!armyEntry ? (
              <div className="flex items-center justify-center gap-2 py-12 text-caption text-muted">
                <span className="motion-loading h-5 w-5 shrink-0 rounded-full border-2 border-accent/20 border-t-crimson-bright" />
                {copy.armyLists.loadingDetachments}
              </div>
            ) : (
              <DetachmentPicker
                roster={roster}
                armyEntry={armyEntry}
                dpUsed={dpUsed}
                onPersist={onPersist}
                battleSize={roster.battleSize}
                onBattleSize={(size) => onPersist({ ...roster, battleSize: size })}
                detachmentsRaw={detachmentsRaw}
                catalogEnhancements={catalogEnhancements}
              />
            )}
          </div>
        )}
      </div>

      {step === 'detachment' && (
        <footer className="shrink-0 border-t border-white/[0.08] px-2 py-2">
          {!roster?.detachments.length && armyEntry && !loadingFaction && (
            <p className="mb-2 text-center text-caption text-muted">
              {copy.armyLists.wizardPickDetachment}
            </p>
          )}
          <button
            type="button"
            disabled={!roster?.detachments.length || !!loadingFaction || !armyEntry}
            onClick={onComplete}
            className="app-btn flex w-full py-3.5 text-body disabled:opacity-40"
          >
            {copy.armyLists.startBuilding}
          </button>
        </footer>
      )}
    </div>
  )
}
