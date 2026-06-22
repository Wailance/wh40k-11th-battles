#!/usr/bin/env node
/**
 * Fix common BSData datasheet leaks across all curated faction JSON:
 * - strip ➤ prefix from weapon names
 * - backfill default weapons on listable units that have loadouts but empty weapon arrays
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const factionsDir = join(root, 'public/data/army/curated/factions')
const loadoutsDir = join(root, 'public/data/army/loadouts')

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2019'`]/g, '')
    .replace(/\[legends\]/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function cleanWeaponName(name) {
  return name.replace(/^➤\s*/, '').trim()
}

function weaponLabelFromOption(name) {
  const cleaned = cleanWeaponName(name)
  const stripped = cleaned.replace(/^.*\bw\/\s*/i, '').trim()
  return stripped || cleaned
}

function isListableUnit(unit) {
  if (unit.legends === true || /\[legends\]|\[crucible\]/i.test(unit.name)) return false
  if (unit.pricing?.length) return true
  return unit.points > 0
}

function defaultGroupSelections(group) {
  const selections = {}

  if (group.mode === 'fixed') {
    const id = group.fixedOptionId ?? group.options[0]?.id
    if (id) selections[id] = 1
    if (group.groups) {
      for (const sub of group.groups) Object.assign(selections, defaultGroupSelections(sub))
    }
    const opt = group.options[0]
    if (opt?.groups) {
      for (const sub of opt.groups) Object.assign(selections, defaultGroupSelections(sub))
    }
    return selections
  }

  if (group.options.length === 0 && group.groups) {
    for (const sub of group.groups) Object.assign(selections, defaultGroupSelections(sub))
    return selections
  }

  if (group.mode === 'single') {
    const pick =
      group.options.find((o) => o.id === group.defaultOptionId) ??
      group.options.find((o) => o.min > 0) ??
      group.options[0]
    if (pick) {
      selections[pick.id] = 1
      if (pick.groups) {
        for (const sub of pick.groups) Object.assign(selections, defaultGroupSelections(sub))
      }
    }
    return selections
  }

  let total = 0
  for (const option of group.options) {
    if (option.min > 0) {
      selections[option.id] = option.min
      total += option.min
      if (option.groups) {
        for (const sub of option.groups) Object.assign(selections, defaultGroupSelections(sub))
      }
    }
  }

  const need = Math.max(0, group.min - total)
  if (need > 0) {
    const fill =
      group.options.find((o) => o.id === group.defaultOptionId) ??
      group.options.find((o) => o.max > 1) ??
      group.options[0]
    if (fill) selections[fill.id] = (selections[fill.id] ?? 0) + need
  }

  for (const sub of group.groups ?? []) {
    Object.assign(selections, defaultGroupSelections(sub))
  }

  return selections
}

function defaultLoadoutSelections(def) {
  const selections = {}
  for (const group of def.groups ?? []) {
    Object.assign(selections, defaultGroupSelections(group))
  }
  return selections
}

function allLoadoutOptions(def) {
  const options = []
  function walkGroups(groups) {
    for (const group of groups ?? []) {
      options.push(...(group.options ?? []))
      walkGroups(group.groups)
      for (const option of group.options ?? []) walkGroups(option.groups)
    }
  }
  walkGroups(def.groups)
  return options
}

function buildWeaponIndex(units) {
  const index = new Map()
  for (const unit of units) {
    for (const weapon of [...(unit.rangedWeapons ?? []), ...(unit.meleeWeapons ?? [])]) {
      const key = normalizeName(cleanWeaponName(weapon.name))
      if (!index.has(key)) index.set(key, weapon)
    }
  }
  return index
}

function lookupWeapon(index, label) {
  const variants = [label]
  const withoutCount = label.replace(/^\d+\s+/, '').trim()
  if (withoutCount && withoutCount !== label) variants.push(withoutCount)
  const andSplit = withoutCount.split(/\s+and\s+/i).map((s) => s.trim()).filter(Boolean)
  if (andSplit.length > 1) variants.push(...andSplit)

  for (const variant of variants) {
    const key = normalizeName(variant)
    if (index.has(key)) return index.get(key)

    for (const [candidate, weapon] of index) {
      if (candidate === key || candidate.endsWith(` ${key}`) || key.endsWith(` ${candidate}`)) {
        return weapon
      }
    }
  }

  return null
}

function cloneWeapon(weapon) {
  return {
    ...weapon,
    name: cleanWeaponName(weapon.name),
    keywords: [...(weapon.keywords ?? [])],
  }
}

let arrowFixes = 0
let weaponBackfills = 0
const backfillSamples = []

for (const file of readdirSync(factionsDir).filter((f) => f.endsWith('.json'))) {
  const slug = file.replace(/\.json$/, '')
  const path = join(factionsDir, file)
  const faction = JSON.parse(readFileSync(path, 'utf8'))
  const loadoutPath = join(loadoutsDir, `${slug}.json`)
  const loadouts = existsSync(loadoutPath) ? JSON.parse(readFileSync(loadoutPath, 'utf8')) : {}
  const weaponIndex = buildWeaponIndex(faction.units ?? [])
  let changed = false

  for (const unit of faction.units ?? []) {
    for (const list of [unit.rangedWeapons, unit.meleeWeapons]) {
      if (!list) continue
      for (const weapon of list) {
        const cleaned = cleanWeaponName(weapon.name)
        if (cleaned !== weapon.name) {
          weapon.name = cleaned
          arrowFixes++
          changed = true
        }
      }
    }

    if (!isListableUnit(unit)) continue
    const hasWeapons = (unit.rangedWeapons?.length ?? 0) + (unit.meleeWeapons?.length ?? 0) > 0
    if (hasWeapons) continue

    const loadout = loadouts[unit.id]
    if (!loadout?.groups?.length) continue

    const selections = defaultLoadoutSelections(loadout)
    const picked = new Map()

    for (const option of allLoadoutOptions(loadout)) {
      if ((selections[option.id] ?? 0) <= 0) continue
    const labels = [weaponLabelFromOption(option.name)]
    if (option.equippedWith) labels.push(option.equippedWith)
    for (const label of labels) {
      if (!label || /^(e-cog|assistant|sergeant|model)$/i.test(label)) continue
      const hit = lookupWeapon(weaponIndex, label)
      if (!hit) continue
      picked.set(normalizeName(label), cloneWeapon(hit))
    }
    }

    if (picked.size === 0) continue

    const ranged = []
    const melee = []
    for (const weapon of picked.values()) {
      if (weapon.range === 'Melee') melee.push(weapon)
      else ranged.push(weapon)
    }

    if (ranged.length === 0 && melee.length === 0) continue

    unit.rangedWeapons = ranged
    unit.meleeWeapons = melee
    weaponBackfills++
    backfillSamples.push(`${slug}/${unit.name}: ${[...picked.values()].map((w) => w.name).join(', ')}`)
    changed = true
  }

  if (changed) {
    writeFileSync(path, `${JSON.stringify(faction, null, 2)}\n`)
  }
}

console.log(`Sanitized curated datasheets: ${arrowFixes} weapon name(s) cleaned, ${weaponBackfills} unit(s) backfilled`)
if (backfillSamples.length) {
  console.log('Backfill samples:')
  for (const line of backfillSamples.slice(0, 20)) console.log(`  ${line}`)
  if (backfillSamples.length > 20) console.log(`  … and ${backfillSamples.length - 20} more`)
}
