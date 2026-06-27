import type { ForceDisposition } from '../types/game'
import { FD_COLORS, FD_ORDER } from './game-utils'
import { PRIMARY_DECKS } from './mission-reference'

export interface ForceDispositionInfo {
  fd: ForceDisposition
  title: string
  summary: string
  deckFocus: string
  colorKey: string
  deckSize: number
}

const FD_COPY: Record<ForceDisposition, Omit<ForceDispositionInfo, 'fd' | 'colorKey' | 'deckSize'>> = {
  'TAKE AND HOLD': {
    title: 'Take and Hold',
    summary:
      'Hold ground and dominate the objective count. Primary deck rewards steady control and expanding your footprint.',
    deckFocus: 'Objective control · holding contested points · board presence',
  },
  'PURGE THE FOE': {
    title: 'Purge the Foe',
    summary:
      'Aggressive elimination — kill enemy units and press the advantage. Primary deck scores through destruction and pressure.',
    deckFocus: 'Unit destruction · aggressive pushes · attrition',
  },
  RECONNAISSANCE: {
    title: 'Reconnaissance',
    summary:
      'Gather intel and strike from unexpected angles. Primary deck blends kills on objectives with table-edge scoring.',
    deckFocus: 'Intel · table edges · flexible positioning',
  },
  'PRIORITY ASSETS': {
    title: 'Priority Assets',
    summary:
      'Secure vital battlefield assets and relics. Primary deck focuses on specific objectives and asset control.',
    deckFocus: 'Asset objectives · relic sites · targeted scoring',
  },
  DISRUPTION: {
    title: 'Disruption',
    summary:
      'Sabotage, deny, and outmanoeuvre the opponent. Primary deck rewards traps, denial, and asymmetric play.',
    deckFocus: 'Denial · sabotage · booby-traps · manoeuvre',
  },
}

export function forceDispositionInfo(fd: ForceDisposition): ForceDispositionInfo {
  const base = FD_COPY[fd]
  return {
    fd,
    ...base,
    colorKey: FD_COLORS[fd],
    deckSize: PRIMARY_DECKS[fd].length,
  }
}

export function allForceDispositions(): ForceDispositionInfo[] {
  return FD_ORDER.map(forceDispositionInfo)
}
