'use client'

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import * as THREE from 'three'
import { FRONT, photoCamera, pivotOf, poseFor, roomMesh, type Pose } from '@/lib/visualizer/spatial/moves'
import type { DepthMap } from '@/lib/visualizer/spatial/depth'
import styles from './ai-bench.module.css'

/*
 * (pending modules S41 — card studio:ai-sandboxes; 1.0's src/components/tools/depth-parallax-viewer.tsx, "standing in the room") The photo
 * as a room you can step into: every pixel lifted to its distance (lib/visualizer/spatial/moves `roomMesh` over `depthOf`'s map) and drawn by
 * three.js from the photo's own camera (`photoCamera` — at rest the view IS the photo). Drag turns the camera about the room's middle (±25°
 * across, ±12° up and down), the wheel or a pinch steps in and back (±1.2 m), the arrow keys turn it and + / − step, 0 goes back to the photo.
 * It draws only when something changes (no idle loop). The handle draws a pose to a picture (a camera move's still) and moves the camera for
 * a clip. A browser without WebGL says so in place.
 */

export type DepthViewHandle = {
  /** the view from `pose` (else as it is now) as a JPEG data URL; the live pose is put back */ capture: (pose?: Pose) => string | null
  /** the drawing canvas, for a clip */ canvas: () => HTMLCanvasElement | null
  /** turn about the room's middle by `deg` (a clip's frame) */ turn: (deg: number) => void
  reset: () => void
  pivot: () => number
}
export type Margin = { url: string; metres: Float32Array; width: number; height: number; ox: number; oy: number }

const YAW_MAX = 25, PITCH_MAX = 12, DOLLY_MAX = 1.2

