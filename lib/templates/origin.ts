/**
 * (REG-495) Where the template editor was opened from — a quote's Template card or a lead's Create Quote — so Back returns
 * there, "Preview with" shows that quote, and Publish can update the quote or start one. Carried as ?from= (the page to
 * return to, REG-465), ?quote= and ?lead=; the page resolves them into this. Client-safe.
 */
import type { DocData } from './data'

export type EditorOrigin = {
  from: string | undefined
  quote?: { id: string; number: string; leadName: string; status: string; templateId: string | null; data: DocData }
  lead?: { id: string; name: string }
}
