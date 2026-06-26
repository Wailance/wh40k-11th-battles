import builderMeta from '../../public/data/warorgan/builder-meta.json'

type BuilderMetaFile = {
  version?: string
  armies: Record<string, { units: number; detachments: number }>
}

const meta = builderMeta as BuilderMetaFile

export function woBuilderDetachmentCount(army: string): number | undefined {
  return meta.armies[army]?.detachments
}

export function woBuilderUnitCount(army: string): number | undefined {
  return meta.armies[army]?.units
}
