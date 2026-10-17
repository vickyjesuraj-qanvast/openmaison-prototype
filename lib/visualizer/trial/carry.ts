/*
 * (pending modules S36 — the step's "carry the picture into the new studio if it fits honestly") A room photo the visitor uploaded to the trial
 * goes with them into the studio they start — only when they press Start your studio, only their own photo (never a trial render, which
 * wears the mark; never a sample, which every studio has), and only in this browser tab: it waits in sessionStorage (gone when the tab
 * closes, or after two hours) until the new studio's AI Visualizer takes it once and makes it the first room of a design of theirs
 * (components/visualizer/home/visualizer-home.tsx `?trial=1`). Nothing reaches a server until that studio exists and its member asks for it.
 * Two keys: the small note (the room's name and when) that a page may read on every render, and the picture itself, read once.
 */
const NOTE = 'om.trial.room'
const PHOTO = 'om.trial.photo'
const MAX_AGE_MS = 2 * 60 * 60_000
export type CarriedRoom = { name: string; dataUrl: string; /** (S42E, E-14) what else came from the trial, said once the photo opens in the studio */ landed?: { message: string; action: { label: string; href: string } } }
/** Where a new studio takes the photo: its AI Visualizer, which makes the design and opens it. */
export const TRIAL_LANDING = '/visualizer?trial=1'

/** Keeps the photo for the new studio; false when the browser won't hold it (a private window, a full store) — the studio starts without it. */
export function carryTrialRoom(room: CarriedRoom): boolean {
  try {
    sessionStorage.setItem(PHOTO, room.dataUrl)
    sessionStorage.setItem(NOTE, JSON.stringify({ name: room.name, at: Date.now(), ...(room.landed ? { landed: room.landed } : {}) }))
    return true
  } catch { dropTrialRoom(); return false }
}
type Landed = NonNullable<CarriedRoom['landed']>
const landedOf = (v: unknown): Landed | undefined => {
  const l = v as Partial<Landed> | null | undefined
  return l && typeof l.message === 'string' && l.action && typeof l.action.label === 'string' && typeof l.action.href === 'string' && l.action.href.startsWith('/') ? { message: l.message, action: { label: l.action.label, href: l.action.href } } : undefined
}
const note = (): { name: string; at: number; landed?: Landed } | null => {
  try {
    const raw = sessionStorage.getItem(NOTE); if (!raw) return null
    const n = JSON.parse(raw) as { name?: unknown; at?: unknown; landed?: unknown }
    const landed = landedOf(n.landed)
    return typeof n.name === 'string' && typeof n.at === 'number' && Date.now() - n.at <= MAX_AGE_MS ? { name: n.name, at: n.at, ...(landed ? { landed } : {}) } : null
  } catch { return null }
}
/** Whether a photo waits for a new studio (sign-up says so, and lands on the AI Visualizer). Cheap: the small note only. */
export const hasTrialRoom = (): boolean => !!note()
/** The photo, once — both keys are cleared as it is taken (or when it is too old). */
export function takeTrialRoom(): CarriedRoom | null {
  const n = note()
  let dataUrl: string | null = null
  try { dataUrl = sessionStorage.getItem(PHOTO) } catch { /* private window */ }
  dropTrialRoom()
  return n && dataUrl?.startsWith('data:image/') ? { name: n.name, dataUrl, ...(n.landed ? { landed: n.landed } : {}) } : null
}
/** Forgets it (Start over, a new photo — the visitor changed their mind). */
export function dropTrialRoom(): void {
  try { sessionStorage.removeItem(NOTE); sessionStorage.removeItem(PHOTO) } catch { /* private window */ }
}
