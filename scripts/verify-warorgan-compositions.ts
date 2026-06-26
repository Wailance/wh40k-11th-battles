/**
 * WarOrgan unit composition smoke tests (replaces legacy MFM loadout file checks).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { warOrganFactionFile } from '../src/lib/warorgan-army-map'
import { assembleWarOrganBundle, legendsFileName } from '../src/lib/warorgan-bundle-build'
import {
  adjustModelRow,
  canAdjustModelRow,
  defaultWarOrganComposition,
  primaryBulkIndex,
  totalModelCount,
  unitHasWarOrganComposition,
  validModelCounts,
} from '../src/lib/warorgan-composition'
import { leaderCanAttachToBodyguard } from '../src/lib/warorgan-roster'
import type { WoFactionData, WoUnit } from '../src/types/warorgan'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const woDir = join(root, 'public/data/warorgan/factions')

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

const checks: { army: string; unitName: string; test: (u: WoUnit) => void }[] = [
  {
    army: 'Space Marines',
    unitName: 'ASSAULT INTERCESSOR SQUAD',
    test: (u) => {
      if (!unitHasWarOrganComposition(u)) fail('Assault Intercessor Squad: no composition')
      const state = defaultWarOrganComposition(u)
      if (totalModelCount(state) < 5) fail('Assault Intercessor Squad: default squad too small')
      const valid = validModelCounts(u)
      if (!valid.includes(totalModelCount(state))) {
        fail(`Assault Intercessor Squad: default count not in points tiers (${valid.join(', ')})`)
      }
      const comps = u.UnitComposition?.ModelCompositions ?? []
      const bulk = primaryBulkIndex(comps)
      if (bulk < 0) fail('Assault Intercessor Squad: no bulk row')
      if (!canAdjustModelRow(u, state, bulk, 1)) fail('Assault Intercessor Squad: cannot grow squad')
      const grown = adjustModelRow(u, state, bulk, 1)
      if (!grown || totalModelCount(grown) <= totalModelCount(state)) {
        fail('Assault Intercessor Squad: adjustModelRow +1 failed')
      }
    },
  },
  {
    army: 'Adepta Sororitas',
    unitName: 'BATTLE SISTERS SQUAD',
    test: (u) => {
      const state = defaultWarOrganComposition(u)
      if (totalModelCount(state) < 5) fail('Battle Sisters Squad: default below 5 models')
    },
  },
  {
    army: 'Adepta Sororitas',
    unitName: 'CANONESS',
    test: (u) => {
      if (!u.LeaderInfo?.UnitNames?.length) fail('Canoness: missing LeaderInfo')
      const sisters = loadFaction('Adepta Sororitas.json').Units.find((x) => x.Name === 'BATTLE SISTERS SQUAD')
      if (sisters && !leaderCanAttachToBodyguard(u, sisters.Name, sisters)) {
        fail('Canoness: cannot attach to Battle Sisters Squad')
      }
    },
  },
  {
    army: 'Necrons',
    unitName: 'NECRON WARRIORS',
    test: (u) => {
      const state = defaultWarOrganComposition(u)
      if (totalModelCount(state) < 1) fail('Necron Warriors: empty default')
    },
  },
]

for (const { army, unitName, test } of checks) {
  const file = warOrganFactionFile(army)
  if (!file) {
    fail(`${army}: no faction file`)
    continue
  }
  const bundle = assembleWarOrganBundle(file, loadFaction(file), loadLegends(file), 'test')
  const unit = [...bundle.unitDefs.values()].find((u) => u.Name === unitName)
  if (!unit) {
    fail(`${army}: unit ${unitName} not found`)
    continue
  }
  test(unit)
}

if (errors) {
  console.error(`FAILED: ${errors} WarOrgan composition error(s)`)
  process.exit(1)
}

console.log(`✓ WarOrgan composition checks OK (${checks.length} spot tests)`)
