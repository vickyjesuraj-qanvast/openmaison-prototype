# (pending modules S43C) Helpers for the living room's empty plate (plate.py): the photo, its traced outlines, plane-limited Laplace fills.
# Needs Python 3 with numpy + opencv-python-headless (`python3 -m venv v && v/bin/pip install numpy opencv-python-headless`).
import json, cv2, numpy as np
import os
HERE = os.path.dirname(os.path.abspath(__file__))
L = os.path.abspath(os.path.join(HERE, '..', '..', '..'))   # the repo
S = os.environ.get('PLATE_OUT', os.path.join(HERE, '.out'))   # where the stages go to look at
os.makedirs(S + '/plate', exist_ok=True)
SRC = L + '/public/visualizer/samples/living-room/original.jpg'
img8 = cv2.imread(SRC); H, W = img8.shape[:2]
P = json.load(open(os.path.join(HERE, 'living-room-outlines.json')))   # the living room's traced outlines (the tracer's, in 0…1)
def poly_mask(q, aa=True):
    m = np.zeros((H*4, W*4), np.uint8)
    cv2.fillPoly(m, [np.array([[int(round(x*W*4)), int(round(y*H*4))] for x, y in [(a[0], a[1]) for a in q]], np.int32)], 255)
    return cv2.resize(m, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
def M(name_or_poly): return poly_mask(P[name_or_poly] if isinstance(name_or_poly, str) else name_or_poly)
def dil(m, r): k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*r+1, 2*r+1)); return cv2.dilate(m, k)
def ero(m, r): k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*r+1, 2*r+1)); return cv2.erode(m, k)
def pushpull(img, known, levels=8):
    """smooth fill of unknown pixels from known ones (img HxWxC float, known HxW 0..1)"""
    pyr = []; a = img * known[..., None]; w = known.copy()
    for _ in range(levels):
        pyr.append((a, w))
        if min(a.shape[:2]) < 4: break
        a = cv2.pyrDown(a); w = cv2.pyrDown(w)
    a, w = pyr[-1]; cur = a / np.maximum(w[..., None], 1e-6)
    for a, w in reversed(pyr[:-1]):
        up = cv2.resize(cur, (a.shape[1], a.shape[0]), interpolation=cv2.INTER_LINEAR)
        ww = np.clip(w * 4, 0, 1)[..., None]
        cur = (a / np.maximum(w[..., None], 1e-6)) * ww + up * (1 - ww)
    return cur
def harmonic(img, known, iters=300, init=None):
    """Laplace fill: unknown pixels relaxed to the average of their neighbours, known ones fixed"""
    cur = pushpull(img, known) if init is None else init.copy()
    unk = known < 0.5
    k = np.array([[0, .25, 0], [.25, 0, .25], [0, .25, 0]], np.float32)
    for _ in range(iters):
        nb = cv2.filter2D(cur, -1, k, borderType=cv2.BORDER_REPLICATE)
        cur[unk] = nb[unk]
    return cur
def to_f(img8): return img8.astype(np.float32)
def save(f, path): cv2.imwrite(path, np.clip(f, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])
def ys(x0, y0, x1, y1, x):  # y on the line (x0,y0)-(x1,y1) at x
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
def harmonic_in(img, known, domain, iters=600):
    """Laplace fill restricted to a plane: unknown = domain & ~known; neighbours outside the domain don't count"""
    d = (domain > 0.5).astype(np.float32)
    kn = ((known > 0.5) & (d > 0.5)).astype(np.float32)
    cur = pushpull(img * d[..., None], kn)
    unk = (d > 0.5) & (kn < 0.5)
    k = np.array([[0, 1, 0], [1, 0, 1], [0, 1, 0]], np.float32)
    cnt = cv2.filter2D(d, -1, k, borderType=cv2.BORDER_CONSTANT)
    for _ in range(iters):
        s = cv2.filter2D(cur * d[..., None], -1, k, borderType=cv2.BORDER_CONSTANT)
        nb = s / np.maximum(cnt, 1e-6)[..., None]
        cur[unk] = nb[unk]
    return cur
def line_y(p0, p1):
    (x0, y0), (x1, y1) = p0, p1
    return lambda x: y0 + (y1 - y0) * (x - x0) / (x1 - x0)
def region_below(f, xa=0.0, xb=1.0):   # pixels below the line y=f(x) for x in [xa, xb]
    yy, xx = np.mgrid[0:H, 0:W]; x = (xx + 0.5) / W; y = (yy + 0.5) / H
    return ((y > f(x)) & (x >= xa) & (x <= xb)).astype(np.float32)
def region_above(f, xa=0.0, xb=1.0):
    yy, xx = np.mgrid[0:H, 0:W]; x = (xx + 0.5) / W; y = (yy + 0.5) / H
    return ((y <= f(x)) & (x >= xa) & (x <= xb)).astype(np.float32)
