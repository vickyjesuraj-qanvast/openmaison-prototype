# The living room's empty plate (pending modules S43C): the owner's photo with every loose piece taken out — made from the photo itself,
# plane by plane: a wall is filled from the wall around the hole (Laplace, inside that wall's own plane), the curtains are carried down
# their own folds, the balcony's railing is continued at its own spacing, the floor is the visible floor's light carried under the rug
# (its sun patches and the window's reflections kept), joinery is continued along its own lines. What stays in the plate: the curtains,
# the console, the wall panels, the window. Output: public/visualizer/samples/living-room/defurnished.jpg
# Usage (from the repo, Python 3 + numpy + opencv-python-headless): python scripts/viz/plate/plate.py — the stages go to $PLATE_OUT (or
# scripts/viz/plate/.out); look at the plate beside the photo, then run scripts/viz/remove-test.mts.
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
rng = np.random.default_rng(11)
orig = to_f(img8)
out = orig.copy()
yy, xx = np.mgrid[0:H, 0:W]; X = (xx + 0.5) / W; Y = (yy + 0.5) / H
def B(x): return 0.556 + 0.36 * (x - 0.746)     # the console top's back edge (meets the wall)
def F(x): return 0.566 + 0.46 * (x - 0.746)     # the console top's front edge (its lit lip)
def FLs(x): return 0.6 + (0.745 - 0.6) * (0.3035 - x) / 0.3035   # the side wall's foot (hidden behind the sofa — read off the room's lines)
def noise(sig, blur=0.7): return cv2.GaussianBlur(rng.normal(0, sig, (H, W)).astype(np.float32), (0, 0), blur)[..., None]
def put(fill, region, n=0.0):
    global out
    a = np.clip(region, 0, 1)[..., None]
    f = fill + (noise(n) if n else 0)
    out = out * (1 - a) + f * a
def soft(m, r=1.2): return np.clip(cv2.GaussianBlur(m, (0, 0), r), 0, 1)
def columns_down(region, src_rows, base=None, gain=None):
    """each column of `region` takes its own colour from `src_rows` (a band of rows above, in the same column), times a vertical gain"""
    global out
    src = out if base is None else base
    a = src_rows
    res = out.copy()
    for x in range(W):
        col = region[:, x] > 0.5
        if not col.any(): continue
        s = a[:, x] > 0.5
        if not s.any(): continue
        c = src[s, x].mean(0)
        ys_ = np.where(col)[0]
        for y in ys_:
            g = gain(y / H) if gain else 1.0
            res[y, x] = c * g
    return res

# ── the planes ──
_X4 = (np.arange(W * 4) + 0.5) / (W * 4); _Y4 = (np.arange(H * 4) + 0.5) / (H * 4); _XX, _YY = np.meshgrid(_X4, _Y4)
side = cv2.resize(((_XX <= 0.3035) & (_YY < FLs(_XX))).astype(np.float32), (W, H), interpolation=cv2.INTER_AREA)   # anti-aliased along its foot
tvwall = ((X >= 0.806) & (X <= 0.979) & (Y < B(X) - 0.001)).astype(np.float32)
col1 = ((X >= 0.776) & (X < 0.806) & (Y < B(X) - 0.001)).astype(np.float32)
ret = ((X >= 0.7535) & (X < 0.776) & (Y > 0.12) & (Y < B(X) - 0.001)).astype(np.float32)
col2 = ((X > 0.979) & (Y < B(X) - 0.001)).astype(np.float32)
ctop = ((X >= 0.744) & (Y >= B(X) - 0.001) & (Y <= F(X) + 0.004) & (X <= 1.0)).astype(np.float32)

# ── 1 · the art (and its shade) off the panelled wall ──
art = np.maximum.reduce([dil(M('art'), 4), M([[0.088, 0.092], [0.112, 0.092], [0.112, 0.476], [0.088, 0.476]]), M([[0.1, 0.455], [0.245, 0.455], [0.245, 0.478], [0.1, 0.478]])])
dom = side * (Y < 0.495)
put(harmonic_in(orig, 1 - art, dom), art * dom, 1.0)

