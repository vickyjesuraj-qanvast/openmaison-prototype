"""Build the OpenMaison 2.0 UAT workbook from the chapter JSON files (REG-669). Run: python3 design-source/uat/build_uat.py (needs openpyxl).
Sample files: python3 design-source/uat/gen_files.py public/uat-files && NODE_PATH=$PWD/node_modules node design-source/uat/gen_images.cjs public/uat-files

Tabs: UAT · Start here · UAT · Dane · UAT · Oliva · UAT · Swati · UAT · Missing or other · UAT · Summary · UAT · 1.0 checklist · UAT · Lists (hidden)
"""
import json, glob, os, re, sys
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'story')   # the chapters (ch1…ch27.json), their files and the nine checklists
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(HERE), 'OpenMaison-2.0-UAT.xlsx')

TESTERS = ['Dane', 'Oliva', 'Swati']
CHAPTERS = {
    1: ('First login', 'Look around your new workspace.'),
    2: ('Set up your studio', 'Company details, your team and the studio’s rules.'),
    3: ('Build your library', 'Price book, templates and the question bank.'),
    4: ('Leads arrive', 'Add, import and capture leads; find them in the list.'),
    5: ('Work your lead', 'Sophia Wong: assign, call, notes, tasks, files, questionnaire, meeting.'),
    6: ('Quote it', 'Sophia’s quote, from template to the client’s confirmation.'),
    7: ('A rival quote', 'Quote X-Ray against another studio’s quote.'),
    8: ('Sign the deal', 'Sophia’s contract, sent and signed.'),
    9: ('Win, park or lose', 'Won, On Hold, Lost, Resume, Return, Delete.'),
    10: ('A designer’s day', 'View as Sarah, James, Hui Min and Nurul — what each role sees and may do.'),
    11: ('The owner’s week', 'Tasks, the bell, Insights and the studio-wide lists.'),
    12: ('On your phone', 'The key tasks again, on a phone.'),
    13: ('Design her room', 'AI Visualizer: Sophia’s living room, from her photo to the look she picks.'),
    14: ('Plans and AI credits', 'The studio’s AI credits, Plans inside the app, the price before every press, running out, and the usage page.'),
    15: ('Find anything', 'The studio-wide search: from the side navigation or ⌘K, by name, phone or number, one kind at a time, on a phone.'),
    16: ('Keys', 'Keyboard shortcuts: the ? list beside the page, lists and a lead from the keyboard, G then …, the editors, tips, the single-key switch.'),
    17: ('Won becomes a project', 'Sophia’s win becomes a project: what it needs before work starts, the Start, the Projects list, a project with no lead, and the lead’s records carried on.'),
    18: ('The schedule', 'The list that is also the timeline: from the quote, moves with Undo, the milestone’s layers, reminders, Share changes and templates.'),
    19: ('Updates and the client portal', 'Updates with photos and review, Invite to Portal, the client’s own portal (sign in, what needs them, confirm a stage), the household and the portal’s set-up.'),
    20: ('Money in', 'Contract value, variation orders, invoices from the payment schedule, then payments: the client’s proof, receipts, reminders and reversals.'),
    21: ('Choices and the ending', 'Choices on the project and the portal, Complete handover with its checklist, the owner’s review, Reopen, Delete and Restore, and the rules.'),
    22: ('Meetings', 'A meeting held moves its lead the way the studio’s rule allows; a live meeting with the co-pilot, from the client’s consent to the brief, saved to the lead and shared; an invitation the client answers.'),
    23: ('Messages', 'The team’s own conversations beside the clients’: the studio’s room, two people, a named group and its people, a lead’s Team conversation, and a designer’s view.'),
    24: ('Plan it in 3D', 'Wall elevations with the usual heights for the carpenter, a layout’s 3D picture and its turning clip, and a client’s floor-plan photo made into a 3D picture.'),
    25: ('Outside the studio', 'Market Insights, the studio’s Qanvast lead credits and reviews, and the privacy link at the foot of the client portal.'),
    26: ('Quotes on the move', 'A quote on a phone and a tablet: it opens as the document, Edit is one section at a time, Items and payments are cards, the paper is a viewer, the lists and Create Quote as cards and rows, the client’s page with Confirm in reach.'),    27: ('Contracts on the move', 'A contract on a phone and a tablet: it opens as the document, Edit is a short list with Details as one form, the paper full screen with one row of tools, a signature field placed by clause, the client reads first and signs in one hand, the lists and templates as cards and rows, a photo of the signed paper on the Won step.'),
}
RESULTS = ['✅ Works', '🟡 Works, but…', '❌ Doesn’t work', '🔍 Couldn’t find it', '⏭️ Skipped']
STATUSES = ['New', 'Fixing', 'Fixed – please re-test', 'Won’t change', 'Talk to Dane']
RETESTS = ['✅ Fixed now', '❌ Still not right']
TYPES = ['I did this in 1.0 and can’t find it', 'Confusing', 'Bug (not in the story)', 'Idea']
MODULES = ['Shell', 'Company', 'Settings', 'Price book', 'Templates', 'Leads', 'Lead details', 'Tasks', 'Quotes', 'Quote X-Ray', 'Contracts', 'Notifications', 'Insights', 'AI Visualizer', 'AI credits', 'Projects', 'Money', 'Client portal', 'Meetings', 'Messages', '3D Space Planner', 'Market Insights', 'Qanvast Ops', 'Phone']
AUDITS = {'LEADS': 'Leads', 'QTPL': 'Quote templates', 'QED': 'Quote editor', 'CTR': 'Contracts', 'XRAY': 'Quote X-Ray', 'SET': 'Accounts Setup → Settings', 'PB': 'Price book', 'VIZ': 'AI Visualizer', 'CR': 'AI credits & plans'}

