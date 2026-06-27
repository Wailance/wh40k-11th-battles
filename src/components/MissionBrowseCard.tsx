import { MissionNameButton } from './MissionNameButton'
import { getMissionDetail } from '../lib/mission-details'

export function MissionBrowseCard({ name }: { name: string }) {
  const detail = getMissionDetail(name)

  return (
    <li className="ref-mission-card app-panel p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <MissionNameButton name={name} className="text-body font-semibold" showIcon />
        {detail?.cap && (
          <span className="ref-mission-cap shrink-0 rounded border border-faint px-2 py-0.5 text-micro text-muted">
            {detail.cap}
          </span>
        )}
      </div>
      {detail?.summary && (
        <p className="mt-2 text-caption leading-relaxed text-muted">{detail.summary}</p>
      )}
      {detail?.whenDrawn && (
        <p className="mt-2 text-micro text-accent-dim">
          <span className="font-semibold uppercase tracking-wide">When drawn:</span> {detail.whenDrawn}
        </p>
      )}
    </li>
  )
}
