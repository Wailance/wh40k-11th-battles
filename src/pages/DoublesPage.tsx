import { Link } from 'react-router-dom'
import {
  DOUBLES_COMPANION_PDF,
  DOUBLES_MISSION_SEQUENCE,
  DOUBLES_TERMINOLOGY,
} from '../data/doubles-companion'
import { copy } from '../lib/copy'
import {
  FormatPdfLink,
  FormatSectionTabs,
  FormatSequenceList,
  FormatStartBattleLink,
  useFormatSection,
} from '../components/FormatCompanionShell'

export function DoublesPage() {
  const [section, setSection] = useFormatSection('sequence')

  const sections = [
    { id: 'sequence' as const, label: 'Sequence' },
    { id: 'terminology' as const, label: 'Terms' },
  ]

  return (
    <div className="space-y-4 pb-2">
      <div>
        <h1 className="app-page-title">{copy.formats.doubles.title}</h1>
        <p className="mt-1 text-sm text-muted">{copy.formats.doubles.subtitle}</p>
        <FormatPdfLink href={DOUBLES_COMPANION_PDF} label={copy.formats.pdfLink} />
      </div>

      <FormatStartBattleLink to="/new/doubles" label={copy.formats.startDoublesBattle} />

      <FormatSectionTabs sections={sections} section={section} onSection={setSection} />

      {section === 'sequence' && <FormatSequenceList steps={DOUBLES_MISSION_SEQUENCE} />}

      {section === 'terminology' && (
        <div className="space-y-2">
          {DOUBLES_TERMINOLOGY.map((t) => (
            <article key={t.title} className="app-panel p-4">
              <h2 className="text-sm font-semibold text-accent">{t.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted">{t.body}</p>
            </article>
          ))}
        </div>
      )}

      <Link to="/" className="app-btn-ghost flex w-full py-3 text-sm">
        {copy.formats.backHome}
      </Link>
    </div>
  )
}
