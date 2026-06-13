import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DpBudget, DpCost } from '../components/DpDisplay'
import { ForceDispositionBadge } from '../components/ForceDispositionBadge'
import { MissionNameButton } from '../components/MissionNameButton'
import { WizardProgress } from '../components/WizardProgress'
import {
  applyMissionsToGame,
  armies,
  createNewGame,
  formatPlayerDetachments,
  gameData,
  MAX_DP,
  playerForceDispositions,
  prepareGameForStart,
  togglePlayerDetachment,
} from '../lib/game-utils'
import { BattlefieldMap } from '../components/BattlefieldMap'
import { PreBattleChecklist } from '../components/PreBattleChecklist'
import { getMatchupBattlefield } from '../lib/battlefield'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { copy } from '../lib/copy'
import { wizardStepHint } from '../lib/wizard-hints'
import { loadActiveGame, saveActiveGame } from '../lib/storage'
import type { ForceDisposition, GameState, PlayerSetup, SecondaryMode, SelectedDetachment } from '../types/game'

const STEPS = ['Players', 'Detachments', 'Mission', 'Secondaries', 'Start']

export function NewGamePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [game, setGame] = useState<GameState>(() => createNewGame())
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const activeGame = loadActiveGame()
  const hasActive = activeGame?.status === 'active'

  const update = (patch: Partial<GameState>) => setGame((g) => ({ ...g, ...patch }))
  const updateP1 = (patch: Partial<GameState['player1']>) =>
    setGame((g) => ({ ...g, player1: { ...g.player1, ...patch } }))
  const updateP2 = (patch: Partial<GameState['player2']>) =>
    setGame((g) => ({ ...g, player2: { ...g.player2, ...patch } }))
  const updateP1Fd = (fd: ForceDisposition) =>
    setGame((g) => applyMissionsToGame({ ...g, player1: { ...g.player1, forceDisposition: fd } }))
  const updateP2Fd = (fd: ForceDisposition) =>
    setGame((g) => applyMissionsToGame({ ...g, player2: { ...g.player2, forceDisposition: fd } }))

  const armyList = armies

  function advanceStep() {
    if (step === 1) setGame((g) => applyMissionsToGame(g))
    setStep((s) => s + 1)
  }

  function toggleDetachment(player: 1 | 2, armyName: string, detName: string) {
    const army = armyList.find((a) => a.army === armyName)
    const det = army?.detachments.find((d) => d.name === detName)
    if (!det) return
    const selected: SelectedDetachment = {
      name: det.name,
      dp: det.dp,
      note: det.note,
      forceDisposition: det.forceDisposition as ForceDisposition,
    }
    if (player === 1) updateP1(togglePlayerDetachment(game.player1, selected))
    else updateP2(togglePlayerDetachment(game.player2, selected))
  }

  function startGame() {
    if (hasActive && activeGame?.id !== game.id) {
      setConfirmOverwrite(true)
      return
    }
    launchGame()
  }

  function launchGame() {
    const ready = prepareGameForStart({ ...game, status: 'active' })
    saveActiveGame(ready)
    navigate('/game')
  }

  const secondaryReady = (p: PlayerSetup) =>
    p.secondaryMode === 'tactical' ||
    (p.secondaryMode === 'fixed' && p.secondaries.length === 2)

  const canNext = [
    game.player1.army && game.player2.army,
    game.player1.detachments.length >= 1 && game.player2.detachments.length >= 1,
    Boolean(game.player1.primaryMission && game.player2.primaryMission && game.matchupId),
    secondaryReady(game.player1) && secondaryReady(game.player2),
    true,
  ][step]

  const stepHint = !canNext ? wizardStepHint(step, game) : null

  return (
    <div>
      {hasActive && (
        <div className="app-panel mb-4 border-crimson/20 bg-crimson-soft/40 p-3 text-sm">
          <p className="font-medium text-bone">{copy.home.activeSub}</p>
          <p className="mt-1 text-xs text-muted">
            {activeGame!.player1.name} vs {activeGame!.player2.name} · Round {activeGame!.battleRound}
          </p>
          <Link to="/game" className="mt-2 inline-block text-xs font-medium text-accent">
            {copy.home.resumeCta} →
          </Link>
        </div>
      )}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="app-page-title">{copy.newGame.title}</h1>
          <p className="mt-0.5 text-sm text-muted">{STEPS[step]}</p>
        </div>
        <button type="button" onClick={() => navigate('/')} className="app-btn-ghost shrink-0 px-3 py-2 text-xs">
          {copy.newGame.cancel}
        </button>
      </div>
      <WizardProgress step={step} total={STEPS.length} labels={STEPS} />

      {step === 0 && (
        <div className="space-y-4">
          <PlayerFields
            label="Player 1"
            color="var(--color-p1)"
            name={game.player1.name}
            army={game.player1.army}
            battleReady={game.player1.battleReady}
            armies={armyList.map((a) => a.army)}
            onName={(name) => updateP1({ name })}
            onArmy={(army) => updateP1({ army, detachments: [] })}
            onBattleReady={(battleReady) => updateP1({ battleReady })}
          />
          <PlayerFields
            label="Player 2"
            color="var(--color-p2)"
            name={game.player2.name}
            army={game.player2.army}
            battleReady={game.player2.battleReady}
            armies={armyList.map((a) => a.army)}
            onName={(name) => updateP2({ name })}
            onArmy={(army) => updateP2({ army, detachments: [] })}
            onBattleReady={(battleReady) => updateP2({ battleReady })}
          />
        </div>
      )}

      {step === 1 && (
        <DetachmentStep
          player1={game.player1}
          player2={game.player2}
          onToggle={(player, det) => toggleDetachment(player, player === 1 ? game.player1.army : game.player2.army, det)}
        />
      )}

      {step === 2 && (
        <div className="space-y-4">
          <ForceDispositionPicker
            label={game.player1.name}
            color="var(--color-p1)"
            player={game.player1}
            onChange={updateP1Fd}
          />
          <ForceDispositionPicker
            label={game.player2.name}
            color="var(--color-p2)"
            player={game.player2}
            onChange={updateP2Fd}
          />

          <div className="app-panel p-4">
            <p className="mb-2 text-sm text-muted">Chapter Approved matchup</p>
            <div className="flex flex-wrap items-center gap-2">
              <ForceDispositionBadge fd={game.player1.forceDisposition} />
              <span className="text-muted">vs</span>
              <ForceDispositionBadge fd={game.player2.forceDisposition} />
            </div>
            {game.matchupId && (
              <p className="mt-2 text-xs text-accent">Mission &amp; Layout #{game.matchupId}</p>
            )}
            <p className="mt-2 text-xs text-muted">
              Primary missions are set by the pairing of Force Dispositions (Chapter Approved deck).
            </p>
          </div>

          <MissionCard player={game.player1.name} mission={game.player1.primaryMission} fd={game.player1.forceDisposition} color="var(--color-p1)" />
          <MissionCard player={game.player2.name} mission={game.player2.primaryMission} fd={game.player2.forceDisposition} color="var(--color-p2)" />

          {game.matchupId && getMatchupBattlefield(game.matchupId) && (
            <BattlefieldMap
              battlefield={getMatchupBattlefield(game.matchupId)!}
              attacker={game.attacker}
              player1Name={game.player1.name}
              player2Name={game.player2.name}
              variantIndex={game.layoutVariantIndex}
              onVariantChange={(i) => update({ layoutVariantIndex: i })}
              compact
            />
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <SecondarySetup
            label={game.player1.name}
            color="var(--color-p1)"
            player={game.player1}
            onChange={(patch) => updateP1(patch)}
          />
          <SecondarySetup
            label={game.player2.name}
            color="var(--color-p2)"
            player={game.player2}
            onChange={(patch) => updateP2(patch)}
          />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <ToggleGroup
            label="Who goes first?"
            options={[
              { value: 1, label: game.player1.name },
              { value: 2, label: game.player2.name },
            ]}
            value={game.firstPlayer}
            onChange={(v) => update({ firstPlayer: v as 1 | 2 })}
          />
          <ToggleGroup
            label="Attacker"
            options={[
              { value: 1, label: game.player1.name },
              { value: 2, label: game.player2.name },
            ]}
            value={game.attacker}
            onChange={(v) => update({ attacker: v as 1 | 2 })}
          />

          {game.matchupId && getMatchupBattlefield(game.matchupId) && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-bone">{copy.newGame.layoutPick}</p>
              <p className="text-xs text-muted">{copy.newGame.layoutPickHint}</p>
              <BattlefieldMap
                battlefield={getMatchupBattlefield(game.matchupId)!}
                attacker={game.attacker}
                player1Name={game.player1.name}
                player2Name={game.player2.name}
                variantIndex={game.layoutVariantIndex}
                onVariantChange={(i) => update({ layoutVariantIndex: i })}
              />
            </div>
          )}

          <PreBattleChecklist
            checks={game.preBattleChecks}
            onToggle={(i) => {
              const next = [...game.preBattleChecks]
              next[i] = !next[i]
              update({ preBattleChecks: next })
            }}
          />

          <div className="app-panel p-4 text-sm">
            <SummaryRow label="P1" value={`${game.player1.army} — ${formatPlayerDetachments(game.player1)}`} />
            <SummaryRow label="P2" value={`${game.player2.army} — ${formatPlayerDetachments(game.player2)}`} />
            <SummaryRow label="Primary" value={`${game.player1.primaryMission} / ${game.player2.primaryMission}`} />
            {game.matchupId && getMatchupBattlefield(game.matchupId)?.variants[game.layoutVariantIndex] && (
              <SummaryRow
                label="Layout"
                value={
                  getMatchupBattlefield(game.matchupId)!.variants[game.layoutVariantIndex].label
                }
              />
            )}
            <SummaryRow
              label="Battle Ready"
              value={`${game.player1.battleReady ? '+10 VP' : 'No'} / ${game.player2.battleReady ? '+10 VP' : 'No'}`}
            />
          </div>
        </div>
      )}

      {stepHint && (
        <p className="mt-4 text-center text-sm text-warning" role="status">
          {stepHint}
        </p>
      )}

      <ConfirmDialog
        open={confirmOverwrite}
        title={copy.home.newGameWhileActive}
        body={copy.home.newGameWhileActiveBody}
        confirmLabel={copy.home.cta}
        danger
        onCancel={() => setConfirmOverwrite(false)}
        onConfirm={() => {
          setConfirmOverwrite(false)
          launchGame()
        }}
      />

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="app-btn-ghost flex-1 py-3 text-sm"
          >
            {copy.newGame.back}
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!canNext}
            onClick={advanceStep}
            className="app-btn flex-1 py-3 text-sm disabled:opacity-40"
          >
            {copy.newGame.next}
          </button>
        ) : (
          <button
            type="button"
            onClick={startGame}
            className="app-btn flex-1 py-3 text-sm"
          >
            {copy.newGame.start}
          </button>
        )}
      </div>
    </div>
  )
}

