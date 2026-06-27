#!/usr/bin/env python3
"""Extract game data from Veizla.gg xlsx cheat sheet into src/data/game-data.json."""
import zipfile, json, re, xml.etree.ElementTree as ET
from pathlib import Path

XLSX = Path.home() / 'Downloads/Cheat Sheet - Warhammer 40k 11th Edition - Veizla.gg.xlsx'
OUT = Path(__file__).resolve().parent.parent / 'src/data/game-data.json'

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
FD = {'PURGE THE FOE','TAKE AND HOLD','PRIORITY ASSETS','RECONNAISSANCE','DISRUPTION'}

def col_to_num(col):
    n = 0
    for c in col: n = n * 26 + (ord(c) - 64)
    return n

def parse_cell_ref(ref):
    m = re.match(r'([A-Z]+)(\d+)', ref)
    return col_to_num(m.group(1)), int(m.group(2))

def read_sheet(z, shared, target):
    root = ET.fromstring(z.read(target))
    rows_data = {}
    for row in root.findall('.//m:sheetData/m:row', NS):
        for c in row.findall('m:c', NS):
            ref = c.get('r')
            if not ref: continue
            col, row_n = parse_cell_ref(ref)
            v = c.find('m:v', NS)
            is_elem = c.find('m:is', NS)
            val = ''
            if c.get('t') == 's' and v is not None: val = shared[int(v.text)]
            elif c.get('t') == 'inlineStr' and is_elem is not None:
                t = is_elem.find('.//m:t', NS)
                val = t.text if t is not None and t.text else ''
            elif v is not None: val = v.text or ''
            rows_data.setdefault(row_n, {})[col] = val
    return rows_data

def row_vals(rows, r):
    cells = rows.get(r, {})
    if not cells: return []
    mx = max(cells)
    return [cells.get(c, '') for c in range(1, mx+1)]

