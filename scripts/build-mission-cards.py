#!/usr/bin/env python3
"""Build src/data/mission-cards.json with official-style mission card text."""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'src/data/mission-cards.json'

CMD = (
    'End of the Command phase (or the end of your turn if it is the fifth '
    'battle round and you are going second).'
)
CAP_PRIMARY = 'Max 45 VP per game · 15 VP per battle round'
CAP_SECONDARY = 'Max 45 VP (Tactical) or 20 VP per card (Fixed) · 15 VP per battle round'


def primary(summary, blocks, actions=None):
    return {
        'type': 'primary',
        'summary': summary,
        'blocks': blocks,
        'actions': actions or [],
        'cap': CAP_PRIMARY,
    }


def secondary(summary, blocks, when_drawn=None):
    d = {
        'type': 'secondary',
        'summary': summary,
        'blocks': blocks,
        'cap': CAP_SECONDARY,
    }
    if when_drawn:
        d['whenDrawn'] = when_drawn
    return d


def hold_non_home(reward='4 VP', extra=None):
    blocks = [
        {
            'label': 'SECOND BATTLE ROUND ONWARDS',
            'text': f'WHEN: {CMD} REQUIREMENT: You control one or more objective markers that are not within your deployment zone. REWARD: {reward}.',
        }
    ]
    if extra:
        blocks.extend(extra)
    return blocks


CARDS = {}

# --- PURGE THE FOE primaries ---
CARDS['Meatgrinder'] = primary(
    'Purge the Foe mirror match — kill units and dominate objectives.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: One or more enemy units were destroyed this turn. REWARD: 3 VP.'},
        *hold_non_home(),
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: More enemy units than friendly units were destroyed since the end of your opponent\'s last turn. REWARD: 4 VP.'},
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You control one or more objective markers in your opponent\'s deployment zone. REWARD: 5 VP.'},
    ],
)

CARDS['Unstoppable Force'] = primary(
    'Purge vs Take and Hold — kill every turn and seize ground.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: One or more enemy units were destroyed this turn. REWARD: 3 VP.'},
        *hold_non_home(),
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You control one or more objective markers that you did not control at the start of your turn. REWARD: 3 VP.'},
        {'label': 'END OF BATTLE', 'text': 'WHEN: End of the battle. REQUIREMENT: You control one or more Centre objective markers. REWARD: 5 VP.'},
    ],
)

CARDS['Punishment'] = primary(
    'Purge vs Disruption — condemn enemy units and hold objectives.',
    [
        {'label': 'SETUP', 'text': 'At the start of each of your turns, select 1–3 Condemned enemy units: units that destroyed a friendly unit on the previous turn and/or are within range of an objective marker you do not control.'},
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: One or more Condemned units left the battlefield this turn (destroyed or otherwise removed). REWARD: 5 VP.'},
        *hold_non_home('4 VP', [
            {'label': 'SECOND BATTLE ROUND ONWARDS', 'text': f'WHEN: {CMD} REQUIREMENT: You control more objective markers than your opponent. REWARD: 5 VP.'},
            {'label': 'END OF BATTLE', 'text': 'WHEN: End of the battle. REQUIREMENT: You control your opponent\'s home objective marker. REWARD: 8 VP.'},
        ]),
    ],
)

CARDS['Destroyer\'s Wrath'] = primary(
    'Purge vs Priority Assets — kill units and out-hold the enemy.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: One or more enemy units were destroyed this turn. REWARD: 3 VP.'},
        *hold_non_home('4 VP', [
            {'label': 'SECOND BATTLE ROUND ONWARDS', 'text': f'WHEN: {CMD} REQUIREMENT: You control more objective markers than your opponent. REWARD: 4 VP.'},
            {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: More enemy units than friendly units were destroyed since the end of your opponent\'s last turn. REWARD: 5 VP.'},
        ]),
    ],
)