# ── 2 · the TV wall: the TV, its glow and shade, the soundbar, the branches ──
shade = M([[0.933, 0.226], [0.976, 0.226], [0.976, 0.565], [0.933, 0.565]])
halo = M([[0.8, 0.3], [0.936, 0.212], [0.936, 0.24], [0.8, 0.33]])
# the soundbar's shade on the wall just above the console top
sbshade = M([[0.8, 0.548], [0.95, 0.598], [0.95, 0.64], [0.8, 0.59]])
rm_tv = np.maximum.reduce([dil(M('tv'), 3), shade, halo, dil(M('soundbar'), 3), dil(M('consoleplant'), 6), sbshade])
put(harmonic_in(orig, 1 - rm_tv, tvwall), rm_tv * tvwall, 0.9)
# the panel grooves run on to the console: their own profile, copied down where the TV hid them
for gx in (0.8625, 0.9432):
    x0 = int(gx * W)
    ref_y = slice(int(0.05 * H), int(0.18 * H))
    prof = orig[ref_y, x0 - 3:x0 + 4].mean(0) / np.maximum(orig[ref_y, x0 - 6:x0 + 7].mean((0, 1)), 1)   # 7 columns, ratio to the wall
    for y in range(int(0.2 * H), int(B(gx) * H)):
        if rm_tv[y, x0] < 0.5: continue
        base = out[y, x0 - 6:x0 + 7].mean(0)
        out[y, x0 - 3:x0 + 4] = base[None, :] * prof

# ── 3 · the console's decor (books, a ball) off the oak column and the wall return; the branches off the far column ──
decor = M([[0.752, 0.512], [0.784, 0.512], [0.81, 0.548], [0.812, 0.575], [0.79, 0.578], [0.752, 0.572]])
d1 = dil(decor, 2) * ret
put(harmonic_in(orig, 1 - dil(decor, 2), ret), d1, 0.8)
for colmask, rmm in ((col1, np.maximum(dil(decor, 2), dil(M('tv'), 3))), (col2, dil(M('consoleplant'), 6))):
    reg = colmask * rmm
    for x in range(W):
        ys_ = np.where(reg[:, x] > 0.5)[0]
        if not len(ys_): continue
        y0, y1 = ys_.min(), ys_.max()
        h = y1 - y0 + 1
        src = orig[max(0, y0 - h):y0, x][::-1]
        if len(src) < h: src = np.concatenate([src, np.repeat(src[-1:], h - len(src), 0)])
        out[y0:y1 + 1, x] = src[:h]
# ── 4 · the console top, continued along its length where the soundbar, the decor and the vase stood ──
rm_top = np.maximum.reduce([dil(M('soundbar'), 3), dil(decor, 2), dil(M('consoleplant'), 4)]) * ctop
put(harmonic_in(out, 1 - rm_top, ctop, iters=1500), rm_top, 0.8)

save(out, S + '/plate/stage-upper.jpg')
np.save(S + '/plate/stage-upper.npy', out)
print('upper done')

# ═════════ the lower room ═════════
SOFA = dil(M('sofa'), 2)
TREE = dil(M('tree'), 3)
ARM = dil(M('armchair'), 2)
STOOL = dil(M('stool'), 2)
CT = dil(M('coffeetable'), 2)
LAMP = dil(M('lamp'), 2)
STAB = dil(M('sidetable'), 2)
RUG = dil(M('rug'), 1)
CORNER = M([[0.294, 0.455], [0.395, 0.455], [0.395, 0.512], [0.294, 0.512]])   # the tree's foot and the sofa's back between them

# ── 5 · the lamp's glow leaves the wall with the lamp: the wall's low tones near it go back to the wall's own colour around ──
glow_zone = soft(M([[0, 0.3], [0.13, 0.3], [0.13, 0.62], [0, 0.62]]), 1) * side
ring = side * (Y < 0.5) * (1 - glow_zone) * ((X < 0.3) & (Y > 0.25)).astype(np.float32) * (1 - dil(M('art'), 6))
neutral = harmonic_in(cv2.GaussianBlur(out, (0, 0), 6), ring, side, iters=500)
lowp = cv2.GaussianBlur(out, (0, 0), 6)
d = np.hypot((X - 0.05) / 0.11, (Y - 0.56) / 0.16)
w = np.clip(1.2 - d, 0, 1) ** 1.2 * 0.85 * side
out = out + (neutral - lowp) * w[..., None]