export const DepthView = forwardRef<DepthViewHandle, {
  photo: string
  depth: DepthMap
  /** the photo extended past its edges (Fill the edges) — its picture and its distances */ margin?: Margin | null
  relief: number
  trim: boolean
  label: string
  /** the photo's pixel size, for its shape */ ratio: number
  onMove?: (moved: boolean) => void
  testId?: string
}>(function DepthView({ photo, depth, margin = null, relief, trim, label, ratio, onMove, testId }, ref) {
  const host = useRef<HTMLDivElement>(null)
  const st = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; mesh: THREE.Mesh | null; back: THREE.Mesh | null; tex: THREE.Texture | null; pivot: number } | null>(null)
  const live = useRef({ yaw: 0, pitch: 0, dolly: 0 })
  const [noGl, setNoGl] = useState(false)
  const moved = useRef(false)
  const onMoveRef = useRef(onMove)
  useLayoutEffect(() => { onMoveRef.current = onMove })

  const draw = (pose?: Pose) => {
    const s = st.current; if (!s) return
    const p = pose ?? poseFor({ yaw: live.current.yaw, pitch: live.current.pitch, dx: 0, dy: 0, dz: live.current.dolly }, s.pivot)
    s.camera.position.set(p.x, p.y, p.z)
    s.camera.rotation.order = 'YXZ'
    s.camera.rotation.set(p.pitch, p.yaw, 0)
    s.camera.updateMatrixWorld()
    s.renderer.render(s.scene, s.camera)
  }
  const tell = () => {
    const m = live.current.yaw !== 0 || live.current.pitch !== 0 || live.current.dolly !== 0
    if (m !== moved.current) { moved.current = m; onMoveRef.current?.(m) }
  }

  /* one renderer for the view's life */
  useEffect(() => {
    const el = host.current
    if (!el) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }) } catch { queueMicrotask(() => setNoGl(true)); return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.setAttribute('aria-hidden', 'true')
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--om-color-surface-bg').trim()
    scene.background = new THREE.Color(bg || 'white')
    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 100)
    st.current = { renderer, scene, camera, mesh: null, back: null, tex: null, pivot: 3 }
    const size = () => { const w = el.clientWidth || 1, h = el.clientHeight || 1; renderer.setSize(w, h, false); draw() }
    const ro = new ResizeObserver(size); ro.observe(el)
    size()
    return () => {
      ro.disconnect()
      const s = st.current
      if (s) { s.mesh?.geometry.dispose(); s.back?.geometry.dispose(); (s.mesh?.material as THREE.Material | undefined)?.dispose(); s.tex?.dispose() }
      renderer.dispose(); renderer.domElement.remove(); st.current = null
    }
  }, [])

  /* the photo's camera, and the room's mesh from its depth (the margin's when the edges are filled) */
  useEffect(() => {
    const s = st.current; if (!s) return
    const pivot = pivotOf(depth)
    s.pivot = pivot
    const cam = photoCamera(depth.width, depth.height, depth.frame.f, depth.frame.yh)
    s.camera.fov = cam.fovDeg; s.camera.aspect = cam.fullW / cam.fullH
    s.camera.setViewOffset(cam.fullW, cam.fullH, 0, cam.offsetY, depth.width, depth.height)
    s.camera.updateProjectionMatrix()
    const src = margin ?? { url: photo, metres: depth.metres, width: depth.width, height: depth.height, ox: 0, oy: 0 }
    const m = roomMesh({ metres: src.metres, width: src.width, height: src.height, ox: src.ox, oy: src.oy, frame: { f: depth.frame.f, yh: depth.frame.yh, cx: depth.frame.cx }, step: 2, relief, pivot, trim: trim ? 0.12 : 0 })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(m.positions, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(m.uvs, 2))
    geo.setIndex(new THREE.BufferAttribute(m.index, 1))
    if (s.mesh) { s.scene.remove(s.mesh); s.mesh.geometry.dispose() }
    if (s.back) { s.scene.remove(s.back); s.back.geometry.dispose() }
    const mat = (s.mesh?.material as THREE.MeshBasicMaterial | undefined) ?? new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    s.mesh = new THREE.Mesh(geo, mat)
    s.mesh.frustumCulled = false
    s.scene.add(s.mesh)
    /* the photo itself, pushed back behind the farthest point of the room: through a cut silhouette the camera at rest sees the very pixel
       the photo has there (so the view at rest IS the photo), and a turned camera sees the room's own far colours, never a blank */
    let deepest = 0
    for (let k = 2; k < m.positions.length; k += 3) deepest = Math.max(deepest, -m.positions[k]!)
    const zb = deepest * 1.05, { f, yh, cx } = depth.frame
    const x0 = -src.ox, x1 = src.width - src.ox, y0 = -src.oy, y1 = src.height - src.oy
    const P = (x: number, y: number) => [((x - cx) / f) * zb, ((yh - y) / f) * zb, -zb]
    const back = new THREE.BufferGeometry()
    back.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...P(x0, y0), ...P(x1, y0), ...P(x0, y1), ...P(x1, y1)]), 3))
    back.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2))
    back.setIndex([0, 2, 1, 1, 2, 3])
    s.back = new THREE.Mesh(back, mat)
    s.back.frustumCulled = false
    s.scene.add(s.back)
    el()?.setAttribute('data-triangles', String(m.triangles))
    el()?.setAttribute('data-trimmed', String(m.trimmed))
    draw()
    let gone = false
    new THREE.TextureLoader().load(src.url, (t) => {
      if (gone || !st.current) { t.dispose(); return }
      t.colorSpace = THREE.SRGBColorSpace
      st.current.tex?.dispose(); st.current.tex = t
      mat.map = t; mat.needsUpdate = true
      el()?.setAttribute('data-ready', '')
      draw()
    })
    return () => { gone = true }
  }, [photo, depth, margin, relief, trim])

  const el = () => host.current

  useImperativeHandle(ref, () => ({
    capture: (pose) => { const s = st.current; if (!s) return null; draw(pose); try { return s.renderer.domElement.toDataURL('image/jpeg', 0.9) } finally { if (pose) draw() } },
    canvas: () => st.current?.renderer.domElement ?? null,
    turn: (deg) => { live.current = { yaw: (deg * Math.PI) / 180, pitch: 0, dolly: 0 }; draw() },
    reset: () => { live.current = { yaw: 0, pitch: 0, dolly: 0 }; draw(FRONT); tell() },
    pivot: () => st.current?.pivot ?? 3,
  }), [])

  /* drag turns, the wheel and a pinch step in and back */
  useEffect(() => {
    const node = host.current; if (!node) return
    const pts = new Map<number, { x: number; y: number }>()
    let pinch = 0
    const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v))
    const turnBy = (dx: number, dy: number) => {
      const w = node.clientWidth || 1
      live.current.yaw = clamp(live.current.yaw - (dx / w) * 0.9, (YAW_MAX * Math.PI) / 180)
      live.current.pitch = clamp(live.current.pitch - (dy / w) * 0.6, (PITCH_MAX * Math.PI) / 180)
      draw(); tell()
    }
    const down = (e: PointerEvent) => { node.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y) } }
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId); if (!p) return
      if (pts.size === 2) {
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const [a, b] = [...pts.values()], d = Math.hypot(a!.x - b!.x, a!.y - b!.y)
        if (pinch) { live.current.dolly = clamp(live.current.dolly - (d - pinch) / 200, DOLLY_MAX); draw(); tell() }
        pinch = d; return
      }
      turnBy(e.clientX - p.x, e.clientY - p.y)
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0 }
    const wheel = (e: WheelEvent) => { e.preventDefault(); live.current.dolly = clamp(live.current.dolly + e.deltaY / 600, DOLLY_MAX); draw(); tell() }
    node.addEventListener('pointerdown', down); node.addEventListener('pointermove', move); node.addEventListener('pointerup', up); node.addEventListener('pointercancel', up)
    node.addEventListener('wheel', wheel, { passive: false })
    return () => {
      node.removeEventListener('pointerdown', down); node.removeEventListener('pointermove', move); node.removeEventListener('pointerup', up); node.removeEventListener('pointercancel', up)
      node.removeEventListener('wheel', wheel)
    }
  }, [])

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = (2 * Math.PI) / 180, clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v))
    const l = live.current
    if (e.key === 'ArrowLeft') l.yaw = clamp(l.yaw + step, (YAW_MAX * Math.PI) / 180)
    else if (e.key === 'ArrowRight') l.yaw = clamp(l.yaw - step, (YAW_MAX * Math.PI) / 180)
    else if (e.key === 'ArrowUp') l.pitch = clamp(l.pitch + step, (PITCH_MAX * Math.PI) / 180)
    else if (e.key === 'ArrowDown') l.pitch = clamp(l.pitch - step, (PITCH_MAX * Math.PI) / 180)
    else if (e.key === '+' || e.key === '=') l.dolly = clamp(l.dolly - 0.1, DOLLY_MAX)
    else if (e.key === '-' || e.key === '_') l.dolly = clamp(l.dolly + 0.1, DOLLY_MAX)
    else if (e.key === '0') { l.yaw = 0; l.pitch = 0; l.dolly = 0 }
    else return
    e.preventDefault(); draw(); tell()
  }

  return (
    <div ref={host} className={styles.view3d} style={{ '--ratio': String(ratio) } as CSSProperties} tabIndex={0} role="img" aria-label={label}
         aria-describedby={testId ? `${testId}-keys` : undefined} onKeyDown={onKey} data-testid={testId} data-kb-own="" data-nogl={noGl || undefined}>
      {noGl ? <p className={styles.stageWait}>This browser can’t draw a 3D view here.</p> : null}
      <span id={testId ? `${testId}-keys` : undefined} className={styles.viewHint}>Drag to look around · scroll to step in · arrow keys · 0 resets</span>
    </div>
  )
})