CARDS['Consecrate'] = primary(
    'Purge vs Reconnaissance — kill to consecrate objectives.',
    [
        {'label': 'MECHANIC', 'text': 'Each time a unit from your army destroys an enemy unit, it becomes a Consecration unit. At the end of your turn, each Consecration unit within range of an objective marker (not your home, not already Consecrated) may Consecrate it and cease being a Consecration unit.'},
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: 1–2 objectives are Consecrated by you. REWARD: 3 VP. OR 3+ Consecrated: 6 VP.'},
        *hold_non_home('4 VP', [
            {'label': 'SECOND BATTLE ROUND ONWARDS', 'text': f'WHEN: {CMD} REQUIREMENT: You control more objective markers than your opponent. REWARD: 4 VP.'},
            {'label': 'END OF BATTLE', 'text': 'WHEN: End of the battle. REQUIREMENT: Your opponent\'s home objective is Consecrated. REWARD: 5 VP.'},
        ]),
    ],
)

# --- TAKE AND HOLD ---
CARDS['Immovable Object'] = primary(
    'Take and Hold vs Purge — centre control and expansion holding.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You control one or more Centre objective markers. REWARD: 3 VP.'},
        {'label': 'BATTLE ROUNDS 2–4', 'text': f'WHEN: {CMD} REQUIREMENT: For each objective marker you control outside your deployment zone. REWARD: 5 VP each.'},
        {'label': 'BATTLE ROUND 5', 'text': 'WHEN: End of your turn (if you are going second). REQUIREMENT: For each objective marker you control outside your deployment zone. REWARD: 5 VP each.'},
    ],
)

CARDS['Battlefield Dominance'] = primary(
    'Take and Hold mirror — dominate the objective count.',
    [
        {'label': 'BATTLE ROUNDS 1–2', 'text': 'WHEN: End of your turn. REQUIREMENT: You control more objective markers than your opponent. REWARD: 2 VP per marker you control.'},
        {'label': 'SECOND BATTLE ROUND ONWARDS', 'text': f'WHEN: {CMD} REQUIREMENT: You control your home objective. REWARD: 3 VP per objective you control, +2 VP per non-home objective.'},
    ],
)

CARDS['Determined Acquisition'] = primary(
    'Take and Hold vs Disruption — cap uncontested objectives.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You control an objective you did not control at the start of your turn (not your home). REWARD: 2 VP per such objective.'},
        {'label': 'SECOND BATTLE ROUND ONWARDS', 'text': f'WHEN: {CMD} REQUIREMENT: Per objective you control in opponent territory. REWARD: 3 VP base + 3 VP bonus for objectives in opponent deployment zone.'},
    ],
)

CARDS['Inescapable Dominion'] = primary(
    'Take and Hold vs Priority Assets — wide board control.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You control 3+ objective markers. REWARD: 4 VP.'},
        {'label': 'SECOND BATTLE ROUND ONWARDS', 'text': f'WHEN: {CMD} REQUIREMENT: You control 2+ objectives. REWARD: 5 VP. If you control more than your opponent: +4 VP.'},
        {'label': 'END OF BATTLE', 'text': 'WHEN: End of the battle. REQUIREMENT: You control opponent\'s home objective. REWARD: 5 VP.'},
    ],
)

CARDS['Purge and Secure'] = primary(
    'Take and Hold vs Reconnaissance — kill on objectives and hold.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You destroyed an enemy unit while within range of an objective, OR destroyed an enemy unit on an objective. REWARD: 3 VP.'},
        {'label': 'SECOND BATTLE ROUND ONWARDS', 'text': f'WHEN: {CMD} REQUIREMENT: Per non-home objective you control. REWARD: 4 VP each.'},
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You control more objectives than at the start of your turn. REWARD: 3 VP.'},
    ],
)

