'use client'

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EYE, planBounds, wallBoxes, wallRuns, type Camera, type PlanDoc } from '@/lib/planner/model'
import type { LibraryMaterial } from '@/lib/visualizer/materials'
import { buildScene, type TextureCache } from './build'
import styles from './three-view.module.css'

/*
 * (gaps build J, J-Q9) The 3D view: Orbit (drag turns, wheel or pinch zooms, right-drag or two fingers pan — three's OrbitControls) and
 * Walk (first person at eye height: drag looks, the arrows / WASD or the pad walk, walls stop you, doors let you through). In the editor a
 * press on a piece selects it and a drag slides it over the floor (the editor snaps and keeps it as one Undo step). The scene is rebuilt
 * from the plan on each change — a layout is a few hundred boxes. `capture()` hands back the frame as a PNG (Download PNG).
 * (parity map, TD-098) `iso` looks through an orthographic camera from the south-west corner at 35° — the isometric (dollhouse) view, every
 * length to one scale; it orbits and zooms like the 3D view, Walk always walks in perspective. (TD-081) `pieces` off leaves the rooms bare.
 * (pending modules S28) `look` — 1.0's two pictures through the orthographic camera, the whole layout framed: `front` its Dollhouse (from the
 * front, 45° down, the outer walls square to the picture's edges — 1.0's "orientation lock"; it turns as the 3D view does), `top` its Top-down
 * (straight down, north up as on the Top view; it zooms and pans, never tilts).
 */

export type ThreeHandle = { capture: () => string | null; fit: () => void; flyTo: (roomId: string) => void; walkStep: (dir: 'forward' | 'back' | 'left' | 'right', on: boolean) => void }
type Props = {
  plan: PlanDoc
  library: LibraryMaterial[]
  mode: 'orbit' | 'walk'
  low: boolean
  selected?: string | null
  editable?: boolean
  onSelect?: (pieceId: string | null) => void
  /** a piece dragged on the floor — x / z in centimetres; `done` once released */ onMove?: (pieceId: string, x: number, z: number, done: boolean) => void
  onCamera?: (c: Camera) => void
  /** where Walk starts — a room's id */ walkFrom?: string | null
  className?: string
  label?: string
  /** (parity map, TD-098) the isometric view: an orthographic camera at 35° */ iso?: boolean
  /** (parity map, TD-081) off: the rooms without their furniture */ pieces?: boolean
  /** (pending modules S28) the 3D picture's looks (win over `iso`): `front` 1.0's Dollhouse, `top` its Top-down */ look?: 'front' | 'top' | null
  /** (pending modules S41) a turntable: one whole turn every `spin` seconds while orbiting (never on Top-down or in Walk); 0 / unset, still —
      the developers' bench records a clip of a turning layout, and (S42 D·1) the 3D picture's *Download a turning clip* turns its Dollhouse
      only while it records */ spin?: number
}

