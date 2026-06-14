import { useState } from 'react'
import { SecondaryMissionPickerSheet } from './SecondaryMissionPickerSheet'
import { copy } from '../lib/copy'
import { tacticalSecondaryInventory } from '../lib/mission-scoring'
import type { PlayerScores, PlayerSetup } from '../types/game'

function summaryText(player: PlayerSetup, scores: PlayerScores): string {
  if (player.secondaryMode === 'fixed') {
    const active = player.secondaries.filter((c) => !scores.removedSecondaries.includes(c))
    if (!active.length) return copy.game.secondaryPickerEmpty
    return active.join(' · ')
  }
  const items = tacticalSecondaryInventory(scores)
  if (!items.length) return copy.game.secondaryPickerEmpty
  return items.map(({ card }) => card).join(' · ')
}

export function SecondaryMissionList({
  player,
  scores,
  battleRound,
  editable,
  compact = false,
  onApplyFixed,
  onApplyTactical,
}: {
  player: PlayerSetup
  scores: PlayerScores
  battleRound: number
  editable: boolean
  compact?: boolean
  onApplyFixed: (selected: string[]) => void
  onApplyTactical: (hand: string[], restoreToDeck: string[]) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <>
      <div className={`app-secondary-list ${compact ? 'app-secondary-list-compact' : ''}`}>
        <div className="app-secondary-list-header">
          <p className="app-secondary-list-title">{copy.game.secondaryListTitle}</p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="app-secondary-manage-btn"
          >
            {copy.game.secondaryPickerOpen}
          </button>
        </div>
        <p className={`app-secondary-summary ${compact ? 'text-micro' : 'text-micro'}`}>
          {summaryText(player, scores)}
        </p>
      </div>

      <SecondaryMissionPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        player={player}
        scores={scores}
        battleRound={battleRound}
        editable={editable}
        onApplyFixed={onApplyFixed}
        onApplyTactical={onApplyTactical}
      />
    </>
  )
}
