/* AI Visualizer (REG-673, Q-24) — who may change what. Pure and client-safe: the gallery, the editor and the actions read the same words.
   Every member uses the tool; a lead's design follows Who sees leads; a design, a room's delete and a studio material are changed by
   whoever made them, an Owner or an Admin (Quote X-Ray's rule, REG-641). */

type Viewer = { id: string | null; role: string | null | undefined }
/* (verify round 1) A refusal names the maker when the page knows them ("Only Dane, an Owner or an Admin…"), and says every thing the rule
   covers — Move to Folder included; restoring and deleting for good say so in their own words. */
const who = (name: string | null | undefined, fallback: string) => name?.trim() || fallback
/** (wave E, gallery-2) A lead's design is never moved nor renamed (it sits with its lead and wears its name): its rule says only Delete. */
export const designRule = (maker?: string | null, fixed = false) => `Only ${who(maker, 'whoever made it')}, an Owner or an Admin can ${fixed ? 'delete' : 'move, rename or delete'} this`
export const DESIGN_RULE = designRule()
export const designRestoreRule = (maker?: string | null) => `Only ${who(maker, 'whoever made it')}, an Owner or an Admin can restore this design`
export const designPurgeRule = (maker?: string | null) => `Only ${who(maker, 'whoever made it')}, an Owner or an Admin can delete this design for good`
/** The rule for several designs at once — whoever made each one differs (a many-at-once refusal, an Empty Trash that kept them all). */
export const DESIGN_PURGE_RULE = 'Only whoever made a design, an Owner or an Admin can delete it for good'
export const DESIGNS_DELETE_RULE = 'Only whoever made a design, an Owner or an Admin can delete it'
export const DESIGNS_RESTORE_RULE = 'Only whoever made a design, an Owner or an Admin can restore it'
export const materialRule = (maker?: string | null) => `Only ${who(maker, 'whoever added it')}, an Owner or an Admin can move, change or delete this material`
export const MATERIAL_RULE = materialRule()
export const materialRestoreRule = (maker?: string | null) => `Only ${who(maker, 'whoever added it')}, an Owner or an Admin can restore this material`
export const materialPurgeRule = (maker?: string | null) => `Only ${who(maker, 'whoever added it')}, an Owner or an Admin can delete this material for good`
export const MATERIAL_PURGE_RULE = 'Only whoever added a material, an Owner or an Admin can delete it for good'
export const MATERIALS_DELETE_RULE = 'Only whoever added a material, an Owner or an Admin can delete it'
export const MATERIALS_RESTORE_RULE = 'Only whoever added a material, an Owner or an Admin can restore it'
const runs = (v: Viewer) => v.role === 'Owner' || v.role === 'Admin'
/** `fixed` — a lead's design (Move to Folder and Rename are never offered on it): the refusal says only Delete (wave E, gallery-2). */
export const designChangeBlock = (v: Viewer, createdBy: string | null | undefined, maker?: string | null, fixed = false): string | null => (runs(v) || (!!v.id && v.id === createdBy) ? null : designRule(maker, fixed))
export const materialChangeBlock = (v: Viewer, uploadedBy: string | null | undefined, maker?: string | null): string | null => (runs(v) || (!!v.id && v.id === uploadedBy) ? null : materialRule(maker))
/** (verify round 1, critic §4) A lead returned to Qanvast or deleted: its design's links stay off, and Share with client says so. */
export const LEAD_CLOSED_SHARE = 'This lead was returned or deleted — its links stay off'
/** (audit 2026-09-26, F076 · F202) A room goes with its maker's say, or the design's maker's (they may delete the whole design), an Owner's
    or an Admin's — the rule this header always stated, now kept by deleteRoom and restoreRoom too. (wave E, E12) Rename and Change photo
    follow the same rule (renameRoom, setRoomPhoto and its Undo refuse with it), so one sentence names all three — the room menu says it
    once, under the rows it greys. */
export const ROOM_RULE = 'Only whoever made it or its design, an Owner or an Admin can rename this room, change its photo or delete it'
export const roomDeleteBlock = (v: Viewer, roomCreatedBy: string | null | undefined, designCreatedBy: string | null | undefined): string | null =>
  runs(v) || (!!v.id && (v.id === roomCreatedBy || v.id === designCreatedBy)) ? null : ROOM_RULE
/** (wave E, E12) Why this viewer may not rename a room or change its photo — the Delete-room rule, word for word. */
export const roomChangeBlock = roomDeleteBlock
/** (wave E, files-9) A lead deleted (in the leads' trash): its design opens, but nothing more goes onto the lead from it — no filing, no
    quote, no link — until the lead is restored. The editor's note and the refused rows read these words. */
export const leadDeletedNote = (lead: string) => `${lead.trim() || 'This lead'} was deleted — restore the lead to share, file or quote from this design.`
export const LEAD_DELETED_ROW = 'Its lead was deleted'

/** (audit 2026-09-26, F099) When a client's call back is due, on the studio's clock (Singapore): within the hour in working hours (a weekday,
    09:00–17:00); before nine on a weekday, at ten that morning; otherwise ten o'clock on the next weekday — never an overdue task at 3 a.m. */
export function callBackDue(at: Date): Date {
  const SGT = 8 * 3_600_000, DAY = 86_400_000
  const wall = new Date(at.getTime() + SGT)   // the UTC fields of `wall` read Singapore's wall clock
  const weekday = (d: Date) => d.getUTCDay() >= 1 && d.getUTCDay() <= 5
  const h = wall.getUTCHours()
  if (weekday(wall) && h >= 9 && h < 17) return new Date(at.getTime() + 3_600_000)
  let ten = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate(), 10) - SGT
  if (!(weekday(wall) && h < 9)) ten += DAY
  while (!weekday(new Date(ten + SGT))) ten += DAY
  return new Date(ten)
}

/** 1.0's limits (A E-20 · C-71): a render takes at most 100 pins, a pin or a reply at most 2,000 characters; a link lives 7 days. */
export const PIN_LIMIT = 100
export const PIN_CHARS = 2000
export const SHARE_DAYS = 7
export const SHARE_MAX_VERSIONS = 6
/** 1.0's photo limit (B-34). */
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp'