# --- DISRUPTION ---
CARDS['Delaying Action'] = primary(
    'Disruption vs Purge — attrition and central/expansion control.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: Per enemy unit destroyed this turn. REWARD: 2 VP each.'},
        *hold_non_home('4 VP'),
        {'label': 'SECOND BATTLE ROUND ONWARDS', 'text': 'WHEN: End of your turn. REQUIREMENT: You control a Centre objective and an Expansion objective. REWARD: 3 VP.'},
    ],
)

CARDS['Death Trap'] = primary(
    'Disruption vs Take and Hold — booby-trap terrain and objectives.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: Per terrain area trapped this turn. REWARD: 2 VP (+3 VP if that area is also an objective).'},
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: One or more enemy units that started the turn in a trapped area were destroyed. REWARD: 3 VP.'},
        *hold_non_home('4 VP'),
    ],
    actions=['BOOBY TRAP (ACTION): Starts in your Shooting phase. One unit within range of a non-home objective or eligible terrain area in No Man\'s Land. Completes immediately. Place a trap marker.'],
)

CARDS['Outmaneuver'] = primary(
    'Disruption mirror — seize the enemy deployment zone.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You control your opponent\'s home objective. REWARD: 10 VP.'},
        {'label': 'BATTLE ROUND 1', 'text': 'WHEN: End of your turn. REQUIREMENT: Per non-home objective you control. REWARD: 4 VP each.'},
        {'label': 'BATTLE ROUNDS 2–3', 'text': f'WHEN: {CMD} REQUIREMENT: Per non-home objective you control. REWARD: 5 VP each.'},
        {'label': 'BATTLE ROUND 4+', 'text': 'WHEN: End of your turn. REQUIREMENT: Per non-home objective you control. REWARD: 6 VP each.'},
    ],
)

CARDS['Locate and Deny'] = primary(
    'Disruption vs Priority Assets — sensor sweeps and relic control.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: One or more enemy units that started the turn within range of an objective were destroyed. REWARD: 4 VP.'},
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: Only one Operation marker remains and you control it uncontested. REWARD: 4 VP.'},
        *hold_non_home('4 VP'),
        {'label': 'END OF BATTLE', 'text': 'WHEN: End of the battle. REQUIREMENT: You control the sole remaining marker with no enemies in range. REWARD: 5 VP.'},
    ],
    actions=['SENSOR SWEEP (ACTION): One unit within range of a Centre objective. Completes end of turn if you control it. Remove an enemy Operation marker (if more than one remains).'],
)

CARDS['Smoke and Mirrors'] = primary(
    'Disruption vs Reconnaissance — decoy objectives.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: Per objective decoyed (+2 VP if in opponent territory). REWARD: 2 VP each.'},
        *hold_non_home('4 VP'),
        {'label': 'END OF BATTLE', 'text': 'WHEN: End of the battle. REQUIREMENT: 4+ objectives are decoyed. REWARD: 10 VP.'},
    ],
    actions=['DECOY (ACTION): Unlimited uses on non-home objectives you control; completes end of turn. Decoy markers removed if an enemy ends a move within range.'],
)

# --- PRIORITY ASSETS ---
CARDS['Vital Link'] = primary(
    'Priority Assets vs Purge — stack Operation markers on Centre objectives.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You control one or more Centre objectives. REWARD: 2 VP + 1 VP per Operation marker on Centre objectives you control.'},
        *hold_non_home('4 VP', [
            {'label': 'SECOND BATTLE ROUND ONWARDS', 'text': f'WHEN: {CMD} REQUIREMENT: You control a Centre objective. REWARD: +4 VP.'},
            {'label': 'END OF BATTLE', 'text': 'WHEN: End of the battle. REQUIREMENT: You control opponent\'s home objective. REWARD: 10 VP.'},
        ]),
    ],
    actions=['VITAL LINK (ACTION): Once per turn on a Centre objective. Completes end of turn if you control it. Place an Operation marker.'],
)

