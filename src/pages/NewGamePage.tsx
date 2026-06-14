import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
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
import { getMatchupBattlefield } from '../lib/battlefield'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { copy } from '../lib/copy'
import { wizardStepHint } from '../lib/wizard-hints'
import { loadActiveGame, saveActiveGame } from '../lib/storage'
import type {
  DominatusAlliance,
  ForceDisposition,
  GameFormat,
  GameState,
  PlayerSetup,
  SecondaryMode,
  SelectedDetachment,
} from '../types/game'
import { DOMINATUS_ALLIANCE_LABELS, DOMINATUS_ALLIANCES } from '../data/dominatus-companion'

const STEPS = ['Players', 'Detachments', 'Mission', 'Secondaries', 'Layout']

export function NewGamePage({ format = 'standard' }: { format?: GameFormat }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [game, setGame] = useState<GameState>(() => createNewGame(format))
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

  const pageTitle =
    format === 'dominatus'
      ? copy.newGame.titleDominatus
      : format === 'doubles'
        ? copy.newGame.titleDoubles
        : copy.newGame.title

  const canNext = [
    game.player1.army &&
      game.player2.army &&
      (format !== 'doubles' ||
        Boolean(game.doubles?.team1Player2.trim() && game.doubles?.team2Player2.trim())),
    game.player1.detachments.length >= 1 && game.player2.detachments.length >= 1,
    Boolean(game.player1.primaryMission && game.player2.primaryMission && game.matchupId),
    secondaryReady(game.player1) && secondaryReady(game.player2),
    true,
  ][step]

  const stepHint = !canNext ? wizardStepHint(step, game) : null

  return (
    <div>
      {hasActive && (
        <div className="app-panel mb-4 border-crimson/20 bg-crimson-soft/40 p-3 text-body">
          <p className="font-medium text-bone">{copy.home.activeSub}</p>
          <p className="mt-1 text-caption text-muted">
            {activeGame!.player1.name} vs {activeGame!.player2.name} · Round {activeGame!.battleRound}
          </p>
          <Link to="/game" className="mt-2 inline-block text-caption font-medium text-accent">
            {copy.home.resumeCta} →
          </Link>
        </div>
      )}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="app-page-title">{pageTitle}</h1>
          <p className="mt-0.5 text-body text-muted">{STEPS[step]}</p>
        </div>
        <button type="button" onClick={() => navigate('/')} className="app-btn-ghost shrink-0 px-3 py-2 text-caption">
          {copy.newGame.cancel}
        </button>
      </div>
      <WizardProgress
        step={step}
        total={STEPS.length}
        labels={STEPS}
        onStepClick={(i) => setStep(i)}
      />

      <div key={step} className="motion-step">
      {step === 0 && (
        <div className="space-y-4">
          {format === 'doubles' && game.doubles && (
            <DoublesTeamFields
              meta={game.doubles}
              player1={game.player1}
              player2={game.player2}
              onMeta={(patch) => update({ doubles: { ...game.doubles!, ...patch } })}
              onP1={(patch) => updateP1(patch)}
              onP2={(patch) => updateP2(patch)}
              armies={armyList.map((a) => a.army)}
            />
          )}
          {format !== 'doubles' && (
            <>
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
            </>
          )}
          {format === 'dominatus' && game.dominatus && (
            <DominatusSetupFields
              meta={game.dominatus}
              onChange={(patch) => update({ dominatus: { ...game.dominatus!, ...patch } })}
            />
          )}
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
            <p className="mb-2 text-body text-muted">Chapter Approved matchup</p>
            <div className="flex flex-wrap items-center gap-2">
              <ForceDispositionBadge fd={game.player1.forceDisposition} />
              <span className="text-muted">vs</span>
              <ForceDispositionBadge fd={game.player2.forceDisposition} />
            </div>
            {game.matchupId && (
              <p className="mt-2 text-caption text-accent">Mission &amp; Layout #{game.matchupId}</p>
            )}
            <p className="mt-2 text-caption text-muted">
              Primary missions are set by the pairing of Force Dispositions (Chapter Approved deck).
            </p>
          </div>

          <MissionCard player={game.player1.name} mission={game.player1.primaryMission} fd={game.player1.forceDisposition} color="var(--color-p1)" />
          <MissionCard player={game.player2.name} mission={game.player2.primaryMission} fd={game.player2.forceDisposition} color="var(--color-p2)" />
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
          {game.matchupId && getMatchupBattlefield(game.matchupId) && (
            <div className="space-y-2">
              <p className="text-body font-medium text-bone">{copy.newGame.layoutPick}</p>
              <p className="text-caption text-muted">{copy.newGame.layoutPickHint}</p>
              <BattlefieldMap
                battlefield={getMatchupBattlefield(game.matchupId)!}
                attacker={game.attacker}
                player1Name={game.player1.name}
                player2Name={game.player2.name}
                variantIndex={game.layoutVariantIndex}
                onVariantChange={(i) => update({ layoutVariantIndex: i })}
                preview
              />
            </div>
          )}

          <p className="text-caption leading-relaxed text-muted">{copy.newGame.layoutPreBattleNote}</p>

          <div className="app-panel p-4 text-body">
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

      </div>

      {stepHint && (
        <p className="mt-4 text-center text-body text-warning" role="status">
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

      <div className={`flex gap-3 ${step === 1 ? 'mt-4' : 'mt-8'}`}>
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="app-btn-ghost flex-1 py-3 text-body"
          >
            {copy.newGame.back}
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!canNext}
            onClick={advanceStep}
            className="app-btn flex-1 py-3 text-body disabled:opacity-40"
          >
            {copy.newGame.next}
          </button>
        ) : (
          <button
            type="button"
            onClick={startGame}
            className="app-btn flex-1 py-3 text-body"
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
        className="app-input mb-3 w-full px-3 py-2 text-body outline-none"
      />
      <select
        value={army}
        onChange={(e) => onArmy(e.target.value)}
        className="app-input mb-3 w-full px-3 py-2 text-body outline-none"
      >
        <option value="">Select army…</option>
        {armies.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onBattleReady(!battleReady)}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-body touch-manipulation ${
          battleReady ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border text-muted'
        }`}
      >
        <span>{copy.game.battleReady}</span>
        <span className="text-caption">{battleReady ? copy.game.battleReadyOn : copy.game.battleReadyOff}</span>
      </button>
      <p className="mt-2 text-caption leading-relaxed text-muted">{copy.game.battleReadyHint}</p>
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
  const stepRef = useRef<HTMLDivElement>(null)
  const player = activePlayer === 1 ? player1 : player2
  const color = activePlayer === 1 ? 'var(--color-p1)' : 'var(--color-p2)'

  const p1Ready = player1.detachments.length >= 1
  const p2Ready = player2.detachments.length >= 1
  const highlightP2 = p1Ready && !p2Ready && activePlayer === 1
  const highlightP1 = p2Ready && !p1Ready && activePlayer === 2
  const handoffTo: 1 | 2 | null = highlightP2 ? 2 : highlightP1 ? 1 : null

  function switchPlayer(n: 1 | 2) {
    setActivePlayer(n)
    stepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const tabButtons = (
    <div className="grid grid-cols-2 gap-2">
      {([1, 2] as const).map((n) => {
        const p = n === 1 ? player1 : player2
        const ready = p.detachments.length >= 1
        const dp = p.detachments.reduce((s, d) => s + d.dp, 0)
        const isHandoffTarget = handoffTo === n
        const isDoneHandoff = activePlayer === n && handoffTo !== null && handoffTo !== n
        const seatColor = n === 1 ? 'var(--color-p1)' : 'var(--color-p2)'
        return (
          <button
            key={n}
            type="button"
            onClick={() => switchPlayer(n)}
            data-next={isHandoffTarget || undefined}
            className={`rounded-lg border px-3 py-2.5 text-left text-body touch-manipulation transition-shadow ${
              isHandoffTarget
                ? 'detachment-tab-next'
                : activePlayer === n
                  ? isDoneHandoff
                    ? 'detachment-tab-done'
                    : 'player-seat-active'
                  : 'border-border bg-panel'
            }`}
            style={
              isHandoffTarget
                ? ({ '--detachment-tab-glow': seatColor } as CSSProperties)
                : activePlayer === n && !isDoneHandoff
                  ? ({ '--player-seat-color': seatColor } as CSSProperties)
                  : undefined
            }
          >
            <span className="flex items-center gap-1.5">
              <span
                className={`block truncate ${isHandoffTarget ? 'font-bold' : 'font-semibold'}`}
                style={{ color: seatColor }}
              >
                {p.name}
              </span>
              {isHandoffTarget && (
                <span
                  className="detachment-tab-next-label shrink-0 rounded px-1.5 py-0.5 text-micro uppercase tracking-wide"
                  style={
                    {
                      '--detachment-tab-glow': seatColor,
                      color: seatColor,
                    } as CSSProperties
                  }
                >
                  {copy.newGame.detachmentYourTurn}
                </span>
              )}
            </span>
            <span
              className={`mt-0.5 block text-micro ${isHandoffTarget ? 'font-medium' : 'text-muted'}`}
              style={isHandoffTarget ? { color: seatColor } : undefined}
            >
              {ready
                ? `${p.detachments.length} det · ${dp}/${MAX_DP} DP`
                : isHandoffTarget
                  ? copy.newGame.detachmentContinue(p.name)
                  : 'Pick detachments'}
            </span>
          </button>
        )
      })}
    </div>
  )

  return (
    <div ref={stepRef} className="detachment-step">
      <div className="detachment-step-tabs sticky top-0 z-20 -mx-1 mb-3 border-b border-white/[0.06] bg-void/95 px-1 pb-3 pt-1 backdrop-blur-md">
        <p className="mb-2 text-micro font-medium uppercase tracking-wider text-muted">
          {copy.newGame.detachmentSwitch}
        </p>
        {tabButtons}
      </div>

      <DetachmentPicker
        key={activePlayer}
        playerName={player.name}
        armyName={player.army}
        selected={player.detachments}
        color={color}
        onToggle={(d) => onToggle(activePlayer, d)}
        footer={
          activePlayer === 1 && p1Ready && !p2Ready ? (
            <button
              type="button"
              onClick={() => switchPlayer(2)}
              className="app-btn detachment-continue-next mt-4 w-full py-3 text-body"
            >
              {copy.newGame.detachmentContinue(player2.name)}
            </button>
          ) : activePlayer === 2 && p2Ready && !p1Ready ? (
            <button type="button" onClick={() => switchPlayer(1)} className="app-btn-ghost mt-4 w-full py-3 text-body">
              {copy.newGame.detachmentBack(player1.name)}
            </button>
          ) : null
        }
      />
    </div>
  )
}

function DetachmentPicker({
  playerName, armyName, selected, color, onToggle, footer,
}: {
  playerName: string
  armyName: string
  selected: SelectedDetachment[]
  color: string
  onToggle: (d: string) => void
  footer?: ReactNode
}) {
  const army = armies.find((a) => a.army === armyName)
  const usedDp = selected.reduce((s, d) => s + d.dp, 0)
  const selectedNames = new Set(selected.map((d) => d.name))

  const remainingDp = MAX_DP - usedDp

  return (
    <div className="motion-step">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-semibold" style={{ color }}>{playerName}</p>
        <p className="text-caption text-muted">{armyName}</p>
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
              className="player-seat-chip flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-caption touch-manipulation"
              style={{ '--player-seat-color': color } as CSSProperties}
            >
              <span className="font-medium">{d.name}</span>
              <DpCost dp={d.dp} size="sm" />
              <span className="opacity-50">×</span>
            </button>
          ))}
        </div>
      )}

      <p className="mb-2 text-caption text-muted">{copy.dp.pickHint}</p>

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
              className={`min-h-[3.25rem] w-full rounded-lg border p-3 text-left text-body transition-colors touch-manipulation ${
                isSelected
                  ? 'player-seat-active'
                  : wouldExceed
                    ? 'border-border bg-panel opacity-45'
                    : 'border-border bg-panel active:bg-panel-hover'
              }`}
              style={isSelected ? ({ '--player-seat-color': color } as CSSProperties) : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{d.name}</span>
                <DpCost dp={d.dp} size="sm" />
              </div>
              {wouldExceed && !isSelected && (
                <p className="mt-1 text-micro text-warning">{copy.dp.tooMany(d.dp, remainingDp)}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <ForceDispositionBadge fd={d.forceDisposition as ForceDisposition} short />
                {d.note && <span className="text-caption text-muted">{d.note}</span>}
              </div>
            </button>
          )
        })}
      </div>
      {footer}
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
      <p className="mb-2 text-body" style={{ color }}>
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
      <p className="text-caption font-semibold uppercase" style={{ color }}>{player}</p>
      <p className="mt-1 text-lg font-bold">
        <MissionNameButton name={mission} className="text-lg font-bold text-text no-underline hover:text-accent" />
      </p>
      <p className="mt-1 text-micro text-muted">Tap mission for scoring guide</p>
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
            className={`flex min-h-[3.25rem] flex-1 flex-col items-center justify-center rounded-lg border px-2 py-2 text-center touch-manipulation ${
              player.secondaryMode === mode
                ? 'border-accent/30 bg-accent-soft text-accent'
                : 'border-border text-muted'
            }`}
          >
            <span className="text-body font-medium">
              {mode === 'fixed' ? copy.newGame.secondaryFixed : copy.newGame.secondaryTactical}
            </span>
            <span className="mt-0.5 text-micro leading-tight opacity-80">
              {mode === 'fixed' ? copy.newGame.secondaryFixedHint : copy.newGame.secondaryTacticalHint}
            </span>
          </button>
        ))}
      </div>

      {player.secondaryMode === 'fixed' && (
        <>
          <p className="mb-2 text-caption text-muted">
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
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border text-body touch-manipulation ${
                    player.secondaries.includes(s)
                      ? 'border-accent bg-accent text-void'
                      : 'border-border text-muted'
                  }`}
                  aria-label={player.secondaries.includes(s) ? `Deselect ${s}` : `Select ${s}`}
                >
                  {player.secondaries.includes(s) ? '✓' : ''}
                </button>
                <MissionNameButton name={s} className="min-w-0 flex-1 text-body" />
              </div>
            ))}
          </div>
        </>
      )}

      {player.secondaryMode === 'tactical' && (
        <p className="text-caption text-muted leading-relaxed">
          Use Random to draw one card at a time (max 2 in hand). Achieved cards are
          discarded. Max {gameData.scoringCaps.tacticalSecondaryMaxGame} VP from Tactical
          secondaries ({gameData.scoringCaps.tacticalSecondaryMaxRound} VP/round).
        </p>
      )}
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

