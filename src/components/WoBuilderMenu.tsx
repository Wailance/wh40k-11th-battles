import { useEffect, useRef, useState } from 'react'
import { copy } from '../lib/copy'

type WoBuilderMenuProps = {
  showLegends: boolean
  hasLegendsUnits: boolean
  onToggleLegends: () => void
  onOpenDetachments: () => void
  onOpenStratagems?: () => void
  onExportJson: () => void
  onExportWoJson?: () => void
  onImportWo?: () => void
  onCopyText: () => void
  onDelete?: () => void
}

export function WoBuilderMenu({
  showLegends,
  hasLegendsUnits,
  onToggleLegends,
  onOpenDetachments,
  onOpenStratagems,
  onExportJson,
  onExportWoJson,
  onImportWo,
  onCopyText,
  onDelete,
}: WoBuilderMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function item(action: () => void, label: string, danger = false) {
    return (
      <button
        type="button"
        role="menuitem"
        className={danger ? 'wo-builder-menu-item is-danger' : 'wo-builder-menu-item'}
        onClick={() => {
          action()
          setOpen(false)
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="wo-builder-menu-anchor relative" ref={ref}>
      <button
        type="button"
        className="wo-builder-menu-trigger"
        aria-label="Builder menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 4 16" className="h-4 w-1" aria-hidden>
          <circle cx="2" cy="2" r="1.35" fill="currentColor" />
          <circle cx="2" cy="8" r="1.35" fill="currentColor" />
          <circle cx="2" cy="14" r="1.35" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="wo-builder-menu" role="menu">
          {item(onOpenDetachments, copy.armyLists.tabDetachments)}
            {onOpenStratagems && item(onOpenStratagems, copy.armyLists.stratagems)}
            {hasLegendsUnits && item(onToggleLegends, showLegends ? copy.armyLists.hideLegends : copy.armyLists.showLegends)}
          {item(onCopyText, copy.armyLists.exportText)}
          {item(onExportJson, copy.armyLists.exportJson)}
          {onExportWoJson && item(onExportWoJson, copy.armyLists.exportListFile)}
          {onImportWo && item(onImportWo, copy.armyLists.importListFile)}
          {onDelete && item(onDelete, 'Delete list', true)}
        </div>
      )}
    </div>
  )
}
