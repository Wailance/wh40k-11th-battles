#!/usr/bin/env python3
"""Extract rules text from official GW PDFs into game-data.json."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'data/sources'
OUT = ROOT / 'src/data/game-data.json'

CORE_PDF_URL = (
    'https://assets.warhammer-community.com/'
    'warhammer40000_core&key_corerules_eng_24.09-5xfayxjekm.pdf'
)
TC_PDF_URL = 'https://assets.warhammer-community.com/eng_4-xglmycxyvf.pdf'

MAX_BODY = 1400

SECTION_PHASE: dict[str, str] = {
    'CORE CONCEPTS': 'core',
    'THE BATTLE ROUND': 'core',
    'DATASHEETS': 'core',
    'STRATAGEMS': 'core',
    'STRATEGIC RESERVES': 'core',
    'MUSTER YOUR ARMY': 'core',
    'MISSIONS': 'core',
    'COMMAND PHASE': 'command',
    'MOVEMENT PHASE': 'movement',
    'TRANSPORTS': 'movement',
    'SHOOTING PHASE': 'shooting',
    'MAKING ATTACKS': 'shooting',
    'WEAPON ABILITIES': 'shooting',
    'CHARGE PHASE': 'charge',
    'FIGHT PHASE': 'fight',
    'TERRAIN FEATURES': 'terrain',
}

FOOTER_RE = re.compile(r'CORE RULES \| ([^\n]+)')
TITLE_RE = re.compile(r"^[A-Z][A-Z0-9'’\-/ ]{2,58}$")
PG_REF_RE = re.compile(r'\(PG\s+\d+-\d+\)', re.I)

SKIP_TITLES = {
    'CORE RULES', 'HINTS AND TIPS', 'ABILITIES', 'SUMMARIES', 'PAGE NUMBERS',
    'STRATAGEMS KEY', 'STRATAGEM CATEGORIES', 'MISSIONS', 'ARMIES', 'UNITS',
    'DATASHEETS', 'KEYWORDS', 'COMMAND', 'BATTLE-SHOCK', 'MOVEMENT', 'VISIBILITY',
    'BENEFIT OF COVER', 'INTRODUCTION', 'CHAPTER APPROVED', 'TOURNAMENT COMPANION',
    'WOBBLY MODELS', 'DICE ROLLING', 'FAST DICE ROLLING', 'EXAMPLE BATTLEFIELDS',
    'REQUIRED', 'DATASHEET NAME', 'AND ARMOURED CONTAINERS', 'AND FIGHT PHASES',
    'SELECT ELIGIBLE UNIT', 'SELECT TARGETS', 'MAKE CHARGE ROLL', 'MAKE CHARGE MOVE',
    'REPEAT FOR NEXT', 'ELIGIBLE UNIT', 'IMPERIAL REF', 'FILE',
    'SELECT WEAPON', 'MAKE MELEE ATTACKS', 'MAKE ATTACKS', 'PILE IN', 'CONSOLIDATE',
    'CORE CONCEPTS', 'THE BATTLE ROUND', 'ROLLING A D3', 'DICE RESULT', 'D3 RESULT',
}

PHASE_FLAVOR_TITLES = {
    'COMMAND PHASE', 'MOVEMENT PHASE', 'SHOOTING PHASE', 'CHARGE PHASE', 'FIGHT PHASE',
}

DATASHEET_FIELDS = {
    'M', 'T', 'SV', 'W', 'LD', 'OC', 'INV', 'BS', 'WS', 'A', 'S', 'AP', 'D',
}

STRATAGEM_NAMES = {
    'COMMAND RE-ROLL', 'COUNTER-OFFENSIVE', 'EPIC CHALLENGE', 'INSANE BRAVERY',
    'GRENADE', 'TANK SHOCK', 'RAPID INGRESS', 'FIRE OVERWATCH', 'GO TO GROUND',
    'SMOKESCREEN', 'HEROIC INTERVENTION',
}


def entry(category: str, title: str, body: str, link: str = '') -> dict:
    return {'category': category, 'title': title, 'body': body, 'link': link}


def sanitize_body(body: str) -> str:
    lines = body.splitlines()
    clean: list[str] = []
    for line in lines:
        s = line.strip()
        if not s:
            if clean and clean[-1] != '':
                clean.append('')
            continue
        if s.upper() in {'HINTS AND TIPS', 'HINTS AND TIP'}:
            break
        if PG_REF_RE.search(s) and clean:
            break
        if re.match(r'^[A-Z][A-Z ]+\(PG\s+\d', s):
            break
        if re.fullmatch(r'[\d"°º½¼\.]+', s):
            continue
        if re.fullmatch(r'[A-Z]', s):
            continue
        if re.fullmatch(r'(?:[a-z]\s*){2,8}', s):
            continue
        if re.fullmatch(r'\d+CP', s):
            continue
        clean.append(s)
    text = '\n'.join(clean).strip()
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+\n', '\n', text)
    if len(text) > MAX_BODY:
        text = text[:MAX_BODY].rsplit('\n', 1)[0] + '…'
    return text


def is_title(line: str) -> bool:
    if line in SKIP_TITLES or line in STRATAGEM_NAMES or line in DATASHEET_FIELDS:
        return False
    if line.startswith('AND ') or line.endswith(' AND') or line.endswith(' AND UNIT'):
        return False
    if line == 'RANGE' or line == 'MISSION':
        return False
    if not TITLE_RE.match(line):
        return False
    if line.startswith('■'):
        return False
    words = line.split()
    if len(words) == 1 and len(line) < 4:
        return False
    return True


def is_valid_block(title: str, body: str, phase: str) -> bool:
    if len(body) < 60:
        return False
    if title in PHASE_FLAVOR_TITLES and phase == 'core' and len(body) < 280:
        return False
    if body.startswith('ABILITIES (PG') or body.startswith('STRATAGEMS (PG'):
        return False
    if len(PG_REF_RE.findall(body)) >= 2:
        return False
    if 'IMPERIAL REF' in body or 'FILE: 0-' in body:
        return False
    if 'Example weapon' in body or body.startswith('BS AP'):
        return False
    if body.startswith('AND FIGHT PHASES'):
        return False
    if title == 'REQUIRED' or 'Strength is TWICE' in body[:80]:
        return False
    if title == 'MAKE MELEE ATTACKS' and 'Select weapon' in body:
        return False
    # Diagram / example captions
    short_lines = sum(1 for ln in body.splitlines() if 0 < len(ln.strip()) <= 3)
    if short_lines > 8:
        return False
    letter_spam = re.findall(r'(?:^|\n)[a-z](?:\n[a-z]){3,}', body)
    if letter_spam:
        return False
    return True


def clean_lines(text: str) -> list[str]:
    lines: list[str] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            lines.append('')
            continue
        if re.fullmatch(r'\d+', line):
            continue
        if line in {'1CP', '2CP'}:
            continue
        if line.startswith('CORE RULES |'):
            continue
        lines.append(line)
    return lines


def parse_blocks(text: str, default_category: str, phase: str) -> list[dict]:
    lines = clean_lines(text)
    blocks: list[dict] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not is_title(line):
            i += 1
            continue
        title = line
        i += 1
        body_lines: list[str] = []
        while i < len(lines):
            nxt = lines[i]
            if is_title(nxt) or nxt in STRATAGEM_NAMES:
                break
            if nxt.startswith('WHEN:') and title not in STRATAGEM_NAMES:
                break
            body_lines.append(nxt)
            i += 1
        body = sanitize_body('\n'.join(body_lines))
        if not is_valid_block(title, body, phase):
            continue
        blocks.append(entry(default_category, title, body, CORE_PDF_URL))
    return blocks


def parse_stratagems(text: str) -> list[dict]:
    items: list[dict] = []
    for name in STRATAGEM_NAMES:
        idx = text.find(name)
        if idx < 0:
            continue
        chunk = text[idx: idx + 1200]
        m = re.search(
            r'CORE – ([^\n]+)\n(.+?)\nWHEN: (.+?)(?:\nTARGET: (.+?))?(?:\nEFFECT: (.+?))'
            r'(?:\nRESTRICTIONS: (.+?))?(?=\n[A-Z]{3,}|\n\d+CP|\Z)',
            chunk,
            re.DOTALL,
        )
        if not m:
            continue
        cat, flavor, when, target, effect, restrictions = m.groups()
        parts = [p.strip() for p in [
            flavor,
            f'WHEN: {when.strip()}',
            f'TARGET: {target.strip()}' if target else '',
            f'EFFECT: {effect.strip()}' if effect else '',
            f'RESTRICTIONS: {restrictions.strip()}' if restrictions else '',
        ] if p]
        body = sanitize_body('\n'.join(parts))
        cp = '2 CP' if name == 'COUNTER-OFFENSIVE' else '1 CP'
        items.append(entry(cat.strip(), f'{name} — {cp}', body, CORE_PDF_URL))
    return items


def section_from_footer(text: str) -> str | None:
    matches = FOOTER_RE.findall(text)
    if not matches:
        return None
    label = matches[-1].strip()
    if '|' in label:
        label = label.split('|', 1)[0].strip()
    for key, phase in SECTION_PHASE.items():
        if key in label:
            return phase
    return None


def extract_core_pdf(path: Path) -> dict[str, list[dict]]:
    try:
        import fitz  # noqa: PLC0415
    except ImportError:
        print('Run: python3 -m venv .venv && .venv/bin/pip install pymupdf', file=sys.stderr)
        sys.exit(1)

    doc = fitz.open(path)
    by_phase: dict[str, list[dict]] = {
        'core': [], 'command': [], 'movement': [], 'shooting': [],
        'charge': [], 'fight': [], 'terrain': [],
    }
    stratagem_text = ''

    for page_num, page in enumerate(doc):
        text = page.get_text()
        # Pages 1–4: intro + table of contents (not rules text)
        if page_num < 4:
            continue

        phase = section_from_footer(text) or 'core'
        if any(s in text for s in STRATAGEM_NAMES):
            stratagem_text += '\n' + text
        if 'STRATAGEMS' in (section_from_footer(text) or ''):
            continue

        category = 'Terrain' if phase == 'terrain' else phase.replace('_', ' ').title()
        blocks = parse_blocks(text, category, phase)
        by_phase.setdefault(phase, []).extend(blocks)

    by_phase['core'] = [b for b in by_phase['core'] if b['title'] not in STRATAGEM_NAMES]
    by_phase['core'].extend(parse_stratagems(stratagem_text))

    for phase, items in by_phase.items():
        seen: set[str] = set()
        unique: list[dict] = []
        for item in items:
            if item['title'] in seen:
                continue
            seen.add(item['title'])
            unique.append(item)
        by_phase[phase] = unique

    return by_phase


def extract_tc_pdf(path: Path) -> list[dict]:
    try:
        import fitz  # noqa: PLC0415
    except ImportError:
        sys.exit(1)

    doc = fitz.open(path)
    text = '\n'.join(page.get_text() for page in doc)
    missions: list[dict] = []

    sections = [
        ('Tournament Sequence', r'CHAPTER APPROVED TOURNAMENT MISSION SEQUENCE(.+?)(?=CHAPTER APPROVED MISSION DECK|$)', re.DOTALL | re.I),
        ('Fixed Missions', r'FIXED MISSIONS(.+?)(?=TACTICAL MISSIONS|$)', re.DOTALL | re.I),
        ('Tactical Missions', r'TACTICAL MISSIONS(.+?)(?=NEW ORDERS|$)', re.DOTALL | re.I),
        ('VP Limits', r'MAXIMUM VP(.{0,1200})', re.DOTALL | re.I),
        ('Terrain Layouts', r'TERRAIN LAYOUTS(.+?)(?=DESIGNER|APPENDIX|$)', re.DOTALL | re.I),
    ]
    for title, pattern, flags in sections:
        m = re.search(pattern, text, flags)
        if not m:
            continue
        body = m.group(1) if m.lastindex else m.group(0)
        body = re.sub(r'\t+', '\n• ', body)
        body = sanitize_body(body)
        if len(body) < 60:
            continue
        missions.append(entry('Chapter Approved', title, body, TC_PDF_URL))

    missions.insert(0, entry(
        'Chapter Approved',
        'Secondary draw (Tactical)',
        'At the start of your first Command phase, draw two Tactical secondary cards; they stay active until scored. '
        'Each subsequent Command phase, if you have fewer than two active cards, draw until you have two. '
        'Maximum 40 VP from secondaries per game; 15 VP per battle round. Fixed missions: 20 VP cap per card.',
        TC_PDF_URL,
    ))
    missions.insert(1, entry(
        'Chapter Approved',
        'Battle Ready (+10 VP)',
        'Each player scores 10 VP if their army is painted to Battle Ready standard (Tournament Companion).',
        TC_PDF_URL,
    ))

    return missions


def merge_into_game_data(rules: dict[str, list[dict]], missions: list[dict]) -> None:
    data = json.loads(OUT.read_text(encoding='utf-8'))
    data['rules'] = {**rules, 'missions': missions}
    data['rulesPdfs'] = {
        'coreRules': {'title': 'Warhammer 40,000 Core Rules', 'url': CORE_PDF_URL},
        'tournamentCompanion': {
            'title': 'Chapter Approved Tournament Companion',
            'url': TC_PDF_URL,
        },
    }
    data['rulesSources'] = [
        {'title': 'Core Rules PDF', 'url': CORE_PDF_URL},
        {'title': 'Tournament Companion PDF', 'url': TC_PDF_URL},
    ]
    data['rulesNote'] = (
        'Rule text extracted from official GW PDFs (Core Rules + Chapter Approved Tournament Companion). '
        'Open the PDFs for the authoritative full wording.'
    )
    data['version'] = data.get('version', '0.5')
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def main() -> None:
    core = SRC / 'core-rules.pdf'
    tc = SRC / 'tournament-companion.pdf'
    if not core.exists() or not tc.exists():
        print('Missing PDFs. Run: npm run fetch-rules-pdfs', file=sys.stderr)
        sys.exit(1)

    rules = extract_core_pdf(core)
    missions = extract_tc_pdf(tc)
    merge_into_game_data(rules, missions)

    counts = {k: len(v) for k, v in {**rules, 'missions': missions}.items()}
    print(f'Extracted {sum(counts.values())} rule entries from PDFs:', counts)


if __name__ == '__main__':
    main()