CARDS['Secure Asset'] = primary(
    'Priority Assets vs Take and Hold — secure assets on objectives.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You completed Secure Asset on an objective this turn. REWARD: 4 VP.'},
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You destroyed an enemy unit within range of a Centre objective. REWARD: 2 VP.'},
        *hold_non_home('4 VP', [
            {'label': 'SECOND BATTLE ROUND ONWARDS', 'text': f'WHEN: {CMD} REQUIREMENT: You control 3+ objectives. REWARD: 4 VP.'},
        ]),
    ],
    actions=['SECURE ASSET (ACTION): On a non-home objective you control; completes end of turn.'],
)

CARDS['Extract Relic'] = primary(
    'Priority Assets vs Disruption — sensor sweep the relic.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You completed a Sensor Sweep. REWARD: 4 VP.'},
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: Enemy unit that started the turn on an objective was destroyed. REWARD: 3 VP.'},
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: Sole enemy marker remains and you control it uncontested. REWARD: 4 VP.'},
        *hold_non_home('4 VP'),
    ],
    actions=['SENSOR SWEEP (ACTION): As Locate and Deny.'],
)

CARDS['Sabotage'] = primary(
    'Priority Assets mirror — sabotage enemy-side objectives.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: Per objective sabotaged (+2 VP if in opponent deployment zone). REWARD: 3 VP each.'},
        *hold_non_home('4 VP'),
    ],
    actions=['SABOTAGE (ACTION): On a non-home objective; completes when performed.'],
)

CARDS['Vanguard Operation'] = primary(
    'Priority Assets vs Reconnaissance — vanguard operations in terrain.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You completed a Vanguard Operation. REWARD: 4 VP.'},
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You destroyed an enemy unit. REWARD: 2 VP.'},
        *hold_non_home('4 VP'),
    ],
    actions=['VANGUARD OPERATION (ACTION): On terrain with no enemies within range; completes end of turn if still uncontested.'],
)

# --- RECONNAISSANCE ---
CARDS['Triangulation'] = primary(
    'Recon vs Purge — triangulate objectives for big end-of-turn scores.',
    [
        *hold_non_home('4 VP'),
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: 1 objective Triangulated: 3 VP; 2: 6 VP; 3+: 10 VP.'},
        {'label': 'END OF BATTLE', 'text': 'WHEN: End of the battle. REQUIREMENT: You control 4+ objectives. REWARD: 10 VP.'},
    ],
    actions=['TRIANGULATION (ACTION): From battle round 2, once per turn on a non-home objective you control; completes end of turn. Place a Triangulation marker.'],
)

CARDS['Reconnaissance Sweep'] = primary(
    'Recon vs Take and Hold — table corners and kills.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: Units in 3 table corners (6"+ from centre): 3 VP. All 4 corners: 6 VP.'},
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: Per enemy unit destroyed. REWARD: 1 VP each.'},
        *hold_non_home('3 VP'),
    ],
)

CARDS['Surveil the Foe'] = primary(
    'Recon vs Disruption — surveil enemies and deny markers.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You surveilled an enemy not near a marked objective. REWARD: 4 VP.'},
        *hold_non_home('4 VP', [
            {'label': 'SECOND BATTLE ROUND ONWARDS', 'text': f'WHEN: {CMD} REQUIREMENT: You control more objectives than opponent. REWARD: 4 VP.'},
            {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: Opponent has no markers on the board. REWARD: 5 VP.'},
        ]),
    ],
    actions=['SURVEIL (ACTION): Target an enemy within 18"; completes immediately.'],
)

CARDS['Search and Scour'] = primary(
    'Recon vs Priority Assets — centre control and terrain kills.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You control a Centre objective. REWARD: 3 VP.'},
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: Enemy that started the turn in terrain was destroyed. REWARD: 2 VP.'},
        *hold_non_home('4 VP per objective'),
        {'label': 'END OF BATTLE', 'text': 'WHEN: End of the battle. REQUIREMENT: No enemies in your deployment half. REWARD: 5 VP.'},
    ],
)