function PlayerFields({
  label, color, name, army, battleReady, armies, onName, onArmy, onBattleReady,
}: {
  label: string
  color: string
  name: string
  army: string
  battleReady: boolean
  armies: string[]
  onName: (n: string) => void
  onArmy: (a: string) => void
  onBattleReady: (v: boolean) => void
}) {
  return (
    <div className="app-panel p-4">
      <p className="mb-3 font-semibold" style={{ color }}>{label}</p>
      <input
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="Name"
        className="app-input mb-3 w-full px-3 py-2 text-sm outline-none"
      />
      <select
        value={army}
        onChange={(e) => onArmy(e.target.value)}
        className="app-input mb-3 w-full px-3 py-2 text-sm outline-none"
      >
        <option value="">Select army…</option>
        {armies.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onBattleReady(!battleReady)}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm touch-manipulation ${
          battleReady ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border text-muted'
        }`}
      >
        <span>{copy.game.battleReady}</span>
        <span className="text-xs">{battleReady ? copy.game.battleReadyOn : copy.game.battleReadyOff}</span>
      </button>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">{copy.game.battleReadyHint}</p>
    </div>
  )
}

function DetachmentStep({
  player1,
  player2,
  onToggle,
}: {
  player1: PlayerSetup
  player2: PlayerSetup
  onToggle: (player: 1 | 2, det: string) => void
}) {
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1)
  const player = activePlayer === 1 ? player1 : player2
  const color = activePlayer === 1 ? 'var(--color-p1)' : 'var(--color-p2)'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {([1, 2] as const).map((n) => {
          const p = n === 1 ? player1 : player2
          const ready = p.detachments.length >= 1
          return (
            <button
              key={n}
              type="button"
              onClick={() => setActivePlayer(n)}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm touch-manipulation ${
                activePlayer === n
                  ? 'border-accent bg-accent/15 ring-1 ring-accent/25'
                  : 'border-border bg-panel'
              }`}
            >
              <span
                className="block truncate font-semibold"
                style={{ color: n === 1 ? 'var(--color-p1)' : 'var(--color-p2)' }}
              >
                {p.name}
              </span>
              <span className="mt-0.5 block text-[10px] text-muted">
                {ready ? `${p.detachments.length} det · ${p.detachments.reduce((s, d) => s + d.dp, 0)}/${MAX_DP} DP` : 'Pick detachments'}
              </span>
            </button>
          )
        })}
      </div>

      <DetachmentPicker
        key={activePlayer}
        playerName={player.name}
        armyName={player.army}
        selected={player.detachments}
        color={color}
        onToggle={(d) => onToggle(activePlayer, d)}
      />
    </div>
  )
}

