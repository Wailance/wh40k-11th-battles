import { useEffect, useMemo, useState } from 'react'
import type { CuratedUnit } from '../types/faction-data'
import type { RosterUnit } from '../types/roster'
import type { UnitLoadoutDef, UnitLoadoutGroup, UnitLoadoutOption } from '../types/loadout'
import { copy } from '../lib/copy'
import {
  adjustLoadoutSelection,
  adjustBucketGroupSelection,
  defaultLoadoutSelections,
  fixedGroupEquippedLabels,
  optionIsActive,
  parseRosterLoadout,
  selectSingleLoadoutOption,
  squadBreakdownLines,
  summarizeLoadout,
} from '../lib/loadout-engine'
import { displayGroupLabel } from '../lib/loadout-labels'
import { gwVariantLabel, replacementRowLabel } from '../lib/loadout-display'
import {
  bucketGroupCount,
  bucketGroupLabel,
  isSquadCompositionGroup,
  isVariantBucketGroup,
  squadNestedGroups,
  squadPrimaryOption,
  squadVariantOptions,
} from '../lib/loadout-squad'
import { modelCountChoices } from '../lib/list-engine'
import { AppSheet } from './AppSheet'
import { LoadoutSection } from './LoadoutWidgets'
import { UnitDatasheet } from './UnitDatasheet'

type LoadoutEditorProps = {
  group: UnitLoadoutGroup
  depth: number
  loadout: UnitLoadoutDef
  selections: Record<string, number>
  onSelectSingle: (group: UnitLoadoutGroup, optionId: string) => void
  onAdjust: (optionId: string, delta: number) => void
  onAdjustBucket: (group: UnitLoadoutGroup, delta: number) => void
  selectionIndex?: number
}

function CountStepper({
  count,
  label,
  loadout,
  selections,
  optionId,
  onAdjust,
  compact = false,
  expanded,
  onToggleExpand,
  expandable = false,
}: {
  count: number
  label: string
  loadout: UnitLoadoutDef
  selections: Record<string, number>
  optionId: string
  onAdjust: (optionId: string, delta: number) => void
  compact?: boolean
  expanded?: boolean
  onToggleExpand?: () => void
  expandable?: boolean
}) {
  return (
    <div className={`bf-loadout-squad-row${compact ? ' is-compact' : ''}${expandable ? ' has-chevron' : ''}`}>
      <button
        type="button"
        className="bf-loadout-squad-step"
        aria-label={copy.armyLists.decreaseLoadout}
        disabled={adjustLoadoutSelection(loadout, selections, optionId, -1) === null}
        onClick={() => onAdjust(optionId, -1)}
      >
        −
      </button>
      <span className="bf-loadout-squad-count">{count}</span>
      <span className="bf-loadout-squad-label">{label}</span>
      {expandable ? (
        <button
          type="button"
          className={`bf-loadout-chevron${expanded ? ' is-open' : ''}`}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          onClick={onToggleExpand}
        />
      ) : (
        <span className="bf-loadout-chevron-spacer" />
      )}
      <button
        type="button"
        className="bf-loadout-squad-step"
        aria-label={copy.armyLists.increaseLoadout}
        disabled={adjustLoadoutSelection(loadout, selections, optionId, 1) === null}
        onClick={() => onAdjust(optionId, 1)}
      >
        +
      </button>
    </div>
  )
}

function BucketStepper({
  group,
  count,
  label,
  loadout,
  selections,
  onAdjustBucket,
  expanded,
  onToggleExpand,
  expandable,
}: {
  group: UnitLoadoutGroup
  count: number
  label: string
  loadout: UnitLoadoutDef
  selections: Record<string, number>
  onAdjustBucket: (group: UnitLoadoutGroup, delta: number) => void
  expanded?: boolean
  onToggleExpand?: () => void
  expandable?: boolean
}) {
  return (
    <div className={`bf-loadout-squad-row${expandable ? ' has-chevron' : ''}`}>
      <button
        type="button"
        className="bf-loadout-squad-step"
        aria-label={copy.armyLists.decreaseLoadout}
        disabled={adjustBucketGroupSelection(loadout, selections, group, -1) === null}
        onClick={() => onAdjustBucket(group, -1)}
      >
        −
      </button>
      <span className="bf-loadout-squad-count">{count}</span>
      <span className="bf-loadout-squad-label">{label}</span>
      {expandable ? (
        <button
          type="button"
          className={`bf-loadout-chevron${expanded ? ' is-open' : ''}`}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          onClick={onToggleExpand}
        />
      ) : (
        <span className="bf-loadout-chevron-spacer" />
      )}
      <button
        type="button"
        className="bf-loadout-squad-step"
        aria-label={copy.armyLists.increaseLoadout}
        disabled={adjustBucketGroupSelection(loadout, selections, group, 1) === null}
        onClick={() => onAdjustBucket(group, 1)}
      >
        +
      </button>
    </div>
  )
}

