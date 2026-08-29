/** Listing view (table | kanban) — shared by the server page (URL param) and the client store. */
export type ListingView = 'table' | 'kanban'
export const parseView = (v: unknown): ListingView | null => (v === 'kanban' || v === 'table' ? v : null)
