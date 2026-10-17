"""(gaps build F1 — money out, F1-Q10) The demo's supplier bills as real PDFs → public/uat-files/. Two are recorded by the repair (R83 keeps their
bytes with the bill: Woodcraft's WC-2391 on Ryan D'Souza's project, AquaFlow's AF-7781 on Benjamin Han's); two are for the demo's own upload —
ColourPro's CP-0412 (Benjamin's painting, no PO) and PrintHub's PH-2210 (the studio's overhead, a vendor not yet in the directory).
Run: python3 scripts/finance-sample-bills.py public/uat-files

The writer is the UAT's (design-source/uat/gen_files.py): Helvetica, WinAnsi text, one op per column — so pdf.js reads each row as one line with
wide gaps between its columns, the way a supplier's accounting system prints."""
import io, os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else 'public/uat-files'
os.makedirs(OUT, exist_ok=True)

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
    def text(self, x, y, s, size=10, bold=False, right=False):
        if right:  # right-aligned: Helvetica's average width is about half the size per character
            x = x - len(s) * size * 0.5
        self.ops.append(f'BT /{"F2" if bold else "F1"} {size} Tf {x:.1f} {y} Td ({esc(s)}) Tj ET')
    def line(self, x1, y1, x2, y2, width=0.5):
        self.ops.append(f'{width} w {x1} {y1} m {x2} {y2} l S')

def write_pdf(name, pages, title):
    objs = []
    def add(b): objs.append(b); return len(objs)
    font1 = add(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
    font2 = add(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
    content_ids = []
    for p in pages:
        stream = '\n'.join(p.ops).encode('latin-1')
        content_ids.append(add(b'<< /Length %d >>\nstream\n' % len(stream) + stream + b'\nendstream'))
    pages_id = len(objs) + len(pages) + 1
    kids = [add(f'<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 {font1} 0 R /F2 {font2} 0 R >> >> /Contents {cid} 0 R >>'.encode()) for cid in content_ids]
    assert add(f'<< /Type /Pages /Kids [{" ".join(f"{k} 0 R" for k in kids)}] /Count {len(kids)} >>'.encode()) == pages_id
    info = add(f'<< /Title ({esc(title)}) /Producer (OpenMaison demo) >>'.encode('latin-1'))
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

def money(c): return f'{c / 100:,.2f}'

def bill(name, vendor, address, uen, gst_reg, ref, issued, due, bill_to, project, lines, gst_pct):
    p = Page(); y = 790
    p.text(48, y, vendor, size=16, bold=True); y -= 18
    for a in address: p.text(48, y, a, size=9); y -= 12
    p.text(48, y, f'UEN {uen}' + (f'   GST Reg. No. {gst_reg}' if gst_reg else ''), size=9); y -= 30
    p.text(48, y, 'TAX INVOICE' if gst_reg else 'INVOICE', size=13, bold=True); y -= 24
    p.text(48, y, f'Invoice No: {ref}'); p.text(330, y, f'Invoice Date: {issued}'); y -= 15
    p.text(48, y, f'Bill To: {bill_to}'); p.text(330, y, f'Due Date: {due}'); y -= 15
    if project: p.text(48, y, f'Project: {project}'); y -= 15
    y -= 16
    p.line(48, y + 12, 547, y + 12)
    p.text(48, y, 'Description', bold=True); p.text(330, y, 'Qty', bold=True); p.text(400, y, 'Unit Price', bold=True); p.text(490, y, 'Amount', bold=True)
    y -= 6; p.line(48, y, 547, y); y -= 16
    sub = 0
    for d, q, u in lines:
        amt = round(q * u); sub += amt
        p.text(48, y, d); p.text(330, y, f'{q:g}'); p.text(400, y, money(u)); p.text(490, y, money(amt)); y -= 16
    y -= 4; p.line(330, y + 10, 547, y + 10); y -= 6
    gst = round(sub * gst_pct / 100) if gst_reg else 0
    p.text(400, y, 'Subtotal'); p.text(490, y, f'S${money(sub)}'); y -= 16
    if gst_reg: p.text(400, y, f'GST {gst_pct}%'); p.text(490, y, f'S${money(gst)}'); y -= 16
    p.text(400, y, 'Total', bold=True); p.text(490, y, f'S${money(sub + gst)}', bold=True); y -= 40
    p.text(48, y, 'Payment by bank transfer or PayNow to the UEN above. Please quote the invoice number.', size=9)
    write_pdf(name, [p], f'{vendor} {ref}')
    return sub, gst, sub + gst

out = []
out.append(('woodcraft-bill-WC-2391.pdf',) + bill('woodcraft-bill-WC-2391.pdf', 'Woodcraft Carpentry Pte Ltd', ['21 Kaki Bukit Road 3, #05-12 Eunos Techpark', 'Singapore 417818'], '201534567K', 'M90-0345678-K',
    'WC-2391', '25/09/2026', '09/10/2026', 'Demo Studio Pte Ltd', 'Executive Condo — Ryan D’Souza (PO-2026-001)',
    [('Kitchen carpentry, top and bottom cabinets — installed', 1, 420000), ('Wardrobe, master bedroom — installed', 1, 280000)], 9))
out.append(('aquaflow-bill-AF-7781.pdf',) + bill('aquaflow-bill-AF-7781.pdf', 'AquaFlow Plumbing Works', ['Blk 3011 Bedok Industrial Park E, #01-2040', 'Singapore 489977'], '53412788B', '',
    'AF-7781', '16/09/2026', '30/09/2026', 'Demo Studio Pte Ltd', 'HDB 5-Room — Benjamin Han (PO-2026-005)',
    [('Plumbing works, kitchen and bathrooms', 1, 140000)], 9))
out.append(('colourpro-bill-CP-0412.pdf',) + bill('colourpro-bill-CP-0412.pdf', 'ColourPro Painting Services', ['10 Ubi Crescent, #03-41 Ubi Techpark', 'Singapore 408564'], '201812345D', 'M90-0812345-D',
    'CP-0412', '05/10/2026', '19/10/2026', 'Demo Studio Pte Ltd', 'HDB 5-Room — Benjamin Han',
    [('Painting, whole unit — sealer and first coat', 1, 75000)], 9))
out.append(('printhub-bill-PH-2210.pdf',) + bill('printhub-bill-PH-2210.pdf', 'PrintHub Singapore', ['8 Burn Road, #02-09 Trivex', 'Singapore 369977'], '201977881R', 'M91-1977881-R',
    'PH-2210', '03/10/2026', '17/10/2026', 'Demo Studio Pte Ltd', '',
    [('A1 plotting of design drawings', 12, 650), ('Binding of design folders', 4, 1200)], 9))
for r in out: print(r)
