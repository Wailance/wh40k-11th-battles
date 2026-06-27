import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { copy } from '../lib/copy'
import { RULE_CATEGORIES, ruleCount, searchRules } from '../lib/rules-index'

function cleanBody(body: string): string {
  return body.replace(/\u2026/g, '…').replace(/\s+\n/g, '\n').trim()
}

export function RulesPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const results = useMemo(
    () => searchRules(query, category === 'all' ? undefined : category),
    [query, category],
  )

  return (
    <div className="motion-stagger space-y-4 pb-4">
      <div>
        <h1 className="app-page-title">{copy.reference.rulesTitle}</h1>
        <p className="mt-1 text-body text-muted">
          {ruleCount()} rules · Core Rules + Tournament Companion excerpts
        </p>
        <div className="app-divider mt-4" />
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={copy.reference.rulesSearch}
        className="app-input w-full px-4 py-3 text-body"
      />

      <div className="app-scroll-hint flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          data-active={category === 'all'}
          className="app-filter-pill shrink-0"
          onClick={() => setCategory('all')}
        >
          {copy.common.all}
        </button>
        {RULE_CATEGORIES.map((c) => (
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

      {results.length === 0 ? (
        <p className="py-8 text-center text-caption text-muted">{copy.common.noResults}</p>
      ) : (
        <ul className="space-y-2">
          {results.map((rule) => {
            const key = `${rule.category}::${rule.title}`
            const open = expanded === key
            return (
              <li key={key} className="app-panel overflow-hidden">
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
        <Link to="/mission-sequence" className="text-accent hover:underline">
          {copy.missionSequence.title}
        </Link>
        {' · '}
        {copy.reference.rulesDisclaimer}
      </p>
    </div>
  )
}
