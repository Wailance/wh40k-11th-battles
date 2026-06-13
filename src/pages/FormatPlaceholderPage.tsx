import { Link } from 'react-router-dom'
import { copy } from '../lib/copy'
import { GW_EVENT_COMPANION_PDF } from '../lib/gw-links'

const FORMAT_COPY = {
  dominatus: copy.formats.dominatus,
  doubles: copy.formats.doubles,
} as const

export function FormatPlaceholderPage({ format }: { format: keyof typeof FORMAT_COPY }) {
  const info = FORMAT_COPY[format]

  return (
    <div className="space-y-4 pb-2">
      <div>
        <h1 className="app-page-title">{info.title}</h1>
        <p className="mt-1 text-sm text-muted">{info.subtitle}</p>
      </div>

      <section className="app-panel space-y-3 p-4">
        <span className="app-btn-badge">{copy.formats.comingSoon}</span>
        <p className="text-sm leading-relaxed text-bone">{info.body}</p>
        <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted">
          {info.planned.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <a
          href={GW_EVENT_COMPANION_PDF}
          target="_blank"
          rel="noreferrer"
          className="app-btn-ghost inline-flex py-2 text-xs"
        >
          {copy.formats.pdfLink} ↗
        </a>
      </section>

      <Link to="/" className="app-btn-ghost flex w-full py-3 text-sm">
        {copy.formats.backHome}
      </Link>
    </div>
  )
}
