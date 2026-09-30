#!/usr/bin/env python3
"""Builds the UX audit report page (report/index.html + report/shots/*.jpg) and the repo's markdown from findings.py."""
import json, os, subprocess, html
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, 'findings.py')).read())

AREAS = {'L': 'Leads', 'T': 'Lead tabs & Tasks', 'Q': 'Quotes', 'C': 'Contracts & signing', 'S': 'Studio setup', 'V': 'Shell & Visualizer'}
THEMES = [
  ('broken', 'Broken, or quietly wrong', 'Fix these first: a client-facing page that prints an internal to-do, attachments that fail to save, edits lost on the way out, records that credit the wrong person.'),
  ('flow', 'The deal doesn’t move with its documents', 'A quote sent, confirmed or signed doesn’t move its lead, and nothing offers the move — so the pipeline, Maison AI’s advice and Convert to Project go stale together. One pattern closes every hand-off: when a document changes state, its snackbar, its banner and its bell line offer the lead’s next stage.'),
  ('queue', 'What needs me today?', 'Counts exist for templates and AI credits, but not for the work that waits on a person — quotes to approve, contracts unsigned, tasks overdue or owned by nobody — and a phone shows no counts at all. REG-666’s to-do chips and a personal badge answer it on every list.'),
  ('follow', 'No next step once the job is done', 'Saving, adding, importing, completing, revising: each ends on a snackbar that confirms and stops. The house snackbar can carry the next step (and an Undo) — most of these need one line.'),
  ('honest', 'Buttons that promise more — or less — than they do', 'A main button that sends nothing, a status menu that skips approval, tiles and icons that lead to “Coming soon”, figures that disagree with the page they came from.'),
  ('client', 'The client’s side of the screen', 'The pages a homeowner sees on a phone: the confirmation page, the bundle signing page, the render link, the questionnaire link.'),
  ('find', 'Where things live', 'Settings split between Company and Settings, defaults inside a template’s third tab, rules under Notifications — and search that knows records but no settings.'),
  ('field', 'In the field: iPad, phone and a stack of photos', 'The meeting-room and site-visit moments: one file at a time, an unlabelled Share on the iPad, a rough surface marking whose warning never shows.'),
]
SEV_ORDER = {'blocker': 0, 'major': 1, 'minor': 2}

out = os.path.join(HERE, 'report'); os.makedirs(os.path.join(out, 'shots'), exist_ok=True)
files = {}
for x in F:
    if not x['shot']: continue
    src = os.path.join(HERE, x['shot'])
    if not os.path.exists(src): print('missing shot', x['id'], src); x['shot'] = ''; continue
    dst = os.path.join(out, 'shots', f"{x['id']}.jpg")
    if not os.path.exists(dst):
        subprocess.run(['sips', '-Z', '1400', '-s', 'format', 'jpeg', '-s', 'formatOptions', '62', src, '--out', dst], capture_output=True)
    x['img'] = f"shots/{x['id']}.jpg"; files[x['img']] = dst

WALKS = json.load(open(os.path.join(HERE, 'walks.json'))) if os.path.exists(os.path.join(HERE, 'walks.json')) else {}
data = dict(findings=sorted(F, key=lambda x: (SEV_ORDER[x['sev']], x['id'])), areas=AREAS, themes=[dict(key=k, title=t, blurb=b) for k, t, b in THEMES], walks=WALKS)
tpl = open(os.path.join(HERE, 'report.template.html')).read()
page = tpl.replace('/*__DATA__*/null', json.dumps(data, ensure_ascii=False))
open(os.path.join(out, 'index.html'), 'w').write(page)
json.dump(files, open(os.path.join(out, 'files.json'), 'w'), indent=1)
counts = {s: sum(1 for x in F if x['sev'] == s) for s in SEV_ORDER}
print(len(F), 'findings', counts, len(files), 'shots')

# the repo's markdown
md = ['# UX audit — where studios get stuck (2026-09-30)', '',
      'Six walkthroughs of a studio’s real jobs on a production build (scratch copies of the demo DB, 1440 and 390/768 touch), one per area. '
      'Owner’s ask 2026-09-30: “like how we found this user experience issue, can you do a similar audit across to improve the ux and the use cases?” '
      'Nothing here is built until the owner marks it; the review page keeps the picks.', '',
      f"Findings: {len(F)} — {counts['blocker']} blockers · {counts['major']} major · {counts['minor']} minor.", '']
for k, t, b in THEMES:
    rows = [x for x in data['findings'] if x['theme'] == k]
    if not rows: continue
    md += [f'## {t}', '', b, '']
    for x in rows:
        md += [f"### {x['id']} · {x['title']} ({x['sev']}, {AREAS[x['area']]}, effort {x['effort']})", '',
               f"- **What happens:** {x['what']}", f"- **Fix:** {x['fix']}"] + ([f"- **Decided before:** {x['reg']}"] if x['reg'] else []) + ([f"- Screenshot: `{x['shot']}`"] if x['shot'] else []) + ['']
open(os.path.join(HERE, 'ux-audit.md'), 'w').write('\n'.join(md))
