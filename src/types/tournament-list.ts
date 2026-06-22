export type TournamentMetaList = {
  eventId: string
  playerId: string
  playerName: string
  faction: string
  eventName: string
  wins: number
  draws: number
  losses: number
  listId: string
  numberOfPlayers: number
  detachment: string
  numberOfRounds: number
  startDate: string
  eventLink: string
  listText?: string
}

export type TournamentMetaSnapshot = {
  fetchedAt: string
  source: string
  gameType: '40k'
  totalCount: number
  lists: TournamentMetaList[]
}