FONT = 'Arial'
PRIMARY, PRIMARY_TINT = '5500FF', 'EEE5FF'
INK, MUTED = '1F1F29', '6B6B7B'
TESTER_FILL, TEAM_FILL, HEAD_FILL = 'FFFFFF', 'F2F2F5', 'E6E6EE'
thin = Side(style='thin', color='D9D9E3')
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)

def f(bold=False, size=10, color=INK, italic=False):
    return Font(name=FONT, bold=bold, size=size, color=color, italic=italic)
def fill(hex_):
    return PatternFill('solid', start_color=hex_, end_color=hex_)
WRAP_TOP = Alignment(wrap_text=True, vertical='top')
CENTER = Alignment(horizontal='center', vertical='top', wrap_text=True)

# ── data ──────────────────────────────────────────────────────────────────────────────────────────
steps = []
for n in range(1, 28):
    p = os.path.join(HERE, f'ch{n}.json')
    if not os.path.exists(p):
        print(f'!! missing ch{n}.json'); continue
    for r in json.load(open(p)):
        r['chapter'] = n
        steps.append(r)
steps.sort(key=lambda r: (r['chapter'], [int(x) for x in re.findall(r'\d+', str(r['step']))]))
files = []
for p in sorted(glob.glob(os.path.join(HERE, 'ch*-files.json'))):
    files += json.load(open(p))
checklist = []
for key in AUDITS:
    p = os.path.join(HERE, f'checklist-{key}.json')
    if os.path.exists(p):
        checklist += json.load(open(p))
    else:
        print(f'!! missing checklist-{key}.json')
covers = {}
for r in steps:
    for c in r.get('covers', []) or []:
        covers.setdefault(c, []).append(str(r['step']))

wb = Workbook()
wb.remove(wb.active)

# ── Lists (hidden) ────────────────────────────────────────────────────────────────────────────────
L = wb.create_sheet('UAT · Lists')
for col, (title, vals) in enumerate([('Result', RESULTS), ('Status', STATUSES), ('Re-tested', RETESTS), ('Type', TYPES), ('Tester', TESTERS), ('Module', MODULES)], start=1):
    L.cell(row=1, column=col, value=title).font = f(bold=True)
    for i, v in enumerate(vals, start=2):
        L.cell(row=i, column=col, value=v).font = f()
