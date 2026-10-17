"""The UAT's sample files (REG-669) → public/uat-files/. Spreadsheets, CSV and PDFs here; images in gen_images.cjs."""
import csv, io, os, sys
from openpyxl import Workbook
from openpyxl.styles import Font

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

def tsv(block):
    return [line.split('\t') for line in block.strip('\n').split('\n')]

def xlsx(name, rows, text=False):
    wb = Workbook(); ws = wb.active; ws.title = 'Sheet1'
    for r, row in enumerate(rows, start=1):
        for c, v in enumerate(row, start=1):
            if v is None or v == '': continue
            if not text and r > 1:
                try: v = int(v) if str(v).lstrip('-').isdigit() else float(v)
                except ValueError: pass
            cell = ws.cell(row=r, column=c, value=v)
            if text: cell.number_format = '@'
            cell.font = Font(name='Arial', bold=(r == 1))
    for c in range(1, len(rows[0]) + 1):
        ws.column_dimensions[chr(64 + c)].width = max(12, min(48, max(len(str(r[c - 1])) if c - 1 < len(r) else 0 for r in rows) + 2))
    wb.save(os.path.join(OUT, name))

# ── spreadsheets ────────────────────────────────────────────────────────────────────────────────
xlsx('new-leads.xlsx', [
    ['Lead Name', 'Lead Phone Number', 'Lead Email', 'Lead Source', 'Property Type', 'Property Address', 'District', 'Estimated Budget (S$)', 'Key Collection', 'Condition', 'Remarks'],
    ['Aaron Goh', '91335520', 'aaron.goh@example.com', 'Instagram', 'HDB 5-Room', 'Blk 812 Woodlands Street 81', 'North', '72000', 'in 6 months', 'Resale', 'Wants an open kitchen and more storage.'],
    ['Priscilla Low', '82661047', 'priscilla.low@example.com', 'Facebook', 'Condo 3-bedder', 'The Florence Residences, Hougang', 'North East', '110000', 'Collected', 'New', 'Prefers weekend calls.'],
    ['Hakim Salleh', '93802215', 'hakim.salleh@example.com', 'Qanvast', 'BTO 4-Room', 'Tengah Plantation Loop', 'West', '55000', 'in 3 months', 'New', 'Qanvast enquiry, BTO keys in December.'],
    ['Gerald Tan', '98873012', 'gerald.tan@example.com', 'Referral', 'Executive Condo', 'North Gaia, Yishun', 'North', '120000', '', '', 'Asked again through a friend.'],
    ['', '90012233', '', 'Website', '', '', '', '', '', '', 'Enquiry form left the name blank.'],
], text=True)
xlsx('sophia-items-to-paste.xlsx', tsv('''Item	Description	Qty	Unit	Cost	Unit Price	Category	Room
Hacking of kitchen floor and wall tiles	Hack and cart away existing tiles	1	Lot	1400	1800	Hacking	Kitchen
Waterproofing to bathroom floors	3-coat membrane with upturn	2	Lot	260	350	Masonry	Bathrooms
Homogeneous floor tiles, supply and lay	600 × 600 mm, kitchen and yard	140	sqft	8	11	Masonry	Kitchen
Kitchen top and bottom cabinets	Laminate finish, soft-closing hinges	22	ft run	190	250	Carpentry	Kitchen
Quartz countertop	With sink and hob cut-outs	11	ft run	120	170	Carpentry	Kitchen
Full-height wardrobe	Swing doors, master bedroom	10	ft run	240	330	Carpentry	Master Bedroom
Lighting points	New points with wiring	16	point	45	65	Electrical	Whole unit
Painting, whole unit	Nippon Vinilex, two coats	1	Lot	1300	1800	Painting	Whole unit'''))
xlsx('gerald-tan-old-quote.xlsx', tsv('''Trade	Item	Qty	Unit	Rate	Amount
Carpentry	Kitchen cabinets, top and bottom	24	ft run	260	6240
Carpentry	Full-height wardrobe, master bedroom	12	ft run	320	3840
Electrical	Lighting points	20	point	60	1200
Electrical	Power points	12	point	70	840
Painting	Painting, whole unit	1	Lot	2200	2200
Plumbing	Kitchen sink and washer points	2	point	280	560'''))
rival = tsv('''Item	Qty	Unit	Rate	Amount	Trade	Area
Hack existing kitchen floor and wall tiles	1	Lot	1500	1500	Hacking	Kitchen
Supply and lay homogeneous floor tiles	140	sqft	10	1400	Masonry	Kitchen
Kitchen top and bottom cabinets with Blum soft-closing hinges	22	ft run	230	5060	Carpentry	Kitchen
Laminate countertop	11	ft run	90	990	Carpentry	Kitchen
Full-height wardrobe, swing doors	10	ft run	180	1800	Carpentry	Master Bedroom
Lighting points	16	point	60	960	Electrical	Whole unit
KDK ceiling fan points	2	point	130	260	Electrical	Living
Painting to the entire unit, Dulux	1	Lot	1500	1500	Painting	Whole unit
Design and 3D drawings	1	Lot	0	0	Design
Haulage and disposal of debris	1	Lot	0	0	Hacking	Whole unit''')
xlsx('rival-quote-urban-nest.xlsx', rival)

