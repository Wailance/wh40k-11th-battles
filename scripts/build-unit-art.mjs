#!/usr/bin/env node
/**
 * Fetch WH40k unit thumbnails from Fandom wikis and optimize to WebP.
 * Output: public/unit-art/{slug}.webp (~4–12 KB each, 320×400 cover crop)
 *
 * Usage:
 *   node scripts/build-unit-art.mjs                 # all units, skip existing
 *   node scripts/build-unit-art.mjs --force         # rebuild all
 *   node scripts/build-unit-art.mjs --retry-generated  # only placeholder units
 *   node scripts/build-unit-art.mjs --limit 20
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const factionsDir = join(root, 'public/data/army/curated/factions')
const outDir = join(root, 'public/unit-art')
const manifestPath = join(outDir, 'manifest.json')

const force = process.argv.includes('--force')
const retryGenerated = process.argv.includes('--retry-generated')
const limitArg = process.argv.find((a) => a.startsWith('--limit'))
const limit = limitArg
  ? Number(limitArg.split('=')[1] ?? process.argv[process.argv.indexOf('--limit') + 1])
  : Infinity

const WIDTH = 320
const HEIGHT = 400
const WEBP = { quality: 72, effort: 4 }
const DELAY_MS = 80
const UA = 'Mozilla/5.0 (compatible; wh40k-11th-battles-art/1.0)'

const WIKIS = [
  'https://warhammer40k.fandom.com',
  'https://40k-archive.fandom.com',
  'https://2d4chan.org',
]

const overridesPath = join(root, 'scripts/unit-art-overrides.json')
const OVERRIDES = existsSync(overridesPath)
  ? JSON.parse(readFileSync(overridesPath, 'utf8'))
  : {}

const FACTION_TINT = {
  Necrons: ['#1a5c52', '#0d2824'],
  Tyranids: ['#4a2d6b', '#1a1028'],
  Orks: ['#2d5a1a', '#142a0c'],
  'Space Marines': ['#1e3a5f', '#0c1828'],
  'Chaos Space Marines': ['#5a1a1a', '#280c0c'],
  default: ['#3d4654', '#181b22'],
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\[legends\]/gi, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function cleanName(name) {
  return name.replace(/\s*\[[^\]]+\]/gi, '').trim()
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function loadUnits() {
  const bySlug = new Map()
  for (const file of readdirSync(factionsDir).filter((f) => f.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(join(factionsDir, file), 'utf8'))
    for (const unit of data.units) {
      const slug = slugify(unit.name)
      if (!bySlug.has(slug)) {
        bySlug.set(slug, {
          slug,
          name: unit.name,
          army: unit.factionKeywords?.[0] ?? data.faction ?? file.replace('.json', ''),
        })
      }
    }
  }
  return [...bySlug.values()]
}

function nameVariants(name) {
  const base = cleanName(name)
  const out = new Set([name, base, name.replace(/\[Legends\]/gi, '').trim()])

  if (base.endsWith('ies')) out.add(`${base.slice(0, -3)}y`)
  if (base.endsWith('s') && !base.endsWith('ss')) out.add(base.slice(0, -1))
  if (!base.endsWith('s')) out.add(`${base}s`)

  const andParts = base.split(/\s+and\s+/i)
  if (andParts[0]) out.add(andParts[0].trim())
  if (andParts[1]) out.add(andParts[1].trim())

  const words = base.split(/\s+/).filter(Boolean)
  if (words.length >= 2) out.add(words.slice(-2).join(' '))
  if (words.length >= 1) out.add(words.at(-1))

  // "Ironstrider Ballistarii" → "Ironstrider Ballistarius"
  if (base.includes('Ballistarii')) out.add(base.replace('Ballistarii', 'Ballistarius'))
  if (base.includes('Skyrunners')) out.add(base.replace('Skyrunners', 'Skyrunner'))
  if (base.includes('Witchseekers')) out.add('Witchseeker')

  return [...out].filter(Boolean)
}

async function wikiFetch(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) return null
  return res.json()
}

async function fandomThumbForTitle(wiki, title) {
  const titles = title.replace(/ /g, '_')
  const url =
    `${wiki}/api.php?action=query` +
    `&titles=${encodeURIComponent(titles)}` +
    '&prop=pageimages&piprop=thumbnail&pithumbsize=450&format=json'
  const json = await wikiFetch(url)
  if (!json) return null
  const page = Object.values(json.query?.pages ?? {})[0]
  if (!page || page.missing !== undefined) return null
  const src = page.thumbnail?.source
  if (!src) return null
  return src.replace(/scale-to-width-down\/\d+/, 'scale-to-width-down/450')
}

async function fandomOpensearch(wiki, name) {
  const url =
    `${wiki}/api.php?action=opensearch` +
    `&search=${encodeURIComponent(name)}&limit=8&format=json`
  const json = await wikiFetch(url)
  if (!json) return []
  return json[1] ?? []
}

async function fandomFullsearch(wiki, query) {
  const url =
    `${wiki}/api.php?action=query&list=search` +
    `&srsearch=${encodeURIComponent(query)}&srlimit=8&format=json`
  const json = await wikiFetch(url)
  if (!json) return []
  return (json.query?.search ?? []).map((s) => s.title)
}

async function ddgWikiUrls(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) return []
  const html = await res.text()
  const urls = [...html.matchAll(/uddg=([^&"]+)/g)].map((m) => decodeURIComponent(m[1]))
  return urls.filter((u) => /fandom\.com\/wiki\//i.test(u) || /wikia\.nocookie\.net/i.test(u))
}

function titleFromWikiUrl(url) {
  const m = url.match(/\/wiki\/([^?#]+)/)
  if (!m) return null
  return decodeURIComponent(m[1].replace(/_/g, ' '))
}

async function tryWikiTitle(wiki, title) {
  const thumb = await fandomThumbForTitle(wiki, title)
  await sleep(DELAY_MS)
  if (thumb) return { url: thumb, via: `${wiki.replace('https://', '')} title:${title}` }
  return null
}

async function resolveOverride(slug) {
  const o = OVERRIDES[slug]
  if (!o) return null
  if (o.url) return { url: o.url, via: 'override:url' }
  if (o.wiki && o.title) {
    const thumb = await fandomThumbForTitle(o.wiki, o.title)
    await sleep(DELAY_MS)
    if (thumb) return { url: thumb, via: `override:${o.title}` }
  }
  return null
}

async function resolveImageUrl(unit) {
  const override = await resolveOverride(unit.slug)
  if (override) return override

  const variants = nameVariants(unit.name)

  for (const variant of variants) {
    for (const wiki of WIKIS) {
      const direct = await tryWikiTitle(wiki, variant)
      if (direct) return direct

      const osTitles = await fandomOpensearch(wiki, variant)
      await sleep(DELAY_MS)
      for (const t of osTitles) {
        const hit = await tryWikiTitle(wiki, t)
        if (hit) return hit
      }

      for (const q of [`${variant} 40k`, variant, `${variant} warhammer`]) {
        const fsTitles = await fandomFullsearch(wiki, q)
        await sleep(DELAY_MS)
        for (const t of fsTitles) {
          const hit = await tryWikiTitle(wiki, t)
          if (hit) return hit
        }
      }
    }
  }

  for (const variant of variants.slice(0, 4)) {
    const ddgUrls = await ddgWikiUrls(`${variant} warhammer 40k site:fandom.com`)
    await sleep(DELAY_MS)
    for (const pageUrl of ddgUrls.slice(0, 5)) {
      const title = titleFromWikiUrl(pageUrl)
      if (!title) continue
      const wiki = pageUrl.includes('40k-archive') ? WIKIS[1] : WIKIS[0]
      const hit = await tryWikiTitle(wiki, title)
      if (hit) return { ...hit, via: `ddg:${title}` }
    }
  }

  return null
}

function glyphForName(name) {
  const n = name.toLowerCase()
  if (n.includes('tank') || n.includes('vehicle') || n.includes('dread')) return '▣'
  if (n.includes('prime') || n.includes('lord') || n.includes('captain') || n.includes('character')) return '✦'
  return '◇'
}

function tintForArmy(army) {
  for (const [k, v] of Object.entries(FACTION_TINT)) {
    if (k !== 'default' && army.includes(k)) return v
  }
  return FACTION_TINT[army] ?? FACTION_TINT.default
}

async function generatePlaceholder(unit) {
  const [a, b] = tintForArmy(unit.army)
  const label = cleanName(unit.name)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  const lines = []
  const words = label.split(/\s+/)
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (next.length > 16 && line) {
      lines.push(line)
      line = w
    } else line = next
  }
  if (line) lines.push(line)
  const text = lines
    .slice(0, 3)
    .map(
      (l, i) =>
        `<text x="160" y="${200 + i * 22}" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-family="system-ui,sans-serif" font-size="13" font-weight="600">${l}</text>`,
    )
    .join('')
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="100%" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="160" y="150" text-anchor="middle" fill="rgba(255,255,255,0.2)" font-size="48">${glyphForName(label)}</text>
  ${text}
</svg>`
  return sharp(Buffer.from(svg)).resize(WIDTH, HEIGHT).webp(WEBP).toBuffer()
}

async function optimizeToWebp(buffer) {
  return sharp(buffer)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'top' })
    .webp(WEBP)
    .toBuffer()
}

async function download(url) {
  let lastErr
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'image/*,*/*' },
        redirect: 'follow',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (err) {
      lastErr = err
      await sleep(400 * (attempt + 1))
    }
  }
  throw lastErr
}