function OptionNestedPanel({
  option,
  loadout,
  selections,
  onSelectSingle,
  onAdjust,
  onAdjustBucket,
  selectionIndexStart = 1,
}: {
  option: UnitLoadoutOption
  loadout: UnitLoadoutDef
  selections: Record<string, number>
  onSelectSingle: (group: UnitLoadoutGroup, optionId: string) => void
  onAdjust: (optionId: string, delta: number) => void
  onAdjustBucket: (group: UnitLoadoutGroup, delta: number) => void
  selectionIndexStart?: number
}) {
  if (!option.groups?.length) return null

  let selectionIndex = selectionIndexStart

  return (
    <div className="bf-loadout-variant-panel">
      {option.groups.map((sub) => {
        if (sub.mode === 'count' && sub.options.length === 1) {
          const nested = sub.options[0]
          const nestedCount = selections[nested.id] ?? 0
          return (
            <div key={sub.id} className="bf-loadout-replace-block">
              {sub.hint && <p className="bf-loadout-rule-hint">{sub.hint}</p>}
              <div className="bf-loadout-replace-row">
                <button
                  type="button"
                  className="bf-loadout-squad-step"
                  aria-label={copy.armyLists.decreaseLoadout}
                  disabled={adjustLoadoutSelection(loadout, selections, nested.id, -1) === null}
                  onClick={() => onAdjust(nested.id, -1)}
                >
                  −
                </button>
                <span className="bf-loadout-squad-count">{nestedCount}</span>
                <span className="bf-loadout-squad-label">{replacementRowLabel(nested, nestedCount)}</span>
                <span className="bf-loadout-chevron-spacer" />
                <button
                  type="button"
                  className="bf-loadout-squad-step"
                  aria-label={copy.armyLists.increaseLoadout}
                  disabled={adjustLoadoutSelection(loadout, selections, nested.id, 1) === null}
                  onClick={() => onAdjust(nested.id, 1)}
                >
                  +
                </button>
              </div>
            </div>
          )
        }

        const idx = sub.mode === 'single' ? selectionIndex++ : undefined
        return (
          <LoadoutGroupEditor
            key={sub.id}
            group={sub}
            depth={2}
            loadout={loadout}
            selections={selections}
            onSelectSingle={onSelectSingle}
            onAdjust={onAdjust}
            onAdjustBucket={onAdjustBucket}
            selectionIndex={idx}
          />
        )
      })}
    </div>
  )
}

function VariantCountRow({
  option,
  loadout,
  selections,
  onSelectSingle,
  onAdjust,
  onAdjustBucket,
}: {
  option: UnitLoadoutOption
  loadout: UnitLoadoutDef
  selections: Record<string, number>
  onSelectSingle: (group: UnitLoadoutGroup, optionId: string) => void
  onAdjust: (optionId: string, delta: number) => void
  onAdjustBucket: (group: UnitLoadoutGroup, delta: number) => void
}) {
  const count = selections[option.id] ?? 0
  const hasNested = Boolean(option.groups?.length)
  const hasBody = Boolean(option.equippedWith || hasNested)
  const [expanded, setExpanded] = useState(count > 0)
  const label = gwVariantLabel(option, count)
  const showPanel = expanded && (count > 0 || hasNested)

  useEffect(() => {
    if (count > 0) setExpanded(true)
  }, [count])

  return (
    <div className={`bf-loadout-variant${showPanel ? ' is-expanded' : ''}`}>
      <CountStepper
        count={count}
        label={label}
        loadout={loadout}
        selections={selections}
        optionId={option.id}
        onAdjust={onAdjust}
        expandable={hasBody}
        expanded={expanded}
        onToggleExpand={() => setExpanded((v) => !v)}
      />
      {showPanel && (
        <div className="bf-loadout-variant-body">
          {option.equippedWith && (
            <p className="bf-loadout-equipped-line">{copy.armyLists.equippedWith([option.equippedWith])}</p>
          )}
          {option.hint && <p className="bf-loadout-rule-hint">{option.hint}</p>}
          {hasNested && (
            <OptionNestedPanel
              option={option}
              loadout={loadout}
              selections={selections}
              onSelectSingle={onSelectSingle}
              onAdjust={onAdjust}
              onAdjustBucket={onAdjustBucket}
            />
          )}
        </div>
      )}
    </div>
  )
}

