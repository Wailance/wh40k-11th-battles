import type { CuratedUnit, UnitCostBracket, UnitPricingTier, WeaponProfile } from '../types/faction-data'
import type { WoPointBracket, WoUnit, WoWeaponProfile } from '../types/warorgan'

function titleCaseKeyword(k: string): string {
  return k
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function woWeaponToProfile(w: WoWeaponProfile): WeaponProfile {
  const keywords = w.Keywords
    ? w.Keywords.split(/,\s*/).map((k) => titleCaseKeyword(k.trim()))
    : []
  const isMelee = !w.Range || w.Range === 'Melee'
  return {
    name: w.Name,
    range: w.Range ?? 'Melee',
    A: w.Attacks ?? '1',
    ...(isMelee ? { WS: w.ToHit ?? '3+' } : { BS: w.ToHit ?? '3+' }),
    S: w.Strength ?? '4',
    AP: w.AP ?? '0',
    D: w.Damage ?? '1',
    keywords,
  }
}

function groupPointsByInstance(points: WoPointBracket[]): UnitPricingTier[] {
  if (!points.length) return []

  const byModel = new Map<number, WoPointBracket[]>()
  for (const p of points) {
    const mc = p.ModelCount ?? 1
    const list = byModel.get(mc) ?? []
    list.push(p)
    byModel.set(mc, list)
  }

  const tiers: UnitPricingTier[] = []
  const hasUnitCount = points.some((p) => p.UnitCount != null)

  if (!hasUnitCount) {
    const costs: UnitCostBracket[] = [...byModel.entries()]
      .sort(([a], [b]) => a - b)
      .map(([models, brackets]) => ({
        models,
        points: brackets[0].Cost,
      }))
    return [{ range: '[1,)', label: 'any', costs }]
  }

  const modelCounts = [...byModel.keys()].sort((a, b) => a - b)
  for (const mc of modelCounts) {
    const brackets = [...(byModel.get(mc) ?? [])].sort(
      (a, b) => (a.UnitCount ?? 1) - (b.UnitCount ?? 1),
    )
    let prev = 1
    for (const b of brackets) {
      const uc = b.UnitCount ?? 1
      tiers.push({
        range: `[${prev},${uc}]`,
        label: prev === uc ? `copy ${uc}` : `copies ${prev}–${uc}`,
        costs: [{ models: mc, points: b.Cost }],
      })
      prev = uc + 1
    }
    const lastUc = brackets[brackets.length - 1]?.UnitCount ?? 1
    if (lastUc < 99) {
      tiers.push({
        range: `[${lastUc + 1},)`,
        label: `copy ${lastUc + 1}+`,
        costs: [{ models: mc, points: brackets[brackets.length - 1].Cost }],
      })
    }
  }

  return tiers
}

function displayPointsLabel(points: WoPointBracket[]): string {
  if (!points.length) return '0'
  const sorted = [...points].sort((a, b) => a.Cost - b.Cost)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  if (min.Cost === max.Cost) return String(min.Cost)
  const mc = min.ModelCount
  return mc ? `${min.Cost}–${max.Cost} (${mc} models)` : `${min.Cost}–${max.Cost}`
}

export function woDefaultModelCount(unit: WoUnit): number {
  const points = unit.Points ?? []
  if (!points.length) return 1
  const withMc = points.filter((p) => p.ModelCount != null)
  if (withMc.length) {
    return Math.min(...withMc.map((p) => p.ModelCount!))
  }
  return 1
}

export function woUnitToCurated(unit: WoUnit, id: string): CuratedUnit {
  const stat = unit.StatLines?.[0]
  const pricing = groupPointsByInstance(unit.Points ?? [])
  const basePoints = unit.Points?.[0]?.Cost ?? 0

  const rangedWeapons: WeaponProfile[] = []
  const meleeWeapons: WeaponProfile[] = []
  for (const group of unit.Weapons ?? []) {
    const isMelee = group.Name.toUpperCase().includes('MELEE')
    for (const w of group.Weapons ?? []) {
      const profile = woWeaponToProfile(w)
      if (isMelee || profile.range === 'Melee') meleeWeapons.push(profile)
      else rangedWeapons.push(profile)
    }
  }

  return {
    id,
    name: unit.Name,
    points: basePoints,
    pointsLabel: displayPointsLabel(unit.Points ?? []),
    pricing: pricing.length ? pricing : undefined,
    keywords: unit.Keywords ?? [],
    factionKeywords: unit.FactionKeywords ?? [],
    stats: stat
      ? {
          M: stat.Movement,
          T: stat.Toughness,
          SV: stat.Save,
          W: stat.Wounds,
          LD: stat.Leadership,
          OC: stat.OC,
        }
      : {},
    rangedWeapons,
    meleeWeapons,
    abilities: (unit.UnitAbilities ?? []).map((a) => ({
      name: a.Title ?? a.Name ?? 'Ability',
      description: a.Text ?? a.Description ?? '',
    })),
    leader: unit.LeaderInfo?.UnitNames,
    legends: unit.Legends === true,
  }
}