CARDS['Gather Intel'] = primary(
    'Recon mirror — extract intel from objectives.',
    [
        {'label': 'BATTLE ROUND 1', 'text': 'WHEN: End of your turn. REQUIREMENT: You control a Centre objective. REWARD: 6 VP.'},
        *hold_non_home('4 VP'),
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. REQUIREMENT: You extracted intel on an objective. REWARD: 6 VP.'},
        {'label': 'END OF BATTLE', 'text': 'WHEN: End of the battle. REQUIREMENT: Intel extracted on 3+ objectives and on one in opponent territory. REWARD: 5 VP each condition.'},
    ],
    actions=['EXTRACT INTEL (ACTION): From round 2 on objectives you control; completes end of turn. Place Intel marker.'],
)

# --- SECONDARIES (Wahapedia CA + 11th updates) ---
CARDS['Assassination'] = secondary(
    'Eliminate enemy Characters with extreme prejudice.',
    [
        {'label': 'FIXED', 'text': 'WHEN: While this card is active. Each time an enemy CHARACTER is destroyed: 4 VP (Wounds 4+) or 3 VP (Wounds less than 4).'},
        {'label': 'TACTICAL', 'text': 'WHEN: End of either player\'s turn. One or more enemy CHARACTER models destroyed: 5 VP. OR all enemy CHARACTERS destroyed during the battle: 5 VP.'},
    ],
)

CARDS['Bring it Down'] = secondary(
    'Destroy enemy MONSTERS and VEHICLES.',
    [
        {'label': 'FIXED', 'text': 'WHEN: While this card is active. Each time an enemy MONSTER or VEHICLE is destroyed: 2 VP (+2 VP cumulative if total Wounds 15+; +2 VP more if 20+).'},
        {'label': 'TACTICAL', 'text': 'WHEN: End of either player\'s turn. One or more enemy MONSTER or VEHICLE units destroyed this turn. REWARD: 4 VP.'},
    ],
    when_drawn='When Drawn: If no enemy MONSTER or VEHICLE units are on the battlefield, you may discard and redraw.',
)

CARDS['A Grievous Blow'] = secondary(
    'Cull horde units (Starting Strength 13+).',
    [
        {'label': 'FIXED', 'text': 'WHEN: While this card is active. Each time an enemy INFANTRY unit with Starting Strength 13+ (including Attached) is destroyed. REWARD: 5 VP.'},
        {'label': 'TACTICAL', 'text': 'WHEN: End of either player\'s turn. One or more such units destroyed this turn. REWARD: 5 VP.'},
    ],
    when_drawn='When Drawn: If no eligible enemy INFANTRY units are on the battlefield, you may discard and redraw.',
)

CARDS['Engage on All Fronts'] = secondary(
    'Establish a presence in multiple table quarters.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. Presence in 2 quarters: 1 VP. OR 3 quarters: 2 VP. OR 4 quarters: 4 VP.'},
    ],
    when_drawn='When Drawn: A unit wholly in a table quarter more than 6" from the battlefield centre counts as presence in that quarter.',
)
CARDS['Engage on all Fronts'] = CARDS['Engage on All Fronts']

CARDS['Behind Enemy Lines'] = secondary(
    'Break through and cut off enemy escape routes.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. One unit (not AIRCRAFT, not Battle-shocked) wholly in opponent deployment zone: 3 VP. OR two or more such units: 4 VP.'},
    ],
    when_drawn='When Drawn: If battle round 1, you may shuffle this card back into your deck and draw a new card.',
)

CARDS['Secure No Man\'s Land'] = secondary(
    'Seize objectives in No Man\'s Land.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. You control one objective in No Man\'s Land: 2 VP. OR two or more: 5 VP.'},
    ],
)

CARDS['No Prisoners'] = secondary(
    'Show no mercy — destroy enemy units.',
    [
        {'label': 'FIXED', 'text': 'WHEN: While this card is active. Each time an enemy Bodyguard or non-CHARACTER unit is destroyed (up to 5 VP).'},
        {'label': 'TACTICAL', 'text': 'WHEN: While this card is active. Each time an enemy unit is destroyed (up to 5 VP).'},
    ],
)

