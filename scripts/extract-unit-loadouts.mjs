#!/usr/bin/env node
/**
 * Extract per-unit wargear / model loadout trees from BSData catalogues.
 * Output: public/data/army/loadouts/{faction-slug}.json
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { convertFileToRawJson } from 'bsdata40k-to-json'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bsdataDir = join(root, 'data/bsdata-wh40k-10e')
const curatedDir = join(root, 'public/data/army/curated/factions')
const outDir = join(root, 'public/data/army/loadouts')

const SKIP_GROUP_NAMES = new Set([
  'Enhancements',
  'Crusade',
  'Warlord',
  'Blackstone Fragments',
  'Honour Points',
  'Relic Fragments',
  'Configuration',
  'Legends',
  'Weapon Upgrades',
  'Weapon Modifications',
])

const SKIP_OPTION_NAMES = new Set([
  'Terminator Honours upgrade',
  'Archeotech Armament upgrade',
])

function ensureArray(value) {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function isSkippableName(name) {
  if (!name) return true
  if (SKIP_GROUP_NAMES.has(name)) return true
  if (SKIP_OPTION_NAMES.has(name)) return true
  if (name.startsWith('Crusade')) return true
  return false
}

function selectionConstraints(entry) {
  let min = 0
  let max = 99
  for (const c of ensureArray(entry?.constraints?.constraint)) {
    if (c['@_field'] !== 'selections') continue
    const scope = c['@_scope']
    if (scope !== 'parent' && scope !== 'self') continue
    const value = Number(c['@_value'])
    if (c['@_type'] === 'min') min = value
    if (c['@_type'] === 'max') max = value
  }
  return { min, max }
}

function inferMode(min, max, optionCount) {
  if (optionCount <= 1) return 'count'
  if (max === 1) return 'single'
  if (min === 1 && max === 1) return 'single'
  return 'count'
}

function extractChildGroups(container, entryMap) {
  const groups = []
  for (const group of ensureArray(container?.selectionEntryGroups?.selectionEntryGroup)) {
    const parsed = extractGroup(group, entryMap)
    if (parsed) groups.push(parsed)
  }
  return groups
}

function fixedLoadoutLabel(entry) {
  const weapons = []
  for (const link of ensureArray(entry?.entryLinks?.entryLink)) {
    const name = link['@_name']
    if (isSkippableName(name)) continue
    const { min, max } = selectionConstraints(link)
    if (min >= 1 && max === 1) weapons.push(name)
  }
  return weapons.length > 0 ? weapons.join(' and ') : undefined
}

function buildOption(entry, entryMap) {
  if (entry['@_hidden'] === 'true') return null
  const type = entry['@_type']
  if (type !== 'model' && type !== 'upgrade') return null
  const name = entry['@_name']
  if (isSkippableName(name)) return null

  const { min, max } = selectionConstraints(entry)
  if (max <= 0) return null

  const childGroups = extractChildGroups(entry, entryMap)
  const opt = {
    id: entry['@_id'],
    name,
    min,
    max: Math.min(max, 99),
  }
  if (childGroups.length > 0) opt.groups = childGroups
  const equippedWith = fixedLoadoutLabel(entry)
  if (equippedWith) opt.equippedWith = equippedWith
  if (name.includes('Plasma Pistol')) {
    opt.hint =
      'For every 5 models in this unit, one Heavy bolt pistol can be replaced with one Plasma pistol.'
    if (!opt.equippedWith) opt.equippedWith = 'Astartes chainsword and Plasma pistol'
  }
  return opt
}

function buildOptionFromLink(link, target, entryMap) {
  const name = link['@_name'] || target?.['@_name']
  if (isSkippableName(name)) return null
  const id = link['@_id'] || target?.['@_id']
  if (!id) return null

  const linkC = selectionConstraints(link)
  const targetC = target ? selectionConstraints(target) : { min: 0, max: 99 }
  const min = linkC.min > 0 ? linkC.min : targetC.min
  const max = Math.min(linkC.max < 99 ? linkC.max : targetC.max, 99)

  const childGroups = target ? extractChildGroups(target, entryMap) : []
  const opt = { id, name, min, max }
  if (childGroups.length > 0) opt.groups = childGroups
  const equippedWith = target ? fixedLoadoutLabel(target) : undefined
  if (equippedWith) opt.equippedWith = equippedWith
  if (name.includes('Plasma Pistol')) {
    opt.hint =
      'For every 5 models in this unit, one Heavy bolt pistol can be replaced with one Plasma pistol.'
    if (!opt.equippedWith) opt.equippedWith = 'Astartes chainsword and Plasma pistol'
  }
  return opt
}

function collectOptions(container, entryMap) {
  const options = []
  const seen = new Set()

  for (const entry of ensureArray(container?.selectionEntries?.selectionEntry)) {
    const opt = buildOption(entry, entryMap)
    if (opt && !seen.has(opt.id)) {
      seen.add(opt.id)
      options.push(opt)
    }
  }

  for (const link of ensureArray(container?.entryLinks?.entryLink)) {
    if (link['@_hidden'] === 'true') continue
    const linkType = link['@_type']
    const target = entryMap.get(link['@_targetId'])
    if (linkType === 'selectionEntryGroup') continue
    if (linkType !== 'selectionEntry' && target?.['@_type'] !== 'upgrade' && target?.['@_type'] !== 'model') {
      continue
    }
    const opt = buildOptionFromLink(link, target, entryMap)
    if (opt && !seen.has(opt.id)) {
      seen.add(opt.id)
      options.push(opt)
    }
  }

  return options
}

function splitCompositionGroup(group) {
  if (group.mode !== 'count' || group.min <= 1 || group.options.length < 2) return group

  const required = group.options.filter((o) => o.min >= 1 && o.max === 1)
  const squad = group.options.filter((o) => !(o.min >= 1 && o.max === 1))
  if (required.length === 0 || squad.length === 0) return group

  const subGroups = []

  for (const req of required) {
    if (req.groups?.length) {
      subGroups.push({
        id: `${req.id}-fixed`,
        name: req.name,
        min: 1,
        max: 1,
        mode: 'fixed',
        fixedOptionId: req.id,
        options: [],
        groups: req.groups,
      })
    } else {
      subGroups.push({
        id: `${req.id}-fixed`,
        name: req.name,
        min: 1,
        max: 1,
        mode: 'fixed',
        fixedOptionId: req.id,
        options: [{ ...req, min: 1, max: 1 }],
      })
    }
  }

  const squadMin = Math.max(0, group.min - required.length)
  const squadMax = Math.max(0, group.max - required.length)

  subGroups.push({
    id: `${group.id}-squad`,
    name: 'Squad',
    min: squadMin,
    max: squadMax,
    mode: 'count',
    options: squad,
    defaultOptionId: group.defaultOptionId,
  })

  return {
    id: group.id,
    name: group.name,
    min: group.min,
    max: group.max,
    mode: 'count',
    options: [],
    groups: subGroups,
  }
}

function extractGroup(group, entryMap) {
  if (group['@_hidden'] === 'true') return null
  const name = group['@_name']
  if (isSkippableName(name)) return null

  const { min, max } = selectionConstraints(group)
  const options = collectOptions(group, entryMap)
  const nestedGroups = extractChildGroups(group, entryMap)

  if (options.length === 0 && nestedGroups.length === 0) return null

  const result = {
    id: group['@_id'],
    name,
    min,
    max,
    mode: inferMode(min, max, options.length + nestedGroups.length),
    options,
  }

  const defaultId = group['@_defaultSelectionEntryId']
  if (defaultId) result.defaultOptionId = defaultId

  if (nestedGroups.length > 0) result.groups = nestedGroups

  return splitCompositionGroup(result)
}

function flattenSquadVariantGroups(group) {
  if (group.mode !== 'count' || !group.groups?.length) return

  const lifted = []
  const kept = []
  for (const sub of group.groups) {
    if (
      sub.mode === 'count' &&
      sub.options.some((o) => o.equippedWith || /\bw\/\s/i.test(o.name))
    ) {
      lifted.push(...sub.options)
    } else {
      kept.push(sub)
    }
  }

  if (lifted.length > 0) {
    group.options.push(...lifted)
    group.groups = kept
  }

  for (const sub of group.groups ?? []) flattenSquadVariantGroups(sub)
}

function flattenSquadLoadout(loadout) {
  for (const group of loadout.groups ?? []) flattenSquadVariantGroups(group)
}

function extractLoadout(entry, entryMap) {
  if (!entry || entry['@_hidden'] === 'true') return null
  const groups = extractChildGroups(entry, entryMap)
  return groups.length > 0 ? { groups } : null
}

function indexEntries(cat) {
  const map = new Map()
  function indexNode(node) {
    if (!node || typeof node !== 'object') return
    if (node['@_id']) map.set(node['@_id'], node)
    for (const sub of ensureArray(node?.selectionEntries?.selectionEntry)) indexNode(sub)
    for (const group of ensureArray(node?.selectionEntryGroups?.selectionEntryGroup)) indexNode(group)
  }

  for (const entry of ensureArray(cat?.sharedSelectionEntries?.selectionEntry)) indexNode(entry)
  for (const entry of ensureArray(cat?.selectionEntries?.selectionEntry)) indexNode(entry)
  for (const group of ensureArray(cat?.sharedSelectionEntryGroups?.selectionEntryGroup)) indexNode(group)
  return map
}

function collectUnitEntries(cat) {
  const units = []
  function consider(entry) {
    const type = entry?.['@_type']
    if ((type === 'unit' || type === 'model') && entry['@_id']) units.push(entry)
  }
  for (const entry of ensureArray(cat?.sharedSelectionEntries?.selectionEntry)) consider(entry)
  for (const entry of ensureArray(cat?.selectionEntries?.selectionEntry)) consider(entry)
  return units
}

mkdirSync(outDir, { recursive: true })

const curatedFiles = readdirSync(curatedDir).filter((f) => f.endsWith('.json'))
const catFiles = readdirSync(bsdataDir).filter((f) => f.endsWith('.cat'))

let withLoadout = 0

for (const curatedFile of curatedFiles) {
  const slug = curatedFile.replace(/\.json$/, '')
  const curated = JSON.parse(readFileSync(join(curatedDir, curatedFile), 'utf8'))
  const unitIds = new Set(curated.units.map((u) => u.id))
  const loadouts = {}

  for (const catFile of catFiles) {
    const raw = await convertFileToRawJson(join(bsdataDir, catFile))
    const entryMap = indexEntries(raw.catalogue)
    for (const entry of collectUnitEntries(raw.catalogue)) {
      if (!unitIds.has(entry['@_id'])) continue
      const loadout = extractLoadout(entry, entryMap)
      if (loadout) {
        // Keep nested variant buckets — GW Battle Forge renders plasma/missile as grouped rows.
        loadouts[entry['@_id']] = loadout
        withLoadout++
      }
    }
  }

  if (Object.keys(loadouts).length > 0) {
    writeFileSync(join(outDir, `${slug}.json`), JSON.stringify(loadouts, null, 2))
  }
}

console.log(`✓ Loadouts: ${withLoadout} units with options → ${outDir}/`)
