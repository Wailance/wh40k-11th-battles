import type { DominatusAlliance } from '../data/dominatus-companion'

export interface DominatusPlayerTrack {
  id: string
  name: string
  alliance: DominatusAlliance
  battleHonours: number
  battleSkills: number
  agendaAchieved: number
}

export interface DominatusCampaignState {
  phase: 1 | 2 | 3
  locationName: string
  locationNotes: string
  players: DominatusPlayerTrack[]
}

const KEY = 'wh40k11-dominatus-campaign'

export const DEFAULT_CAMPAIGN: DominatusCampaignState = {
  phase: 1,
  locationName: '',
  locationNotes: '',
  players: [],
}

export function loadDominatusCampaign(): DominatusCampaignState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_CAMPAIGN, players: [] }
    const parsed = JSON.parse(raw) as Partial<DominatusCampaignState>
    return {
      phase: (parsed.phase as 1 | 2 | 3) ?? 1,
      locationName: parsed.locationName ?? '',
      locationNotes: parsed.locationNotes ?? '',
      players: Array.isArray(parsed.players) ? parsed.players : [],
    }
  } catch {
    return { ...DEFAULT_CAMPAIGN, players: [] }
  }
}

export function saveDominatusCampaign(state: DominatusCampaignState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function addDominatusPlayer(
  state: DominatusCampaignState,
  name: string,
  alliance: DominatusAlliance,
): DominatusCampaignState {
  return {
    ...state,
    players: [
      ...state.players,
      {
        id: crypto.randomUUID(),
        name: name.trim() || 'Player',
        alliance,
        battleHonours: 0,
        battleSkills: 0,
        agendaAchieved: 0,
      },
    ],
  }
}