function VariantBucketRow({
  group,
  loadout,
  selections,
  onSelectSingle,
  onAdjust,
  onAdjustBucket,
}: {
  group: UnitLoadoutGroup
  loadout: UnitLoadoutDef
  selections: Record<string, number>
  onSelectSingle: (group: UnitLoadoutGroup, optionId: string) => void
  onAdjust: (optionId: string, delta: number) => void
  onAdjustBucket: (group: UnitLoadoutGroup, delta: number) => void
}) {
  const count = bucketGroupCount(group, selections)
  const label = bucketGroupLabel(group, count)
  const hasNested = group.options.some((o) => o.groups?.length) || group.options.length > 1
  const equipped =
    group.options.find((o) => (selections[o.id] ?? 0) > 0 && o.equippedWith)?.equippedWith ??
    group.options.find((o) => o.equippedWith)?.equippedWith
  const [expanded, setExpanded] = useState(count > 0)

  useEffect(() => {
    if (count > 0) setExpanded(true)
  }, [count])

  const showPanel = expanded && (count > 0 || hasNested)

  return (
    <div className={`bf-loadout-variant${showPanel ? ' is-expanded' : ''}`}>
      <BucketStepper
        group={group}
        count={count}
        label={label}
        loadout={loadout}
        selections={selections}
        onAdjustBucket={onAdjustBucket}
        expandable={Boolean(equipped || hasNested)}
        expanded={expanded}
        onToggleExpand={() => setExpanded((v) => !v)}
      />
      {showPanel && (
        <div className="bf-loadout-variant-body">
          {equipped && (
            <p className="bf-loadout-equipped-line">{copy.armyLists.equippedWith([equipped])}</p>
          )}
          {group.options.length > 1 && (
            <div className="bf-loadout-bucket-breakdown">
              {group.options.map((option) => {
                const optionCount = selections[option.id] ?? 0
                if (optionCount <= 0 && group.options.length > 2) return null
                return (
                  <VariantCountRow
                    key={option.id}
                    option={option}
                    loadout={loadout}
                    selections={selections}
                    onSelectSingle={onSelectSingle}
                    onAdjust={onAdjust}
                    onAdjustBucket={onAdjustBucket}
                  />
                )
              })}
            </div>
          )}
          {group.options.map((option) => {
            if (!optionIsActive(option, selections) || !option.groups?.length) return null
            return (
              <OptionNestedPanel
                key={option.id}
                option={option}
                loadout={loadout}
                selections={selections}
                onSelectSingle={onSelectSingle}
                onAdjust={onAdjust}
                onAdjustBucket={onAdjustBucket}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function SinglePickGroup({
  group,
  depth,
  loadout,
  selections,
  onSelectSingle,
  onAdjust,
  onAdjustBucket,
  selectionIndex,
}: LoadoutEditorProps) {
  return (
    <div className={depth > 0 ? 'bf-loadout-pick is-nested' : 'bf-loadout-pick'}>
      <p className="bf-loadout-pick-label">{displayGroupLabel(group, selectionIndex)}</p>
      <div className="bf-loadout-pill-row">
        {group.options.map((option) => {
          const active = optionIsActive(option, selections)
          return (
            <button
              key={option.id}
              type="button"
              className={`bf-loadout-pill${active ? ' is-active' : ''}`}
              onClick={() => onSelectSingle(group, option.id)}
            >
              {option.name}
            </button>
          )
        })}
      </div>
      {group.options.map((option) => {
        if (!optionIsActive(option, selections) || !option.groups?.length) return null
        return (
          <OptionNestedPanel
            key={option.id}
            option={option}
            loadout={loadout}
            selections={selections}
            onSelectSingle={onSelectSingle}
            onAdjust={onAdjust}
            onAdjustBucket={onAdjustBucket}
          />
        )
      })}
      {group.groups?.map((sub) => (
        <LoadoutGroupEditor
          key={sub.id}
          group={sub}
          depth={depth + 1}
          loadout={loadout}
          selections={selections}
          onSelectSingle={onSelectSingle}
          onAdjust={onAdjust}
          onAdjustBucket={onAdjustBucket}
        />
      ))}
    </div>
  )
}

function SquadCountGroup({
  group,
  depth,
  loadout,
  selections,
  onSelectSingle,
  onAdjust,
  onAdjustBucket,
}: LoadoutEditorProps) {
  const primary = squadPrimaryOption(group)
  const variants = squadVariantOptions(group)
  const bucketGroups = squadNestedGroups(group)
  const breakdown = squadBreakdownLines(group, selections)

  return (
    <div className={depth > 0 ? 'bf-loadout-squad-card is-nested' : 'bf-loadout-squad-card'}>
      {primary && (
        <VariantCountRow
          option={primary}
          loadout={loadout}
          selections={selections}
          onSelectSingle={onSelectSingle}
          onAdjust={onAdjust}
          onAdjustBucket={onAdjustBucket}
        />
      )}

      {variants.map((option) => (
        <VariantCountRow
          key={option.id}
          option={option}
          loadout={loadout}
          selections={selections}
          onSelectSingle={onSelectSingle}
          onAdjust={onAdjust}
          onAdjustBucket={onAdjustBucket}
        />
      ))}

      {bucketGroups.map((sub) => (
        <VariantBucketRow
          key={sub.id}
          group={sub}
          loadout={loadout}
          selections={selections}
          onSelectSingle={onSelectSingle}
          onAdjust={onAdjust}
          onAdjustBucket={onAdjustBucket}
        />
      ))}

      {breakdown.length > 0 && (
        <div className="bf-loadout-squad-summary">
          {breakdown.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function FixedRoleGroup({
  group,
  depth,
  loadout,
  selections,
  onSelectSingle,
  onAdjust,
  onAdjustBucket,
  selectionIndex = 1,
}: LoadoutEditorProps) {
  const equipped = fixedGroupEquippedLabels(group, selections)
  let pickIndex = selectionIndex

  return (
    <div className={depth > 0 ? 'bf-loadout-role-card is-nested' : 'bf-loadout-role-card'}>
      <p className="bf-loadout-role-title">
        {group.name}
        {equipped.length > 0 && (
          <span className="bf-loadout-equipped-tail"> {copy.armyLists.equippedWith(equipped)}</span>
        )}
      </p>
      {group.groups?.map((sub) => {
        const idx = sub.mode === 'single' ? pickIndex++ : undefined
        return (
          <LoadoutGroupEditor
            key={sub.id}
            group={sub}
            depth={depth + 1}
            loadout={loadout}
            selections={selections}
            onSelectSingle={onSelectSingle}
            onAdjust={onAdjust}
            onAdjustBucket={onAdjustBucket}
            selectionIndex={idx}
          />
        )
      })}
    </div>
  )
}

function LoadoutGroupEditor({
  group,
  depth,
  loadout,
  selections,
  onSelectSingle,
  onAdjust,
  onAdjustBucket,
  selectionIndex,
}: LoadoutEditorProps) {
  const isContainer = group.options.length === 0 && (group.groups?.length ?? 0) > 0

  if (isContainer) {
    return (
      <div className={depth > 0 ? 'bf-loadout-block is-nested' : 'bf-loadout-block'}>
        {group.name && <p className="bf-loadout-block-title">{group.name}</p>}
        {group.groups!.map((sub) => (
          <LoadoutGroupEditor
            key={sub.id}
            group={sub}
            depth={depth}
            loadout={loadout}
            selections={selections}
            onSelectSingle={onSelectSingle}
            onAdjust={onAdjust}
            onAdjustBucket={onAdjustBucket}
          />
        ))}
      </div>
    )
  }

  if (group.mode === 'fixed') {
    return (
      <FixedRoleGroup
        group={group}
        depth={depth}
        loadout={loadout}
        selections={selections}
        onSelectSingle={onSelectSingle}
        onAdjust={onAdjust}
        onAdjustBucket={onAdjustBucket}
        selectionIndex={selectionIndex}
      />
    )
  }

  if (group.mode === 'single') {
    return (
      <SinglePickGroup
        group={group}
        depth={depth}
        loadout={loadout}
        selections={selections}
        onSelectSingle={onSelectSingle}
        onAdjust={onAdjust}
        onAdjustBucket={onAdjustBucket}
        selectionIndex={selectionIndex}
      />
    )
  }

  if (group.mode === 'count' && isSquadCompositionGroup(group)) {
    return (
      <SquadCountGroup
        group={group}
        depth={depth}
        loadout={loadout}
        selections={selections}
        onSelectSingle={onSelectSingle}
        onAdjust={onAdjust}
        onAdjustBucket={onAdjustBucket}
      />
    )
  }

  if (group.mode === 'count' && isVariantBucketGroup(group)) {
    return (
      <VariantBucketRow
        group={group}
        loadout={loadout}
        selections={selections}
        onSelectSingle={onSelectSingle}
        onAdjust={onAdjust}
        onAdjustBucket={onAdjustBucket}
      />
    )
  }

  return (
    <div className={depth > 0 ? 'bf-loadout-block is-nested' : 'bf-loadout-block'}>
      {group.name && <p className="bf-loadout-block-title">{group.name}</p>}
      {group.hint && <p className="bf-loadout-rule-hint">{group.hint}</p>}
      {group.options.map((option) => (
        <VariantCountRow
          key={option.id}
          option={option}
          loadout={loadout}
          selections={selections}
          onSelectSingle={onSelectSingle}
          onAdjust={onAdjust}
          onAdjustBucket={onAdjustBucket}
        />
      ))}
      {group.groups?.map((sub) => (
        <LoadoutGroupEditor
          key={sub.id}
          group={sub}
          depth={depth + 1}
          loadout={loadout}
          selections={selections}
          onSelectSingle={onSelectSingle}
          onAdjust={onAdjust}
          onAdjustBucket={onAdjustBucket}
        />
      ))}
    </div>
  )
}

export function RosterUnitEditSheet({
  line,
  unit,
  loadout,
  open,
  onClose,
  onSave,
  enhancementNames,
}: {
  line: RosterUnit | null
  unit: CuratedUnit | null
  loadout: UnitLoadoutDef | null
  open: boolean
  onClose: () => void
  onSave: (patch: { models?: number; options?: Record<string, unknown> }) => void
  enhancementNames?: readonly string[]
}) {
  const modelChoices = useMemo(() => (unit ? modelCountChoices(unit) : []), [unit])
  const [models, setModels] = useState<number | undefined>()
  const [selections, setSelections] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!open || !line || !unit) return
    setModels(line.models ?? modelChoices[0] ?? undefined)
    const existing = parseRosterLoadout(line.options)
    if (loadout && Object.keys(existing).length === 0) {
      setSelections(defaultLoadoutSelections(loadout))
    } else {
      setSelections(existing)
    }
  }, [open, line, unit, loadout, modelChoices])

  if (!open || !line || !unit) return null

  const activeLine = line
  const activeUnit = unit
  const hasLoadout = Boolean(loadout?.groups.length)

  function handleAdjust(optionId: string, delta: number) {
    if (!loadout) return
    const next = adjustLoadoutSelection(loadout, selections, optionId, delta)
    if (next) setSelections(next)
  }

  function handleAdjustBucket(group: UnitLoadoutGroup, delta: number) {
    if (!loadout) return
    const next = adjustBucketGroupSelection(loadout, selections, group, delta)
    if (next) setSelections(next)
  }

  function handleSelectSingle(group: UnitLoadoutGroup, optionId: string) {
    if (!loadout) return
    const next = selectSingleLoadoutOption(loadout, selections, group, optionId)
    if (next) setSelections(next)
  }

  function handleSave() {
    const summary = loadout ? summarizeLoadout(loadout, selections) : ''
    const options: Record<string, unknown> = {
      ...(activeLine.options ?? {}),
      loadout: selections,
      loadoutSummary: summary,
    }
    onSave({
      models: models ?? activeLine.models,
      options,
    })
    onClose()
  }

  return (
    <AppSheet open={open} onClose={onClose}>
      <div className="app-sheet-scroll px-4 pb-8 pt-1">
        <UnitDatasheet
          unit={activeUnit}
          showAdd={false}
          pointsLabel={`${activeLine.points} pts`}
          enhancementNames={enhancementNames}
          headerAction={
            <button type="button" className="app-btn shrink-0 px-4 py-2 text-caption" onClick={handleSave}>
              {copy.common.done}
            </button>
          }
        >
          {modelChoices.length > 0 && (
            <LoadoutSection title={copy.armyLists.modelCount}>
              <div className="bf-loadout-pill-row">
                {modelChoices.map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`bf-loadout-pill${models === count ? ' is-active' : ''}`}
                    onClick={() => setModels(count)}
                  >
                    {count} {copy.armyLists.models}
                  </button>
                ))}
              </div>
            </LoadoutSection>
          )}

          {hasLoadout && loadout && (
            <LoadoutSection title={copy.armyLists.loadoutHeading}>
              {loadout.groups.map((group) => (
                <LoadoutGroupEditor
                  key={group.id}
                  group={group}
                  depth={0}
                  loadout={loadout}
                  selections={selections}
                  onSelectSingle={handleSelectSingle}
                  onAdjust={handleAdjust}
                  onAdjustBucket={handleAdjustBucket}
                />
              ))}
            </LoadoutSection>
          )}
        </UnitDatasheet>
      </div>
    </AppSheet>
  )
}