L.sheet_state = 'hidden'
def list_ref(col, n):
    c = get_column_letter(col)
    return f"='UAT · Lists'!${c}$2:${c}${n + 1}"
def dv(ws, ref, rng):
    v = DataValidation(type='list', formula1=ref, allow_blank=True, showDropDown=False)
    v.error, v.errorTitle, v.showErrorMessage = 'Pick one of the answers in the list.', 'Pick from the list', True
    ws.add_data_validation(v); v.add(rng)

# ── Tester tabs ───────────────────────────────────────────────────────────────────────────────────
COLS = [  # key, header, width, who fills
    ('ch', 'Ch', 5, 'pre'), ('step', 'Step', 7, 'pre'), ('scene', 'Scene', 18, 'pre'), ('module', 'Module', 12, 'pre'),
    ('try', 'Try this', 30, 'pre'), ('how', 'How', 46, 'pre'), ('expect', 'You should see', 40, 'pre'), ('in10', 'In 1.0', 22, 'pre'), ('as', 'You are', 11, 'pre'),
    ('result', 'Result', 18, 'tester'), ('what', 'What happened (only if not ✅)', 40, 'tester'), ('shot', 'Screenshot link', 18, 'tester'), ('date', 'Date tested', 12, 'tester'),
    ('reply', 'Our reply', 30, 'team'), ('status', 'Status', 18, 'team'), ('retest', 'Re-tested', 15, 'tester'),
]
IDX = {k: i + 1 for i, (k, *_ ) in enumerate(COLS)}
LASTC = get_column_letter(len(COLS))
FIRST = 4  # first data row
tester_last_row = {}
for t in TESTERS:
    ws = wb.create_sheet(f'UAT · {t}')
    ws.sheet_properties.tabColor = PRIMARY
    ws['A1'] = f'{t} — the whole story, chapter by chapter'
    ws['A1'].font = f(bold=True, size=14)
    ws['A2'] = ('Go in order. Read “Try this”, follow “How”, compare with “You should see”, then pick a Result. '
                'Write in “What happened” only when it is not ✅. White columns are yours; grey columns are Vicky’s and Dane’s. See “UAT · Start here” first.')
    ws['A2'].font = f(size=10, color=MUTED); ws['A2'].alignment = Alignment(wrap_text=True, vertical='top')
    ws.merge_cells(f'A2:{LASTC}2'); ws.row_dimensions[2].height = 30
    for i, (k, h, w, who) in enumerate(COLS, start=1):
        c = ws.cell(row=3, column=i, value=h)
        c.font = f(bold=True, color='FFFFFF' if who == 'tester' else INK)
        c.fill = fill(PRIMARY if who == 'tester' else HEAD_FILL)
        c.alignment = Alignment(wrap_text=True, vertical='center'); c.border = BORDER
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[3].height = 30
    row = FIRST
    ch_prev = None
    for r in steps:
        if r['chapter'] != ch_prev:
            ch_prev = r['chapter']
            title, blurb = CHAPTERS[ch_prev]
            c = ws.cell(row=row, column=1, value=f'Chapter {ch_prev} · {title} — {blurb}')
            c.font = f(bold=True, color='FFFFFF', size=11); c.fill = fill('2A1A66'); c.alignment = Alignment(vertical='center')
            for i in range(2, len(COLS) + 1): ws.cell(row=row, column=i).fill = fill('2A1A66')
            ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=len(COLS))
            ws.row_dimensions[row].height = 22
            row += 1
        vals = {'ch': r['chapter'], 'step': str(r['step']), 'scene': r.get('scene', ''), 'module': r.get('module', ''), 'try': r.get('try', ''),
                'how': r.get('how', ''), 'expect': r.get('expect', ''), 'in10': r.get('in10', ''), 'as': r.get('as', 'Dane')}
        for i, (k, h, w, who) in enumerate(COLS, start=1):
            c = ws.cell(row=row, column=i, value=vals.get(k))
            c.border = BORDER; c.alignment = CENTER if k in ('ch', 'step', 'as') else WRAP_TOP
            if who == 'pre':
                c.font = f(bold=(k == 'try'), color=INK if k in ('try', 'how', 'expect') else MUTED)
            elif who == 'team':
                c.fill = fill(TEAM_FILL); c.font = f()
            else:
                c.fill = fill(TESTER_FILL); c.font = f()
        if vals['as'] != 'Dane':
            ws.cell(row=row, column=IDX['as']).font = f(bold=True, color=PRIMARY)
        row += 1
    last = row - 1
    tester_last_row[t] = last
    res = get_column_letter(IDX['result'])
    dv(ws, list_ref(1, len(RESULTS)), f'{res}{FIRST}:{res}{last}')
    dv(ws, list_ref(2, len(STATUSES)), f"{get_column_letter(IDX['status'])}{FIRST}:{get_column_letter(IDX['status'])}{last}")
    dv(ws, list_ref(3, len(RETESTS)), f"{get_column_letter(IDX['retest'])}{FIRST}:{get_column_letter(IDX['retest'])}{last}")
    date_c = get_column_letter(IDX['date'])
    dd = DataValidation(type='date', allow_blank=True); ws.add_data_validation(dd); dd.add(f'{date_c}{FIRST}:{date_c}{last}')
    for rr in range(FIRST, last + 1): ws.cell(row=rr, column=IDX['date']).number_format = 'd mmm yyyy'
    rng = f'{res}{FIRST}:{res}{last}'
    for val, color in [(RESULTS[0], 'DDF4E4'), (RESULTS[1], 'FFF3CC'), (RESULTS[2], 'FDDCDC'), (RESULTS[3], 'DCE8FD'), (RESULTS[4], 'EEEEEE')]:
        ws.conditional_formatting.add(rng, FormulaRule(formula=[f'${res}{FIRST}="{val}"'], fill=fill(color)))
    st = get_column_letter(IDX['status'])
    ws.conditional_formatting.add(f'{st}{FIRST}:{st}{last}', FormulaRule(formula=[f'${st}{FIRST}="{STATUSES[2]}"'], fill=fill('FFF3CC'), font=Font(name=FONT, bold=True, color='8A5A00')))
    ws.freeze_panes = f'{get_column_letter(IDX["how"])}{FIRST}'
    ws.sheet_view.zoomScale = 100

