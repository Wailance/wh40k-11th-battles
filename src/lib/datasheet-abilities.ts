import type { UnitAbility } from '../types/faction-data'
import { normalizeMfmName } from './mfm-pricing'

const SKIP_ABILITY_NAMES = new Set([normalizeMfmName('Unit Composition')])

function isWargearAbility(name: string): boolean {
  const key = normalizeMfmName(name)
  return /crest$/.test(key) || key === normalizeMfmName('Multi-spectral visor')
}

function isEnhancementLeak(ability: UnitAbility, enhancementNames: ReadonlySet<string>): boolean {
  const nameKey = normalizeMfmName(ability.name)
  if (SKIP_ABILITY_NAMES.has(nameKey)) return true
  if (enhancementNames.has(nameKey)) return true

  const description = ability.description ?? ''
  if (/this Enhancement/i.test(description)) return true
  if (/model only\./i.test(description)) return true
  if (/^\*\*\^\^/.test(description.trim())) return true

  if (isWargearAbility(ability.name)) return false

  if (/the bearer/i.test(description) || /While the bearer/i.test(description)) return true
  if (/equipped with/i.test(description)) return true

  return false
}

export function filterDatasheetAbilities(
  abilities: UnitAbility[],
  enhancementNames: readonly string[] = [],
): UnitAbility[] {
  const enhancements = new Set(enhancementNames.map(normalizeMfmName))
  return abilities.filter((ability) => !isEnhancementLeak(ability, enhancements))
}

export function displayWeaponName(name: string): string {
  return name.replace(/^➤\s*/, '').trim()
}
