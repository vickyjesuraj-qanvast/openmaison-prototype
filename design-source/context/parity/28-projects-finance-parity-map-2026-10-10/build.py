import json, os, re, sys, html
M = os.path.dirname(os.path.abspath(__file__))
ORDER = [('pr','Projects list & the project record'),('sc','Schedule'),('td','Tasks, choices, floor plan, compliance & 3D'),
         ('uc','Updates, meetings, activity, tickets, chat & notifications'),('mi','Money in on a project'),
         ('mo','Money out: vendors, POs, bills, expenses'),('fb','Finance module, books & reports'),
         ('fr','Files, roles & project settings'),('cp','The client’s portal & its set-up')]
OK = {'kept','changed','moved','merged','partial','simulated','held','dropped','missing'}
FIX = {'partly':'partial','stand-in':'simulated','gap':'missing','same':'kept'}
areas, problems, total = [], [], 0
for key, name in ORDER:
    f = os.path.join(M, key + '.json')
    if not os.path.exists(f): problems.append(f'{key}: no file'); continue
    d = json.load(open(f))
    rows, seen = [], set()
    for r in d.get('rows', []):
        st = (r.get('status') or '').strip().lower(); st = FIX.get(st, st)
        if st not in OK: problems.append(f"{key} {r.get('id')}: status {st!r}"); continue
        r['status'] = st
        sev = (r.get('severity') or '').strip().lower()
        r['severity'] = sev if st in ('missing','partial') and sev in ('high','medium','low') else ''
        if r.get('id') in seen: problems.append(f"{key}: duplicate id {r.get('id')}"); continue
        seen.add(r.get('id'))
        for k in ('group','feature','what','who','v1','v1_code','v1_refs','v2','v2_code','how','decision'):
            r[k] = (r.get(k) or '').strip() if isinstance(r.get(k), str) else ', '.join(r.get(k) or []) if isinstance(r.get(k), list) else str(r.get(k) or '')
        rows.append(r)
    total += len(rows)
    areas.append({'key': key, 'name': name, 'rows': rows, 'new_in_2': d.get('new_in_2', []), 'notes': d.get('notes', '')})
meta = [('Mapped on', '10 Oct 2026'), ('1.0 read from', 'qanvast-id-tool (code, not run)'), ('2.0 read from', 'openmaison-prototype working tree'), ('Areas', str(len(areas))), ('Rows', str(total))]
method = [
  ('What a row is', ['One thing a studio member, client, vendor or the system does or gets in 1.0: a screen, an action, a rule, a calculation, a message, a scheduled job, a permission, a link or a setting.',
                     'A feature is split into several rows when its parts landed differently in 2.0.',
                     'Look and motion (1.0’s UI system) are out of scope; 2.0 follows its own design system.']),
  ('How it was read', ['Nine readers, one per area, each read 1.0’s code for their area and the 1.0 inventories (A–M, about 8,000 rows) as an index.',
                       'Each row’s 2.0 place was checked by opening today’s 2.0 code, after the gaps build, the one-home moves and the 7-tab simplification.',
                       'A row is Missing only when nothing in 2.0 does the job and no decision of yours was found in the register.']),
  ('Where decisions come from', ['REG-nnnn: design-source/REGISTER.md.', 'Q-nn: the Projects audit (22-…, 2026-10-05).', 'F-nn and M-nn: the Projects build and gaps-build records (23-…, 27-…).', 'S-nn and Q-nn after 2026-10-09: the simplification proposal.']),
  ('Overlaps', ['A feature that touches two areas can appear in both, each from its own side.', 'A gap two readers found is linked both ways (\u201cSame gap as\u201d) and is listed once under Needs a decision.']),
  ('What it is not', ['Not a test run: rows say where a feature lives, the probes say it works.', 'Not 1.0’s other modules: Leads, Quotes, Contracts, X-Ray, the Visualizer and AI credits have their own parity audits.']),
]
SAME = [('PR-089','MO-094'),('PR-121','MO-101'),('FB-009','MO-084'),('MO-079','FB-105'),('MO-087','FB-031'),('UC-094','TD-049'),
        ('TD-067','UC-113'),('FR-095','CP-118'),('CP-062','CP-064','SC-087'),('SC-084','UC-084'),('UC-058','FR-084'),('MI-065','FB-101','FB-102'),
        ('PR-122','PR-123')]
ids = {r['id'] for a in areas for r in a['rows']}
for g in SAME:
    for i in g:
        if i not in ids: problems.append(f'SAME: unknown {i}')
for a in areas:
    for r in a['rows']:
        r['same'] = next(([x for x in g if x != r['id']] for g in SAME if r['id'] in g), [])
BUILT = json.load(open(os.path.join(M, 'built.json')))
REGION_HOLD = {'SC-010', 'UC-119'}
for a in areas:
    for r in a['rows']:
        if r['id'] in BUILT: r['built'] = BUILT[r['id']]
        if r['id'] in REGION_HOLD: r['waits'] = 'Waits on your call about regions beyond Singapore (DEF-30)'
meta.append(('Built', '10 Oct 2026 · REG-1560…1670'))
data = {'meta': meta, 'areas': areas, 'method': method}
raw = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
t = open(os.path.join(M, 'template.html')).read()
open(os.path.join(M, 'projects-finance-map.html'), 'w').write(t.replace('/*__DATA__*/', raw))
print('rows', total, 'areas', len(areas))
for a in areas:
    c = {}
    for r in a['rows']: c[r['status']] = c.get(r['status'], 0) + 1
    print(f"  {a['key']}: {len(a['rows'])} {c}")
print('problems:', len(problems)); [print('  ', p) for p in problems[:40]]