# ── Missing or other ──────────────────────────────────────────────────────────────────────────────
M = wb.create_sheet('UAT · Missing or other')
M.sheet_properties.tabColor = 'E8A33D'
M['A1'] = 'Anything the story did not cover'; M['A1'].font = f(bold=True, size=14)
M['A2'] = ('Something you used in 1.0 and cannot find in 2.0, something confusing, a bug outside the steps, or an idea. One row each. '
           'White columns are yours; grey columns are Vicky’s and Dane’s.')
M['A2'].font = f(color=MUTED); M.merge_cells('A2:J2'); M['A2'].alignment = Alignment(wrap_text=True, vertical='top'); M.row_dimensions[2].height = 30
MCOLS = [('Date', 12, 'tester'), ('Who', 10, 'tester'), ('Type', 26, 'tester'), ('Module', 14, 'tester'), ('Where (which screen)', 24, 'tester'),
         ('What happened / what you expected', 50, 'tester'), ('Screenshot link', 18, 'tester'), ('Our reply', 34, 'team'), ('Status', 18, 'team'), ('Re-tested', 15, 'tester')]
for i, (h, w, who) in enumerate(MCOLS, start=1):
    c = M.cell(row=3, column=i, value=h); c.font = f(bold=True, color='FFFFFF' if who == 'tester' else INK)
    c.fill = fill(PRIMARY if who == 'tester' else HEAD_FILL); c.border = BORDER; c.alignment = Alignment(wrap_text=True, vertical='center')
    M.column_dimensions[get_column_letter(i)].width = w
