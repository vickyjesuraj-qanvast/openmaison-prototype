import { TOKEN_GROUPS, type TokenKey } from '@/lib/contracts/tokens'
import type { Align, BlockKind } from '../editor/doc-editor'

/**
 * The Document screen's content on a phone and a touch tablet (contracts on the move 2026-10-22, P-03 · P-04) — the queries and the words
 * its pieces share. Client-safe constants; no DOM here.
 */

/** (Q-01) The phone model: a phone, or a tablet held upright — the + ▾ and Text style open as bottom sheets, the placement as a sheet; a tablet
    held sideways keeps anchored menus and a centred dialog. The same words `lib/breakpoint.ts` will carry as `TABLET_PORTRAIT` once the Contract
    screen (C1) lands — one import to swap. */
export const PHONE_MODEL = '(max-width: 767px), (max-width: 1024px) and (orientation: portrait)'
/** (REG-307) The touch rules' query: a chip's tap sheet and a box's own ✕ live here, never on a mouse. */
export const TOUCH = '(max-width: 767px), (hover: none) and (max-width: 1024px)'

/** The Text style menu's rows, in the desk bar's order. */
export const BLOCKS: { kind: BlockKind; label: string }[] = [
  { kind: 'p', label: 'Normal text' }, { kind: 'h1', label: 'Heading 1' }, { kind: 'h2', label: 'Heading 2' }, { kind: 'h3', label: 'Heading 3' },
]
export const ALIGNS: { a: Align; icon: string; label: string }[] = [
  { a: 'left', icon: 'format_align_left', label: 'Align left' }, { a: 'center', icon: 'format_align_center', label: 'Align centre' }, { a: 'right', icon: 'format_align_right', label: 'Align right' },
]

/** (C-15) Where a Smart Text chip fills in from — the chip sheet's second line, by the chip's group. */
export function tokenSource(key: TokenKey): string {
  const group = TOKEN_GROUPS.find((g) => g.tokens.some((t) => t.key === key))?.key
  switch (group) {
    case 'client': return 'Fills in from the lead’s client'
    case 'lead': return 'Fills in from the lead'
    case 'studio': return 'Fills in from your studio’s profile'
    case 'quote': return 'Fills in from the quote it names'
    case 'handover': return 'Fills in from the project at handover'
    case 'date': return key === 'date.today' ? 'Fills in on the day it is signed' : 'Fills in from the contract date'
    default: return 'Fills in from the record'
  }
}
