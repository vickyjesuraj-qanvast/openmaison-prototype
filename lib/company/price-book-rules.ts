/**
 * (REG-652, price book parity Q-03 · Q-04) Who changes the price book. Owners and Admins add, edit, delete, import and make bulk changes;
 * every member reads the book and uses it on quotes; a Designer (or a Manager) **proposes** a new item — it is on their own quotes at
 * once and offered to no one else until an Owner or an Admin approves it or sends it back with a note. My Sections are the Owners' and
 * Admins' to change. Pure, client-safe: the galleries, the quote editor and the actions read the same words.
 */
type Viewer = { id: string | null; role: string | null | undefined }
type Item = { status: string; createdBy: string | null }

export const BOOK_RULE = 'Only an Owner or an Admin changes the price book'
export const SECTION_RULE = 'Only an Owner or an Admin saves or changes the Price book’s sections'
export const PROPOSED_LINE = 'Proposed — an Owner or an Admin approves it before the studio uses it'
export const runsBook = (v: Viewer) => v.role === 'Owner' || v.role === 'Admin'
const own = (v: Viewer, i: Item) => i.status === 'proposed' && !!v.id && i.createdBy === v.id

/** Why `viewer` may not change this item, else null — a Designer changes only their own proposal. */
export const itemChangeBlock = (v: Viewer, i: Item): string | null => (runsBook(v) || own(v, i) ? null : BOOK_RULE)
/** Whether `viewer` sees and is offered the item: every live item, and their own proposals (an Owner or an Admin sees every proposal in the book). */
export const itemVisible = (v: Viewer, i: Item) => i.status !== 'proposed' || runsBook(v) || own(v, i)
/** Whether a quote may take the item for `viewer`: live, or their own proposal — a proposal waits for its approval before anyone else uses it. */
export const itemPickable = (v: Viewer, i: Item) => i.status !== 'proposed' || own(v, i)
/** The status a new item from `viewer` starts in. */
export const newItemStatus = (v: Viewer) => (runsBook(v) ? 'live' : 'proposed')