M.row_dimensions[3].height = 30
MLAST = 200
for rr in range(4, MLAST + 1):
    for i, (h, w, who) in enumerate(MCOLS, start=1):
        c = M.cell(row=rr, column=i); c.border = BORDER; c.alignment = WRAP_TOP; c.font = f()
        c.fill = fill(TEAM_FILL if who == 'team' else TESTER_FILL)
    M.cell(row=rr, column=1).number_format = 'd mmm yyyy'
dv(M, list_ref(5, len(TESTERS)), f'B4:B{MLAST}'); dv(M, list_ref(4, len(TYPES)), f'C4:C{MLAST}'); dv(M, list_ref(6, len(MODULES)), f'D4:D{MLAST}')
dv(M, list_ref(2, len(STATUSES)), f'I4:I{MLAST}'); dv(M, list_ref(3, len(RETESTS)), f'J4:J{MLAST}')
M.freeze_panes = 'A4'

# ── Summary ───────────────────────────────────────────────────────────────────────────────────────
S = wb.create_sheet('UAT · Summary')
S.sheet_properties.tabColor = '3E9B63'
S['A1'] = 'Where we are'; S['A1'].font = f(bold=True, size=14)
S['A2'] = 'Counts fill in by themselves from each tester’s tab. “Open” = ❌ or 🔍 not yet marked Fixed or Won’t change.'
S['A2'].font = f(color=MUTED)
res_c = get_column_letter(IDX['result']); ch_c = get_column_letter(IDX['ch']); mod_c = get_column_letter(IDX['module']); st_c = get_column_letter(IDX['status'])
Q = lambda v: json.dumps(v, ensure_ascii=False)   # a formula literal — numbers bare, text in double quotes, emoji kept
SHORT = ['Done', '✅', '🟡', '❌', '🔍', 'Open']
def block(top, label, key_col, keys, key_label):
    S.cell(row=top, column=1, value=label).font = f(bold=True, size=12)
    hdr = top + 1
    S.cell(row=hdr + 1, column=1, value=key_label).font = f(bold=True)
    S.cell(row=hdr + 1, column=2, value='Steps').font = f(bold=True)
    col = 3
    for t in TESTERS:
        S.cell(row=hdr, column=col, value=t).font = f(bold=True, color='FFFFFF')
        for j in range(len(SHORT)):
            S.cell(row=hdr, column=col + j).fill = fill(PRIMARY)
            c = S.cell(row=hdr + 1, column=col + j, value=SHORT[j]); c.font = f(bold=True); c.fill = fill(PRIMARY_TINT); c.alignment = Alignment(horizontal='center')
        S.merge_cells(start_row=hdr, start_column=col, end_row=hdr, end_column=col + len(SHORT) - 1)
        col += len(SHORT)
    for i, k in enumerate(keys):
        rr = hdr + 2 + i
        S.cell(row=rr, column=1, value=k[1]).font = f()
        tab0 = f"'UAT · {TESTERS[0]}'"
        S.cell(row=rr, column=2, value=f'=COUNTIF({tab0}!${key_col}:${key_col},{Q(k[0])})').font = f()
        col = 3
        for t in TESTERS:
            tab = f"'UAT · {t}'"
            crit = Q(k[0])
            formulas = [
                f'=COUNTIFS({tab}!${key_col}:${key_col},{crit},{tab}!${res_c}:${res_c},"<>")',
            ] + [f'=COUNTIFS({tab}!${key_col}:${key_col},{crit},{tab}!${res_c}:${res_c},{Q(v)})' for v in RESULTS[:4]] + [
                f'=COUNTIFS({tab}!${key_col}:${key_col},{crit},{tab}!${res_c}:${res_c},{Q(RESULTS[2])},{tab}!${st_c}:${st_c},"<>{STATUSES[2]}",{tab}!${st_c}:${st_c},"<>{STATUSES[3]}")'
                f'+COUNTIFS({tab}!${key_col}:${key_col},{crit},{tab}!${res_c}:${res_c},{Q(RESULTS[3])},{tab}!${st_c}:${st_c},"<>{STATUSES[2]}",{tab}!${st_c}:${st_c},"<>{STATUSES[3]}")',
            ]
            for j, fm in enumerate(formulas):
                c = S.cell(row=rr, column=col + j, value=fm); c.font = f(); c.alignment = Alignment(horizontal='center')
            col += len(SHORT)
    tot = hdr + 2 + len(keys)
    S.cell(row=tot, column=1, value='Total').font = f(bold=True)
    for cc in range(2, 3 + len(TESTERS) * len(SHORT)):
        L_ = get_column_letter(cc)
        c = S.cell(row=tot, column=cc, value=f'=SUM({L_}{hdr + 2}:{L_}{tot - 1})'); c.font = f(bold=True); c.alignment = Alignment(horizontal='center')
        c.border = Border(top=Side(style='thin', color=INK))
    return tot + 2
