/** Yandex Metrika — VITE_YM_COUNTER_ID in .env.production */

const COUNTER_ID = Number(import.meta.env.VITE_YM_COUNTER_ID)
const ENABLED = Number.isFinite(COUNTER_ID) && COUNTER_ID > 0
const TAG_SRC = ENABLED ? `https://mc.yandex.ru/metrika/tag.js?id=${COUNTER_ID}` : ''

type YmQueue = ((...args: unknown[]) => void) & { a?: unknown[]; l?: number }

declare global {
  interface Window {
    ym?: YmQueue
  }
}

let initialized = false

function callYm(method: string, ...args: unknown[]) {
  if (!ENABLED) return
  window.ym?.(COUNTER_ID, method, ...args)
}

export function initAnalytics() {
  if (!ENABLED || initialized || typeof document === 'undefined') return
  initialized = true

  const w = window as Window & { ym?: YmQueue }
  w.ym =
    w.ym ||
    function (...args: unknown[]) {
      ;(w.ym!.a = w.ym!.a || []).push(args)
    }
  w.ym.l = Date.now()

  if (![...document.scripts].some((s) => s.src.includes('mc.yandex.ru/metrika/tag.js'))) {
    const script = document.createElement('script')
    script.async = true
    script.src = TAG_SRC
    document.head.appendChild(script)
  }

  callYm('init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
    trackHash: false,
    referrer: document.referrer,
    url: location.href,
  })
}

export function trackPageView(path?: string) {
  if (!ENABLED) return
  const url = path ?? `${window.location.pathname}${window.location.search}${window.location.hash}`
  callYm('hit', url, { title: document.title })
}

/** Metrika goals — create matching goals in the Metrika dashboard. */
export type AnalyticsGoal =
  | 'start_game'
  | 'end_game'
  | 'save_history'
  | 'new_game_wizard'

export function trackGoal(goal: AnalyticsGoal, params?: Record<string, string>) {
  if (!ENABLED) return
  callYm('reachGoal', goal, params)
}

export function isAnalyticsEnabled() {
  return ENABLED
}

export function metrikaCounterId() {
  return ENABLED ? COUNTER_ID : null
}
