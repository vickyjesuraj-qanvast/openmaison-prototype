/**
 * (REG-646, settings parity Q-07 · E-87) Who runs a template's life: renaming, deleting, restoring and deleting one forever are its author's,
 * an Owner's or an Admin's; the studio's default — what every new quote or contract starts from — is the Owners' and Admins'. A quote
 * template keeps no author, so it is theirs alone. Pure, client-safe: the galleries' menus and the actions read the same words.
 */
type Viewer = { id: string | null; role: string | null | undefined }
export const TEMPLATE_CHANGE_RULE = 'Only its author, an Owner or an Admin renames or deletes it'
export const TEMPLATE_RUNNER_RULE = 'Only an Owner or an Admin renames or deletes a quote template'
export const TEMPLATE_DEFAULT_RULE = 'Only an Owner or an Admin sets the studio’s default'
const runs = (v: Viewer) => v.role === 'Owner' || v.role === 'Admin'
/** Why `viewer` may not rename, delete or restore a template written by `createdBy` (null = none recorded), else null. */
export const templateChangeBlock = (viewer: Viewer, createdBy: string | null | undefined): string | null =>
  runs(viewer) || (!!viewer.id && !!createdBy && createdBy === viewer.id) ? null : createdBy === undefined ? TEMPLATE_RUNNER_RULE : TEMPLATE_CHANGE_RULE
/** Why `viewer` may not make a template the studio's default, else null. */
export const templateDefaultBlock = (viewer: Viewer): string | null => (runs(viewer) ? null : TEMPLATE_DEFAULT_RULE)
