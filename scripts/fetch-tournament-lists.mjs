#!/usr/bin/env node
/**
 * Pull recent competitive 40k lists from listhammer.info (BCP tournament data).
 * Bundled for GitHub Pages — their API blocks browser CORS from other origins.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public/data/tournament-meta')
const outFile = join(outDir, 'recent-lists.json')

const BASE = 'https://listhammer.info'
const PAGES = Number(process.env.TOURNAMENT_LIST_PAGES ?? 4)
const PAGE_SIZE = 25
const FETCH_LIST_TEXT = process.env.TOURNAMENT_LIST_TEXT !== '0'
const LIST_CONCURRENCY = 6

async function fetchJson(path, params = {}) {
  const url = new URL(path, BASE)
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(k, String(item))
    } else {
      url.searchParams.set(k, String(v))
    }
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.json()
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length)
  let index = 0
  async function worker() {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return results
}

async function main() {
  const lists = []
  let totalCount = 0

  for (let page = 0; page < PAGES; page++) {
    const data = await fetchJson('/api/recentLists', { page, gameType: '40k' })
    totalCount = data.totalCount ?? totalCount
    const batch = data.result ?? []
    if (!batch.length) break
    lists.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }

  if (FETCH_LIST_TEXT && lists.length) {
    await mapPool(lists, LIST_CONCURRENCY, async (entry) => {
      try {
        const data = await fetchJson('/api/eventList', {
          eventId: entry.eventId,
          playerId: entry.playerId,
        })
        if (data.list) entry.listText = data.list
      } catch (err) {
        console.warn(`list text ${entry.listId}:`, err.message)
      }
      return entry
    })
  }

  const snapshot = {
    fetchedAt: new Date().toISOString(),
    source: BASE,
    gameType: '40k',
    totalCount,
    lists,
  }

  mkdirSync(outDir, { recursive: true })
  writeFileSync(outFile, JSON.stringify(snapshot, null, 2) + '\n')
  console.log(`✓ Tournament meta: ${lists.length} lists (of ${totalCount}) → ${outFile}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
