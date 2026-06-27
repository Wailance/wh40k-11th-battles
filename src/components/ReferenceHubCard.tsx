import { Link } from 'react-router-dom'

export function ReferenceHubCard({
  to,
  index,
  title,
  description,
  browseLabel = 'Browse',
}: {
  to: string
  index: number
  title: string
  description: string
  browseLabel?: string
}) {
  const num = String(index).padStart(2, '0')
  return (
    <Link to={to} className="ref-hub-card motion-card">
      <span className="ref-hub-card-index" aria-hidden>
        {num}
      </span>
      <span className="ref-hub-card-body">
        <span className="ref-hub-card-title">{title}</span>
        <span className="ref-hub-card-desc">{description}</span>
      </span>
      <span className="ref-hub-card-action">{browseLabel}</span>
    </Link>
  )
}