nxt = block(4, 'By chapter', ch_c, [(n, f'{n} · {CHAPTERS[n][0]}') for n in range(1, 28)], 'Chapter')
used_modules = [m for m in MODULES if any(r.get('module') == m for r in steps)]
block(nxt, 'By module', mod_c, [(m, m) for m in used_modules], 'Module')
S.column_dimensions['A'].width = 26; S.column_dimensions['B'].width = 8
for cc in range(3, 3 + len(TESTERS) * len(SHORT)): S.column_dimensions[get_column_letter(cc)].width = 7
S.freeze_panes = 'C6'

# ── 1.0 checklist ─────────────────────────────────────────────────────────────────────────────────
C = wb.create_sheet('UAT · 1.0 checklist')
C.sheet_properties.tabColor = '6B6B7B'
C['A1'] = 'Every 1.0 feature, and where the story tests it'; C['A1'].font = f(bold=True, size=14)
C['A2'] = ('From the nine 1.0 → 2.0 parity audits (design-source/context/parity/). “Now in 2.0” says what happened to the feature; '
           '“Tested in steps” lists the story steps that prove it. Rows marked “Team check” are built but not in the story — Vicky and Dane check those here (Team result). Testers do not need this tab.')
C['A2'].font = f(color=MUTED); C.merge_cells('A2:J2'); C['A2'].alignment = Alignment(wrap_text=True, vertical='top'); C.row_dimensions[2].height = 30
CCOLS = [('Module', 16), ('ID', 9), ('Area', 20), ('1.0 feature', 44), ('Now in 2.0', 22), ('Why (when not built)', 40), ('Tested in steps', 18), ('Check', 12), ('Team result', 18), ('Team notes', 30)]
for i, (h, w) in enumerate(CCOLS, start=1):
    c = C.cell(row=3, column=i, value=h); c.font = f(bold=True); c.fill = fill(HEAD_FILL); c.border = BORDER
    C.column_dimensions[get_column_letter(i)].width = w
built_like = lambda now: now.startswith('Built') or now == '2.0 only'
gap_rows = []
rr = 4
for x in checklist:
    ref = f"{x['key']}:{x['id']}"
    st = covers.get(ref, [])
    now = x.get('now', '')
    check = ''
    if built_like(now) and not st: check = 'Team check'; gap_rows.append(ref)
    vals = [AUDITS.get(x['key'], x['key']), x['id'], x.get('area', ''), x.get('feature', ''), now, x.get('why', ''), ', '.join(sorted(set(st), key=lambda s: [int(n) for n in re.findall(r'\d+', s)])), check]
    for i, v in enumerate(vals, start=1):
        c = C.cell(row=rr, column=i, value=v); c.font = f(color=INK if i in (4, 5) else MUTED); c.alignment = WRAP_TOP; c.border = BORDER
    if check: C.cell(row=rr, column=8).font = f(bold=True, color='8A5A00')
    rr += 1
