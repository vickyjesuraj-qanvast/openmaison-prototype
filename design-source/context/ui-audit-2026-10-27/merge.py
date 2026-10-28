#!/usr/bin/env python3
"""Merge the six lanes' findings and words into the review page's data.json, and make one compressed shot per finding.
Run: python3 merge.py  (in the ui-audit folder). Writes page/data.json and page/shots/<id>.jpg."""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'page')
os.makedirs(os.path.join(OUT, 'shots'), exist_ok=True)
LANES = {1: 'Shell & your day', 2: 'Leads', 3: 'Projects & client portal', 4: 'Quotes, contracts & templates',
         5: 'Company, Settings, Finance & Reports', 6: 'Tools'}
SEV = {'high': 0, 'med': 1, 'low': 2}

findings, words = [], []
for n, lane in LANES.items():
    fp = os.path.join(HERE, f'lane-{n}.json')
    if not os.path.exists(fp):
        print('missing', fp); continue
    for f in json.load(open(fp)):
        f['lane'] = n; f['laneName'] = lane
        f['severity'] = f.get('severity', 'low') if f.get('severity') in SEV else 'low'
        findings.append(f)
    wp = os.path.join(HERE, f'lane-{n}-words.json')
    if os.path.exists(wp):
        for w in json.load(open(wp)):
            w['lane'] = n; words.append(w)

# one shot per finding: its first listed shot that exists, as a 1200-wide JPEG
shots_dir = os.path.join(HERE, 'shots')
have = set(os.listdir(shots_dir))
def find_shot(name):
    if not name: return None
    base = os.path.basename(name)
    for cand in (base, base + '.png', re.sub(r'\.png$', '', base) + '.png'):
        if cand in have: return cand
    return None
for f in findings:
    src = None
    for s in f.get('shots') or []:
        src = find_shot(s)
        if src: break
    f['shot'] = None
    if src:
        dst = os.path.join(OUT, 'shots', f"{f['id']}.jpg")
        if not os.path.exists(dst):
            subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '55', '--resampleWidth', '1200',
                            os.path.join(shots_dir, src), '--out', dst], capture_output=True)
            # a narrow phone shot stays its own width
            w = subprocess.run(['sips', '-g', 'pixelWidth', os.path.join(shots_dir, src)], capture_output=True, text=True).stdout
            m = re.search(r'pixelWidth: (\d+)', w)
            if m and int(m.group(1)) < 1200:
                subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '60', os.path.join(shots_dir, src), '--out', dst], capture_output=True)
        if os.path.exists(dst): f['shot'] = f"shots/{f['id']}.jpg"

findings.sort(key=lambda f: (SEV[f['severity']], f['lane'], f['id']))

# the words: one row per distinct "now", every place it appears
def norm(s): return re.sub(r'\s+', ' ', (s or '').strip().strip('"“”').lower())
merged = {}
for w in words:
    k = norm(w.get('now'))
    if not k: continue
    m = merged.setdefault(k, {'now': w['now'].strip(), 'proposed': [], 'where': [], 'why': [], 'kind': w.get('kind', 'label'), 'lanes': []})
    p = (w.get('proposed') or '').strip()
    if p and p not in m['proposed']: m['proposed'].append(p)
    for x in w.get('where') or []:
        if x not in m['where']: m['where'].append(x)
    y = (w.get('why') or '').strip()
    if y and y not in m['why']: m['why'].append(y)
    if w['lane'] not in m['lanes']: m['lanes'].append(w['lane'])
wordrows = sorted(merged.values(), key=lambda r: (-len(r['lanes']), -len(r['where']), r['now'].lower()))
for i, r in enumerate(wordrows): r['id'] = f'W-{i + 1:03d}'

themes = json.load(open(os.path.join(HERE, 'themes.json'))) if os.path.exists(os.path.join(HERE, 'themes.json')) else []
data = {'lanes': LANES, 'findings': findings, 'words': wordrows, 'themes': themes}
json.dump(data, open(os.path.join(OUT, 'data.json'), 'w'), ensure_ascii=False)
by = lambda k: {v: sum(1 for f in findings if f.get(k) == v) for v in sorted({f.get(k) for f in findings})}
print(len(findings), 'findings', by('kind'), by('severity'), '·', len(words), 'word rows →', len(wordrows), 'merged ·',
      sum(1 for f in findings if f['shot']), 'shots')
