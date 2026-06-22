import type { UnitLoadoutGroup, UnitLoadoutOption } from '../types/loadout'

/** GW Battle Forge style label for a model variant row. */
export function gwVariantLabel(option: UnitLoadoutOption, count: number): string {
  const name = option.displayName ?? formatGwVariantName(option.name)
  return count > 0 ? `${count} ${name}` : name
}

export function gwGroupLabel(group: UnitLoadoutGroup, count: number): string {
  const name = group.displayName ?? formatGwVariantName(group.name)
  return count > 0 ? `${count} ${name}` : name
}

function formatGwVariantName(raw: string): string {
  let name = raw.replace(/^➤\s*/, '').trim()
  const withMatch = name.match(/^(.+?)\s+w\/\s+(.+)$/i)
  if (withMatch) {
    const base = pluralizeModelName(withMatch[1].trim())
    const weapon = withMatch[2].trim()
    if (/incinerator/i.test(weapon)) return `${base} with plasma incinerators`
    if (/heavy bolt pistol/i.test(weapon)) return `${base} with heavy bolt pistols`
    if (/pyreblaster/i.test(weapon)) return `${base} with pyreblasters`
    if (/grenade launcher/i.test(weapon)) return `${base} with Astartes grenade launchers`
    if (/superfrag|missile launcher/i.test(weapon)) return `${base} with superfrag rocket launchers`
    if (/vengor/i.test(weapon)) return `${base} with vengor launchers`
    if (/occulus/i.test(weapon)) return `${base} with occulus bolt carbines`
    if (/combat knife/i.test(weapon)) return `${base} with combat knives`
    if (/bolt sniper/i.test(weapon)) return `${base} with bolt sniper rifles`
    if (/jump pack/i.test(weapon)) return `${base} with jump packs`
    return `${base} with ${weapon}`
  }
  return pluralizeModelName(name)
}

function pluralizeModelName(name: string): string {
  if (/\bIntercessors?\b/i.test(name) && !/Intercessors$/i.test(name)) {
    return name.replace(/\bIntercessor\b/i, 'Intercessors')
  }
  if (/\bVeterans?\b/i.test(name) && !/Veterans$/i.test(name) && /Veteran\b/i.test(name)) {
    return name.replace(/\bVeteran\b/i, 'Veterans')
  }
  return name
}

export function replacementRowLabel(option: UnitLoadoutOption, count: number): string {
  const weapon =
    option.displayName ??
    (option.name.replace(/^.*\bw\/\s*/i, '').trim() || option.name)
  return `${count} × ${weapon}`
}
