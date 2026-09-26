/**
 * (REG-646, settings parity Q-07 · E-87) Who runs a template's life: renaming, deleting, restoring and deleting one forever are its author's,
 * an Owner's or an Admin's; the studio's default — what every new quote or contract starts from — is the Owners' and Admins'. A quote
 * template keeps no author, so it is theirs alone. Pure, client-safe: the galleries' menus and the actions read the same words.
 */
type Viewer = { id: string | null; role: string | null | undefined }
export const TEMPLATE_CHANGE_RULE = 'Only its author, an Owner or an Admin renames or deletes it'
export const TEMPLATE_RUNNER_RULE = 'Only an Owner or an Admin renames or deletes a quote template'
/** (verify round 3) A template no one wrote — the payment presets (created_by null) — is the Owners' and Admins' alone: never "only its author". */
export const TEMPLATE_PRESET_RULE = 'Only an Owner or an Admin renames or deletes it'
export const TEMPLATE_DEFAULT_RULE = 'Only an Owner or an Admin sets the studio’s default'
/* (wave E, E7) The other refusals a template action answers with — the gallery's own words where it already says them (the default, the
   studio split), else plain ones (invented copy, logged). */
export const TEMPLATE_DEFAULT_DELETE_RULE = 'The default can’t be deleted'
export const TEMPLATE_AWAITING_DELETE_RULE = 'A template awaiting approval can’t be deleted'
export const TEMPLATE_PUBLISH_RULE = 'Only an Owner, an Admin or the backup approver publishes while templates need approval'
export const TEMPLATE_REVIEW_RULE = 'Only an Owner, an Admin or the backup approver answers a submission'
export const TEMPLATE_DELETED_LINE = 'The template is deleted — restore it first'
export const TEMPLATE_GONE_LINE = 'That template is gone'
export const TEMPLATE_IN_USE_RULE = 'Quotes still print through it — restore it instead'
export const TEMPLATE_UNPUBLISHED_RULE = 'Only a published template can be the default'
export const SPLIT_DEFAULT_DELETE_RULE = 'The studio default split can’t be deleted'
export const BRAND_RULE = 'Only an Owner or an Admin changes the company details and the brand kit'
const runs = (v: Viewer) => v.role === 'Owner' || v.role === 'Admin'
/** Why `viewer` may not rename, delete or restore a template written by `createdBy` (null = none recorded), else null. */
export const templateChangeBlock = (viewer: Viewer, createdBy: string | null | undefined): string | null =>
  runs(viewer) || (!!viewer.id && !!createdBy && createdBy === viewer.id) ? null : createdBy === undefined ? TEMPLATE_RUNNER_RULE : createdBy === null ? TEMPLATE_PRESET_RULE : TEMPLATE_CHANGE_RULE
/** Why `viewer` may not make a template the studio's default, else null. */
export const templateDefaultBlock = (viewer: Viewer): string | null => (runs(viewer) ? null : TEMPLATE_DEFAULT_RULE)

/* (verify round 3) The Deleted sheet and the server say the same rule — templateChangeBlock's check, unchanged — in whole sentences that
   name the template's maker, as Deleted Materials and Deleted Designs do: "Only Dane, an Owner or an Admin can restore this template or
   delete it for good". "Its author" when the name isn't known; a preset, which no one wrote, is the Owners' and Admins' alone. */
const onlyWho = (createdBy: string | null | undefined, maker?: string | null): string =>
  (createdBy ? `Only ${maker?.trim() || 'its author'}, an Owner or an Admin` : 'Only an Owner or an Admin')
/** The Deleted sheet's row: why `viewer` may not restore this template — nor delete it for good, the one rule said once in the row — else null. */
export const templateRestoreBlock = (viewer: Viewer, createdBy: string | null | undefined, maker?: string | null): string | null =>
  (templateChangeBlock(viewer, createdBy) === null ? null : `${onlyWho(createdBy, maker)} can restore this template or delete it for good`)
/** Delete Forever's own half (its tooltip, what Empty Trash leaves behind), else null. */
export const templatePurgeBlock = (viewer: Viewer, createdBy: string | null | undefined, maker?: string | null): string | null =>
  (templateChangeBlock(viewer, createdBy) === null ? null : `${onlyWho(createdBy, maker)} can delete this template for good`)
/** The server's refusal of a Restore or a Delete forever when none of `rows` is the viewer's to touch — in that action's words, never
    "renames or deletes it": one maker by name ("…can restore this template", "…these templates"), else the rule for any template. */
export function templateTrashRefusal(action: 'restore' | 'purge', rows: { createdBy: string | null }[], maker?: string | null): string {
  const verb = action === 'restore' ? 'restore' : 'delete', forGood = action === 'purge' ? ' for good' : ''
  const makers = new Set(rows.map((r) => r.createdBy ?? null))
  if (makers.size === 1) return `${onlyWho([...makers][0], maker)} can ${verb} ${rows.length === 1 ? 'this template' : 'these templates'}${forGood}`
  return `Only a template’s author, an Owner or an Admin can ${verb} it${forGood}`
}

/**
 * (wave E, E7 · files-15) A Company library action's refusal — every template kind, the price book, folders, the brand kit. The action
 * ANSWERS `{ error: <the rule> }` instead of throwing it: a production server action's throw reaches the page redacted, so the studio's
 * words ("Only its author, an Owner or an Admin renames or deletes it") never made the snackbar and it read "please try again".
 */
export type Refusal = { error: string }
export const refuse = (error: string): Refusal => ({ error })
export const isRefusal = (v: unknown): v is Refusal => !!v && typeof v === 'object' && 'error' in v && typeof (v as { error: unknown }).error === 'string' && !!(v as { error: string }).error
/**
 * The answer, or — a refusal — an Error carrying the rule, for a caller whose `try` or `run()` already words a failure: a client-side
 * Error keeps its message, so `refusalOf` / `run()` say "Couldn’t <what> — <the rule>" (components/leads/tasks/use-run.ts).
 */
export async function orThrow<T>(answer: Promise<T> | T): Promise<Exclude<T, Refusal>> {
  const v = await answer
  if (isRefusal(v)) throw new Error(v.error)
  return v as Exclude<T, Refusal>
}
