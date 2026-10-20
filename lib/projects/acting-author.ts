import 'server-only'
import { AsyncLocalStorage } from 'node:async_hooks'

/*
 * (simplify round 2 — R2-C, his "fix all the pending things" 2026-10-09; S-18) Whose update it is when an approval runs someone else's ask. Under
 * Settings › Projects › Milestone completion needs approval, a Designer's Mark done keeps its ticks on the record (`done_ask_json`) and they run
 * when an Owner or an Admin approves it — the photos' update then is the Designer's, the way an approved update keeps its author: written as
 * the one who asked (`done_asked_by`), published by the approver. The author is set on the server only, around the approval's own call to
 * `saveProjectUpdate` (app/projects/updates-actions.ts reads `askedAuthor()`); it travels with that call's async work (AsyncLocalStorage), so no
 * browser can name an author.
 */
const scope = new AsyncLocalStorage<{ authorId: string }>()

/** Run `work` with the update it writes credited to `authorId` (the member who asked); null runs it as whoever pressed. */
export function asAskedBy<T>(authorId: string | null | undefined, work: () => Promise<T>): Promise<T> {
  return authorId ? scope.run({ authorId }, work) : work()
}

/** The member an approval's update is written as — null outside `asAskedBy` (the presser writes it). */
export const askedAuthor = (): string | null => scope.getStore()?.authorId ?? null