function isGeneratedEntry(entry) {
  return entry?.source === 'generated' || entry?.source === 'generated-fallback'
}

async function processUnit(unit, manifest, { allowSkip }) {
  const outPath = join(outDir, `${unit.slug}.webp`)
  const existing = manifest[unit.slug]

  if (allowSkip && !force && existsSync(outPath) && !isGeneratedEntry(existing)) {
    return { slug: unit.slug, status: 'skip' }
  }

  try {
    const hit = await resolveImageUrl(unit)
    let buf
    let source
    if (hit) {
      const raw = await download(hit.url)
      buf = await optimizeToWebp(raw)
      source = hit.via
    } else {
      if (retryGenerated && existsSync(outPath) && isGeneratedEntry(existing)) {
        return { slug: unit.slug, status: 'still-generated' }
      }
      buf = await generatePlaceholder(unit)
      source = 'generated'
    }
    writeFileSync(outPath, buf)
    manifest[unit.slug] = {
      name: unit.name,
      source,
      bytes: buf.length,
      hash: createHash('sha1').update(buf).digest('hex').slice(0, 8),
    }
    return {
      slug: unit.slug,
      status: source === 'generated' ? 'generated' : 'fandom',
      bytes: buf.length,
    }
  } catch (err) {
    const buf = await generatePlaceholder(unit)
    writeFileSync(outPath, buf)
    manifest[unit.slug] = {
      name: unit.name,
      source: 'generated-fallback',
      bytes: buf.length,
      error: String(err),
    }
    return { slug: unit.slug, status: 'fallback', bytes: buf.length }
  }
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}

  let units = loadUnits()
  if (retryGenerated) {
    const slugs = new Set(
      Object.entries(manifest)
        .filter(([, v]) => isGeneratedEntry(v))
        .map(([slug]) => slug),
    )
    units = units.filter((u) => slugs.has(u.slug))
    console.log(`Retrying ${units.length} generated placeholders`)
  }

  units = units.slice(0, limit)

  console.log(`Processing ${units.length} units → ${outDir}`)
  let fandom = 0
  let generated = 0
  let skipped = 0
  let still = 0
  let totalBytes = 0

  for (let i = 0; i < units.length; i++) {
    const unit = units[i]
    const result = await processUnit(unit, manifest, { allowSkip: !retryGenerated })
    if (result.status === 'skip') skipped++
    else if (result.status === 'still-generated') still++
    else if (result.status === 'fandom') {
      fandom++
      totalBytes += result.bytes
    } else {
      generated++
      totalBytes += result.bytes ?? 0
    }
    if ((i + 1) % 10 === 0 || i === units.length - 1) {
      console.log(`  ${i + 1}/${units.length} — found:${fandom} generated:${generated} skip:${skipped} still:${still}`)
    }
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  const done = fandom + generated
  const avgKb = done > 0 ? Math.round(totalBytes / done / 1024) : 0
  console.log(`Done. found=${fandom} generated=${generated} skipped=${skipped} still=${still} avg≈${avgKb}KB`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