# ── CSV ─────────────────────────────────────────────────────────────────────────────────────────
with open(os.path.join(OUT, 'supplier-price-list.csv'), 'w', newline='', encoding='utf-8') as fh:
    fh.write('''Item,Kind,Description,Unit,Cost,Markup,Category,Vendor
"Shower screen, tempered glass",Purchase,"10 mm clear tempered glass, fixed panel with hinged door",set,650.00,250.00,Glass & Mirror,Glass Studio SG
"Vinyl flooring, supply and install",Purchase,5 mm SPC vinyl planks with underlay,sqft,5.80,1.50,Flooring,Floor Xpert
Feature wall wallpaper,Purchase,"Textured vinyl wallpaper, supply and hang",sqft,3.20,1.30,Painting,Wallpaper Hub
"Shower screen, tempered glass",Purchase,"10 mm clear tempered glass, fixed panel with hinged door",set,640.00,260.00,Glass & Mirror,Glass Studio SG
''')

# ── A WhatsApp chat export (S43B · F1-01: Auto Fill reads its words by rule — 5.11) ──────────────────────────────────────
with open(os.path.join(OUT, 'sophia-whatsapp-chat.txt'), 'w', encoding='utf-8') as fh:
    fh.write('''8/10/2026, 6:58 pm - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
8/10/2026, 7:02 pm - Dane: Hi Sophia, this is Dane from Demo Studio — thanks for your enquiry about your home.
8/10/2026, 7:15 pm - Sophia Wong: Hi Dane! We collect the keys next month. Could we meet at your showroom on Saturday 3pm?
8/10/2026, 7:16 pm - Dane: Saturday 3pm works — see you at the showroom then.
''')

# ── PDFs (a minimal writer: Helvetica, WinAnsi text, lines and rectangles) ─────────────────────────
def esc(s):
    out = []
    for ch in s.encode('cp1252'):
        c = chr(ch)
        if c in '()\\': out.append('\\' + c)
        elif ch > 126 or ch < 32: out.append('\\%03o' % ch)
        else: out.append(c)
    return ''.join(out)

class Page:
    def __init__(self): self.ops = []
    def text(self, x, y, s, size=11, bold=False):
        self.ops.append(f'BT /{"F2" if bold else "F1"} {size} Tf {x} {y} Td ({esc(s)}) Tj ET')
    def rect(self, x, y, w, h, width=1):
        self.ops.append(f'{width} w {x} {y} {w} {h} re S')
    def line(self, x1, y1, x2, y2, width=0.5):
        self.ops.append(f'{width} w {x1} {y1} m {x2} {y2} l S')

