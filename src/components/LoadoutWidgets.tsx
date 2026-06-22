import type { ReactNode } from 'react'
import type { WeaponProfile } from '../types/faction-data'
import { copy } from '../lib/copy'
import { displayWeaponName } from '../lib/datasheet-abilities'

export function WeaponStatsTable({
  title,
  weapons,
}: {
  title: string
  weapons: WeaponProfile[]
}) {
  if (weapons.length === 0) return null

  const isMelee = weapons[0]?.range === 'Melee'

  return (
    <div className="bf-weapon-table-wrap">
      <p className="bf-weapon-table-title">{title}</p>
      <div className="bf-weapon-table-scroll">
        <table className="bf-weapon-table">
          <thead>
            <tr>
              <th>Weapon</th>
              <th>{isMelee ? 'RNG' : 'RANGE'}</th>
              <th>A</th>
              <th>{isMelee ? 'WS' : 'BS'}</th>
              <th>S</th>
              <th>AP</th>
              <th>D</th>
            </tr>
          </thead>
          <tbody>
            {weapons.map((w) => (
              <tr key={w.name}>
                <td className="bf-weapon-table-name">
                  <span>{displayWeaponName(w.name)}</span>
                  {w.keywords.length > 0 && (
                    <span className="bf-weapon-table-kw">{w.keywords.join(', ')}</span>
                  )}
                </td>
                <td>{w.range}</td>
                <td>{w.A}</td>
                <td>{w.WS ?? w.BS ?? '—'}</td>
                <td>{w.S}</td>
                <td>{w.AP}</td>
                <td>{w.D}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function WeaponStatsSection({
  rangedWeapons,
  meleeWeapons,
}: {
  rangedWeapons: WeaponProfile[]
  meleeWeapons: WeaponProfile[]
}) {
  return (
    <>
      {rangedWeapons.length > 0 && (
        <WeaponStatsTable title={copy.armyLists.ranged} weapons={rangedWeapons} />
      )}
      {meleeWeapons.length > 0 && (
        <WeaponStatsTable title={copy.armyLists.melee} weapons={meleeWeapons} />
      )}
    </>
  )
}

export function WeaponBlock({
  title,
  weapons,
}: {
  title: string
  weapons: WeaponProfile[]
}) {
  return <WeaponStatsTable title={title} weapons={weapons} />
}

export function LoadoutSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="bf-loadout-section">
      <p className="bf-loadout-section-title">{title}</p>
      {children}
    </section>
  )
}
