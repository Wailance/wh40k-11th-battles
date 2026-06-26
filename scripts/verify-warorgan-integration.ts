/**
 * Integration tests for WarOrgan TS modules (bundle, import/export, validation).
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import gameData from '../src/data/game-data.json'
import { warOrganFactionFile } from '../src/lib/warorgan-army-map'
import {
  assembleWarOrganBundle,
  legendsFileName,
  mergeCodexChapterBundles,
} from '../src/lib/warorgan-bundle-build'
import {
  compositionMatchesPoints,
  defaultWarOrganComposition,
  totalModelCount,
  WO_ROSTER_KEY,
} from '../src/lib/warorgan-composition'
import { woEnhancementEligible } from '../src/lib/warorgan-enhancements'
import {
  convertWoArmyListToRoster,
  exportWoArmyList,
} from '../src/lib/warorgan-import-export'
import {
  findGameDetachment,
  normalizeWoKey,
  reconcileRosterDetachments,
  woNamesMatch,
} from '../src/lib/warorgan-names'
import { leaderCanAttachToBodyguard } from '../src/lib/warorgan-roster'
import { isCodexChapter, MFM_SPACE_MARINES_ARMY } from '../src/lib/space-marine-chapters'
import { factionPalette } from '../src/lib/warorgan-theme'
import { validateWarOrganRoster } from '../src/lib/warorgan-validation'
import type { ArmyRoster } from '../src/types/roster'
import type { WarOrganBuilderBundle, WoFactionData, WoUnit } from '../src/types/warorgan'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const woDir = join(root, 'public/data/warorgan/factions')
const meta = JSON.parse(readFileSync(join(root, 'public/data/warorgan/meta.json'), 'utf8')) as {
  Version?: string
  factions?: { Name: string }[]
}

const CODEX_CHAPTERS = [
  'Ultramarines',
  'Raven Guard',
  'Imperial Fists',
  'Iron Hands',
  'Salamanders',
  'White Scars',
]

const PALETTE_ARMIES = [
  'Black Templar',
  'League of Votann',
  "T'au Empire",
  'Agents of the Imperium',
]

let errors = 0
let warnings = 0

function fail(msg: string) {
  console.error(`✗ ${msg}`)
  errors++
}

function warn(msg: string) {
  console.warn(`⚠ ${msg}`)
  warnings++
}

function loadFaction(file: string): WoFactionData {
  return JSON.parse(readFileSync(join(woDir, file), 'utf8')) as WoFactionData
}

function loadLegends(mainFile: string): WoUnit[] {
  const legFile = legendsFileName(mainFile)
  const path = join(woDir, legFile)
  if (!existsSync(path)) return []
  const data = loadFaction(legFile)
  return (data.Units ?? []).map((u) => ({ ...u, Legends: true }))
}

function buildBundleForArmy(army: string): WarOrganBuilderBundle | null {
  const file = warOrganFactionFile(army)
  if (!file || !existsSync(join(woDir, file))) return null
  const faction = loadFaction(file)
  const legends = loadLegends(file)
  const bundle = assembleWarOrganBundle(file, faction, legends, meta.Version ?? 'test')

  if (!isCodexChapter(army)) return bundle
  const smFile = warOrganFactionFile(MFM_SPACE_MARINES_ARMY)
  if (!smFile || !existsSync(join(woDir, smFile))) return bundle
  const smFaction = loadFaction(smFile)
  const smLegends = loadLegends(smFile)
  const smBundle = assembleWarOrganBundle(smFile, smFaction, smLegends, meta.Version ?? 'test')
  return mergeCodexChapterBundles(bundle, smBundle)
}

const builderArmies = [...gameData.armies.map((a) => a.army), ...CODEX_CHAPTERS]

for (const army of builderArmies) {
  if (!warOrganFactionFile(army)) fail(`warOrganFactionFile missing for "${army}"`)
}

for (const army of PALETTE_ARMIES) {
  if (!factionPalette(meta, army)) fail(`factionPalette could not resolve "${army}"`)
}

let bundleCount = 0
let roundTrips = 0
let compositionChecks = 0
const smBundleForLeaders = buildBundleForArmy(MFM_SPACE_MARINES_ARMY)
const smUnitNameKeys = smBundleForLeaders
  ? new Set([...smBundleForLeaders.unitDefs.values()].map((u) => normalizeWoKey(u.Name)))
  : new Set<string>()

for (const army of builderArmies) {
  const bundle = buildBundleForArmy(army)
  if (!bundle) {
    fail(`could not build bundle for "${army}"`)
    continue
  }
  bundleCount++

  const ids = bundle.units.map((u) => u.id)
  const idSet = new Set(ids)
  if (idSet.size !== ids.length) fail(`${army}: duplicate curated unit ids`)

  for (const unit of bundle.unitDefs.values()) {
    if (unit.UnitComposition?.ModelCompositions?.length) {
      const state = defaultWarOrganComposition(unit)
      const models = totalModelCount(state)
      if (!compositionMatchesPoints(unit, models)) {
        fail(`${army}: default composition illegal for ${unit.Name} (${models} models)`)
      }
      compositionChecks++
    }
  }

  const unitNameKeys = new Set([...bundle.unitDefs.values()].map((u) => normalizeWoKey(u.Name)))
  for (const unit of bundle.unitDefs.values()) {
    if (!unit.LeaderInfo?.UnitNames?.length) continue
    for (const target of unit.LeaderInfo.UnitNames) {
      if (!unitNameKeys.has(normalizeWoKey(target))) {
        const inSmPool = isCodexChapter(army) && smUnitNameKeys.has(normalizeWoKey(target))
        if (!inSmPool) {
          warn(`${army}: leader ${unit.Name} references non-datasheet "${target}"`)
        }
      }
    }
  }

  for (const enh of bundle.enhancements) {
    if (!findGameDetachment(bundle, enh.detachment ?? '')) {
      fail(`${army}: enhancement "${enh.name}" references unknown detachment "${enh.detachment}"`)
    }
  }

  const firstDet = bundle.detachments[0]
  const firstUnit = bundle.units[0]
  if (firstDet && firstUnit) {
    const roster: ArmyRoster = {
      id: 'test',
      name: 'Integration test',
      army,
      battleSize: 2000,
      dataEdition: 'warorgan',
      units: [
        {
          lineId: 'line-1',
          unitId: firstUnit.id,
          name: firstUnit.name,
          points: firstUnit.points,
          count: 1,
          options: {
            [WO_ROSTER_KEY]: defaultWarOrganComposition(bundle.unitDefs.get(firstUnit.id)!),
          },
        },
      ],
      detachments: [
        {
          name: firstDet.name,
          dp: firstDet.dp,
          note: firstDet.note,
          forceDisposition: firstDet.forceDisposition,
        },
      ],
      enhancements: [],
      pointsTotal: firstUnit.points + firstDet.dp * 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const reconciled = reconcileRosterDetachments(
      {
        ...roster,
        detachments: [
          {
            ...roster.detachments[0]!,
            name: formatTitleCase(firstDet.name),
          },
        ],
      },
      bundle,
    )
    if (!woNamesMatch(reconciled.detachments[0]!.name, firstDet.name)) {
      fail(`${army}: reconcileRosterDetachments did not restore canonical detachment name`)
    }

    const exported = exportWoArmyList(reconciled, bundle, bundle.units)
    const imported = convertWoArmyListToRoster(exported, bundle)
    if (!imported || imported.skippedUnits.length) {
      fail(`${army}: import/export round-trip skipped units: ${imported?.skippedUnits.join(', ')}`)
    } else if (imported.roster.units[0]?.unitId !== firstUnit.id) {
      fail(`${army}: import/export round-trip unit id mismatch`)
    } else {
      roundTrips++
    }

    const issues = validateWarOrganRoster(reconciled, bundle.units, bundle)
    const hard = issues.filter((i) => i.level === 'error')
    if (hard.length > 3) {
      fail(`${army}: sample roster has unexpected validation errors: ${hard.map((i) => i.message).join('; ')}`)
    }
  }

  const leaderWithBody = [...bundle.unitDefs.values()].find(
    (u) => u.LeaderInfo?.UnitNames?.length && unitNameKeys.has(normalizeWoKey(u.LeaderInfo.UnitNames[0]!)),
  )
  if (leaderWithBody) {
    const bodyName = leaderWithBody.LeaderInfo!.UnitNames[0]!
    if (!leaderCanAttachToBodyguard(leaderWithBody, bodyName)) {
      fail(`${army}: leaderCanAttachToBodyguard failed for ${leaderWithBody.Name} → ${bodyName}`)
    }
  }

  const sampleEnh = bundle.enhancements[0]
  const sampleWoUnit = [...bundle.unitDefs.values()].find((u) => u.IsCharacter) ?? [...bundle.unitDefs.values()][0]
  if (sampleEnh && sampleWoUnit && firstDet) {
    const eligible = woEnhancementEligible(sampleWoUnit, sampleEnh, firstDet.name)
    if (typeof eligible !== 'boolean') fail(`${army}: woEnhancementEligible returned non-boolean`)
  }
}

function formatTitleCase(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

const smBundle = buildBundleForArmy('Ultramarines')
const vanillaBundle = buildBundleForArmy(MFM_SPACE_MARINES_ARMY)
if (smBundle && vanillaBundle) {
  if (smBundle.units.length <= vanillaBundle.units.length) {
    fail('codex chapter bundle should include Space Marines units')
  }
  const smOnly = smBundle.units.filter((u) => !vanillaBundle.units.some((v) => v.id === u.id))
  if (!smOnly.length) fail('Ultramarines bundle should add chapter-specific units')
}

for (const f of meta.factions ?? []) {
  const file = warOrganFactionFile(f.Name)
  if (!file && !['Adeptus Titanicus'].includes(f.Name)) {
    warn(`meta faction "${f.Name}" has no builder map entry`)
  }
}

if (errors) {
  console.error(`FAILED: ${errors} WarOrgan integration error(s), ${warnings} warning(s)`)
  process.exit(1)
}

console.log(
  `✓ WarOrgan integration OK (${bundleCount} bundles, ${compositionChecks} compositions, ${roundTrips} round-trips, ${warnings} warnings)`,
)