# ── 6 · the side wall's dado zone behind the sofa, the lamp and the side table: the wall carried down to a skirting at its foot ──
rm_side = np.maximum.reduce([SOFA, LAMP, STAB, TREE, CORNER]) * side
dom = side * (Y > 0.4)
known = 1 - rm_side
fillc = harmonic_in(cv2.GaussianBlur(out, (0, 0), 1.2), known, dom, iters=900)
put(fillc, rm_side * dom, 0.9)
# the skirting: a painted board along the foot, its top lip lit, the line under the lip in shade — drawn at 4x and brought down soft
SS = 4
Xs = (np.arange(W * SS) + 0.5) / (W * SS); Ys = (np.arange(H * SS) + 0.5) / (H * SS)
XX, YY = np.meshgrid(Xs, Ys)
yb = FLs(XX); hh = 0.016 + np.clip((0.3035 - XX) / 0.3035, 0, 1) * 0.011
t = (YY - (yb - hh)) / hh
board = ((t >= 0) & (t <= 1) & (XX <= 0.3035)).astype(np.float32)
lip = ((t >= 0) & (t < 0.12)).astype(np.float32) * board
shd = ((t >= 0.12) & (t < 0.22)).astype(np.float32) * board
down = lambda m: cv2.resize(m, (W, H), interpolation=cv2.INTER_AREA)
board, lip, shd = down(board), down(lip), down(shd)
gain = (1.035 * (board - lip - shd) + 1.1 * lip + 0.86 * shd) / np.maximum(board, 1e-6)
a = board * np.clip(rm_side * 2, 0, 1)
out = out * (1 - a[..., None]) + (fillc * gain[..., None]) * a[..., None]
save(out, S + '/plate/stage-side.jpg')
np.save(S + '/plate/stage-side.npy', out)
print('side done')

# ── 7 · the curtains carried down their own folds behind the tree, the sofa, the armchair and the side stool ──
def profile(x0, x1, y0, y1, ref0, ref1):
    """a curtain's vertical light, measured where it shows all the way down (the right drape, the right sheer's free strip)"""
    ys_ = np.arange(int(y0 * H), int(y1 * H))
    v = np.array([orig[y, int(x0 * W):int(x1 * W)].mean() for y in ys_])
    ref = orig[int(ref0 * H):int(ref1 * H), int(x0 * W):int(x1 * W)].mean()
    g = cv2.GaussianBlur((v / ref).reshape(-1, 1).astype(np.float32), (1, 0), 2).ravel()
    return lambda y: float(np.interp(y, ys_ / H, g))
g_drape = profile(0.715, 0.75, 0.21, 0.622, 0.26, 0.34)
g_sheer = profile(0.7, 0.707, 0.21, 0.615, 0.3, 0.4)
CL = M('curtainL'); CR = M('curtainR')
hideL = np.maximum.reduce([dil(M('tree'), 5), dil(M('sofa'), 5), CT, CORNER]) * CL
drapeL = hideL * (X < 0.377); sheerL = hideL * (X >= 0.377)
def blend_into(fill, reg, domain):
    """the fill's own folds, its light matched to the curtain around the hole (the difference at the hole's rim, Laplace-filled inside)"""
    known = domain * (1 - (reg > 0.02))
    diff = harmonic_in(orig - fill, known, domain, iters=700)
    return fill + cv2.GaussianBlur(diff, (0, 0), 1.5)
g_drape_c = lambda y: min(1.05, g_drape(y))
for reg, rows, gfun, shift, dom in ((drapeL, ((Y > 0.26) & (Y < 0.34)), g_drape_c, 0.022, CL * (X < 0.377)), (sheerL, ((Y > 0.28) & (Y < 0.5)), lambda y: g_sheer(y) / max(1e-3, g_sheer(0.4)), 0.0, CL * (X >= 0.377))):
    src = rows.astype(np.float32) * CL * (1 - hideL) * (1 - dil(M('tree'), 8))
    col = columns_down(reg, src, base=orig, gain=lambda y, g=gfun, s=shift: g(min(0.62, y + s)))
    col = blend_into(col, reg, dom)
    put(col, soft(reg, 0.8), 1.0)