C.auto_filter.ref = f'A3:J{rr - 1}'
for r_ in range(4, rr):
    for cc in (9, 10): c = C.cell(row=r_, column=cc); c.border = BORDER; c.font = f(); c.alignment = WRAP_TOP; c.fill = fill(TEAM_FILL)
dv(C, list_ref(1, len(RESULTS)), f'I4:I{rr - 1}')
for val, color in [(RESULTS[0], 'DDF4E4'), (RESULTS[1], 'FFF3CC'), (RESULTS[2], 'FDDCDC'), (RESULTS[3], 'DCE8FD')]:
    C.conditional_formatting.add(f'I4:I{rr - 1}', FormulaRule(formula=[f'$I4="{val}"'], fill=fill(color)))
C.freeze_panes = 'A4'

# ── Start here (first) ────────────────────────────────────────────────────────────────────────────
H = wb.create_sheet('UAT · Start here', 0)
H.sheet_properties.tabColor = PRIMARY
H.column_dimensions['A'].width = 4; H.column_dimensions['B'].width = 30; H.column_dimensions['C'].width = 100
r = 1
def put(text, *, size=10, bold=False, color=INK, col=2, merge=True, height=None, italic=False):
    global r
    c = H.cell(row=r, column=col, value=text); c.font = f(bold=bold, size=size, color=color, italic=italic); c.alignment = Alignment(wrap_text=True, vertical='top')
    if merge and col == 2: H.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
    if height: H.row_dimensions[r].height = height
    r += 1
def pair(k, v, height=None):
    global r
    a = H.cell(row=r, column=2, value=k); a.font = f(bold=True); a.alignment = Alignment(wrap_text=True, vertical='top')
    b = H.cell(row=r, column=3, value=v); b.font = f(); b.alignment = Alignment(wrap_text=True, vertical='top')
    if height: H.row_dimensions[r].height = height
    r += 1
def gap():
    global r; r += 1
put('OpenMaison 2.0 — User acceptance test', size=18, bold=True, height=28)
put('Walk through 2.0 the way a studio would on its first day, and tell us what works, what doesn’t, and what you miss from 1.0.', color=MUTED, height=18)
gap()
put('The story', size=13, bold=True)
put('Demo Studio has just moved from OpenMaison 1.0 to 2.0. Its team, leads and quotes came across with it. You are Dane, the studio owner, '
    'logging in for the first time. Over twenty-five chapters you set up the studio, receive leads, and take one new client — Sophia Wong, '
    '9765 4321, a 4-room HDB in Tampines — from first call to signed contract. Then you look at the studio as a designer would, '
    'review the week, do it all again on your phone, design Sophia’s living room in the AI Visualizer, look after the studio’s '
    'plan and AI credits, find anything and work from the keyboard. The last five chapters run Sophia’s project — and the '
    'studio’s other jobs — from the win to the handover: the schedule, updates, her own client portal, the money and the ending. Four last '
    'chapters cover what came after: meetings and the co-pilot, the team’s own messages, planning in 3D, and the studio’s world outside — '
    'Market Insights, Qanvast and the portal’s fine print.', height=88)
