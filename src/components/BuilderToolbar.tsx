import { useEffect, useRef, useState } from 'react'
import { copy } from '../lib/copy'

type BuilderToolbarProps = {
  showWoActions: boolean
  showDelete: boolean
  onExportJson: () => void
  onExportWoJson?: () => void
  onImportWo?: () => void
  onCopyText: () => void
  onDelete: () => void
}

export function BuilderToolbar({
  showWoActions,
  showDelete,
  onExportJson,
  onExportWoJson,
  onImportWo,
  onCopyText,
  onDelete,
}: BuilderToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  return (
    <footer className="bf-toolbar shrink-0">
      <button
        type="button"
        className="bf-toolbar-btn"
        aria-label={copy.armyLists.exportText}
        onClick={onCopyText}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
          />
        </svg>
        <span>{copy.armyLists.exportText}</span>
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className="bf-toolbar-btn"
          aria-label="List file actions"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"
            />
          </svg>
          <span>File</span>
        </button>
        {menuOpen && (
          <div className="bf-toolbar-menu" role="menu">
            <button type="button" role="menuitem" className="bf-toolbar-menu-item" onClick={() => { onExportJson(); setMenuOpen(false) }}>
              {copy.armyLists.exportJson}
            </button>
            {showWoActions && onExportWoJson && (
              <button type="button" role="menuitem" className="bf-toolbar-menu-item" onClick={() => { onExportWoJson(); setMenuOpen(false) }}>
                {copy.armyLists.exportListFile}
              </button>
            )}
            {showWoActions && onImportWo && (
              <button type="button" role="menuitem" className="bf-toolbar-menu-item" onClick={() => { onImportWo(); setMenuOpen(false) }}>
                {copy.armyLists.importListFile}
              </button>
            )}
            {showDelete && (
              <button
                type="button"
                role="menuitem"
                className="bf-toolbar-menu-item bf-toolbar-menu-item-danger"
                onClick={() => { onDelete(); setMenuOpen(false) }}
              >
                Delete list
              </button>
            )}
          </div>
        )}
      </div>
    </footer>
  )
}