CARDS['Cleanse'] = secondary(
    'Purify tainted objectives.',
    [
        {'label': 'CLEANSE (ACTION)', 'text': 'STARTS: Shooting phase. UNITS: One or more within range of a non-home objective. COMPLETES: End of your turn if you still control it. REWARD: Fixed 2 VP / Tactical 5 VP for one cleansed; double for two or more.'},
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. One or more objectives cleansed by your army this turn.'},
    ],
    when_drawn='When Drawn: Select objectives to cleanse as per card.',
)

CARDS['Defend Stronghold'] = secondary(
    'Defend objectives in your deployment zone.',
    [
        {'label': 'SECOND BATTLE ROUND ONWARDS', 'text': 'WHEN: End of opponent\'s turn or end of battle. You control one or more objectives in your deployment zone. REWARD: 3 VP.'},
    ],
    when_drawn='When Drawn: If battle round 1, shuffle back and draw a new card.',
)

CARDS['Overwhelming Force'] = secondary(
    'Destroy enemies on objectives.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: While this card is active. Each time an enemy unit that started the turn within range of an objective is destroyed (up to 5 VP). Leader and Bodyguard count separately if Attached.'},
    ],
)

CARDS['Display of Might'] = secondary(
    'Dominate No Man\'s Land numerically.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. More of your units than opponent\'s wholly within No Man\'s Land. REWARD: 4 VP.'},
    ],
    when_drawn='When Drawn: If battle round 1, shuffle back and draw a new card.',
)

CARDS['Outflank'] = secondary(
    'Hold both flanks of the battlefield.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. You have units wholly within both the left and right halves of the battlefield (see card). REWARD: 5 VP.'},
    ],
)

CARDS['Forward Position'] = secondary(
    'Hold the enemy home or every Expansion objective.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. You control your opponent\'s home objective marker. REWARD: 5 VP. OR you control each Expansion objective marker. REWARD: 5 VP.'},
    ],
)

CARDS['Burden of Thrust'] = secondary(
    'Guard nominated objectives with assigned units.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. Each nominated objective is controlled by its guardian unit. REWARD: 4 VP per objective.'},
    ],
    when_drawn='When Drawn: Select objectives and guardian units as described on the card.',
)

CARDS['Centre Ground'] = secondary(
    'Deny the centre of the battlefield.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. One or more units wholly within 3" of the battlefield centre and no enemy within 3": 2 VP. OR no enemy within 6": 5 VP.'},
    ],
)

CARDS['Beacon'] = secondary(
    'Keep your Beacon unit alive behind enemy lines.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your opponent\'s turn. Your Beacon unit is not destroyed and is wholly outside your deployment zone. REWARD: 5 VP.'},
    ],
    when_drawn='When Drawn: Select a Beacon unit on the battlefield or embarked in a TRANSPORT.',
)

CARDS['Plunder'] = secondary(
    'Plunder terrain in enemy territory.',
    [
        {'label': 'PLUNDER (ACTION)', 'text': 'Perform on a terrain feature (see card).'},
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of your turn. You completed Plunder on a terrain feature. REWARD: 5 VP.'},
    ],
    when_drawn='When Drawn: If you already have Cleanse, you may discard and redraw (and vice versa).',
)

CARDS['A Tempting Target'] = secondary(
    'Seize the bait objective in No Man\'s Land.',
    [
        {'label': 'ANY BATTLE ROUND', 'text': 'WHEN: End of either player\'s turn. You control your Tempting Target objective marker. REWARD: 5 VP.'},
    ],
    when_drawn='When Drawn: Opponent selects one No Man\'s Land objective (not a home objective) as your Tempting Target.',
)

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(CARDS, indent=2, ensure_ascii=False) + '\n')
print(f'Wrote {len(CARDS)} mission cards to {OUT}')
