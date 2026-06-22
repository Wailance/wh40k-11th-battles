#!/usr/bin/env node
/**
 * Audit list-builder catalogs: ghost units, zero-point leaks, key MFM gaps.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const factionsDir = join(root, 'public/data/army/curated/factions')
const mfmDir = join(root, 'public/data/army/mfm/factions')
const factionMap = JSON.parse(readFileSync(join(root, 'src/data/faction-map.json'), 'utf8'))
const armyMap = JSON.parse(readFileSync(join(root, 'public/data/army/mfm/army-map.json'), 'utf8'))

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

function normalizeMfmName(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2019'`]/g, '')
    .replace(/\[legends\]/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function inflectMfmNameVariants(name) {
  const norm = normalizeMfmName(name)
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
    [normalizeMfmName('Decimus Kill Team')]: [normalizeMfmName('Deathwatch Veterans')],
  }
  for (const alias of aliases[normalizeMfmName(unitName)] ?? []) {
    keys.add(alias)
    for (const k of inflectMfmNameVariants(alias)) keys.add(k)
  }
  for (const key of keys) {
    const hit = index.get(key)
    if (hit) return hit
  }
  return undefined
}

function catalogSatisfiesMfm(catalogName, mfmName) {
  const keys = new Set()
  for (const k of inflectMfmNameVariants(catalogName)) keys.add(k)
  const aliases = {
    [normalizeMfmName('Decimus Kill Team')]: [normalizeMfmName('Deathwatch Veterans')],
  }
  for (const alias of aliases[normalizeMfmName(catalogName)] ?? []) keys.add(alias)
  return keys.has(normalizeMfmName(mfmName))
}

function isListableCatalogUnit(unit) {
  if (!unit.factionKeywords?.length && !unit.keywords?.length) return false
  if (unit.pricing?.length) return true
  return unit.points > 0
}

function unitCatalogQuality(unit) {
  let score = 0
  if (unit.factionKeywords?.length) score += 20
  if (unit.keywords?.length) score += 10
  if (unit.pricing?.length) score += 5
  score += unit.rangedWeapons?.length ?? 0
  score += unit.meleeWeapons?.length ?? 0
  score += unit.abilities?.length ?? 0
  if (Object.keys(unit.stats ?? {}).length >= 6) score += 3
  return score
}

function dedupeCatalogUnits(units) {
  const byName = new Map()
  for (const unit of units) {
    const key = normalizeMfmName(unit.name)
    const existing = byName.get(key)
    if (!existing || unitCatalogQuality(unit) > unitCatalogQuality(existing)) {
      byName.set(key, unit)
    }
  }
  return [...byName.values()]
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
      return u.keywords.some((k) => k.toLowerCase() === filter.keyword.toLowerCase())
    }
    return true
  })
}

function applyMfm(unit, mfm) {
  if (!mfm?.pricing?.length) return unit
  const points = mfm.points ?? mfm.pricing[0]?.costs?.[0]?.points ?? unit.points
  return {
    ...unit,
    points,
    pricing: mfm.pricing,
    pointsLabel: mfm.pointsLabel ?? String(points),
  }
}

const slugCache = new Map()
for (const file of readdirSync(factionsDir).filter((f) => f.endsWith('.json'))) {
  slugCache.set(file.replace(/\.json$/, ''), JSON.parse(readFileSync(join(factionsDir, file), 'utf8')).units ?? [])
}

const mfmCache = new Map()
for (const file of readdirSync(mfmDir).filter((f) => f.endsWith('.json'))) {
  mfmCache.set(file.replace(/\.json$/, ''), JSON.parse(readFileSync(join(mfmDir, file), 'utf8')).units ?? [])
}

function buildMfmIndex(army) {
  const index = new Map()
  for (const slug of armyMap[army]?.slugs ?? []) {
    for (const unit of mfmCache.get(slug) ?? []) {
      index.set(normalizeMfmName(unit.name), unit)
    }
  }
  return index
}

function buildCatalog(army, mapping) {
  const seen = new Set()
  const units = []
  for (const slug of mapping.slugs) {
    for (const u of slugCache.get(slug) ?? []) {
      if (seen.has(u.id)) continue
      seen.add(u.id)
      units.push(u)
    }
  }
  for (const supplement of mapping.unitSupplements ?? []) {
    const allowed = new Set(supplement.names.map((name) => normalizeMfmName(name)))
    for (const u of slugCache.get(supplement.slug) ?? []) {
      if (!allowed.has(normalizeMfmName(u.name))) continue
      if (seen.has(u.id)) continue
      seen.add(u.id)
      units.push(u)
    }
  }
  const mfmIndex = buildMfmIndex(army)
  return dedupeCatalogUnits(
    applyUnitFilter(units, mapping.unitFilter).map((unit) =>
      applyMfm(unit, lookupMfm(mfmIndex, unit.name)),
    ),
  ).filter(isListableCatalogUnit)
}

const ghostPatterns = [/\bw\/\s/i, /^kill team sergeant$/i, /^gravis veteran\b/i]

let totalGhosts = 0
let totalCatalog = 0

for (const mapping of factionMap.mappings) {
  const army = mapping.army
  const mfmIndex = buildMfmIndex(army)
  const seen = new Set()
  const raw = []
  for (const slug of mapping.slugs) {
    for (const u of slugCache.get(slug) ?? []) {
      if (seen.has(u.id)) continue
      seen.add(u.id)
      raw.push(u)
    }
  }
  for (const supplement of mapping.unitSupplements ?? []) {
    const allowed = new Set(supplement.names.map((name) => normalizeMfmName(name)))
    for (const u of slugCache.get(supplement.slug) ?? []) {
      if (!allowed.has(normalizeMfmName(u.name))) continue
      if (seen.has(u.id)) continue
      seen.add(u.id)
      raw.push(u)
    }
  }

  const catalog = buildCatalog(army, mapping)
  totalCatalog += catalog.length
  const catalogNames = new Set(catalog.map((u) => normalizeMfmName(u.name)))

  const zeroInCatalog = catalog.filter((u) => u.points === 0)
  if (zeroInCatalog.length) {
    fail(`${army}: ${zeroInCatalog.length} zero-point unit(s) in catalog: ${zeroInCatalog.map((u) => u.name).join(', ')}`)
  }

  for (const u of applyUnitFilter(raw, mapping.unitFilter)) {
    const priced = applyMfm(u, lookupMfm(mfmIndex, u.name))
    if (isListableCatalogUnit(priced)) continue
    if (catalogNames.has(normalizeMfmName(u.name))) continue
    if (u.points > 0 && (u.keywords?.length || u.factionKeywords?.length)) {
      fail(`${army}: listable unit lost from catalog: ${u.name}`)
      continue
    }
    const looksLikeModel = ghostPatterns.some((re) => re.test(u.name))
    if (!looksLikeModel && !lookupMfm(mfmIndex, u.name)) {
      warn(`${army}: hidden 0-pt entry (not a loadout model): ${u.name}`)
    } else if (looksLikeModel) {
      totalGhosts++
    }
  }
}

const KEY_MFM_UNITS = {
  Deathwatch: ['Deathwatch Veterans'],
  'Imperial Agents': ['Fortis Kill Team'],
  'Adepta Sororitas': ['Battle Sisters Squad'],
}

for (const [army, keys] of Object.entries(KEY_MFM_UNITS)) {
  const mapping = factionMap.mappings.find((m) => m.army === army)
  if (!mapping) continue
  const mfmIndex = buildMfmIndex(army)
  const catalog = buildCatalog(army, mapping)
  for (const key of keys) {
    if (!lookupMfm(mfmIndex, key)) continue
    const found = catalog.some((u) => catalogSatisfiesMfm(u.name, key))
    if (!found) warn(`${army}: MFM unit missing from catalog — ${key}`)
  }
}

if (errors === 0) {
  console.log(`✓ catalog audit OK (${factionMap.mappings.length} armies, ${totalCatalog} listable units, ${totalGhosts} loadout models hidden)`)
  if (warnings > 0) console.log(`  ${warnings} warning(s)`)
} else {
  process.exit(1)
}
