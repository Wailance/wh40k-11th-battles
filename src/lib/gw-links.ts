import { gameData } from './game-utils'

type RulesPdfs = {
  coreRules?: { title: string; url: string }
  tournamentCompanion?: { title: string; url: string }
}

const pdfs = (gameData as { rulesPdfs?: RulesPdfs }).rulesPdfs

/** Official GW PDFs bundled in game-data (rulesPdfs). */
export const GW_CORE_RULES_PDF = pdfs?.coreRules?.url ?? ''
export const GW_TOURNAMENT_COMPANION_PDF = pdfs?.tournamentCompanion?.url ?? ''

export const GW_PDF_LABELS = {
  core: pdfs?.coreRules?.title ?? 'Core Rules',
  tournament: pdfs?.tournamentCompanion?.title ?? 'Tournament Companion',
} as const
