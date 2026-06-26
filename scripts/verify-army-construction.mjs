#!/usr/bin/env node
/** Smoke tests for 11th edition army construction limits. */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

let errors = 0
function fail(msg) {
  console.error(`✗ ${msg}`)
  errors++
}

function mkUnit(keywords) {
  return { keywords, factionKeywords: [], name: 'Test', id: 'test', points: 10 }
}

// Inline mirror of army-construction.ts (verify runs without TS build)
function maxCopies(unit, battleSize) {
  const base = battleSize === 1000 ? 2 : 3
  const kws = unit.keywords.map((k) => k.toLowerCase())
  if (kws.includes('epic hero')) return 1
  if (kws.includes('battleline') || kws.includes('dedicated transport')) return base * 2
  return base
}

function isBudgetLegal(dets, battleSize) {
  const budget = battleSize === 1000 ? 2 : 3
  const used = dets.reduce((s, d) => s + d.dp, 0)
  if (used <= budget) return true
  return dets.length === 1
}

function countEnhSlots(lines) {
  const byName = new Map()
  for (const line of lines) {
    const e = byName.get(line.name) ?? { upgrade: line.upgrade, n: 0 }
    e.n += 1
    byName.set(line.name, e)
  }
  let slots = 0
  for (const { upgrade, n } of byName.values()) slots += upgrade ? 1 : n
  return slots
}

if (maxCopies(mkUnit(['Battleline']), 2000) !== 6) {
  fail('Strike Force Battleline max should be 6')
}
if (maxCopies(mkUnit(['Battleline']), 1000) !== 4) {
  fail('Incursion Battleline max should be 4')
}
if (maxCopies(mkUnit(['Infantry']), 1000) !== 2) {
  fail('Incursion generic max should be 2')
}
if (!isBudgetLegal([{ dp: 3 }], 1000)) {
  fail('single 3DP detachment should be legal at 1000')
}
if (isBudgetLegal([{ dp: 2 }, { dp: 1 }], 1000)) {
  fail('2+1 DP should be illegal at 1000')
}
if (countEnhSlots([{ name: 'A', upgrade: true }, { name: 'A', upgrade: true }, { name: 'A', upgrade: true }]) !== 1) {
  fail('upgrade enhancement should count as 1 slot for 3 units')
}
if (countEnhSlots([{ name: 'A', upgrade: false }, { name: 'B', upgrade: false }]) !== 2) {
  fail('two character enhancements = 2 slots')
}

const am = JSON.parse(
  readFileSync(join(root, 'public/data/warorgan/factions/Astra Militarum.json'), 'utf8'),
)
const abhuman = am.Dettachments?.find((d) => d.Tags?.includes('ABHUMAN'))
if (!abhuman) fail('AM fixture: missing ABHUMAN detachment')

const sm = JSON.parse(
  readFileSync(join(root, 'public/data/warorgan/factions/Space Marines.json'), 'utf8'),
)
const librarius = sm.Dettachments?.find((d) => d.Name === 'LIBRARIUS CONCLAVE')
if (librarius && librarius.Stratagems?.length !== 0) {
  fail('Librarius Conclave should have 0 stratagems in WarOrgan data')
}

if (errors === 0) console.log('✓ army-construction smoke checks OK')
else process.exit(1)