def main():
    with zipfile.ZipFile(XLSX) as z:
        ss_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        shared = [''.join([(t.text or '') for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')]) for si in ss_root.findall('m:si', NS)]
        rels_root = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        rid_to_path = {rel.get('Id'): rel.get('Target') for rel in rels_root}
        wb = ET.fromstring(z.read('xl/workbook.xml'))
        sheets = {}
        for s in wb.findall('.//m:sheet', NS):
            rid = s.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            target = 'xl/' + rid_to_path[rid].lstrip('/')
            sheets[s.get('name')] = read_sheet(z, shared, target)

    def parse_det_row(vals):
        if len(vals) < 2 or ' DP' not in vals[1]:
            return None
        dp = int(vals[1].replace(' DP', '').strip())
        note = vals[3] if len(vals) > 3 and vals[3] not in FD else ''
        fd = vals[4] if len(vals) > 4 else (vals[3] if len(vals) > 3 else '')
        return {'name': vals[2], 'dp': dp, 'note': note, 'forceDisposition': fd}

    def parse_det(sheet_name, category):
        rows = sheets[sheet_name]
        armies, current = [], None
        for r in sorted(rows):
            vals = row_vals(rows, r)
            if not vals:
                continue
            if vals[0].startswith('http'):
                if current:
                    current['factionPackUrl'] = vals[0]
                    det = parse_det_row(vals)
                    if det:
                        current['detachments'].append(det)
                continue
            det = parse_det_row(vals)
            if not det:
                continue
            if vals[0]:
                if current:
                    armies.append(current)
                current = {'army': vals[0], 'category': category, 'factionPackUrl': '', 'detachments': [det]}
            elif current:
                current['detachments'].append(det)
        if current:
            armies.append(current)
        return armies

    all_armies = []
    for sn, cat in [('Chaos','chaos'),('Imperium','imperium'),('Space Marines','space-marines'),('Xenos','xenos')]:
        all_armies.extend(parse_det(sn, cat))
    all_armies.sort(key=lambda a: a['army'].casefold())

    matchups = []
    for r in sorted(sheets['Force Dispositions']):
        cells = sheets['Force Dispositions'][r]
        k, p1, p2 = cells.get(1,''), cells.get(2,''), cells.get(3,'')
        if k.startswith('#') and p1 in FD and p2 in FD:
            matchups.append({'id': int(k.replace('#','')), 'player1': p1, 'player2': p2})

    FD_ORDER = ['TAKE AND HOLD', 'PURGE THE FOE', 'DISRUPTION', 'RECONNAISSANCE', 'PRIORITY ASSETS']
    primary_matrix = []
    for r in sorted(sheets['Primary']):
        if r < 3 or r > 7: continue
        cells = sheets['Primary'][r]
        primary_matrix.append([cells.get(i+1,'') for i in range(5)])
    # Matrix is you (row) × opponent (column); same FD order both axes.

    SECONDARY_ALIASES = {'Engage on all Fronts': 'Engage on All Fronts'}

    def canon_secondary(name):
        return SECONDARY_ALIASES.get(name, name)

    secondaries_confirmed, secondaries_leaked = [], []
    mode = None
    for r in sorted(sheets['Secondary']):
        cells = sheets['Secondary'][r]
        v1 = cells.get(1,'')
        if v1 == 'Cards presented':
            mode = 'confirmed'
        elif v1 == 'Confirmed':
            # 18th card (A Tempting Target) listed after the initial 17
            mode = 'confirmed_late'
        elif v1 == 'LEAK BELOW':
            mode = 'leaked'
        elif mode == 'confirmed' and v1 and v1 not in ('18 SECONDARIES CONFIRMED',):
            secondaries_confirmed.append(canon_secondary(v1))
        elif mode == 'confirmed_late' and v1:
            secondaries_confirmed.append(canon_secondary(v1))
            mode = 'skip_card_body'
        elif mode == 'leaked' and v1 and v1 not in ('LEAK BELOW',) and v1.isupper() and len(v1) < 40:
            secondaries_leaked.append(v1)

    def parse_rules(sheet_name):
        rows = sheets[sheet_name]
        rules, current = [], None
        for r in sorted(rows):
            cells = rows[r]
            cat, rule, desc = cells.get(1,''), cells.get(2,''), cells.get(3,'')
            link = cells.get(6,'') or cells.get(5,'')
            if cat.startswith('http') or cat == 'Category': continue
            if cat:
                if current: rules.append(current)
                current = {'category': cat, 'title': rule, 'body': desc, 'link': link}
            elif current and (rule or desc):
                if rule: current['body'] += ('\n' + rule)
                if desc: current['body'] += (' ' + desc)
        if current: rules.append(current)
        return [x for x in rules if x['title'] or x['body']]

    matchup_fd = {m['id']: m for m in matchups}
    seen_layouts = set()
    layouts = []
    for r in sorted(sheets['Layouts']):
        cells = sheets['Layouts'][r]
        k, p1, p2, avail = cells.get(1,''), cells.get(2,''), cells.get(3,''), cells.get(4,'')
        if not k.startswith('#') or not p1:
            continue
        mid = int(k.replace('#', ''))
        if mid in seen_layouts:
            continue
        fd = matchup_fd.get(mid)
        if not fd:
            continue
        seen_layouts.add(mid)
        layouts.append({
            'id': mid,
            'player1': fd['player1'],
            'player2': fd['player2'],
            'available': avail != 'NOT AVAILABLE',
        })
    layouts.sort(key=lambda l: l['id'])

    data = {
        'version': '0.4', 'source': 'Veizla.gg',
        'armies': all_armies,
        'forceDispositionMatchups': matchups,
        'forceDispositionOrder': FD_ORDER,
        'forceDispositionColors': {'PURGE THE FOE':'red','TAKE AND HOLD':'green','PRIORITY ASSETS':'yellow','RECONNAISSANCE':'teal','DISRUPTION':'blue'},
        'primaryMissionMatrix': primary_matrix,
        'opponentForceDispositionRow': {
            'TAKE AND HOLD': 0, 'PURGE THE FOE': 1, 'DISRUPTION': 2,
            'RECONNAISSANCE': 3, 'PRIORITY ASSETS': 4,
        },
        'scoringCaps': {
            'primaryMaxGame': 45, 'primaryMaxRound': 15,
            'tacticalSecondaryMaxGame': 40, 'tacticalSecondaryMaxRound': 15,
            'fixedSecondaryMaxGame': 40, 'fixedSecondaryMaxPerCard': 20,
            'fixedSecondaryMaxRound': 15, 'battleReadyVp': 10,
        },
        'secondaries': {
            'fixedOptions': ['Assassination', 'Bring it Down', 'A Grievous Blow', 'Engage on All Fronts'],
            'tacticalDeck': secondaries_confirmed,
            'confirmed': secondaries_confirmed,
            'leaked': secondaries_leaked,
        },
        'layouts': layouts,
        # Rules come from official GW PDFs — run: npm run extract-rules
        'terrain': {
            'note': 'Objective markers removed — terrain footprints used as objectives in 11th Edition',
            'footprints': ['Four large rectangles – 7" x 11.5"','Two large right-angle triangles – 8" x 11.5"','Four medium rectangles – 6" x 4"','Two long lines – 10" x 2.5"','Four short lines – 6" x 2"'],
            'links': []
        }
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        prev = json.loads(OUT.read_text(encoding='utf-8'))
        for key in ('rules', 'rulesPdfs', 'rulesSources', 'rulesNote'):
            if prev.get(key):
                data[key] = prev[key]
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    print(f'Wrote {OUT} — {len(all_armies)} armies, {sum(len(a["detachments"]) for a in all_armies)} detachments')
    if not data.get('rules'):
        print('Note: run npm run extract-rules to populate rules from GW PDFs')

if __name__ == '__main__':
    main()
