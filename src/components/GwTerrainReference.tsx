import { GW_TERRAIN_LAYOUTS } from '../lib/battlefield'
import { copy } from '../lib/copy'
import { GW_PDF_LABELS, GW_TOURNAMENT_COMPANION_PDF } from '../lib/gw-links'
import { gameData } from '../lib/game-utils'

export function GwTerrainReference() {
  return (
    <div className="space-y-4">
      <section className="app-panel p-4 text-sm leading-relaxed text-muted">
        <h2 className="font-semibold text-bone">{copy.battlefield.gwTerrainTitle}</h2>
        <p className="mt-2">{gameData.terrain.note}</p>
        <p className="mt-2">{copy.battlefield.gwTerrainBody}</p>
        <ul className="mt-3 space-y-1">
          {gameData.terrain.footprints.map((f) => (
            <li key={f}>· {f}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs">
          {copy.battlefield.gwTerrainKit}: 4× 6&quot;×4&quot;, 2× 10&quot;×5&quot;, 6× 12&quot;×6&quot; area
          terrain outlines (GW Tournament Companion).
        </p>
        {GW_TOURNAMENT_COMPANION_PDF && (
          <a
            href={GW_TOURNAMENT_COMPANION_PDF}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-xs text-accent"
          >
            {GW_PDF_LABELS.tournament} (PDF) →
          </a>
        )}
      </section>

      <section className="app-panel p-4">
        <h3 className="font-semibold">{copy.battlefield.gwLayoutsTitle}</h3>
        <p className="mt-1 text-xs text-muted">{copy.battlefield.gwLayoutsHint}</p>
        <div className="mt-3 space-y-2">
          {GW_TERRAIN_LAYOUTS.map((layout) => (
            <div
              key={layout.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-2 text-sm last:border-0"
            >
              <span className="font-medium text-bone">{layout.name}</span>
              <span className="text-xs text-muted">{layout.deployments.join(' · ')}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