hideR = np.maximum.reduce([ARM, STOOL]) * CR * (X < 0.708)
src = ((Y > 0.42) & (Y < 0.5)).astype(np.float32) * CR * (X < 0.708) * (1 - hideR)
col = columns_down(hideR, src, base=orig, gain=lambda y: g_sheer(min(0.615, y)) / max(1e-3, g_sheer(0.46)))
col = blend_into(col, hideR, CR * (X < 0.708))
put(col, soft(hideR, 0.8), 1.0)

# ── 8 · the balcony door's lower glass: the railing and the trees behind it continued at the railing's own spacing ──
glass = ((X >= 0.4305) & (X <= 0.662) & (Y >= 0.43) & (Y <= 0.599)).astype(np.float32)
hideG = np.maximum.reduce([SOFA, CT, dil(M('armchair'), 5)]) * glass
mull = ((X >= 0.4865) & (X <= 0.5015)).astype(np.float32) * hideG     # the door's mullion: straight down
for x in range(W):
    ys_ = np.where(mull[:, x] > 0.5)[0]
    if len(ys_): out[ys_, x] = out[ys_.min() - 1, x]
# the railing and the trees below the handrail: each column carried down from its own visible run under the handrail (bars stay where
# they are, the trees go on as trees), the balcony's edge strip along its own row at the railing's spacing
period = 8.2
y_rail, y_edge = int(0.476 * H), int(0.584 * H)
body = hideG * (1 - mull) * (Y < 0.584)
res = out.copy()
n_fix = 16   # one band of rows under the handrail, the same for every column — the copies line up across the door
done = np.zeros((H, W), bool)
for x in range(W):
    ys_ = np.where(body[:, x] > 0.5)[0]
    if not len(ys_): continue
    if all(hideG[y, x] < 0.5 for y in range(y_rail, y_rail + n_fix)):
        run = out[y_rail:y_rail + n_fix, x]
        for y in ys_:
            if y < y_rail + n_fix: continue
            k = (y - y_rail) % (2 * n_fix)
            res[y, x] = run[k] if k < n_fix else run[2 * n_fix - 1 - k]
            done[y, x] = True
for y, x in zip(*np.where((body > 0.5) & ~done)):
    for k in sorted(range(-20, 21), key=abs):
        sx = int(round(x + k * period))
        if k and 0 <= sx < W and done[y, sx]: res[y, x] = res[y, sx]; break
edge = hideG * (1 - mull) * (Y >= 0.584)
okg = glass * (1 - hideG) * (1 - ((X >= 0.4855) & (X <= 0.5025)).astype(np.float32)) * (Y >= 0.584)
for y, x in zip(*np.where(edge > 0.5)):
    for k in sorted(range(-30, 31), key=abs):
        sx = int(round(x + k * period))
        if k and 0 <= sx < W and okg[y, sx] > 0.5: res[y, x] = out[y, sx]; break
put(res, soft(hideG * (1 - mull), 0.5))

save(out, S + '/plate/stage-curtains.jpg')
np.save(S + '/plate/stage-curtains.npy', out)
print('curtains + glass done')

