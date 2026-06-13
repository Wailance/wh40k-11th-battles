import { getArmyDataDisclaimer } from '../lib/faction-loader'

export function ArmyDataBanner() {
  return (
    <div className="rounded-xl border border-warning/25 bg-warning/10 px-3 py-2.5 text-[11px] leading-relaxed text-warning">
      {getArmyDataDisclaimer()}
    </div>
  )
}
