"""Re-subset the self-hosted Material Symbols fonts (REG-207) to the icons the app uses.

  python3 scripts/subset-icons.py [extra_icon ...]

Reads public/fonts/ICONS.txt plus any names given, downloads the full variable fonts from the Google CSS API (cached in
/tmp), resolves each name through the font's ligature table (aliases such as `people_alt` map to another glyph), keeps
every `.fill` variant, and writes the two subsets back with the ligature and FILL features intact (rlig · rclt). The
letters and digits stay in the font so the browser can match the ligatures. Then rewrites ICONS.txt sorted.
"""
import io, os, re, subprocess, sys, urllib.request
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, 'public', 'fonts')
CACHE = '/tmp/material-symbols'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
FAMILIES = {
    'rounded': ('Material Symbols Rounded', 'material-symbols-rounded.subset.woff2'),
    'outlined': ('Material Symbols Outlined', 'material-symbols-outlined.subset.woff2'),
}

def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read() if binary else r.read().decode('utf-8')

def full_font(key):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, f'{key}.woff2')
    if os.path.exists(path) and os.path.getsize(path) > 100_000:
        return path
    family = FAMILIES[key][0].replace(' ', '+')
    css = fetch(f'https://fonts.googleapis.com/css2?family={family}:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block')
    m = re.search(r'url\((https://fonts\.gstatic\.com/[^)]+\.woff2)\)', css)
    if not m:
        raise SystemExit(f'no woff2 url in the CSS for {key}')
    data = fetch(m.group(1), binary=True)
    with open(path, 'wb') as f:
        f.write(data)
    return path

def ligature_map(font):
    """name string → ligature glyph, from every LigatureSubst lookup in GSUB."""
    cmap = font.getBestCmap()
    rev = {}
    gsub = font['GSUB'].table
    for lookup in gsub.LookupList.Lookup:
        subtables = lookup.SubTable
        if lookup.LookupType == 7:  # extension
            subtables = [st.ExtSubTable for st in subtables]
        for st in subtables:
            if getattr(st, 'LookupType', None) != 4 and not hasattr(st, 'ligatures'):
                continue
            for first, ligs in st.ligatures.items():
                for lig in ligs:
                    rev[(first,) + tuple(lig.Component)] = lig.LigGlyph
    def name_to_glyphs(name):
        out = []
        for ch in name:
            g = cmap.get(ord(ch))
            if g is None:
                return None
            out.append(g)
        return tuple(out)
    return rev, name_to_glyphs

def main():
    listed = [l.strip() for l in open(os.path.join(FONTS, 'ICONS.txt')) if l.strip()]
    names = sorted(set(listed + sys.argv[1:]))
    for key, (family, out_name) in FAMILIES.items():
        src = full_font(key)
        font = TTFont(src)
        rev, to_glyphs = ligature_map(font)
        glyph_order = set(font.getGlyphOrder())
        keep, missing = set(), []
        for name in names:
            seq = to_glyphs(name)
            lig = rev.get(seq) if seq else None
            if lig is None:
                missing.append(name)
                continue
            keep.add(lig)
            if f'{lig}.fill' in glyph_order:
                keep.add(f'{lig}.fill')
        if missing:
            print(f'  {key}: not in the font — {", ".join(missing)}')
        out = os.path.join(FONTS, out_name)
        cmd = [sys.executable, '-m', 'fontTools.subset', src, f'--glyphs={",".join(sorted(keep))}',
               '--text=abcdefghijklmnopqrstuvwxyz_0123456789', '--layout-features=liga,calt,rlig,rclt', '--no-layout-closure',
               '--flavor=woff2', f'--output-file={out}', '--no-hinting', '--desubroutinize', '--notdef-outline']
        subprocess.run(cmd, check=True)
        print(f'  {key}: {len(keep)} glyphs → {out_name} ({os.path.getsize(out) // 1024} KB)')
    with open(os.path.join(FONTS, 'ICONS.txt'), 'w') as f:
        f.write('\n'.join(names) + '\n')
    print(f'ICONS.txt: {len(names)} names')

if __name__ == '__main__':
    main()