# ── 9 · the floor: the visible floor carried under everything that stood on it — its light (Laplace from the floor around), the window's
#        reflections running toward the camera (the floor's own streaks), the sun's patches the rug caught, a fine grain ──
def CB(x): return 0.648 + 0.87 * (x - 0.746)          # the console's underside (the floor under it stays as photographed)
floorD = np.where(X <= 0.3035, Y > FLs(X), np.where(X <= 0.7535, Y > 0.6, Y > np.minimum(CB(X), 0.835))).astype(np.float32)
# the side wall's foot anti-aliased (4x), so the floor meets the skirting along a clean line
_X4 = (np.arange(W * 4) + 0.5) / (W * 4); _Y4 = (np.arange(H * 4) + 0.5) / (H * 4); _XX, _YY = np.meshgrid(_X4, _Y4)
_aa = cv2.resize(((_YY > FLs(_XX)) | (_XX > 0.3035)).astype(np.float32), (W, H), interpolation=cv2.INTER_AREA)
floorD = np.where(X <= 0.31, np.minimum(_aa, np.where(X <= 0.3035, 1.0, floorD)), floorD).astype(np.float32)
floorD *= (1 - np.maximum(CL, CR))
console_faces = np.maximum(M([[0.743, 0.565], [0.955, 0.66], [0.955, 0.8], [0.743, 0.648]]), M([[0.955, 0.66], [1, 0.66], [1, 0.83], [0.955, 0.8]]))
floorD *= (1 - console_faces)
def drop(m, n):   # a piece's contact shade: its outline slid down a few pixels
    acc = m.copy()
    for k in range(1, n + 1): acc = np.maximum(acc, np.roll(m, k, axis=0) * (1 - k / (n + 1) * 0.3))
    return acc
pieces = np.maximum.reduce([SOFA, RUG, CT, STAB, ARM, STOOL])
shades = np.maximum.reduce([drop(SOFA, 9), drop(CT, 12), drop(dil(M('sidetable'), 4), 16), drop(dil(M('armchair'), 3), 9), drop(dil(M('stool'), 3), 10),
    M([[0.0, 0.835], [0.165, 0.835], [0.165, 0.945], [0.0, 0.945]]), M([[0.578, 0.612], [0.708, 0.612], [0.708, 0.68], [0.578, 0.68]]),
    soft(M([[0.445, 0.94], [0.575, 0.94], [0.585, 1.0], [0.435, 1.0]]), 4)])   # the coffee table's walnut drum mirrored in the polished floor