const css = (name: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const ThreeView = forwardRef<ThreeHandle, Props>(function ThreeView({ plan, library, mode, low, selected = null, editable = false, onSelect, onMove, onCamera, walkFrom = null, className, label = '3D view of the layout', iso = false, pieces = true, look = null, spin = 0 }, ref) {
  const host = useRef<HTMLDivElement>(null)
  const st = useRef<{
    renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera | THREE.OrthographicCamera; persp: THREE.PerspectiveCamera; ortho: THREE.OrthographicCamera; controls: OrbitControls; content: THREE.Group | null
    pieces: Map<string, THREE.Object3D>; floors: THREE.Mesh[]; textures: TextureCache; raf: number; fly: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; t0: number } | null
    walk: { yaw: number; pitch: number; keys: Set<string> }; outline: THREE.BoxHelper | null
  } | null>(null)
  const props = useRef({ plan, mode, editable, onSelect, onMove, onCamera, selected, walkFrom, iso, look, low, spin })
  useLayoutEffect(() => { props.current = { plan, mode, editable, onSelect, onMove, onCamera, selected, walkFrom, iso, look, low, spin } })

  /* one renderer for the component's life */
  useEffect(() => {
    const el = host.current
    if (!el) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }) } catch { el.dataset.nogl = ''; return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(css('--om-color-surface-bg', '#F4F4F5'))
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d4cb, 1.5))
    scene.add(new THREE.AmbientLight(0xffffff, 0.45))
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    sun.position.set(-6, 12, -4); sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004
    scene.add(sun); scene.add(sun.target)
    const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 400)
    const ortho = new THREE.OrthographicCamera(-5, 5, 5, -5, -200, 400)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.dampingFactor = 0.12
    controls.maxPolarAngle = Math.PI / 2 - 0.04; controls.minDistance = 1; controls.maxDistance = 80
    controls.minZoom = 0.3; controls.maxZoom = 8
    controls.screenSpacePanning = false
    const s = { renderer, scene, camera, persp: camera, ortho, controls, content: null, pieces: new Map(), floors: [], textures: new Map(), raf: 0, fly: null, walk: { yaw: 0, pitch: 0, keys: new Set<string>() }, outline: null } as NonNullable<typeof st.current>
    st.current = s
    const size = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix()
      const half = (ortho.top - ortho.bottom) / 2; ortho.left = -half * (w / h); ortho.right = half * (w / h); ortho.updateProjectionMatrix()
    }
    size()
    const ro = new ResizeObserver(size); ro.observe(el)
    let camTimer = 0
    controls.addEventListener('end', () => {
      window.clearTimeout(camTimer)
      camTimer = window.setTimeout(() => {
        if (s.camera !== s.persp) return   // the isometric view is a preset, never the layout's own camera
        const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target))
        props.current.onCamera?.({ theta: sph.theta, phi: sph.phi, dist: sph.radius * 100, tx: controls.target.x * 100, tz: controls.target.z * 100 })
      }, 400)
    })
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      if (s.fly) {
        const k = Math.min(1, (now - s.fly.t0) / 420), e = 1 - Math.pow(1 - k, 3)
        camera.position.lerpVectors(s.fly.from, s.fly.to, e); controls.target.lerpVectors(s.fly.tFrom, s.fly.tTo, e)
        if (k >= 1) s.fly = null
      }
      if (props.current.mode === 'walk') stepWalk(s, props.current.plan, dt)
      else {
        const turn = props.current.spin > 0 && props.current.look !== 'top' ? props.current.spin : 0
        controls.autoRotate = turn > 0
        if (turn > 0) { controls.autoRotateSpeed = 60 / turn; controls.update(dt) } else controls.update()
      }
      s.outline?.update()
      renderer.render(scene, s.camera)
      s.raf = requestAnimationFrame(tick)
    }
    s.raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(s.raf); ro.disconnect(); window.clearTimeout(camTimer); controls.dispose()
      s.textures.forEach((t) => t.dispose())
      disposeTree(scene); renderer.dispose(); renderer.domElement.remove(); st.current = null
    }
  }, [])

  /* the scene from the plan */
  const fitted = useRef(false)
  useEffect(() => {
    const s = st.current; if (!s) return
    if (s.content) { s.scene.remove(s.content); disposeTree(s.content) }
    const b = buildScene(plan, { library, low, textures: s.textures, pieces })
    s.content = b.root; s.pieces = b.pieces; s.floors = b.floors
    s.scene.add(b.root)
    const box = planBounds(plan)
    const sun = s.scene.children.find((c) => (c as THREE.DirectionalLight).isDirectionalLight) as THREE.DirectionalLight | undefined
    if (sun) {
      const cx = (box.x0 + box.x1) / 200, cz = (box.z0 + box.z1) / 200, span = Math.max(box.x1 - box.x0, box.z1 - box.z0) / 100
      sun.target.position.set(cx, 0, cz); sun.position.set(cx - span * 0.5, span * 1.2 + 4, cz - span * 0.4)
      const cam = sun.shadow.camera; cam.left = -span; cam.right = span; cam.top = span; cam.bottom = -span; cam.near = 0.5; cam.far = span * 4 + 20; cam.updateProjectionMatrix()
    }
    if (!fitted.current) { fitted.current = true; if (props.current.mode === 'orbit' && (props.current.look || props.current.iso)) toLook(s, plan, props.current.look ?? 'iso', props.current.low); else placeCamera(s, plan) }
  }, [plan, library, low, pieces])

  /* (parity map, TD-098) the isometric camera on and off — orbiting, it keeps its own place; Walk is always in perspective.
     (pending modules S28) the Top-down look the same way: on, the camera goes straight up and never tilts; off, back to the isometric or the 3D view */
  const orthoLook = useRef<'iso' | 'front' | 'top' | null>(null)
  useEffect(() => {
    const s = st.current; if (!s) return
    const want = mode !== 'orbit' ? null : look ?? (iso ? 'iso' : null)
    s.controls.enableRotate = want !== 'top'
    const now = s.camera === s.ortho ? orthoLook.current ?? 'iso' : null
    if (want === now) return
    orthoLook.current = want
    if (want) toLook(s, props.current.plan, want, props.current.low)
    else if (s.camera === s.ortho) { toPersp(s); if (mode === 'orbit') placeCamera(s, props.current.plan) }
  }, [iso, look, mode])

  /* the selection's outline */
  useEffect(() => {
    const s = st.current; if (!s) return
    if (s.outline) { s.scene.remove(s.outline); s.outline.dispose(); s.outline = null }
    const obj = selected ? s.pieces.get(selected) : null
    if (obj && mode === 'orbit') { s.outline = new THREE.BoxHelper(obj, new THREE.Color(css('--om-color-primary-default', '#5500FF'))); s.scene.add(s.outline) }
  }, [selected, plan, mode])

  /* the mode: orbit's controls, or walk's eye */
  useEffect(() => {
    const s = st.current; if (!s) return
    s.controls.enabled = mode === 'orbit'
    if (mode === 'walk') { toPersp(s); startWalk(s, props.current.plan, props.current.walkFrom) }
    else if (props.current.look || props.current.iso) toLook(s, props.current.plan, props.current.look ?? 'iso', props.current.low)
    else { s.camera.up.set(0, 1, 0); placeCamera(s, props.current.plan, true) }
  }, [mode])

  /* pointer: select, drag a piece on the floor (orbit), look around (walk) */
  useEffect(() => {
    const s = st.current, el = host.current
    if (!s || !el) return
    const canvas = s.renderer.domElement
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    let down: { x: number; y: number; id: string | null; drag: boolean; off: THREE.Vector3 | null; look: boolean } | null = null
    const at = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, s.camera) }
    const pick = (): string | null => {
      const hits = ray.intersectObjects([...s.pieces.values()], true)
      return (hits.find((h) => h.object.userData.pieceId)?.object.userData.pieceId as string | undefined) ?? null
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      if (props.current.mode === 'walk') { down = { x: e.clientX, y: e.clientY, id: null, drag: false, off: null, look: true }; canvas.setPointerCapture(e.pointerId); return }
      at(e)
      const id = pick()
      let off: THREE.Vector3 | null = null
      if (id && props.current.editable && id === props.current.selected && props.current.onMove) {
        const p = props.current.plan.pieces.find((x) => x.id === id)
        const hit = new THREE.Vector3()
        if (p && ray.ray.intersectPlane(floor, hit)) { off = new THREE.Vector3(p.x / 100 - hit.x, 0, p.z / 100 - hit.z); s.controls.enabled = false; canvas.setPointerCapture(e.pointerId) }
      }
      down = { x: e.clientX, y: e.clientY, id, drag: false, off, look: false }
    }
    const onMoveP = (e: PointerEvent) => {
      if (!down) return
      if (down.look) {
        s.walk.yaw -= (e.clientX - down.x) * 0.004; s.walk.pitch = Math.max(-0.9, Math.min(0.9, s.walk.pitch - (e.clientY - down.y) * 0.004))
        down.x = e.clientX; down.y = e.clientY; return
      }
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) down.drag = true
      if (down.off && down.id && down.drag) {
        at(e); const hit = new THREE.Vector3()
        if (ray.ray.intersectPlane(floor, hit)) props.current.onMove?.(down.id, (hit.x + down.off.x) * 100, (hit.z + down.off.z) * 100, false)
      }
    }
    const onUp = (e: PointerEvent) => {
      if (!down) return
      const d = down; down = null
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
      if (d.look) return
      if (d.off && d.id) { s.controls.enabled = props.current.mode === 'orbit'; if (d.drag) { at(e); const hit = new THREE.Vector3(); if (ray.ray.intersectPlane(floor, hit)) props.current.onMove?.(d.id, (hit.x + d.off.x) * 100, (hit.z + d.off.z) * 100, true); return } }
      if (!d.drag) props.current.onSelect?.(d.id)
    }
    const onKey = (e: KeyboardEvent, on: boolean) => {
      if (props.current.mode !== 'walk') return
      const k = { ArrowUp: 'forward', KeyW: 'forward', ArrowDown: 'back', KeyS: 'back', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }[e.code]
      if (!k) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      e.preventDefault()
      if (on) s.walk.keys.add(k); else s.walk.keys.delete(k)
    }
    const kd = (e: KeyboardEvent) => onKey(e, true), ku = (e: KeyboardEvent) => onKey(e, false)
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMoveP); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp)
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)
    return () => {
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMoveP); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp)
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    capture: () => { const s = st.current; if (!s) return null; s.renderer.render(s.scene, s.camera); try { return s.renderer.domElement.toDataURL('image/png') } catch { return null } },
    fit: () => { const s = st.current; if (!s) return; if (s.camera === s.ortho) toLook(s, props.current.plan, props.current.look ?? 'iso', props.current.low); else placeCamera(s, props.current.plan, true) },
    flyTo: (roomId: string) => {
      const s = st.current; if (!s) return
      const r = props.current.plan.rooms.find((x) => x.id === roomId); if (!r) return
      if (props.current.mode === 'walk') { startWalk(s, props.current.plan, roomId); return }
      const target = new THREE.Vector3((r.x + r.w / 2) / 100, 0, (r.z + r.d / 2) / 100)
      const span = Math.max(r.w, r.d) / 100
      const dir = s.camera.position.clone().sub(s.controls.target).normalize()
      const to = target.clone().add(dir.multiplyScalar(Math.max(3.2, span * 1.6)))
      to.y = Math.max(to.y, span * 0.9 + 1.6)
      if (reduced()) { s.camera.position.copy(to); s.controls.target.copy(target); return }
      s.fly = { from: s.camera.position.clone(), to, tFrom: s.controls.target.clone(), tTo: target, t0: performance.now() }
    },
    walkStep: (dir, on) => { const s = st.current; if (!s) return; if (on) s.walk.keys.add(dir); else s.walk.keys.delete(dir) },
  }), [])

  return <div ref={host} className={`${styles.host} ${className ?? ''}`} role="img" aria-label={label} data-mode={mode} data-testid="planner-3d" />
})

