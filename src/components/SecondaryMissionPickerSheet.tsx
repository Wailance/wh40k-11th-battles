import { useEffect, useMemo, useState } from 'react'
import { MissionNameButton } from './MissionNameButton'
import { RestoreToDeckButton } from './RestoreToDeckButton'
import { AppSheet } from './AppSheet'
import { copy } from '../lib/copy'
import { gameData } from '../lib/game-utils'
import type { PlayerScores, PlayerSetup, SecondaryMode } from '../types/game'

type CardStatus = 'hand' | 'deck' | 'active' | 'inactive' | 'discarded' | null

function cardStatus(
  card: string,
  mode: SecondaryMode,
  scores: PlayerScores,
  player: PlayerSetup,
): CardStatus {
  if (mode === 'tactical') {
    if (scores.tacticalHand.includes(card)) return 'hand'
    if (scores.removedSecondaries.includes(card)) return 'discarded'
    if (scores.tacticalDeck.includes(card)) return 'deck'
    return null
  }
  if (!player.secondaries.includes(card)) return null
  return scores.removedSecondaries.includes(card) ? 'inactive' : 'active'
}

function statusLabel(status: CardStatus): string | null {
  if (status === 'hand') return copy.game.secondaryStatusHand
  if (status === 'deck') return copy.game.secondaryPickerDeck
  if (status === 'discarded') return copy.game.secondaryStatusDiscarded
  if (status === 'inactive') return copy.game.secondaryStatusInactive
  if (status === 'active') return copy.game.secondaryPickerActive
  return null
}

export function SecondaryMissionPickerSheet({
  open,
  onClose,
  player,
  scores,
  battleRound,
  editable,
  onApplyFixed,
  onApplyTactical,
  onRestoreDiscardedToDeck,
}: {
  open: boolean
  onClose: () => void
  player: PlayerSetup
  scores: PlayerScores
  battleRound: number
  editable: boolean
  onApplyFixed: (selected: string[]) => void
  onApplyTactical: (hand: string[], restoreToDeck: string[]) => void
  onRestoreDiscardedToDeck?: (card: string) => void
}) {
  const mode = player.secondaryMode ?? 'tactical'
  const catalog = useMemo(
    () =>
      mode === 'fixed'
        ? ([...(gameData.secondaries.fixedOptions as string[])] as string[])
        : ([...(gameData.secondaries.tacticalDeck as string[])] as string[]),
    [mode],
  )

  const [selectedFixed, setSelectedFixed] = useState<string[]>([])
  const [selectedHand, setSelectedHand] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    if (mode === 'fixed') {
      const active = player.secondaries.filter((c) => !scores.removedSecondaries.includes(c))
      setSelectedFixed(active.length ? active : [...player.secondaries])
    } else {
      setSelectedHand([...scores.tacticalHand])
    }
  }, [open, mode, player.secondaries, scores.tacticalHand, scores.removedSecondaries, battleRound])

  if (!open) return null

  const toggleFixed = (card: string) => {
    if (!editable) return
    if (selectedFixed.includes(card)) {
      setSelectedFixed(selectedFixed.filter((c) => c !== card))
    } else if (selectedFixed.length < 2) {
      setSelectedFixed([...selectedFixed, card])
    }
  }

  const toggleHand = (card: string, status: CardStatus) => {
    if (!editable) return
    if (status === 'discarded') return

    if (selectedHand.includes(card)) {
      setSelectedHand(selectedHand.filter((c) => c !== card))
    } else if (status === 'hand' || status === 'deck') {
      setSelectedHand([...selectedHand, card])
    }
  }

  const apply = () => {
    if (!editable) return
    if (mode === 'fixed') {
      if (selectedFixed.length !== 2) return
      onApplyFixed(selectedFixed)
    } else {
      onApplyTactical(selectedHand, [])
    }
    onClose()
  }

  const rowChecked = (card: string): boolean => {
    if (mode === 'fixed') return selectedFixed.includes(card)
    return selectedHand.includes(card)
  }

  const rowDisabled = (checked: boolean, status: CardStatus): boolean => {
    if (!editable) return true
    if (mode === 'fixed') return !checked && selectedFixed.length >= 2
    if (status === 'discarded') return true
    return false
  }

  const fixedValid = selectedFixed.length === 2

  return (
    <AppSheet open={open} onClose={onClose} titleId="secondary-picker-title">
      <div className="app-secondary-picker-head">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 id="secondary-picker-title" className="font-display text-title leading-tight text-accent">
                {copy.game.secondaryPickerTitle}
              </h2>
              <p className="mt-0.5 text-micro leading-snug text-muted">
                {mode === 'fixed' ? copy.game.secondaryPickerFixedHint : copy.game.secondaryPickerTacticalHint}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="app-secondary-picker-close"
              aria-label={copy.common.close}
            >
              ×
            </button>
          </div>
          {mode === 'fixed' && editable && !fixedValid && (
            <p className="mt-1.5 text-micro text-warning">{copy.game.secondaryPickerFixedCount(selectedFixed.length)}</p>
          )}
          {mode === 'tactical' && editable && (
            <p className="mt-1.5 text-micro text-muted">
              {copy.game.secondaryPickerHandCount(selectedHand.length)}
            </p>
          )}
        </div>

        <div className="app-secondary-picker-body">
          <div className="app-secondary-picker-list">
            {catalog.map((card) => {
              const status = cardStatus(card, mode, scores, player)
              const checked = rowChecked(card)
              const disabled = rowDisabled(checked, status)

              return (
                <div
                  key={card}
                  className={`app-secondary-picker-row ${checked ? 'is-checked' : ''} ${disabled && !checked ? 'is-disabled' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => (mode === 'fixed' ? toggleFixed(card) : toggleHand(card, status))}
                    disabled={disabled}
                    className={`app-secondary-picker-check ${checked ? 'is-checked' : ''}`}
                    aria-label={checked ? copy.game.secondaryDeactivate(card) : copy.game.secondaryActivate(card)}
                    aria-pressed={checked}
                  >
                    {checked ? '✓' : ''}
                  </button>
                  <MissionNameButton name={card} className="min-w-0 flex-1 text-micro" showIcon />
                  {status && statusLabel(status) && (
                    <span className={`app-secondary-status-badge app-secondary-status-${status}`}>
                      {statusLabel(status)}
                    </span>
                  )}
                  {mode === 'tactical' && status === 'discarded' && editable && onRestoreDiscardedToDeck && (
                    <RestoreToDeckButton compact onClick={() => onRestoreDiscardedToDeck(card)} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="app-secondary-picker-footer">
          <button type="button" onClick={onClose} className="app-btn-ghost flex-1 py-2 text-caption">
            {copy.common.cancel}
          </button>
          {editable && (
            <button
              type="button"
              onClick={apply}
              disabled={mode === 'fixed' ? !fixedValid : false}
              className="app-btn flex-1 py-2 text-caption disabled:opacity-40"
            >
              {copy.game.secondaryPickerSave}
            </button>
          )}
        </div>
    </AppSheet>
  )
}
