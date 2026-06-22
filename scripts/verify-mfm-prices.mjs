#!/usr/bin/env node
/**
 * Compare curated JSON unit points against MFM (same rules as faction-loader overlay).
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const factionMap = JSON.parse(readFileSync(join(root, 'src/data/faction-map.json'), 'utf8'))
const armyMap = JSON.parse(readFileSync(join(root, 'public/data/army/mfm/army-map.json'), 'utf8'))
const curatedDir = join(root, 'public/data/army/curated/factions')
const mfmDir = join(root, 'public/data/army/mfm/factions')

const CODEX_CHAPTERS = new Set([
  'Ultramarines',
  'Raven Guard',
  'Imperial Fists',
  'Iron Hands',
  'Salamanders',
  'White Scars',
])

function mfmArmyKey(army) {
  if (CODEX_CHAPTERS.has(army) || army === 'Space Marines') return 'Space Marines'
  return army
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2019'`]/g, '')
    .replace(/\[legends\]/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function defaultPoints(pricing) {
  if (!pricing?.length) return null
  return pricing[0]?.costs?.[0]?.points ?? null
}

function inflectMfmNameVariants(name) {
  const norm = normalizeName(name)
  const variants = new Set([norm])
  const parts = norm.split(' ').filter(Boolean)
  if (parts.length === 0) return [norm]
  const last = parts[parts.length - 1]
  if (last.endsWith('s') && last.length > 3) {
    variants.add([...parts.slice(0, -1), last.slice(0, -1)].join(' '))
  } else {
    variants.add([...parts.slice(0, -1), `${last}s`].join(' '))
  }
  return [...variants]
}

function lookupMfm(index, unitName) {
  const keys = new Set()
  for (const k of inflectMfmNameVariants(unitName)) keys.add(k)
  const aliases = {
    [normalizeName('Decimus Kill Team')]: [normalizeName('Deathwatch Veterans')],
  }
  for (const alias of aliases[normalizeName(unitName)] ?? []) {
    keys.add(alias)
    for (const k of inflectMfmNameVariants(alias)) keys.add(k)
  }
  for (const key of keys) {
    const hit = index.get(key)
    if (hit) return hit
  }
}

function applyMfm(unit, mfm) {
  if (!mfm?.pricing?.length) return unit
  const points = mfm.points ?? defaultPoints(mfm.pricing) ?? unit.points
  return {
    ...unit,
    points,
    pricing: mfm.pricing,
    legends: mfm.legends === true ? true : unit.legends,
  }
}

function buildMfmIndex(slugs) {
  const index = new Map()
  for (const slug of slugs) {
    const path = join(mfmDir, `${slug}.json`)
    if (!existsSync(path)) continue
    const faction = JSON.parse(readFileSync(path, 'utf8'))
    for (const unit of faction.units ?? []) {
      index.set(normalizeName(unit.name), unit)
    }
  }
  return index
}

function applyUnitFilter(units, filter) {
  if (!filter) return units
  return units.filter((u) => {
    const name = u.name
    if (filter.excludeNameContains?.some((s) => name.includes(s))) return false
    if (filter.nameContainsAny?.length) {
      return filter.nameContainsAny.some((s) => name.includes(s))
    }
    if (filter.keyword) {
      return u.keywords?.some((k) => k.toLowerCase() === filter.keyword.toLowerCase())
    }
    return true
  })
}

let errors = 0
const samples = []

for (const mapping of factionMap.mappings) {
  const army = mapping.army
  const mfmMeta = armyMap[mfmArmyKey(army)]
  if (!mfmMeta?.slugs?.length) continue

  const mfmIndex = buildMfmIndex(mfmMeta.slugs)
  const seen = new Set()
  const catalogUnits = []

  for (const slug of mapping.slugs) {
    const path = join(curatedDir, `${slug}.json`)
    if (!existsSync(path)) continue
    const faction = JSON.parse(readFileSync(path, 'utf8'))
    catalogUnits.push(...(faction.units ?? []))
  }

  for (const supplement of mapping.unitSupplements ?? []) {
    const path = join(curatedDir, `${supplement.slug}.json`)
    if (!existsSync(path)) continue
    const allowed = new Set(supplement.names.map((name) => normalizeName(name)))
    const faction = JSON.parse(readFileSync(path, 'utf8'))
    for (const unit of faction.units ?? []) {
      if (allowed.has(normalizeName(unit.name))) catalogUnits.push(unit)
    }
  }

  const units = applyUnitFilter(catalogUnits, mapping.unitFilter)

  for (const unit of units) {
    const key = `${army}::${normalizeName(unit.name)}`
    if (seen.has(key)) continue
    seen.add(key)

    if (unit.legends === true || /\[legends\]/i.test(unit.name)) continue

    const mfm = lookupMfm(mfmIndex, unit.name)
    if (!mfm?.pricing) continue

    const effective = applyMfm(unit, mfm)
    if (effective.legends === true || /\[legends\]/i.test(unit.name)) continue

    const expected = mfm.points ?? defaultPoints(mfm.pricing)
    if (expected == null) continue

    if (effective.points !== expected) {
      errors++
      if (samples.length < 50) {
        samples.push({ army, name: unit.name, curated: effective.points, mfm: expected })
      }
    }
  }
}

if (samples.length) {
  console.error('Price mismatches in curated JSON (should match MFM after merge):')
  for (const s of samples) {
    console.error(`  ${s.army} / ${s.name}: ${s.curated} → ${s.mfm}`)
  }
  if (errors > samples.length) {
    console.error(`  … and ${errors - samples.length} more`)
  }
}

if (errors === 0) {
  console.log('✓ MFM price check OK')
  process.exit(0)
}

console.error(`FAILED: ${errors} price mismatch(es) — run npm run merge:mfm`)
process.exit(1)