type Cams = { camera: THREE.PerspectiveCamera | THREE.OrthographicCamera; persp: THREE.PerspectiveCamera; ortho: THREE.OrthographicCamera; controls: OrbitControls; renderer: THREE.WebGLRenderer }
function toPersp(s: Cams) { s.camera = s.persp; s.controls.object = s.persp; s.camera.up.set(0, 1, 0) }
/** (parity map, TD-098) The isometric view: from the south-west corner, 35.26° down (the true isometric angle), the whole layout — its
    walls' height too — framed with a margin; one scale for every length on the screen. (pending modules S28) The same frame from any
    direction: `front`, 1.0's Dollhouse — from the front (the south), 45° down, the outer walls square to the picture's edges. */
const toIso = (s: Cams, plan: PlanDoc) => toOrtho(s, plan, new THREE.Vector3(-1, 1, 1))
function toLook(s: Cams, plan: PlanDoc, look: 'iso' | 'front' | 'top', low = false) {
  if (look === 'top') toTop(s, plan)
  else if (look === 'front') toOrtho(s, plan, new THREE.Vector3(0, 1, 1), low)
  else toIso(s, plan)
}
function toOrtho(s: Cams, plan: PlanDoc, from: THREE.Vector3, low = false) {
  s.camera = s.ortho; s.controls.object = s.ortho
  const b = planBounds(plan)
  const cx = (b.x0 + b.x1) / 200, cz = (b.z0 + b.z1) / 200, span = Math.max(b.x1 - b.x0, b.z1 - b.z0, 300) / 100
  const t = new THREE.Vector3(cx, 0, cz)
  const cam = s.ortho
  cam.up.set(0, 1, 0)
  cam.position.copy(t.clone().add(from.clone().normalize().multiplyScalar(span * 2 + 10)))
  cam.lookAt(t); cam.zoom = 1; cam.updateMatrixWorld()
  const inv = cam.matrixWorldInverse.clone()
  let mx = 0, my = 0
  const top = Math.max(...plan.rooms.map((r) => (low ? Math.min(110, r.height) : r.height)), low ? 110 : 280) / 100   // (pending modules S28) the walls as drawn — cut low, the frame is the cutaway's
  for (const x of [b.x0, b.x1]) for (const z of [b.z0, b.z1]) for (const y of [0, top]) { const v = new THREE.Vector3(x / 100, y, z / 100).applyMatrix4(inv); mx = Math.max(mx, Math.abs(v.x)); my = Math.max(my, Math.abs(v.y)) }
  const size = s.renderer.getSize(new THREE.Vector2()), aspect = size.x / Math.max(1, size.y)
  const half = Math.max(my, mx / aspect) * 1.12 + 0.2
  cam.left = -half * aspect; cam.right = half * aspect; cam.top = half; cam.bottom = -half
  cam.updateProjectionMatrix()
  s.controls.target.copy(t); s.controls.update()
}

