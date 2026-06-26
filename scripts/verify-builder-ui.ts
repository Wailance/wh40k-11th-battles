/**
 * UI readiness audit: every builder faction must load catalog, bundle, army entry, and theme.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ALLEGIANCES } from '../src/lib/army-allegiance'
import { warOrganFactionFile } from '../src/lib/warorgan-army-map'
import {
  assembleWarOrganBundle,
  legendsFileName,
  mergeCodexChapterBundles,
} from '../src/lib/warorgan-bundle-build'
import {
  addUnit,
  createEmptyRoster,
  duplicateRosterLine,
  refreshRoster,
  toggleDetachment,
} from '../src/lib/list-engine'
import { builderFactionsForAllegiance } from '../src/lib/space-marine-chapters'
import { isCodexChapter, MFM_SPACE_MARINES_ARMY } from '../src/lib/space-marine-chapters'
import { factionPalette } from '../src/lib/warorgan-theme'
import { validateWarOrganRoster } from '../src/lib/warorgan-validation'
import { WO_ROSTER_KEY } from '../src/lib/warorgan-composition'
import { woNamesMatch } from '../src/lib/warorgan-names'
import { setWarlordOnLine } from '../src/lib/warorgan-roster'
import { maxCopiesForUnit } from '../src/lib/unit-buckets'
import type { WoFactionData, WoUnit } from '../src/types/warorgan'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const woDir = join(root, 'public/data/warorgan/factions')
const meta = JSON.parse(readFileSync(join(root, 'public/data/warorgan/meta.json'), 'utf8'))

const CODEX_CHAPTERS = [
  'Ultramarines',
  'Raven Guard',
  'Imperial Fists',
  'Iron Hands',
  'Salamanders',
  'White Scars',
]

let errors = 0

function fail(msg: string) {
  console.error(`✗ ${msg}`)
  errors++
}

function loadFaction(file: string): WoFactionData {
  return JSON.parse(readFileSync(join(woDir, file), 'utf8')) as WoFactionData
}

function loadLegends(mainFile: string): WoUnit[] {
  try {
    const data = loadFaction(legendsFileName(mainFile))
    return (data.Units ?? []).map((u) => ({ ...u, Legends: true }))
  } catch {
    return []
  }
}

function buildBundle(army: string) {
  const file = warOrganFactionFile(army)
  if (!file) return null
  const faction = loadFaction(file)
  const bundle = assembleWarOrganBundle(file, faction, loadLegends(file), meta.Version ?? 'test')
  if (!isCodexChapter(army)) return bundle
  const smFile = warOrganFactionFile(MFM_SPACE_MARINES_ARMY)
  if (!smFile) return bundle
  const smFaction = loadFaction(smFile)
  const smBundle = assembleWarOrganBundle(smFile, smFaction, loadLegends(smFile), meta.Version ?? 'test')
  return mergeCodexChapterBundles(bundle, smBundle)
}

const wizardFactions = ALLEGIANCES.flatMap((a) =>
  builderFactionsForAllegiance(a.id).map((f) => f.name),
)
const allArmies = [...new Set([...wizardFactions, ...CODEX_CHAPTERS])]
const builderMeta: Record<string, { units: number; detachments: number }> = {}

for (const army of allArmies) {
  if (!warOrganFactionFile(army)) {
    fail(`wizard faction "${army}" has no WarOrgan map`)
    continue
  }

  const bundle = buildBundle(army)
  if (!bundle) {
    fail(`bundle failed for "${army}"`)
    continue
  }

  builderMeta[army] = { units: bundle.units.length, detachments: bundle.detachments.length }

  if (!bundle.units.length) fail(`${army}: empty unit catalog`)
  if (!bundle.detachments.length) fail(`${army}: no detachments for picker`)
  if (!factionPalette(meta, army)) fail(`${army}: factionPalette unresolved`)

  const roster = createEmptyRoster(army)
  const duplicatable =
    bundle.units.find((u) => maxCopiesForUnit(u, roster.battleSize) >= 2) ?? bundle.units[0]!
  const woDef = bundle.unitDefs.get(duplicatable.id)
  const withUnit = refreshRoster(
    addUnit(roster, duplicatable, 1, woDef),
    bundle.units,
    bundle.unitDefs,
    bundle.enhancements,
  )
  if (!withUnit.units.length) fail(`${army}: addUnit produced empty roster`)

  if (maxCopiesForUnit(duplicatable, roster.battleSize) >= 2) {
    const dup = refreshRoster(
      duplicateRosterLine(withUnit, withUnit.units[0]!.lineId!, duplicatable),
      bundle.units,
      bundle.unitDefs,
      bundle.enhancements,
    )
    if (dup.units.length !== 2) fail(`${army}: duplicateRosterLine failed`)
  }

  const det = bundle.detachments[0]!
  const withDet = refreshRoster(
    {
      ...withUnit,
      detachments: [
        {
          name: det.name,
          dp: det.dp,
          note: det.note,
          forceDisposition: det.forceDisposition,
        },
      ],
    },
    bundle.units,
    bundle.unitDefs,
    bundle.enhancements,
  )

  const titleCaseDet = {
    ...withDet.detachments[0]!,
    name: det.name
      .split(/\s+/)
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' '),
  }
  const toggled = toggleDetachment(withDet, titleCaseDet, {
    detachmentsRaw: bundle.detachmentsRaw,
    catalogEnhancements: bundle.enhancements,
  })
  if (toggled.detachments.length !== 0) {
    fail(`${army}: detachment toggle should deselect with title-case name`)
  }
  if (!woNamesMatch(det.name, titleCaseDet.name)) {
    fail(`${army}: woNamesMatch broken for detachments`)
  }

  const charUnit =
    bundle.units.find((u) => u.keywords.some((k) => k.toLowerCase() === 'character')) ??
    bundle.units[0]!
  const charWo = bundle.unitDefs.get(charUnit.id)
  let withChar = refreshRoster(
    addUnit(withDet, charUnit, 1, charWo),
    bundle.units,
    bundle.unitDefs,
    bundle.enhancements,
  )
  const warlordId = withChar.units.find((u) => u.unitId === charUnit.id)?.lineId
  if (warlordId) {
    withChar = refreshRoster(
      { ...withChar, units: setWarlordOnLine(withChar.units, warlordId, true) },
      bundle.units,
      bundle.unitDefs,
      bundle.enhancements,
    )
    const wlIssues = validateWarOrganRoster(withChar, bundle.units, bundle).filter((i) =>
      i.message.includes('Warlord'),
    )
    if (wlIssues.some((i) => i.message.includes('No Warlord'))) {
      fail(`${army}: warlord flag not applied`)
    }
  }

  const issues = validateWarOrganRoster(withDet, bundle.units, bundle)
  if (woDef?.UnitComposition?.ModelCompositions?.length) {
    const line = withUnit.units[0]!
    if (!line.options?.[WO_ROSTER_KEY]) {
      fail(`${army}: addUnit did not seed WarOrgan composition for ${duplicatable.name}`)
    }
  }

  if (issues.filter((i) => i.level === 'error').length > 5) {
    fail(`${army}: too many validation errors on minimal list`)
  }
}

writeFileSync(
  join(root, 'public/data/warorgan/builder-meta.json'),
  `${JSON.stringify({ version: meta.Version ?? 'unknown', armies: builderMeta }, null, 2)}\n`,
)

if (errors) {
  console.error(`FAILED: ${errors} builder UI readiness error(s)`)
  process.exit(1)
}

console.log(`✓ Builder UI readiness OK (${allArmies.length} wizard factions)`)
