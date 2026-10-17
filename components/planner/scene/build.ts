import * as THREE from 'three'
import { catalogueItem, type Shape } from '@/lib/planner/catalogue'
import { floorLook, pieceLook, wallLook } from '@/lib/planner/look'
import { DEFAULT_HEIGHT, OUTDOOR, WALL_T, sideLine, wallBoxes, wallRuns, type Piece, type PlanDoc, type Room } from '@/lib/planner/model'
import type { LibraryMaterial } from '@/lib/visualizer/materials'

/*
 * (gaps build J, J-Q9 · J-Q10) The layout as a three.js scene, in metres (the plan's centimetres ÷ 100): each room's floor in its finish,
 * the merged walls (`wallRuns` → `wallBoxes`, each opening cut) painted on each face in the colour of the room it faces, the windows
 * glazed, and every piece built from boxes and cylinders sized by its own width × depth × height (1.0's nine geometry builders, without
 * its GLB models). Low walls (J-Q9's Walls: Low — 1.0's Cutaway) cut every wall at 1.1 m. Built in the browser only.
 */

const M = (cm: number) => cm / 100
const LOW = 110
export type TextureCache = Map<string, THREE.Texture>
export type Built = { root: THREE.Group; pieces: Map<string, THREE.Object3D>; floors: THREE.Mesh[]; walls: THREE.Mesh[] }

const loader = typeof window !== 'undefined' ? new THREE.TextureLoader() : null
function texture(url: string, cache: TextureCache, repeat: [number, number]): THREE.Texture | null {
  if (!loader) return null
  let t = cache.get(url)
  if (!t) { t = loader.load(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; cache.set(url, t) }
  const c = t.clone(); c.needsUpdate = true; c.repeat.set(repeat[0], repeat[1])
  return c
}
const std = (hex: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.82, metalness: 0, ...o })
const shade = (hex: string, k: number) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return `#${c.getHexString()}` }
const sheen = (finish: string) => (finish === 'gloss' ? 0.25 : finish === 'satin' ? 0.5 : 0.85)

export function buildScene(plan: Pick<PlanDoc, 'rooms' | 'pieces'>, o: { library: LibraryMaterial[]; low: boolean; textures: TextureCache; shadows?: boolean
  /** (parity map, TD-081) the View menu's Furniture: off leaves the rooms bare */ pieces?: boolean }): Built {
  const root = new THREE.Group()
  const floors: THREE.Mesh[] = [], walls: THREE.Mesh[] = []
  const shadows = o.shadows !== false
  /* floors */
  for (const r of plan.rooms) {
    const f = floorLook(r, o.library)
    const map = f.image ? texture(f.image, o.textures, [M(r.w) / 0.6, M(r.d) / 0.6]) : null
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(M(r.w), M(r.d)), std(map ? '#FFFFFF' : f.hex, { roughness: sheen(f.finish), map }))
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(M(r.x + r.w / 2), OUTDOOR.includes(r.kind) ? -0.005 : 0, M(r.z + r.d / 2))
    mesh.receiveShadow = shadows
    mesh.userData.roomId = r.id
    root.add(mesh); floors.push(mesh)
  }
  /* walls — one box per standing part, each face in the colour of the room it looks into */
  const plain = std('#F2F0EC')
  const faceOf = (rooms: Room[], axis: 'h' | 'v', c: number, a: number, after: boolean) => {
    /* the room past the line (after = +z for a constant-z run, +x for a constant-x one) whose side lies on it */
    const r = rooms.find((x) => { const l = sideLine(x, axis === 'h' ? (after ? 'n' : 's') : (after ? 'w' : 'e')); return Math.abs(l.c - c) < 1 && a >= l.a0 - 1 && a <= l.a1 + 1 })
    if (!r) return plain
    const w = wallLook(r, o.library)
    return std(w.hex, { roughness: sheen(w.finish), map: w.image ? texture(w.image, o.textures, [1.5, 1.5]) : null })
  }
  for (const run of wallRuns(plan.rooms)) {
    for (const b of wallBoxes(run, o.low ? Math.min(LOW, run.height) : null)) {
      const len = b.a1 - b.a0, hgt = b.y1 - b.y0, mid = (b.a0 + b.a1) / 2
      const geo = run.axis === 'h' ? new THREE.BoxGeometry(M(len + (b.y0 === 0 ? 0 : 0)), M(hgt), M(WALL_T)) : new THREE.BoxGeometry(M(WALL_T), M(hgt), M(len))
      /* BoxGeometry's faces: +x, −x, +y, −y, +z, −z */
      const mats = run.axis === 'h'
        ? [plain, plain, plain, plain, faceOf(plan.rooms, 'h', run.c, mid, true), faceOf(plan.rooms, 'h', run.c, mid, false)]
        : [faceOf(plan.rooms, 'v', run.c, mid, true), faceOf(plan.rooms, 'v', run.c, mid, false), plain, plain, plain, plain]
      const mesh = new THREE.Mesh(geo, mats)
      mesh.position.set(run.axis === 'h' ? M(mid) : M(run.c), M(b.y0 + hgt / 2), run.axis === 'h' ? M(run.c) : M(mid))
      mesh.castShadow = shadows; mesh.receiveShadow = shadows
      mesh.userData.wall = true
      root.add(mesh); walls.push(mesh)
    }
    /* glazing in each window (below the cut-down height when the walls are low) */
    for (const c of run.cuts.filter((x) => x.kind === 'window')) {
      const top = Math.min(c.sill + c.height, o.low ? LOW : run.height)
      if (top <= c.sill) continue
      const len = c.a1 - c.a0, hgt = top - c.sill, mid = (c.a0 + c.a1) / 2
      const glass = new THREE.Mesh(run.axis === 'h' ? new THREE.BoxGeometry(M(len), M(hgt), 0.02) : new THREE.BoxGeometry(0.02, M(hgt), M(len)),
        new THREE.MeshStandardMaterial({ color: new THREE.Color('#BFD7E3'), transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.1 }))
      glass.position.set(run.axis === 'h' ? M(mid) : M(run.c), M(c.sill + hgt / 2), run.axis === 'h' ? M(run.c) : M(mid))
      root.add(glass)
    }
  }
  /* pieces */
  const pieces = new Map<string, THREE.Object3D>()
  const ceilingOf = (p: Piece) => { const r = plan.rooms.find((x) => p.x >= x.x && p.x <= x.x + x.w && p.z >= x.z && p.z <= x.z + x.d); return r?.height ?? DEFAULT_HEIGHT }
  for (const p of o.pieces === false ? [] : plan.pieces) {
    const g = buildPiece(p, o.library, o.textures, ceilingOf(p))
    g.position.set(M(p.x), 0, M(p.z))
    g.rotation.y = -(p.rot * Math.PI) / 180
    g.userData.pieceId = p.id
    g.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = shadows; m.receiveShadow = shadows; m.userData.pieceId = p.id } })
    root.add(g); pieces.set(p.id, g)
  }
  return { root, pieces, floors, walls }
}