/** (pending modules S28) The Top-down look: the orthographic camera straight above the layout's middle (a hair south of it, so north stays up
    as on the Top view), the whole layout framed with a margin. */
function toTop(s: Cams, plan: PlanDoc) {
  s.camera = s.ortho; s.controls.object = s.ortho
  const b = planBounds(plan)
  const cx = (b.x0 + b.x1) / 200, cz = (b.z0 + b.z1) / 200
  const sx = Math.max(b.x1 - b.x0, 300) / 100, sz = Math.max(b.z1 - b.z0, 300) / 100
  const t = new THREE.Vector3(cx, 0, cz)
  const cam = s.ortho
  cam.up.set(0, 1, 0)
  cam.position.set(cx, Math.max(sx, sz) * 2 + 10, cz + 0.001)
  cam.lookAt(t); cam.zoom = 1
  const size = s.renderer.getSize(new THREE.Vector2()), aspect = size.x / Math.max(1, size.y)
  const half = Math.max(sz / 2, sx / 2 / aspect) * 1.08 + 0.2
  cam.left = -half * aspect; cam.right = half * aspect; cam.top = half; cam.bottom = -half
  cam.updateProjectionMatrix()
  s.controls.target.copy(t); s.controls.update()
}

/** The camera as the layout last left it, else a three-quarter view that fits the whole flat. */
function placeCamera(s: { camera: THREE.PerspectiveCamera | THREE.OrthographicCamera; controls: OrbitControls }, plan: PlanDoc, fresh = false) {
  const b = planBounds(plan)
  const cx = (b.x0 + b.x1) / 200, cz = (b.z0 + b.z1) / 200, span = Math.max(b.x1 - b.x0, b.z1 - b.z0, 300) / 100
  const c = !fresh ? plan.camera : null
  if (c) {
    const t = new THREE.Vector3(c.tx / 100, 0, c.tz / 100)
    s.controls.target.copy(t)
    s.camera.position.copy(t.clone().add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(c.dist / 100, c.phi, c.theta))))
  } else {
    s.controls.target.set(cx, 0, cz)
    /* a tall, narrow screen (a phone) stands further back so the whole flat fits across it */
    const aspect = (s.camera as THREE.PerspectiveCamera).aspect ?? 1
    const k = Math.max(1, 1.2 / Math.max(0.35, aspect))
    s.camera.position.set(cx - span * 0.55 * k, span * 1.05 * k, cz + span * 0.85 * k)
  }
  s.camera.lookAt(s.controls.target)
  s.controls.update()
}