holeF = np.clip(np.maximum(pieces, shades), 0, 1) * floorD
knownF = floorD * (1 - dil((holeF > 0.02).astype(np.float32), 4))
smooth_out = cv2.GaussianBlur(out, (0, 0), 2.5)
baseF = harmonic_in(smooth_out, knownF, floorD, iters=2500)
# the window's reflections: the visible front strip's own vertical streaks, carried up toward the window, fading with distance
Lf = orig.mean(2)
strip = Lf[int(0.945 * H):int(0.995 * H)].mean(0)
streak = strip - cv2.GaussianBlur(strip.reshape(1, -1).astype(np.float32), (0, 0), 18).ravel()
wy = np.clip((Y - 0.6) / (0.95 - 0.6), 0, 1) ** 0.8
refl = (streak[None, :] * wy)[..., None] * np.array([1.0, 1.0, 1.0], np.float32) * 0.6
# the sun's patches: where the rug was lit, the floor is lit (the rug's light without its weave, its pieces' shade taken out)
rugvis = M('rug') * (1 - np.maximum.reduce([SOFA, CT, ARM, STOOL, drop(SOFA, 10), drop(CT, 14)]))
Lr = cv2.GaussianBlur(Lf * rugvis, (0, 0), 5) / np.maximum(cv2.GaussianBlur(rugvis, (0, 0), 5), 1e-3)
Lr_big = cv2.GaussianBlur(Lf * rugvis, (0, 0), 40) / np.maximum(cv2.GaussianBlur(rugvis, (0, 0), 40), 1e-3)
ratio = np.where(rugvis > 0.5, Lr / np.maximum(Lr_big, 1), 1.0).astype(np.float32)
ratio = harmonic_in(ratio[..., None].repeat(3, 2), (rugvis > 0.5).astype(np.float32), M('rug'), iters=600)[..., 0]
ratio = np.clip(1 + (ratio - 1) * 1.15, 0.7, 1.45)
sunw = soft(M('rug'), 3)
lit = baseF
grain = noise(1.6, 0.6)
# the glass door's own reflection on the polished floor in front of it: the bright strip that shows between the vase and the armchair,
# carried across the door's width and fading toward the room
ref_cols = ((X >= 0.538) & (X <= 0.576)).astype(np.float32) * floorD * (1 - (holeF > 0.02))
rowv = np.array([(orig[y][ref_cols[y] > 0.5].mean(0) if (ref_cols[y] > 0.5).any() else np.zeros(3)) for y in range(H)], np.float32)
has = (ref_cols > 0.5).any(1)
door = ((X >= 0.425) & (X <= 0.67) & (Y >= 0.6) & (Y <= 0.7)).astype(np.float32)
wdoor = soft(door, 6) * np.clip((0.7 - Y) / 0.1, 0, 1) ** 1.5
tgt = np.where(has[:, None, None], rowv[:, None, :], baseF)
lit = lit * (1 - wdoor[..., None] * 0.85) + tgt * (wdoor[..., None] * 0.85)
# the sun's patch across the floor: the beam that shows on the floor right of the rug, carried on where the rug lay (its line and its
# width read off the visible floor), fading in toward the window
yc = 0.778 + 0.42 * (X - 0.8)
beam = np.exp(-((Y - yc) / 0.02) ** 4) * np.clip((X - 0.5) / 0.1, 0, 1)
lit = lit * (1 + 0.42 * beam[..., None])
# the stone's own figure: the visible floor's fine detail (its veins and mottling, the light taken out), quilted over the fill in
# feathered blocks taken from the floor at a like depth — never a smooth plastic patch
hp = orig - cv2.GaussianBlur(orig, (0, 0), 6)
srcok = ero((knownF > 0.5).astype(np.float32) * (1 - console_faces), 6) * (Y > 0.62).astype(np.float32)
srcok *= (np.abs(Y - (0.778 + 0.42 * (X - 0.8))) > 0.05).astype(np.float32)   # never from the sun patch's edges
ys_ok, xs_ok = np.where(srcok > 0.5)
BW, BH, OV = 28, 18, 8
tex = np.zeros_like(orig); wsum = np.zeros((H, W), np.float32)
fy = np.hanning(BH + 2 * OV)[:, None] * np.hanning(BW + 2 * OV)[None, :]
hy, hx = np.where(holeF > 0.02)
if len(hy):
    for by in range(hy.min() - OV, hy.max() + OV, BH):
        for bx in range(hx.min() - OV, hx.max() + OV, BW):
            y0, x0 = by - OV, bx - OV
            y1, x1 = y0 + BH + 2 * OV, x0 + BW + 2 * OV
            if y1 <= 0 or x1 <= 0 or y0 >= H or x0 >= W: continue
            if holeF[max(0, y0):min(H, y1), max(0, x0):min(W, x1)].max() < 0.02: continue
            ty = (y0 + y1) / 2 / H
            cand = np.where(np.abs(ys_ok / H - ty) < 0.06)[0]
            if len(cand) < 50: cand = np.arange(len(ys_ok))
            for t in range(120):
                pool = cand if t < 40 else np.arange(len(ys_ok))
                c = pool[rng.integers(len(pool))]
                sy, sx = ys_ok[c] - (BH + 2 * OV) // 2, xs_ok[c] - (BW + 2 * OV) // 2
                if sy < 0 or sx < 0 or sy + BH + 2 * OV > H or sx + BW + 2 * OV > W: continue
                if srcok[sy:sy + BH + 2 * OV, sx:sx + BW + 2 * OV].min() > 0.5: break
            else:
                continue
            ty0, tx0 = max(0, y0), max(0, x0); ty1, tx1 = min(H, y1), min(W, x1)
            patch = hp[sy + (ty0 - y0):sy + (ty1 - y0), sx + (tx0 - x0):sx + (tx1 - x0)]
            wgt = fy[(ty0 - y0):(ty1 - y0), (tx0 - x0):(tx1 - x0)]
            tex[ty0:ty1, tx0:tx1] += patch * wgt[..., None]; wsum[ty0:ty1, tx0:tx1] += wgt
tex = tex / np.maximum(wsum, 1e-3)[..., None]
floor_fill = lit + refl + grain * 0.5 + tex
put(floor_fill, soft(holeF, 0.6))
save(out, S + '/plate/stage-floor.jpg')
cv2.imwrite(L + '/public/visualizer/samples/living-room/defurnished.jpg', np.clip(out, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])
np.save(S + '/plate/stage-floor.npy', out)
print('floor done')
