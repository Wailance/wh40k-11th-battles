import { Link } from 'react-router-dom'
import { ReferenceHubCard } from '../components/ReferenceHubCard'
import { copy } from '../lib/copy'
import { hubSections } from '../lib/reference-hub'

export function ReferencePage() {
  const ref = copy.reference
  const sections = hubSections()

  return (
    <div className="motion-stagger space-y-4 pb-4">
      <div>
        <h1 className="app-page-title">{ref.hubTitle}</h1>
        <p className="mt-1 text-body text-muted">{ref.hubSubtitle}</p>
        <div className="app-divider mt-4" />
      </div>

      <section className="ref-hub-list">
        {sections.map((item, i) => (
          <ReferenceHubCard
            key={item.to}
            to={item.to}
            index={i + 1}
            title={item.title}
            description={item.description}
            browseLabel={ref.browse}
          />
        ))}
      </section>

      <p className="text-center text-micro text-muted">
        <Link to="/new" className="text-accent hover:underline">
          {copy.home.cta}
        </Link>
        {' · '}
        {ref.hubTrackerHint}
      </p>
    </div>
  )
}
