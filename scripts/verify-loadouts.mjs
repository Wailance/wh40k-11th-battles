#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const loadouts = JSON.parse(
  readFileSync(join(root, 'public/data/army/loadouts/imperium-space-marines.json'), 'utf8'),
)

let errors = 0
function fail(msg) {
  console.error(`✗ ${msg}`)
  errors++
}

function walkGroups(groups, visit) {
  for (const g of groups) {
    visit(g)
    if (g.groups) walkGroups(g.groups, visit)
    for (const o of g.options ?? []) {
      if (o.groups) walkGroups(o.groups, visit)
    }
  }
}

function findGroup(groups, name) {
  let hit = null
  walkGroups(groups, (g) => {
    if (g.name === name) hit = g
  })
  return hit
}

const ancient = loadouts['fc7f-8176-c10c-ca8']
const melee = findGroup(ancient?.groups ?? [], 'Melee Weapon')
if (!melee?.options?.some((o) => o.name === 'Power fist')) {
  fail('Ancient: missing Power fist in Melee Weapon')
}

const assault = loadouts['cdd9-efda-95-e7b2']
let sergeant = null
let squad = null
walkGroups(assault?.groups ?? [], (g) => {
  if (g.mode === 'fixed') sergeant = g
  if (g.name === 'Squad') squad = g
})
const weapon1 = sergeant ? findGroup(sergeant.groups ?? [], 'Weapon 1') : null
if (!sergeant) fail('Assault Intercessors: missing fixed sergeant block')
if (!squad) fail('Assault Intercessors: missing Squad block')
if (!weapon1?.options?.some((o) => o.name === 'Hand flamer')) {
  fail('Assault Intercessors: sergeant missing Hand flamer option')
}

if (errors === 0) console.log('✓ loadout structure checks OK')
else process.exit(1)