gap()
put('Before you start', size=13, bold=True)
pair('1. Open the prototype', 'In Terminal, in the openmaison-prototype folder: git pull, then npm run dev. Open http://localhost:3000 in Chrome, window at full width.', 30)
pair('2. Start clean', 'Click the ✦ button (bottom right) › “Reset prototype to base”. Do this ONCE, before chapter 1. Resetting later wipes Sophia Wong and your progress.', 30)
pair('3. Your tab', 'Work only in your own tab (UAT · Dane, UAT · Oliva, UAT · Swati). Go in order — each chapter continues from the one before.', 30)
pair('4. Time', 'About 30–60 minutes a chapter. Stop at a chapter’s end; the prototype remembers where you are.', 18)
gap()
put('How to answer', size=13, bold=True)
for k, v in [(RESULTS[0], 'It did what “You should see” says.'), (RESULTS[1], 'It worked, but something felt wrong, slow, unclear or different from what you expected — say what in “What happened”.'),
             (RESULTS[2], 'It did not do what “You should see” says, or showed an error — say what you did and what you saw.'),
             (RESULTS[3], 'You could not find the button, page or option — say where you looked.'), (RESULTS[4], 'You could not try it (for example, an earlier step failed) — say why.')]:
    pair(k, v, 30 if len(v) > 90 else None)
pair('Screenshot', 'Mac: Cmd + Shift + 4, drag over the screen, then drop the file into the team’s Drive folder and paste its link. Windows: Win + Shift + S.', 30)
pair('Re-tested', 'When Status says “Fixed – please re-test”, try the step again and pick ✅ Fixed now or ❌ Still not right.', 18)
gap()
put('Good to know', size=13, bold=True)
pair('View as', 'Click “Demo Studio” at the bottom of the left menu to see the prototype as another member (a designer, the manager, the admin). '
     'Chapter 10 uses it. Switch back to Dane when a step says so — the bottom-left always shows who you are.', 44)
pair('WhatsApp', 'Some steps open WhatsApp in a new tab. Close it — never press Send. The prototype does not message anyone.', 18)
pair('Client pages', 'Where the client confirms a quote or signs a contract, you copy the link from the prototype and open it in a new tab — you play the client. '
     'Chapter 22’s meeting links open the same way, in a private window.', 30)
pair('Client portal', 'Chapters 19–21 and 25: open the portal’s address in a private window (Chrome: ⌘⇧N, Windows: Ctrl+Shift+N) and sign in with the client’s mobile number — '
     'any six digits pass as the code. Keep your own window for the studio; a preview from the studio would replace the client’s sign-in in the same window.', 44)
pair('Your phone', 'Chapters 12, 26 and 27: when npm run dev starts, Terminal shows a “Network” address (like http://192.168.1.5:3000). Open it on a phone on the same Wi-Fi.', 30)
pair('Sample files', 'Steps that need a file name it — open http://localhost:3000/uat-files/ plus the file name to download it.', 18)
pair('Not in 2.0 on purpose', 'Journey mode (2.0 moves leads stage by stage) and Archive (2.0 uses Delete with a Deleted list). '
     'Their buttons answer “Coming soon in OpenMaison 2.0” — that is expected, not a bug.', 44)
pair('Something else?', 'Anything the story does not cover — especially something you did in 1.0 and cannot find here — goes in “UAT · Missing or other”.', 30)
pair('Questions', 'Ask Vicky or Dane.', 18)
gap()
put('Example of a filled row', size=13, bold=True)
ex_hdr = ['Step', 'Try this', 'Result', 'What happened']
ex = ['4.03', 'Add a lead with a phone number that already exists', RESULTS[1], 'The warning came up, but I expected it to also show the lead’s stage.']
for i, (h, v) in enumerate(zip(ex_hdr, ex)):
    pair(h, v)
if files:
    gap()
    put('Sample files', size=13, bold=True)
    for x in files:
        pair(x['name'], f"http://localhost:3000/uat-files/{x['name']} — {x.get('purpose', '')}", 30 if len(x.get('purpose', '')) > 80 else None)

wb.move_sheet('UAT · Lists', offset=len(wb.sheetnames))
wb.save(OUT)
print(f'saved {OUT}')
print(f'steps: {len(steps)} · by chapter: ' + ', '.join(f"{n}:{sum(1 for s in steps if s['chapter']==n)}" for n in range(1, 28)))
print(f'checklist rows: {len(checklist)} · built-like without a step (Team check): {len(gap_rows)}')