function DetachmentPicker({
  playerName, armyName, selected, color, onToggle,
}: {
  playerName: string
  armyName: string
  selected: SelectedDetachment[]
  color: string
  onToggle: (d: string) => void
}) {
  const army = armies.find((a) => a.army === armyName)
  const usedDp = selected.reduce((s, d) => s + d.dp, 0)
  const selectedNames = new Set(selected.map((d) => d.name))

  const remainingDp = MAX_DP - usedDp

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-semibold" style={{ color }}>{playerName}</p>
        <p className="text-xs text-muted">{armyName}</p>
      </div>

      <div className="app-panel mb-3 !rounded-xl !p-3">
        <DpBudget used={usedDp} color={color} label={copy.dp.budget} />
      </div>

      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selected.map((d) => (
            <button
              key={d.name}
              type="button"
              onClick={() => onToggle(d.name)}
              className="flex items-center gap-2 rounded-lg border border-accent/50 bg-accent/15 px-2.5 py-1.5 text-xs text-accent touch-manipulation"
            >
              <span className="font-medium">{d.name}</span>
              <DpCost dp={d.dp} size="sm" />
              <span className="opacity-50">×</span>
            </button>
          ))}
        </div>
      )}

      <p className="mb-2 text-xs text-muted">{copy.dp.pickHint}</p>

      <div className="space-y-2">
        {army?.detachments.map((d) => {
          const isSelected = selectedNames.has(d.name)
          const wouldExceed = !isSelected && usedDp + d.dp > MAX_DP
          return (
            <button
              key={d.name}
              type="button"
              disabled={wouldExceed}
              onClick={() => onToggle(d.name)}
              title={wouldExceed ? copy.dp.tooMany(d.dp, remainingDp) : undefined}
              className={`min-h-[3.25rem] w-full rounded-lg border p-3 text-left text-sm transition-colors touch-manipulation ${
                isSelected
                  ? 'border-accent bg-accent/15 ring-1 ring-accent/25'
                  : wouldExceed
                    ? 'border-border bg-panel opacity-45'
                    : 'border-border bg-panel active:bg-panel-hover'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{d.name}</span>
                <DpCost dp={d.dp} size="sm" />
              </div>
              {wouldExceed && !isSelected && (
                <p className="mt-1 text-[10px] text-warning">{copy.dp.tooMany(d.dp, remainingDp)}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <ForceDispositionBadge fd={d.forceDisposition as ForceDisposition} short />
                {d.note && <span className="text-xs text-muted">{d.note}</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ForceDispositionPicker({
  label, color, player, onChange,
}: {
  label: string
  color: string
  player: PlayerSetup
  onChange: (fd: ForceDisposition) => void
}) {
  const options = playerForceDispositions(player)
  if (options.length <= 1) return null
  return (
    <div className="app-panel p-4">
      <p className="mb-2 text-sm" style={{ color }}>
        {label} — Force Disposition for mission
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((fd) => (
          <button
            key={fd}
            type="button"
            onClick={() => onChange(fd)}
            className={`min-h-[2.75rem] rounded-lg border p-1.5 touch-manipulation ${player.forceDisposition === fd ? 'border-accent' : 'border-transparent'}`}
          >
            <ForceDispositionBadge fd={fd} size="md" />
          </button>
        ))}
      </div>
    </div>
  )
}

function MissionCard({ player, mission, fd, color }: { player: string; mission: string; fd: ForceDisposition; color: string }) {
  if (!mission) return null
  return (
    <div className="app-panel p-4">
      <p className="text-xs font-semibold uppercase" style={{ color }}>{player}</p>
      <p className="mt-1 text-lg font-bold">
        <MissionNameButton name={mission} className="text-lg font-bold text-text no-underline hover:text-accent" />
      </p>
      <p className="mt-1 text-[10px] text-muted">Tap mission for scoring guide</p>
      <div className="mt-2"><ForceDispositionBadge fd={fd} size="md" /></div>
    </div>
  )
}

function SecondarySetup({
  label, color, player, onChange,
}: {
  label: string
  color: string
  player: PlayerSetup
  onChange: (patch: Partial<PlayerSetup>) => void
}) {
  const fixedOptions = gameData.secondaries.fixedOptions as string[]
  const setMode = (mode: SecondaryMode) =>
    onChange({ secondaryMode: mode, secondaries: mode === 'fixed' ? player.secondaries : [] })

  const toggleFixed = (s: string) => {
    if (player.secondaries.includes(s)) {
      onChange({ secondaries: player.secondaries.filter((x) => x !== s) })
    } else if (player.secondaries.length < 2) {
      onChange({ secondaries: [...player.secondaries, s] })
    }
  }

  return (
    <div className="app-panel p-4">
      <p className="mb-3 font-semibold" style={{ color }}>{label}</p>
      <div className="mb-3 flex gap-2">
        {(['fixed', 'tactical'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setMode(mode)}
            className={`flex-1 rounded-lg border py-2 text-sm capitalize ${
              player.secondaryMode === mode
                ? 'border-accent/30 bg-accent-soft text-accent'
                : 'border-border text-muted'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {player.secondaryMode === 'fixed' && (
        <>
          <p className="mb-2 text-xs text-muted">
            Pick 2 from the 4 Fixed options (max 20 VP each, 15 VP/round)
          </p>
          <div className="flex flex-col gap-2">
            {fixedOptions.map((s) => (
              <div
                key={s}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                  player.secondaries.includes(s)
                    ? 'border-accent bg-accent/10'
                    : 'border-border'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFixed(s)}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border text-sm touch-manipulation ${
                    player.secondaries.includes(s)
                      ? 'border-accent bg-accent text-void'
                      : 'border-border text-muted'
                  }`}
                  aria-label={player.secondaries.includes(s) ? `Deselect ${s}` : `Select ${s}`}
                >
                  {player.secondaries.includes(s) ? '✓' : ''}
                </button>
                <MissionNameButton name={s} className="min-w-0 flex-1 text-sm" />
              </div>
            ))}
          </div>
        </>
      )}

      {player.secondaryMode === 'tactical' && (
        <p className="text-xs text-muted leading-relaxed">
          Each Command phase, draw until you have 2 active cards (max 2 in hand). Achieved
          cards are discarded. Max {gameData.scoringCaps.tacticalSecondaryMaxGame} VP from
          Tactical secondaries ({gameData.scoringCaps.tacticalSecondaryMaxRound} VP/round).
        </p>
      )}
    </div>
  )
}

function ToggleGroup({
  label, options, value, onChange,
}: {
  label: string
  options: { value: number; label: string }[]
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm text-muted">{label}</p>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-sm border py-3 text-sm font-medium ${
              value === o.value ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-panel'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border py-2 last:border-0">
      <span className="text-muted">{label}: </span>{value}
    </div>
  )
}