def write_pdf(name, pages, title):
    objs = []
    def add(b): objs.append(b); return len(objs)
    font1 = add(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
    font2 = add(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
    pages_id = len(objs) + 1 + 2 * len(pages)   # placeholder index computed below
    kids = []
    content_ids = []
    for p in pages:
        stream = '\n'.join(p.ops).encode('latin-1')
        cid = add(b'<< /Length %d >>\nstream\n' % len(stream) + stream + b'\nendstream')
        content_ids.append(cid)
    pages_id = len(objs) + len(pages) + 1
    for cid in content_ids:
        kids.append(add(f'<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 {font1} 0 R /F2 {font2} 0 R >> >> /Contents {cid} 0 R >>'.encode()))
    assert add(f'<< /Type /Pages /Kids [{" ".join(f"{k} 0 R" for k in kids)}] /Count {len(kids)} >>'.encode()) == pages_id
    info = add(f'<< /Title ({esc(title)}) /Producer (OpenMaison UAT) >>'.encode('latin-1'))
    cat = add(f'<< /Type /Catalog /Pages {pages_id} 0 R >>'.encode())
    buf = io.BytesIO(); buf.write(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
    offs = []
    for i, o in enumerate(objs, start=1):
        offs.append(buf.tell()); buf.write(f'{i} 0 obj\n'.encode() + o + b'\nendobj\n')
    x = buf.tell()
    buf.write(f'xref\n0 {len(objs) + 1}\n0000000000 65535 f \n'.encode())
    for o in offs: buf.write(f'{o:010d} 00000 n \n'.encode())
    buf.write(f'trailer\n<< /Size {len(objs) + 1} /Root {cat} 0 R /Info {info} 0 R >>\nstartxref\n{x}\n%%EOF\n'.encode())
    open(os.path.join(OUT, name), 'wb').write(buf.getvalue())

# Homematch lead sheet — exactly the lines the reader expects, nothing else on the page.
p = Page(); y = 780
for line in ['Homematch', 'Lead sheet exported 25 September 2026', '',
             'Name: Vanessa Ho', 'Phone: 9451 7730', 'Email: vanessa.ho@example.com', 'Property type: HDB 3-Room', 'Address: Blk 45 Lorong 5 Toa Payoh',
             'District: Central', 'Budget (S$): 38,000', 'Key collection: Collected', 'Remarks: Kitchen and two bathrooms only', '',
             'Name: Samuel Yeo', 'Phone: 8732 9014', 'Email: samuel.yeo@example.com', 'Property type: Condo 2-bedder', 'Address: Treasure at Tampines',
             'District: East', 'Budget (S$): 68,000', 'Key collection: in 6 months', 'Remarks: New launch, wants a warm modern look']:
    if line: p.text(56, y, line, size=14 if line == 'Homematch' else 11, bold=(line == 'Homematch'))
    y -= 22 if line == '' else 17
write_pdf('homematch-lead-sheet.pdf', [p], 'Homematch lead sheet')

# One client's enquiry (S42F — Fill from a document reads the picked file's own words): labelled lines, one lead, nothing else that reads as a
# name, a phone or an email. Its values match no demo lead, member or other UAT file.
p = Page(); y = 780
for line in ['Website enquiry', 'Sent from the studio website contact form', '',
             'Name: Rachel Ong', 'Mobile: 9634 2817', 'Email: rachel.ong@example.com', 'Source: Instagram', 'Property type: Condo 3-bedder',
             'Address: 12 Simei Street 3', 'District: East', 'Budget (S$): 85,000', 'Remarks: Wants a brighter kitchen and a study nook for two']:
    if line: p.text(56, y, line, size=14 if line == 'Website enquiry' else 11, bold=(line == 'Website enquiry'))
    y -= 22 if line == '' else 17
write_pdf('rachel-ong-enquiry.pdf', [p], 'Website enquiry — Rachel Ong')

# Sophia's floor plan — a sketch.
p = Page()
p.text(56, 780, 'Sophia Wong — 4-room HDB, Blk 201 Tampines Street 21 — floor plan (sample)', size=12, bold=True)
p.rect(80, 300, 440, 420, 2)
p.line(300, 300, 300, 560); p.line(80, 560, 520, 560); p.line(400, 560, 400, 720); p.line(300, 450, 520, 450)
for (x, y_, s) in [(150, 640, 'Living & Dining'), (420, 640, 'Master Bedroom'), (320, 500, 'Bedroom 2'), (320, 380, 'Bedroom 3'), (140, 420, 'Kitchen'), (140, 340, 'Yard'), (430, 590, 'Bath')]:
    p.text(x, y_, s, size=10)
p.text(56, 260, 'Not to scale. Sample file for the OpenMaison 2.0 user acceptance test.', size=9)
write_pdf('sophia-floor-plan.pdf', [p], 'Sophia Wong floor plan (sample)')

# Cove Interior's quotation — a table with the 20 lines the reader knows.
rows = [l.split(' · ') for l in '''Design Services · — · Design consultation, space planning and 3D drawings · 1 · Lot · 0
Wet Works · Kitchen · Hacking of existing kitchen floor and wall tiles · 1 · Lot · 1,500
Wet Works · Kitchen · Supply and lay homogeneous floor tiles · 140 · sqft · 2,240
Wet Works · Common Bathroom · Hacking of existing bathroom tiles and fittings · 1 · Lot · 1,100
Wet Works · Common Bathroom · Waterproofing, screeding and laying of floor and wall tiles · 300 · sqft · 4,200
Wet Works · Whole unit · Debris disposal · 1 · Lot · 1,200
Plumbing Works · Kitchen · New plumbing points for sink and washer · 2 · point · 800
Plumbing Works · Common Bathroom · New plumbing points for WC, basin, shower and heater · 4 · point · 1,500
Electrical Works · Whole unit · Rewiring of the entire unit with new DB box · 1 · Lot · 3,800
Electrical Works · Whole unit · Lighting points · 20 · point · 1,300
Electrical Works · Whole unit · Power points · 16 · point · 1,200
Carpentry Works · Kitchen · Kitchen top and bottom cabinets, Blum soft-closing hinges · 30 · ft run · 7,200
Carpentry Works · Kitchen · Quartz countertop · 12 · ft run · 2,400
Carpentry Works · Master Bedroom · Full-height wardrobe with swing doors · 12 · ft run · 4,200
Carpentry Works · Living & Dining · TV feature wall with console · 1 · Lot · 3,200
Carpentry Works · Living & Dining · Shoe cabinet · 1 · Lot · 1,400
Ceiling Works · Living & Dining · L-box false ceiling · 32 · ft run · 2,240
Painting Works · Whole unit · Painting to the entire unit, Dulux · 1 · Lot · 1,900
Glass Works · Common Bathroom · Tempered glass shower screen with door · 1 · set · 900
Cleaning · Whole unit · Chemical wash and handover cleaning · 1 · Lot · 400'''.split('\n')]
p = Page()
p.text(40, 790, 'Cove Interior — Quotation', size=16, bold=True)
p.text(40, 770, 'Prepared for: Sophia Wong · Blk 201 Tampines Street 21 · 4-room HDB', size=9)
X = [40, 118, 200, 440, 470, 505]; y = 740
for i, h in enumerate(['Trade', 'Area', 'Item', 'Qty', 'Unit', 'Amount S$']): p.text(X[i], y, h, size=8, bold=True)
p.line(40, y - 5, 560, y - 5)
y -= 20
for r in rows:
    item = r[2] if len(r[2]) <= 50 else r[2][:48] + '…'
    for i, v in enumerate([r[0], r[1], item, r[3], r[4], r[5]]): p.text(X[i], y, v, size=7.5)
    y -= 16
p.line(40, y + 8, 560, y + 8)
p.text(440, y - 8, 'Total S$42,680', size=10, bold=True)
write_pdf('cove-interior-quotation.pdf', [p], 'Cove Interior Quotation')

# Gerald Tan's signed paper contract.
p = Page(); y = 780
for line, size, bold in [('DEMO STUDIO PTE LTD — RENOVATION AGREEMENT', 13, True), ('', 0, False),
                         ('Client: Gerald Tan · Phone 9887 3012 · Executive Condo', 11, False), ('Scope: as per quotation discussed at the site meeting.', 11, False),
                         ('Contract sum: S$48,500.00 (inclusive of GST).', 11, False), ('Payment: 10% on signing, 30% on commencement, 30% on carpentry, 30% on handover.', 11, False),
                         ('', 0, False), ('', 0, False), ('Signed for Demo Studio: Dane', 11, False), ('Signed by the client: Gerald Tan', 11, False), ('Date: 25 September 2026', 11, False)]:
    if line: p.text(56, y, line, size=size, bold=bold)
    y -= 24
p.line(56, 572, 250, 572); p.line(320, 572, 520, 572)
write_pdf('gerald-tan-signed-contract.pdf', [p], 'Gerald Tan renovation agreement (signed)')
print('files written to', OUT)
