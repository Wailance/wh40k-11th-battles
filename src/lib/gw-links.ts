import { EVENT_COMPANION_PDF } from '../data/event-companion'
import { gameData } from './game-utils'

type RulesPdfs = {
  coreRules?: { title: string; url: string }
  eventCompanion?: { title: string; url: string }
  tournamentCompanion?: { title: string; url: string }
}

const pdfs = (gameData as { rulesPdfs?: RulesPdfs }).rulesPdfs

export const GW_CORE_RULES_PDF = pdfs?.coreRules?.url ?? ''
export const GW_EVENT_COMPANION_PDF = pdfs?.eventCompanion?.url ?? EVENT_COMPANION_PDF
export const GW_TOURNAMENT_COMPANION_PDF = GW_EVENT_COMPANION_PDF

export const GW_PDF_LABELS = {
  core: pdfs?.coreRules?.title ?? 'Core Rules',
  eventCompanion: pdfs?.eventCompanion?.title ?? 'Warhammer Event Companion v1.0',
  tournament: pdfs?.eventCompanion?.title ?? 'Warhammer Event Companion v1.0',
} as const