/** One piece, in its own frame: centred on the origin, its back towards −z, its feet on y = 0. */
export function buildPiece(p: Piece, library: LibraryMaterial[], textures: TextureCache, ceiling = DEFAULT_HEIGHT): THREE.Group {
  const g = new THREE.Group()
  const c = catalogueItem(p.key)
  const look = pieceLook(p, library)
  const main = std(look.image ? '#FFFFFF' : look.hex, { roughness: sheen(look.finish), map: look.image ? texture(look.image, textures, [1, 1]) : null })
  const dark = std(shade(look.hex, 0.55))
  const white = std('#F7F7F5', { roughness: 0.35 })
  const metal = std('#9EA3A8', { roughness: 0.35, metalness: 0.6 })
  const w = M(p.w), d = M(p.d), h = M(p.h)
  const box = (bw: number, bh: number, bd: number, x: number, y: number, z: number, mat: THREE.Material = main) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.005, bw), Math.max(0.005, bh), Math.max(0.005, bd)), mat); m.position.set(x, y, z); g.add(m); return m
  }
  const cyl = (rt: number, rb: number, ch: number, x: number, y: number, z: number, mat: THREE.Material = main, seg = 20) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, ch, seg), mat); m.position.set(x, y, z); g.add(m); return m
  }
  const legs = (lw: number, ld: number, lh: number, inset = 0.04, t = 0.04) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(t, lh, t, sx * (lw / 2 - inset), lh / 2, sz * (ld / 2 - inset), dark)
  }
  const chair = (x: number, z: number, face: number, cw = 0.42, cd = 0.42) => {
    const k = new THREE.Group()
    const seat = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.04, cd), main); seat.position.set(0, 0.45, 0); k.add(seat)
    const back = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.42, 0.04), main); back.position.set(0, 0.68, -cd / 2 + 0.02); k.add(back)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.03), dark); l.position.set(sx * (cw / 2 - 0.03), 0.225, sz * (cd / 2 - 0.03)); k.add(l) }
    k.position.set(x, 0, z); k.rotation.y = face; g.add(k)
  }
  const shape: Shape = c?.shape ?? 'cabinet'
  switch (shape) {
    case 'sofa': case 'armchair': {
      const arm = Math.min(0.18, w * 0.12), back = Math.min(0.22, d * 0.25)
      box(w, 0.42, d - back, 0, 0.21, back / 2)
      box(w, h, back, 0, h / 2, -d / 2 + back / 2)
      box(arm, 0.62, d, -w / 2 + arm / 2, 0.31, 0); box(arm, 0.62, d, w / 2 - arm / 2, 0.31, 0)
      break
    }
    case 'lsofa': {
      const seat = Math.min(0.95, d * 0.5), back = 0.22
      box(w, 0.42, seat - back, 0, 0.21, -d / 2 + back + (seat - back) / 2)
      box(seat, 0.42, d - seat, w / 2 - seat / 2, 0.21, -d / 2 + seat + (d - seat) / 2)
      box(w, h, back, 0, h / 2, -d / 2 + back / 2)
      box(back, h, d, w / 2 - back / 2, h / 2, 0)
      box(0.16, 0.62, seat, -w / 2 + 0.08, 0.31, -d / 2 + seat / 2)
      break
    }
    case 'table': case 'lowTable': case 'desk': case 'bench': {
      box(w, 0.04, d, 0, h - 0.02, 0)
      legs(w, d, h - 0.04)
      if (shape === 'desk') box(0.4, h - 0.06, d - 0.04, w / 2 - 0.22, (h - 0.06) / 2, 0)
      break
    }
    case 'diningSet': {
      const td = d * 0.56
      box(w, 0.04, td, 0, 0.73, 0); legs(w, td, 0.71)
      const per = Math.max(1, Math.round(w * 100 / 65))
      for (let i = 0; i < per; i++) { const x = -w / 2 + (w / per) * (i + 0.5); chair(x, -td / 2 - 0.14, 0); chair(x, td / 2 + 0.14, Math.PI) }
      break
    }
    case 'roundSet': {
      const tw = Math.min(w, d) * 0.62
      cyl(tw / 2, tw / 2, 0.04, 0, 0.73, 0); cyl(0.05, 0.05, 0.71, 0, 0.355, 0, dark); cyl(0.22, 0.22, 0.03, 0, 0.015, 0, dark)
      const r = tw / 2 + 0.12
      chair(0, -r, 0); chair(r, 0, -Math.PI / 2); chair(0, r, Math.PI); chair(-r, 0, Math.PI / 2)
      break
    }
    case 'chair': chair(0, 0, 0, w, d); break
    case 'officeChair': {
      box(w * 0.8, 0.07, d * 0.8, 0, 0.48, 0.02); box(w * 0.75, 0.5, 0.06, 0, 0.8, -d / 2 + 0.06)
      cyl(0.03, 0.03, 0.42, 0, 0.24, 0, metal); cyl(w / 2 * 0.9, w / 2 * 0.9, 0.03, 0, 0.03, 0, dark, 5)
      break
    }
    case 'bed': {
      box(w, 0.32, d, 0, 0.16, 0, dark)
      box(w - 0.04, 0.2, d - 0.1, 0, 0.42, 0.03, white)
      box(w, h, 0.08, 0, h / 2, -d / 2 + 0.04)
      const pw = w > 1.4 ? w / 2 - 0.12 : w - 0.16
      for (const x of w > 1.4 ? [-w / 4, w / 4] : [0]) box(pw, 0.1, 0.32, x, 0.57, -d / 2 + 0.32, white)
      box(w - 0.02, 0.06, d * 0.55, 0, 0.55, d / 2 - d * 0.275, main)
      break
    }
    case 'wardrobe': case 'tall': case 'shelf': case 'cabinet': case 'dresser': {
      if (shape === 'shelf') {
        box(0.03, h, d, -w / 2 + 0.015, h / 2, 0); box(0.03, h, d, w / 2 - 0.015, h / 2, 0); box(w, h, 0.02, 0, h / 2, -d / 2 + 0.01)
        for (let i = 0; i <= 5; i++) box(w, 0.025, d, 0, 0.02 + (h - 0.04) * (i / 5), 0)
        break
      }
      box(w, 0.08, d - 0.04, 0, 0.04, -0.02, dark)
      box(w, h - 0.08, d, 0, 0.08 + (h - 0.08) / 2, 0)
      const doors = shape === 'wardrobe' ? Math.max(2, Math.round(w * 100 / 50)) : 1
      for (let i = 1; i < doors; i++) box(0.006, h - 0.12, 0.006, -w / 2 + (w / doors) * i, 0.08 + (h - 0.08) / 2, d / 2 + 0.003, dark)
      if (shape === 'dresser') box(w * 0.6, 0.7, 0.03, 0, h + 0.4, -d / 2 + 0.05, std('#DDE7EC', { roughness: 0.05, metalness: 0.4 }))
      break
    }
    case 'tv': {
      box(w, h, d, 0, h / 2, 0)
      const sw = Math.min(w * 0.8, 1.45), sh = sw * 9 / 16
      box(sw, sh, 0.03, 0, h + 0.06 + sh / 2, -d / 2 + 0.06, std('#1C1C1F', { roughness: 0.2 }))
      break
    }
    case 'counter': case 'island': {
      box(w, h - 0.04, d - 0.02, 0, (h - 0.04) / 2, -0.01)
      box(w + 0.02, 0.04, d + 0.02, 0, h - 0.02, 0, std('#E9E6E1', { roughness: 0.3 }))
      if (shape === 'counter') { box(0.6, 0.02, 0.45, Math.min(w / 2 - 0.4, 0.4), h + 0.001, 0, std('#2A2A2D', { roughness: 0.3 })) }
      break
    }
    case 'fridge': box(w, h, d, 0, h / 2, 0, std('#D4D6D9', { roughness: 0.3, metalness: 0.3 })); box(0.02, 0.5, 0.03, w / 2 - 0.08, h * 0.6, d / 2 + 0.015, metal); break
    case 'washer': {
      box(w, h, d, 0, h / 2, 0, white)
      const door = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.3, w * 0.3, 0.03, 28), std('#9FB4BF', { roughness: 0.2 })); door.rotation.x = Math.PI / 2; door.position.set(0, h * 0.5, d / 2 + 0.015); g.add(door)
      break
    }
    case 'toilet': {
      box(w, 0.4, d * 0.28, 0, 0.55, -d / 2 + d * 0.14, white)
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.45, w * 0.32, 0.4, 24), white); bowl.scale.set(1, 1, (d * 0.72) / w); bowl.position.set(0, 0.2, -d / 2 + d * 0.28 + d * 0.36); g.add(bowl)
      break
    }
    case 'vanity': {
      box(w, h - 0.12, d, 0, (h - 0.12) / 2, 0)
      box(w, 0.12, d, 0, h - 0.06, 0, white)
      box(w * 0.8, 0.7, 0.02, 0, h + 0.55, -d / 2 + 0.01, std('#DDE7EC', { roughness: 0.05, metalness: 0.4 }))
      break
    }
    case 'shower': {
      box(w, 0.04, d, 0, 0.02, 0, white)
      const glass = new THREE.MeshStandardMaterial({ color: new THREE.Color('#CFE3E8'), transparent: true, opacity: 0.28, roughness: 0.05 })
      box(0.01, h, d, w / 2 - 0.005, h / 2, 0, glass); box(w, h, 0.01, 0, h / 2, d / 2 - 0.005, glass)
      cyl(0.08, 0.08, 0.02, 0, h - 0.1, -d / 4, metal)
      break
    }
    case 'bath': box(w, h, d, 0, h / 2, 0, white); box(w - 0.12, 0.01, d - 0.12, 0, h - 0.06, 0, std('#BFD7E3', { roughness: 0.1 })); break
    case 'rug': box(w, Math.max(0.01, h), d, 0, 0.006, 0); break
    case 'plant': {
      cyl(w * 0.3, w * 0.24, 0.35, 0, 0.175, 0, std('#B8A890'))
      for (const [x, y, z, r] of [[0, 0.75, 0, 0.26], [0.1, 0.95, 0.05, 0.2], [-0.08, 1.05, -0.06, 0.16]] as const) {
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r * w / 0.45, 1), main); leaf.position.set(x, y * h / 1.2, z); g.add(leaf)
      }
      break
    }
    case 'lamp': cyl(w * 0.3, w * 0.3, 0.03, 0, 0.015, 0, dark); cyl(0.012, 0.012, h - 0.3, 0, (h - 0.3) / 2, 0, metal); cyl(w * 0.35, w / 2, 0.3, 0, h - 0.15, 0, main); break
    case 'pendant': {
      const top = M(ceiling)
      cyl(0.006, 0.006, 0.6, 0, top - 0.3, 0, dark)
      cyl(w * 0.15, w / 2, h, 0, top - 0.6 - h / 2, 0, main)
      break
    }
    default: box(w, h, d, 0, h / 2, 0)
  }
  return g
}