function DominatusSetupFields({
  meta,
  onChange,
}: {
  meta: NonNullable<GameState['dominatus']>
  onChange: (patch: Partial<NonNullable<GameState['dominatus']>>) => void
}) {
  return (
    <div className="app-panel space-y-3 p-4">
      <p className="text-body font-semibold text-bone">{copy.formats.dominatus.title}</p>
      <label className="block text-caption text-muted">
        {copy.formats.dominatus.phase}
        <select
          value={meta.phase}
          onChange={(e) => onChange({ phase: Number(e.target.value) as 1 | 2 | 3 })}
          className="app-input mt-1 w-full"
        >
          {[1, 2, 3].map((p) => (
            <option key={p} value={p}>
              Phase {p}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-caption text-muted">
        {copy.formats.dominatus.locationStep}
        <textarea
          value={meta.locationNotes}
          onChange={(e) => onChange({ locationNotes: e.target.value })}
          className="app-input mt-1 min-h-[3rem] w-full"
        />
      </label>
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        {([1, 2] as const).map((n) => {
          const allianceKey = n === 1 ? 'player1Alliance' : 'player2Alliance'
          const agendaKey = n === 1 ? 'player1AttemptAgenda' : 'player2AttemptAgenda'
          const agendaNameKey = n === 1 ? 'player1AgendaName' : 'player2AgendaName'
          return (
            <div key={n} className="rounded-lg border border-border p-3">
              <p className="mb-2 text-caption font-medium" style={{ color: n === 1 ? 'var(--color-p1)' : 'var(--color-p2)' }}>
                Player {n}
              </p>
              <label className="block text-caption text-muted">
                {copy.formats.dominatus.alliance}
                <select
                  value={meta[allianceKey]}
                  onChange={(e) => onChange({ [allianceKey]: e.target.value as DominatusAlliance })}
                  className="app-input mt-1 w-full"
                >
                  {DOMINATUS_ALLIANCES.map((a) => (
                    <option key={a} value={a}>
                      {DOMINATUS_ALLIANCE_LABELS[a]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-2 flex items-center gap-2 text-caption text-muted">
                <input
                  type="checkbox"
                  checked={meta[agendaKey]}
                  onChange={(e) => onChange({ [agendaKey]: e.target.checked })}
                />
                {copy.formats.dominatus.attemptAgenda}
              </label>
              {meta[agendaKey] && (
                <input
                  value={meta[agendaNameKey]}
                  onChange={(e) => onChange({ [agendaNameKey]: e.target.value })}
                  placeholder={copy.formats.dominatus.agendaName}
                  className="app-input mt-2 w-full text-caption"
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DoublesTeamFields({
  meta,
  player1,
  player2,
  onMeta,
  onP1,
  onP2,
  armies,
}: {
  meta: NonNullable<GameState['doubles']>
  player1: PlayerSetup
  player2: PlayerSetup
  onMeta: (patch: Partial<NonNullable<GameState['doubles']>>) => void
  onP1: (patch: Partial<PlayerSetup>) => void
  onP2: (patch: Partial<PlayerSetup>) => void
  armies: string[]
}) {
  const teamPanel = (
    teamKey: 'team1' | 'team2',
    color: string,
    player: PlayerSetup,
    onPlayer: (patch: Partial<PlayerSetup>) => void,
  ) => {
    const isTeam1 = teamKey === 'team1'
    const nameKey = isTeam1 ? 'team1Name' : 'team2Name'
    const p2Key = isTeam1 ? 'team1Player2' : 'team2Player2'
    const army2Key = isTeam1 ? 'team1Army2' : 'team2Army2'
    const warlordKey = isTeam1 ? 'team1Warlord' : 'team2Warlord'
    return (
      <div className="app-panel p-4">
        <p className="mb-3 font-semibold" style={{ color }}>
          {meta[nameKey]}
        </p>
        <input
          value={meta[nameKey]}
          onChange={(e) => onMeta({ [nameKey]: e.target.value })}
          placeholder={copy.formats.doubles.teamName}
          className="app-input mb-3 w-full text-body"
        />
        <input
          value={player.name}
          onChange={(e) => onPlayer({ name: e.target.value })}
          placeholder="Player 1"
          className="app-input mb-2 w-full text-body"
        />
        <select
          value={player.army}
          onChange={(e) => onPlayer({ army: e.target.value, detachments: [] })}
          className="app-input mb-2 w-full text-body"
        >
          <option value="">Army 1…</option>
          {armies.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          value={meta[p2Key]}
          onChange={(e) => onMeta({ [p2Key]: e.target.value })}
          placeholder={copy.formats.doubles.player2}
          className="app-input mb-2 w-full text-body"
        />
        <input
          value={meta[army2Key]}
          onChange={(e) => onMeta({ [army2Key]: e.target.value })}
          placeholder={copy.formats.doubles.army2}
          className="app-input mb-2 w-full text-body"
        />
        <label className="block text-caption text-muted">
          {copy.formats.doubles.warlord}
          <select
            value={meta[warlordKey]}
            onChange={(e) => onMeta({ [warlordKey]: Number(e.target.value) as 1 | 2 })}
            className="app-input mt-1 w-full"
          >
            <option value={1}>Player 1</option>
            <option value={2}>Player 2</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => onPlayer({ battleReady: !player.battleReady })}
          className={`mt-3 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-caption ${
            player.battleReady ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border text-muted'
          }`}
        >
          <span>{copy.game.battleReady}</span>
          <span>{player.battleReady ? copy.game.battleReadyOn : copy.game.battleReadyOff}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {teamPanel('team1', 'var(--color-p1)', player1, onP1)}
      {teamPanel('team2', 'var(--color-p2)', player2, onP2)}
    </div>
  )
}
