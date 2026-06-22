#!/usr/bin/env node
/**
 * Validate curated unit datasheets: structure, weapons, duplicates, loadout keys.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const factionsDir = join(root, 'public/data/army/curated/factions')
const loadoutsDir = join(root, 'public/data/army/loadouts')
const armyMap = JSON.parse(readFileSync(join(root, 'public/data/army/mfm/army-map.json'), 'utf8'))
const factionMap = JSON.parse(readFileSync(join(root, 'src/data/faction-map.json'), 'utf8'))

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2019'`]/g, '')
    .replace(/\[legends\]/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function buildArmyEnhancements() {
  const slugToArmy = new Map()
  for (const mapping of factionMap.mappings) {
    for (const slug of mapping.slugs) slugToArmy.set(slug, mapping.army)
  }

  const byArmy = new Map()
  for (const [army, meta] of Object.entries(armyMap)) {
    const names = new Set()
    for (const slug of meta.slugs ?? []) {
      const path = join(root, `public/data/army/mfm/factions/${slug}.json`)
      try {
        const mfm = JSON.parse(readFileSync(path, 'utf8'))
        for (const detachment of mfm.detachments ?? []) {
          for (const enhancement of detachment.enhancements ?? []) {
            names.add(normalizeName(enhancement.name))
          }
        }
      } catch {
        // optional MFM file
      }
    }
    byArmy.set(army, names)
  }
  return { slugToArmy, byArmy }
}

function isDatasheetAbility(ability, enhancementNames) {
  const nameKey = normalizeName(ability.name)
  if (nameKey === 'unit composition') return false
  if (enhancementNames.has(nameKey)) return false

  const description = ability.description ?? ''
  if (/this Enhancement/i.test(description)) return false
  if (/model only\./i.test(description)) return false
  if (/^\*\*\^\^/.test(description.trim())) return false
  if (/crest$/i.test(nameKey) || nameKey === 'multi spectral visor') return true
  if (/the bearer/i.test(description) || /While the bearer/i.test(description)) return false
  if (/equipped with/i.test(description)) return false
  return true
}

const { slugToArmy, byArmy } = buildArmyEnhancements()

const CORE_STATS = ['M', 'T', 'SV', 'W', 'LD', 'OC']
const WEAPON_FIELDS = ['name', 'range', 'A', 'S', 'AP', 'D']

let errors = 0
let warnings = 0

function fail(msg) {
  console.error(`✗ ${msg}`)
  errors++
}

function warn(msg) {
  console.warn(`⚠ ${msg}`)
  warnings++
}

const idToFiles = new Map()
const allUnits = []
let totalWeapons = 0

for (const file of readdirSync(factionsDir).filter((f) => f.endsWith('.json'))) {
  const slug = file.replace(/\.json$/, '')
  const faction = JSON.parse(readFileSync(join(factionsDir, file), 'utf8'))
  const names = new Map()

  for (const u of faction.units ?? []) {
    allUnits.push({ ...u, slug })

    if (!u.id) fail(`${slug}: unit missing id (${u.name ?? '?'})`)
    else {
      if (!idToFiles.has(u.id)) idToFiles.set(u.id, [])
      idToFiles.get(u.id).push(slug)
    }

    if (!u.name?.trim()) fail(`${slug}: unit ${u.id ?? '?'} missing name`)

    if (names.has(u.name)) warn(`${slug}: duplicate unit name "${u.name}" (catalog dedupes by name)`)
    names.set(u.name, u.id)

    const stats = u.stats ?? {}
    if (Object.keys(stats).length > 0) {
      const missing = CORE_STATS.filter((k) => !stats[k])
      if (missing.length) fail(`${slug}/${u.name}: missing stats ${missing.join(', ')}`)
    } else if ((u.rangedWeapons?.length || u.meleeWeapons?.length) && u.points > 0) {
      fail(`${slug}/${u.name}: has weapons but no stat block`)
    }

    if (!u.keywords?.length && !u.factionKeywords?.length && u.points > 0) {
      warn(`${slug}/${u.name}: no keywords or faction keywords`)
    }

    const rw = u.rangedWeapons ?? []
    const mw = u.meleeWeapons ?? []
    const ab = u.abilities ?? []
    totalWeapons += rw.length + mw.length

    if (u.points > 0 && !u.legends && !/\[legends\]/i.test(u.name) && !rw.length && !mw.length && !ab.length) {
      warn(`${slug}/${u.name}: listable unit with empty datasheet`)
    }

    if (u.points > 0 && !u.legends && !/\[legends\]|\[crucible\]/i.test(u.name) && !rw.length && !mw.length) {
      warn(`${slug}/${u.name}: listable unit missing weapon profiles`)
    }

    const army = slugToArmy.get(slug)
    const enhancementNames = byArmy.get(army) ?? new Set()
    const visibleAbilities = ab.filter((a) => isDatasheetAbility(a, enhancementNames))
    if (ab.length >= 15 && visibleAbilities.length <= ab.length - 10) {
      warn(`${slug}/${u.name}: ${ab.length} raw abilities (${visibleAbilities.length} shown after filter)`)
    }

    for (const w of [...rw, ...mw]) {
      if (/^➤/.test(w.name)) warn(`${slug}/${u.name} → ${w.name}: weapon name still has ➤ prefix`)
      const missing = WEAPON_FIELDS.filter((f) => w[f] == null || w[f] === '')
      const melee = w.range === 'Melee'
      if (melee && !w.WS) missing.push('WS')
      if (!melee && !w.BS) missing.push('BS')
      if (missing.length) {
        const msg = `${slug}/${u.name} → ${w.name}: missing ${missing.join(', ')}`
        if (u.legends || /\[legends\]/i.test(u.name)) warn(msg)
        else fail(msg)
      }
    }

    for (const a of ab) {
      if (!a.name?.trim()) fail(`${slug}/${u.name}: ability without name`)
      if (!a.description?.trim()) warn(`${slug}/${u.name}/${a.name}: empty ability text`)
    }
  }
}

for (const [id, files] of idToFiles) {
  const unique = [...new Set(files)]
  if (unique.length > 1) fail(`duplicate unit id ${id} in ${unique.join(', ')}`)
}

const unitIds = new Set(allUnits.map((u) => u.id).filter(Boolean))
const loadoutIds = new Set()
for (const file of readdirSync(loadoutsDir).filter((f) => f.endsWith('.json'))) {
  const data = JSON.parse(readFileSync(join(loadoutsDir, file), 'utf8'))
  for (const id of Object.keys(data)) {
    loadoutIds.add(id)
    if (!unitIds.has(id)) warn(`loadout key ${id} has no curated unit (${file})`)
  }
}

const listable = allUnits.filter((u) => u.points > 0 || u.pricing?.length)
const withLoadout = listable.filter((u) => loadoutIds.has(u.id))

if (errors === 0) {
  console.log(
    `✓ datasheet audit OK (${allUnits.length} units, ${totalWeapons} weapon profiles, ${loadoutIds.size} loadout trees, ${withLoadout.length} listable with loadouts)`,
  )
  if (warnings > 0) console.log(`  ${warnings} warning(s)`)
} else {
  process.exit(1)
}
