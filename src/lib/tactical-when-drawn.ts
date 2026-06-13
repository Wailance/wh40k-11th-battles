import { getMissionDetail } from './mission-details'

const ROUND1_REDRAW = [
  'Behind Enemy Lines',
  'Display of Might',
  'Bring it Down',
  'A Grievous Blow',
]

/** Auto shuffle-back-and-redraw on draw (Event Companion When Drawn). */
export function shouldAutoRedrawWhenDrawn(card: string, battleRound: number): boolean {
  if (battleRound !== 1) return false
  const detail = getMissionDetail(card)
  if (!detail?.whenDrawn) return false
  if (/battle round 1/i.test(detail.whenDrawn) && /shuffle.*draw|draw a new/i.test(detail.whenDrawn)) {
    return true
  }
  return ROUND1_REDRAW.some((n) => n.toLowerCase() === card.toLowerCase())
}

export function whenDrawnReminder(card: string): string | null {
  const detail = getMissionDetail(card)
  if (!detail?.whenDrawn) return null
  if (shouldAutoRedrawWhenDrawn(card, 1)) return null
  return detail.whenDrawn.replace(/^When Drawn:\s*/i, '')
}

export function mayManualRedrawWhenDrawn(card: string): boolean {
  const detail = getMissionDetail(card)
  if (!detail?.whenDrawn) return false
  return /may discard and redraw|discard and redraw/i.test(detail.whenDrawn)
}