function startWalk(s: { camera: THREE.PerspectiveCamera | THREE.OrthographicCamera; walk: { yaw: number; pitch: number } }, plan: PlanDoc, from: string | null) {
  const r = plan.rooms.find((x) => x.id === from) ?? [...plan.rooms].filter((x) => x.kind === 'living').sort((a, b) => b.w * b.d - a.w * a.d)[0] ?? plan.rooms[0]
  if (!r) return
  /* (S43E, F3-03 W3-03) Walk starts as a person stepping into the room: at one end of its longer side, looking down its length — from the
     middle, facing the nearer wall (a 6 × 4.2 m living room put the wall 2.1 m away), the first view was one flat grey wall */
  const long = r.w >= r.d, inset = Math.min(60, (long ? r.w : r.d) / 2)
  s.camera.position.set((long ? r.x + r.w - inset : r.x + r.w / 2) / 100, EYE / 100, (long ? r.z + r.d / 2 : r.z + r.d - inset) / 100)
  s.walk.yaw = long ? Math.PI / 2 : 0; s.walk.pitch = -0.08   // yaw π/2 faces −x, 0 faces −z
  aim(s)
}
function aim(s: { camera: THREE.PerspectiveCamera | THREE.OrthographicCamera; walk: { yaw: number; pitch: number } }) {
  s.camera.rotation.order = 'YXZ'
  s.camera.rotation.set(s.walk.pitch, s.walk.yaw, 0)
}
/** One frame of walking: 1.4 m a second, stopped 25 cm short of any wall that stands at the floor (a doorway lets you through). */
function stepWalk(s: { camera: THREE.PerspectiveCamera | THREE.OrthographicCamera; walk: { yaw: number; pitch: number; keys: Set<string> } }, plan: PlanDoc, dt: number) {
  aim(s)
  const k = s.walk.keys
  if (!k.size) return
  const f = (k.has('forward') ? 1 : 0) - (k.has('back') ? 1 : 0), side = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0)
  if (!f && !side) return
  const fwd = new THREE.Vector3(-Math.sin(s.walk.yaw), 0, -Math.cos(s.walk.yaw)), right = new THREE.Vector3(Math.cos(s.walk.yaw), 0, -Math.sin(s.walk.yaw))
  const move = fwd.multiplyScalar(f).add(right.multiplyScalar(side)).normalize().multiplyScalar(1.4 * dt)
  const next = s.camera.position.clone().add(move)
  if (!blocked(plan, next.x * 100, next.z * 100)) { s.camera.position.copy(next); return }
  const nx = s.camera.position.clone().add(new THREE.Vector3(move.x, 0, 0)), nz = s.camera.position.clone().add(new THREE.Vector3(0, 0, move.z))
  if (!blocked(plan, nx.x * 100, nx.z * 100)) s.camera.position.copy(nx)
  else if (!blocked(plan, nz.x * 100, nz.z * 100)) s.camera.position.copy(nz)
}
const wallCache = new WeakMap<PlanDoc['rooms'], ReturnType<typeof wallBoxes>>()
function blocked(plan: PlanDoc, x: number, z: number): boolean {
  let boxes = wallCache.get(plan.rooms)
  if (!boxes) { boxes = wallRuns(plan.rooms).flatMap((r) => wallBoxes(r)).filter((b) => b.y0 < EYE && b.y1 > 40); wallCache.set(plan.rooms, boxes) }
  const R = 25
  return boxes.some((b) => (b.axis === 'h'
    ? x > b.a0 - R && x < b.a1 + R && Math.abs(z - b.c) < R
    : z > b.a0 - R && z < b.a1 + R && Math.abs(x - b.c) < R))
}

function disposeTree(o: THREE.Object3D) {
  o.traverse((x) => {
    const m = x as THREE.Mesh
    if (m.geometry) m.geometry.dispose()
    const mat = m.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(mat)) mat.forEach((q) => q.dispose()); else mat?.dispose()
  })
}
