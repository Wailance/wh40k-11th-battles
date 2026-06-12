#!/usr/bin/env python3
"""DEPRECATED — use scripts/extract-rules-from-pdf.py (npm run extract-rules).

Previously merged Warhammer Community article summaries into game-data.json.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src/data/game-data.json'

GW = 'https://www.warhammer-community.com/en-gb/articles'

SOURCES = [
    {'title': 'Core Rules (free PDF)', 'url': f'{GW}/nhqt9wx3/new40k-rules-download-the-free-core-rules-now/'},
    {'title': 'Edition overview (Adepticon)', 'url': f'{GW}/ctdexme4/warhammer-40000-the-new-edition-is-revealed-at-adepticon-preview-2026/'},
    {'title': 'Your queries answered', 'url': f'{GW}/v0fhjy3m/new40k-your-queries-answered/'},
    {'title': 'Chapter Approved deck', 'url': f'{GW}/p3i6aa3h/the-chapter-approved-deck-what-is-it-and-how-does-it-work/'},
    {'title': 'Army affects mission', 'url': f'{GW}/oefzq9fg/new40k-how-your-army-affects-your-mission/'},
    {'title': 'Building an army', 'url': f'{GW}/95fucn12/building-an-army-in-the-new-edition-of-warhammer-40000/'},
    {'title': 'Terrain rules', 'url': f'{GW}/xlppkx5s/new40k-take-cover-with-updated-terrain-rules/'},
    {'title': 'Combat changes', 'url': f'{GW}/m3son4il/new40k-combat-changes-shake-up-fighting-in-the-new-edition/'},
    {'title': "World Champion's top 5", 'url': f'{GW}/8dl5ikuv/new40k-world-champions-top-5-changes/'},
    {'title': 'Tournament Companion PDF', 'url': 'https://assets.warhammer-community.com/eng_4-xglmycxyvf.pdf'},
]

def entry(category, title, body, link=''):
    return {'category': category, 'title': title, 'body': body.strip(), 'link': link}


def build_rules():
    return {
        'core': [
            entry('Edition', '11th Edition overview',
                  'Codexes remain valid at launch. Detachments are modular: combine up to 3 Detachment Points (DP) of specialised detachments, or one broad detachment. Over 70 new and updated detachments at launch. Missions and objectives are driven by Force Disposition pairings — armies are rewarded for playing to their strategic role.',
                  f'{GW}/ctdexme4/warhammer-40000-the-new-edition-is-revealed-at-adepticon-preview-2026/'),
            entry('Edition', 'Unified experience',
                  'Every game should feel narratively compelling and competitively balanced — matched, narrative, and open play share the same mission framework rather than separate modes.',
                  f'{GW}/v0fhjy3m/new40k-your-queries-answered/'),
            entry('Edition', 'Free Core Rules PDF',
                  'Download the official Core Rules from Warhammer Community. Physical copy included in Warhammer 40,000: Armageddon.',
                  f'{GW}/nhqt9wx3/new40k-rules-download-the-free-core-rules-now/'),
            entry('Characters', 'Leaders keep their abilities',
                  'Characters no longer lose their best abilities when their Bodyguard unit is destroyed. Heroes fight at full strength until they fall.',
                  f'{GW}/v0fhjy3m/new40k-your-queries-answered/'),
            entry('Stratagems', 'No stratagem stacking per phase',
                  'A single unit cannot have multiple Stratagems applied to it in the same phase. Powerful units must win fights without stacking defensive or offensive Stratagems.',
                  f'{GW}/v0fhjy3m/new40k-your-queries-answered/'),
            entry('Objectives', 'Terrain footprints replace markers',
                  'Round objective markers are gone. Control is measured on terrain footprints — bunkers, ruins, relics, and fortifications that make battlefields more immersive.',
                  f'{GW}/ctdexme4/warhammer-40000-the-new-edition-is-revealed-at-adepticon-preview-2026/'),
            entry('Scoring', 'Battle Ready (+10 VP)',
                  'Armies painted to Battle Ready standard score +10 VP at the end of the game (Chapter Approved Tournament Companion).',
                  'https://assets.warhammer-community.com/eng_4-xglmycxyvf.pdf'),
            entry('Tactical play', 'Reduced turn-one alpha strikes',
                  'Hidden infantry, cover as -1 BS, and dense deployment-zone terrain push decisive fights toward the mid-board (Richard Siegler, World Champion).',
                  f'{GW}/8dl5ikuv/new40k-world-champions-top-5-changes/'),
            entry('Stratagems', 'RAPID INGRESS — 1 CP',
                  'WHEN: End of opponent\'s Movement phase. TARGET: 1 friendly unit in Strategic Reserves (not AIRCRAFT). EFFECT: Unit makes an arrival movement. RESTRICTIONS: Not in battle round 1.',
                  f'{GW}/nhqt9wx3/new40k-rules-download-the-free-core-rules-now/'),
            entry('Stratagems', 'SMOKE SCREEN — 1 CP',
                  'WHEN: Start of opponent\'s Shooting phase. TARGET: 1 friendly SMOKE unit. EFFECT: Until end of phase, attacks targeting your SMOKE unit (or units obscured by it) gain Benefit of Cover.',
                  ''),
            entry('Stratagems', 'FIRE OVERWATCH — 1 CP',
                  'WHEN: End of opponent\'s Movement phase. TARGET: 1 friendly unengaged unit (not TITANIC). EFFECT: Unit shoots using the Overwatch type.',
                  ''),
            entry('Stratagems', 'OVERWATCH',
                  'Target one visible enemy within 24". Each attack hits only on unmodified 6. Cannot re-roll hits. Unit cannot perform an action after shooting.',
                  ''),
            entry('Stratagems', 'HEROIC INTERVENTION — 1 CP',
                  'WHEN: End of opponent\'s Charge phase. TARGET: 1 friendly unengaged unit within 12" of enemy units. EFFECT: Resolve a charge (Leap to Defend or Into the Frey modes).',
                  ''),
            entry('Stratagems', 'COUNTER-OFFENSIVE — 2 CP',
                  'WHEN: Fight step of opponent\'s Fight phase, after an enemy unit fights. TARGET: 1 friendly unit eligible to fight. EFFECT: Unit gains Fights First and must fight next.',
                  ''),
        ],
        'command': [
            entry('Command phase', 'Secondary mission draw',
                  'Each Command phase, draw 2 Tactical secondary cards. Keep unscored cards in hand — no hand limit. Max 15 VP from secondaries per battle round, 40 VP per game (Tournament Companion).',
                  f'{GW}/p3i6aa3h/the-chapter-approved-deck-what-is-it-and-how-does-it-work/'),
            entry('Command phase', 'Optional scoring',
                  'You may hold secondary cards until fully achievable — you are not forced to score partial value. Combined with draw every turn, early bad draws no longer doom your game.',
                  f'{GW}/p3i6aa3h/the-chapter-approved-deck-what-is-it-and-how-does-it-work/'),
            entry('Command phase', 'Primary scoring caps',
                  'Primary missions: max 45 VP per game, 15 VP per battle round. Same per-round cap applies to secondary scoring.',
                  f'{GW}/oefzq9fg/new40k-how-your-army-affects-your-mission/'),
            entry('CP', 'Command Re-roll',
                  'Spend 1 CP to re-roll a single die when making a test or roll for a unit from your army (Core Rules).',
                  f'{GW}/nhqt9wx3/new40k-rules-download-the-free-core-rules-now/'),
        ],
        'movement': [
            entry('Movement', 'Pivot removed',
                  'Units no longer pivot in place — use Normal moves to reorient.',
                  ''),
            entry('Movement', 'Mobile keyword',
                  'MOBILE units move horizontally through DENSE terrain. Agile units (e.g. Squighog Boyz) and some towering walkers gain MOBILE; super-heavy walkers may take Battleshock risk.',
                  f'{GW}/xlppkx5s/new40k-take-cover-with-updated-terrain-rules/'),
            entry('Movement', 'Through Engagement Range',
                  'In the Movement phase you CAN move through an enemy model\'s Engagement Range (2") without being in combat — you still cannot end a move within Engagement Range without charging.',
                  f'{GW}/m3son4il/new40k-combat-changes-shake-up-fighting-in-the-new-edition/'),
            entry('Movement', 'Ingress moves (Deep Strike / Reserves)',
                  'Ingress arrivals (Deep Strike, Strategic Reserve, etc.) can be placed more than 8" from enemies (was 9"). You still need 9" on the charge roll from reserves, but landing zones are larger and more flexible.',
                  f'{GW}/m3son4il/new40k-combat-changes-shake-up-fighting-in-the-new-edition/'),
            entry('Movement', 'Transports into combat',
                  'In some circumstances units can disembark from transports directly into combat — a major buff for assault armies.',
                  f'{GW}/v0fhjy3m/new40k-your-queries-answered/'),
        ],
        'shooting': [
            entry('Terrain', 'Terrain features vs areas',
                  'Terrain features (ruins, barricades, trees) sit on terrain areas — the footprint defines rules effects on the battlefield.',
                  f'{GW}/xlppkx5s/new40k-take-cover-with-updated-terrain-rules/'),
            entry('Terrain', 'Hidden',
                  'INFANTRY, BEASTS, and SWARMS in a terrain area can be Hidden if the unit did not shoot this turn or last turn (hidden at game start). Hidden models are only visible to enemies within Detection Range (usually 15").',
                  f'{GW}/xlppkx5s/new40k-take-cover-with-updated-terrain-rules/'),
            entry('Terrain', 'Obscuring & Cover',
                  'Most terrain is Obscuring — cannot be seen entirely through. INFANTRY/BEAST/SWARM in terrain gain Benefit of Cover: -1 to hit (Ballistic Skill), not +1 to armour saves.',
                  f'{GW}/xlppkx5s/new40k-take-cover-with-updated-terrain-rules/'),
            entry('Terrain', 'Plunging Fire',
                  'Units above enemies may use Plunging Fire for +1 BS (cancels cover). TOWERING models can Plunging Fire at ground units within 12".',
                  f'{GW}/xlppkx5s/new40k-take-cover-with-updated-terrain-rules/'),
            entry('Terrain', 'Upper levels & height',
                  'Hidden rule makes upper floors viable for shooters. Height matters for line of sight into/out of terrain, not just 2D footprints.',
                  f'{GW}/xlppkx5s/new40k-take-cover-with-updated-terrain-rules/'),
        ],
        'charge': [
            entry('Charge', 'Engagement Range 2"',
                  'Engagement Range is 2" (was 1"). Within 2" = engaged. Cannot end any move within Engagement Range without charging.',
                  f'{GW}/m3son4il/new40k-combat-changes-shake-up-fighting-in-the-new-edition/'),
            entry('Charge', 'Declare after rolling',
                  'Pick charge targets AFTER the charge roll. Any unit with an enemy within 12" may declare. Fewer failed charges left stranded in the open.',
                  f'{GW}/m3son4il/new40k-combat-changes-shake-up-fighting-in-the-new-edition/'),
            entry('Charge', 'Generous charge moves',
                  'Target must be within rolled distance (base to base). Move within 1" if possible; otherwise within Engagement Range (2") is enough — easier charges around corners and into terrain.',
                  f'{GW}/m3son4il/new40k-combat-changes-shake-up-fighting-in-the-new-edition/'),
            entry('Charge', 'Fight any engaged enemy',
                  'Units fight any enemy within Engagement Range (2") — no "1 inch from the wall" positioning to deny charges.',
                  f'{GW}/m3son4il/new40k-combat-changes-shake-up-fighting-in-the-new-edition/'),
        ],
        'fight': [
            entry('Fight phase', 'Batch Pile In',
                  'All Pile In moves (3") resolve before any attacks. Active player resolves all Pile Ins first, then opponent. Can Pile In into engagement with non-charge targets.',
                  f'{GW}/m3son4il/new40k-combat-changes-shake-up-fighting-in-the-new-edition/'),
            entry('Fight phase', 'Active player picks first',
                  'The player whose turn it is selects the first unit to fight — even vs enemy Fights First. Your charging unit can strike before enemy Fights First units.',
                  f'{GW}/m3son4il/new40k-combat-changes-shake-up-fighting-in-the-new-edition/'),
            entry('Fight phase', 'Remaining combats',
                  'After all Fights First units fight, the player who would normally pick next chooses first from remaining eligible units, regardless of whose turn it is.',
                  f'{GW}/m3son4il/new40k-combat-changes-shake-up-fighting-in-the-new-edition/'),
            entry('Fight phase', 'Overrun fight',
                  'If eligible to fight but no longer engaged (targets died), unit gets a second Pile In before selecting new targets.',
                  f'{GW}/m3son4il/new40k-combat-changes-shake-up-fighting-in-the-new-edition/'),
            entry('Fight phase', 'Batch Consolidate',
                  'All Consolidate moves happen together after attacks, like Pile In. Consolidate 3" into combat, onto a new enemy within 3", or toward an objective. Newly engaged enemies still fight if they have not yet done so.',
                  f'{GW}/m3son4il/new40k-combat-changes-shake-up-fighting-in-the-new-edition/'),
            entry('Fight phase', 'Cleave',
                  '[CLEAVE X] grants +X Attacks for every 5 models in the target unit (melee Blast). Example: [CLEAVE 1] vs 10 models = +2 Attacks.',
                  f'{GW}/m3son4il/new40k-combat-changes-shake-up-fighting-in-the-new-edition/'),
            entry('Fight phase', 'Fast wound allocation',
                  'Streamlined system for assigning wounds speeds up combat resolution (Core Rules).',
                  f'{GW}/ctdexme4/warhammer-40000-the-new-edition-is-revealed-at-adepticon-preview-2026/'),
        ],
        'missions': [
            entry('Force Dispositions', 'Five strategic orders',
                  'Take and Hold, Purge the Foe, Disruption, Reconnaissance, Priority Assets. Each detachment grants one or more; you choose one per battle (locked for events).',
                  f'{GW}/p3i6aa3h/the-chapter-approved-deck-what-is-it-and-how-does-it-work/'),
            entry('Force Dispositions', '15 asymmetric matchups',
                  'Compare your FD to your opponent\'s to determine each player\'s Primary Mission from the Chapter Approved deck. Different primaries unless both pick the same FD.',
                  f'{GW}/oefzq9fg/new40k-how-your-army-affects-your-mission/'),
            entry('Army building', 'Detachment Points (3 DP)',
                  'Combine detachments up to 3 DP total for bespoke themed armies, or take one broad detachment. Soup across codexes is not returning.',
                  f'{GW}/95fucn12/building-an-army-in-the-new-edition-of-warhammer-40000/'),
            entry('Secondaries', 'Fixed vs Tactical',
                  'Fixed: choose 2 of 4 options (20 VP cap per card). Tactical: draw 2 each Command phase, 40 VP game cap, 15 VP per round.',
                  f'{GW}/p3i6aa3h/the-chapter-approved-deck-what-is-it-and-how-does-it-work/'),
            entry('Secondaries', 'Hold cards & score later',
                  'Draw every Command phase; keep unscored cards. Score up to 15 VP/round from secondaries. No forced partial scoring.',
                  f'{GW}/8dl5ikuv/new40k-world-champions-top-5-changes/'),
            entry('Deployment', 'Strike Force deployments',
                  'Classic layouts return: Dawn of War, Hammer and Anvil, Tipping Point, Search and Destroy, Crucible of Battle, Sweeping Engagement. Each FD matchup suggests terrain layouts.',
                  f'{GW}/oefzq9fg/new40k-how-your-army-affects-your-mission/'),
            entry('Event play', 'Tournament Companion',
                  'Organised play: one FD per list, 3 terrain layouts per matchup, Battle Ready +10 VP, recommended terrain layouts 1–8 by deployment.',
                  'https://assets.warhammer-community.com/eng_4-xglmycxyvf.pdf'),
            entry('Optional', 'Twists',
                  'Optional cards modify core rules or swap primaries (e.g. Mirrored World for symmetrical primaries, Hidden army-wide, etc.).',
                  f'{GW}/oefzq9fg/new40k-how-your-army-affects-your-mission/'),
        ],
    }


def main():
    data = json.loads(OUT.read_text(encoding='utf-8'))
    data['rules'] = build_rules()
    data['rulesSources'] = SOURCES
    data['version'] = '0.5'
    data['rulesNote'] = 'Summaries from official Warhammer Community #New40k articles and Chapter Approved Tournament Companion. Always check GW PDFs for authoritative wording.'
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    counts = {k: len(v) for k, v in data['rules'].items()}
    print('Updated rules:', counts)


if __name__ == '__main__':
    main()
