/**
 * WarOrgan unit composition smoke tests (replaces legacy MFM loadout file checks).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { warOrganFactionFile } from '../src/lib/warorgan-army-map'
import { assembleWarOrganBundle, legendsFileName } from '../src/lib/warorgan-bundle-build'
import {
  adjustChoiceCount,
  adjustModelRow,
  adjustWargearOption,
  canAdjustChoiceCount,
  canAdjustModelRow,
  canAdjustWargearOption,
  defaultWarOrganComposition,
  getChoiceCount,
  getOptionCount,
  maxOptionCount,
  primaryBulkIndex,
  totalModelCount,
  unitHasWarOrganComposition,
  validModelCounts,
} from '../src/lib/warorgan-composition'
import { unitHasEffectiveKeyword } from '../src/lib/warorgan-detachment-effects'
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

const checks: { army: string; unitName: string; test: (u: WoUnit, bundle: ReturnType<typeof assembleWarOrganBundle>) => void }[] = [
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
    army: 'Space Marines',
    unitName: 'ASSAULT INTERCESSORS WITH JUMP PACKS',
    test: (u) => {
      const state = defaultWarOrganComposition(u)
      const bulk = 1
      const opt = u.UnitComposition!.ModelCompositions[bulk].Wargear[0].Options[0]
      const max = maxOptionCount(state.modelCounts[bulk], opt, totalModelCount(state))
      if (max < 1) fail('JPI: plasma pistol slot unavailable at 5-model squad')
      if (!canAdjustWargearOption(u, state, bulk, 0, 0, 1)) {
        fail('JPI: cannot add plasma pistol at default squad size')
      }
      const withPlasma = adjustWargearOption(state, bulk, 0, 0, 1)
      if (!withPlasma || getOptionCount(withPlasma, bulk, 0, 0) !== 1) {
        fail('JPI: plasma pistol adjust failed')
      }
    },
  },
  {
    army: 'Space Marines',
    unitName: 'SCOUT SQUAD',
    test: (u) => {
      const state = defaultWarOrganComposition(u)
      const bulk = 1
      const sniperOpt = u.UnitComposition!.ModelCompositions[bulk].Wargear[0].Options[1]
      if (maxOptionCount(state.modelCounts[bulk], sniperOpt, totalModelCount(state)) < 1) {
        fail('Scout Squad: sniper slot unavailable at 5 models')
      }
      if (!canAdjustWargearOption(u, state, bulk, 0, 1, 1)) {
        fail('Scout Squad: cannot add sniper at 5 models')
      }
      const knifeState = adjustChoiceCount(state, bulk, 0, 0, 1, 1)
      if (!knifeState || getChoiceCount(knifeState, bulk, 0, 0, 1) !== 1) {
        fail('Scout Squad: cannot add combat knife per model')
      }
    },
  },
  {
    army: 'Space Marines',
    unitName: 'LAND SPEEDER',
    test: (_u, bundle) => {
      const det = bundle.detachmentsRaw.find((d) => d.Name === 'FULGURIS TASK FORCE')
      if (!det) {
        fail('Land Speeder: Fulguris detachment missing')
        return
      }
      const ls = [...bundle.unitDefs.values()].find((x) => x.Name === 'LAND SPEEDER')
      if (!ls) {
        fail('Land Speeder unit missing')
        return
      }
      const enh = det.Enhancements.find((e) => e.Name === 'Bellicose Weapon Spirits')
      if (!enh) {
        fail('Land Speeder: Bellicose enhancement missing')
        return
      }
      if (!unitHasEffectiveKeyword(ls, 'Speeder', bundle.detachmentsRaw, ['FULGURIS TASK FORCE'])) {
        fail('Land Speeder: Speeder keyword not granted by Fulguris detachment')
      }
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
  test(unit, bundle)
}

if (errors) {
  console.error(`FAILED: ${errors} WarOrgan composition error(s)`)
  process.exit(1)
}

console.log(`✓ WarOrgan composition checks OK (${checks.length} spot tests)`)
