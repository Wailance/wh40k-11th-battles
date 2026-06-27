import { Link } from 'react-router-dom'
import { copy } from '../lib/copy'
import { ruleCount } from '../lib/rules-index'

const LINKS = [
  { to: '/matrix', titleKey: 'matrixTitle' as const, descKey: 'matrixCardDesc' as const, glyph: 'MX' },
  { to: '/missions', titleKey: 'missionsTitle' as const, descKey: 'missionsCardDesc' as const, glyph: 'MC' },
  { to: '/rules', titleKey: 'rulesTitle' as const, descKey: 'rulesCardDesc' as const, glyph: 'RU' },
  { to: '/detachments', titleKey: 'detachmentsTitle' as const, descKey: 'detachmentsCardDesc' as const, glyph: 'DP' },
  { to: '/mission-sequence', titleKey: 'sequenceTitle' as const, descKey: 'sequenceCardDesc' as const, glyph: 'MS' },
]

export function ReferencePage() {
  const ref = copy.reference
  return (
    <div className="motion-stagger space-y-4 pb-4">
      <div>
        <h1 className="app-page-title">{ref.hubTitle}</h1>
        <p className="mt-1 text-body text-muted">{ref.hubSubtitle}</p>
        <div className="app-divider mt-4" />
      </div>

      <section className="grid grid-cols-1 gap-3">
        {LINKS.map((item) => (
          <Link key={item.to} to={item.to} className="app-panel motion-card flex min-h-[4.5rem] items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-crimson/25 bg-crimson-soft font-display text-body tracking-wider text-crimson-bright">
              {item.glyph}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-body tracking-wide text-accent">{ref[item.titleKey]}</p>
              <p className="mt-0.5 line-clamp-2 text-caption leading-snug text-muted">
                {item.descKey === 'rulesCardDesc'
                  ? ref.rulesCardDesc(ruleCount())
                  : ref[item.descKey]}
              </p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  )
}
