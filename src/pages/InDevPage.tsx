import { Link } from 'react-router-dom'
import { copy } from '../lib/copy'

const ITEMS = [
  {
    to: '/lists',
    title: copy.armyLists.title,
    desc: copy.armyLists.subtitle,
    glyph: 'AB',
  },
  {
    to: '/teams',
    title: copy.formats.teams.title,
    desc: copy.formats.teams.subtitle,
    glyph: 'TM',
  },
  {
    to: '/formats/dominatus',
    title: copy.formats.dominatus.title,
    desc: copy.formats.dominatus.subtitle,
    glyph: 'DM',
  },
  {
    to: '/formats/doubles',
    title: copy.formats.doubles.title,
    desc: copy.formats.doubles.subtitle,
    glyph: '2V',
  },
] as const

export function InDevPage() {
  return (
    <div className="space-y-4 pb-2">
      <div>
        <h1 className="app-page-title">{copy.inDev.title}</h1>
        <p className="mt-2 text-body leading-relaxed text-muted">{copy.inDev.body}</p>
      </div>

      <ul className="motion-stagger space-y-2">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="app-panel flex min-h-[4rem] items-center gap-3 p-4 transition-colors active:bg-panel-hover"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 font-display text-caption tracking-wider text-muted">
                {item.glyph}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-body tracking-wide text-bone">{item.title}</p>
                <p className="mt-0.5 text-caption leading-snug text-muted">{item.desc}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <Link to="/" className="app-btn-ghost flex w-full py-3 text-body">
        {copy.inDev.backHome}
      </Link>
    </div>
  )
}
