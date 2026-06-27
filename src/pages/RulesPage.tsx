import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { copy } from '../lib/copy'
import { RULE_CATEGORIES, ruleCount, searchRules } from '../lib/rules-index'

type RuleGroup = 'all' | 'core' | 'phases' | 'terrain' | 'missions'

const RULE_GROUPS: { id: RuleGroup; label: string; categories?: string[] }[] = [
  { id: 'all', label: 'All rules' },
  { id: 'core', label: 'Core Rules', categories: ['core'] },
  {
    id: 'phases',
    label: 'Game phases',
    categories: ['command', 'movement', 'shooting', 'charge', 'fight'],
  },
  { id: 'terrain', label: 'Terrain', categories: ['terrain'] },
  { id: 'missions', label: 'Missions & scoring', categories: ['missions'] },
]

function cleanBody(body: string): string {
  return body.replace(/\u2026/g, '…').replace(/\s+\n/g, '\n').trim()
}

function categoriesForGroup(group: RuleGroup): string[] | undefined {
  const g = RULE_GROUPS.find((x) => x.id === group)
  return g?.categories
}

export function RulesPage() {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<RuleGroup>('all')
  const [category, setCategory] = useState<string>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const visibleCategories = useMemo(() => {
    const cats = categoriesForGroup(group)
    if (!cats) return RULE_CATEGORIES
    return RULE_CATEGORIES.filter((c) => cats.includes(c.id))
  }, [group])

  const results = useMemo(() => {
    const cats = categoriesForGroup(group)
    if (category !== 'all') {
      return searchRules(query, category)
    }
    if (!cats) return searchRules(query)
    const q = query.trim().toLowerCase()
    const pool = cats.flatMap((id) => searchRules('', id))
    if (!q) return pool
    return pool.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q),
    )
  }, [query, group, category])

  return (
    <div className="motion-stagger space-y-4 pb-4">
      <div>
        <p className="text-micro font-semibold uppercase tracking-widest text-accent-dim">
          {copy.reference.sectionRules}
        </p>
        <h1 className="app-page-title">{copy.reference.rulesTitle}</h1>
        <p className="mt-1 text-body text-muted">{copy.reference.rulesSubtitle}</p>
        <p className="mt-1 text-caption text-muted">{copy.reference.rulesCardDesc(ruleCount())}</p>
        <Link to="/reference" className="mt-2 inline-block text-caption font-medium text-accent hover:underline">
          {copy.reference.hubTitle} · {copy.reference.browseAll}
        </Link>
        <div className="app-divider mt-4" />
      </div>

      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setExpanded(null)
        }}
        placeholder={copy.reference.rulesSearch}
        className="app-input w-full px-4 py-3 text-body"
      />

      <div className="app-scroll-hint flex gap-2 overflow-x-auto pb-1">
        {RULE_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            data-active={group === g.id}
            className="app-filter-pill shrink-0"
            onClick={() => {
              setGroup(g.id)
              setCategory('all')
              setExpanded(null)
            }}
          >
            {g.label}
          </button>
        ))}
      </div>

      {visibleCategories.length > 1 && (
        <div className="app-scroll-hint flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            data-active={category === 'all'}
            className="app-filter-pill shrink-0"
            onClick={() => setCategory('all')}
          >
            {copy.common.all}
          </button>
          {visibleCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              data-active={category === c.id}
              className="app-filter-pill shrink-0"
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {results.length === 0 ? (
        <p className="py-8 text-center text-caption text-muted">{copy.common.noResults}</p>
      ) : (
        <ul className="space-y-2">
          {results.map((rule) => {
            const key = `${rule.category}::${rule.title}`
            const open = expanded === key
            return (
              <li key={key} className="ref-rule-card app-panel overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 p-3 text-left"
                  aria-expanded={open}
                  onClick={() => setExpanded(open ? null : key)}
                >
                  <span className="min-w-0">
                    <span className="text-micro font-medium uppercase tracking-wide text-accent-dim">
                      {rule.category}
                    </span>
                    <span className="mt-0.5 block font-medium text-bone">{rule.title}</span>
                  </span>
                  <span className="shrink-0 text-muted">{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div className="border-t border-faint px-3 pb-3 pt-2">
                    <p className="whitespace-pre-wrap text-caption leading-relaxed text-muted">
                      {cleanBody(rule.body)}
                    </p>
                    {rule.link && (
                      <a
                        href={rule.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-micro text-accent hover:underline"
                      >
                        GW PDF →
                      </a>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-center text-micro text-muted">
        <Link to="/reference" className="text-accent hover:underline">
          {copy.reference.hubTitle}
        </Link>
        {' · '}
        {copy.reference.rulesDisclaimer}
      </p>
    </div>
  )
}
