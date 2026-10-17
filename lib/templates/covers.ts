/**
 * (pending modules S11 — card held:quote-templates, "1.0's five cover-page presets"; 1.0 src/components/leads/cover-editor/templates/*) The
 * five cover looks 1.0 offered — Editorial · Magazine split · Minimal · Bold statement · Studio letterhead — rebuilt as 2.0 cover canvases:
 * 1.0's slots (placed in % of the page) become the cover's elements placed in mm on this template's paper; its photo slot is a Picture the
 * studio fills (nothing prints until it does), its studio_logo the brand logo (the dark one on a dark page), its accent rule a Line in the
 * kit's Accent, its text slots fields in the brand's type roles (1.0 hard-coded Outfit and Inter; 2.0's roles follow the kit). Client-safe.
 */
import { newId, PAPER_MM, type CanvasElement, type Paper, type TextStyle } from './model'

export const COVER_LOOK_KEYS = ['editorial', 'magazine', 'minimal', 'bold', 'letterhead'] as const
export type CoverLookKey = (typeof COVER_LOOK_KEYS)[number]
/** 1.0's names and the line under each card (its `tagline`). */
export const COVER_LOOKS: { key: CoverLookKey; name: string; line: string }[] = [
  { key: 'editorial', name: 'Editorial', line: 'Dramatic, photo-led' },
  { key: 'magazine', name: 'Magazine split', line: 'Print-magazine feel' },
  { key: 'minimal', name: 'Minimal', line: 'Understated, typographic' },
  { key: 'bold', name: 'Bold statement', line: 'Confident, brand-forward' },
  { key: 'letterhead', name: 'Studio letterhead', line: 'Traditional, document feel' },
]
export const isCoverLookKey = (v: unknown): v is CoverLookKey => typeof v === 'string' && (COVER_LOOK_KEYS as readonly string[]).includes(v)

/** 1.0's Studio letterhead intro, as it wrote it. */
const LETTERHEAD_INTRO = 'Thank you for the opportunity to design your space. The pages that follow detail our scope, materials, and timeline.'
const WHITE = '#FFFFFF'

/** A cover look on this paper: its elements and the page's background (a brand key or a hex; none = the white page). */
export function coverLook(key: CoverLookKey, paper: Paper): { elements: CanvasElement[]; background?: string } {
  const { w: W, h: H } = PAPER_MM[paper]
  const X = (pct: number) => Math.round(((pct * W) / 100) * 2) / 2
  const Y = (pct: number) => Math.round(((pct * H) / 100) * 2) / 2
  const text = (x: number, y: number, w: number, value: string, style: TextStyle): CanvasElement => ({ id: newId('e'), kind: 'text', x: X(x), y: Y(y), w: X(w), text: value, style })
  const pic = (x: number, y: number, w: number, h: number, src: string, fit: 'contain' | 'cover' = 'contain'): CanvasElement => ({ id: newId('e'), kind: 'image', x: X(x), y: Y(y), w: X(w), h: Y(h), src, fit })
  const line = (x: number, y: number, w: number, weight: number): CanvasElement => ({ id: newId('e'), kind: 'rule', x: X(x), y: Y(y), w: X(w), weight, color: 'accent' })
  const box = (x: number, y: number, w: number, h: number, fill: string): CanvasElement => ({ id: newId('e'), kind: 'box', x: X(x), y: Y(y), w: X(w), h: Y(h), fill })
  switch (key) {
    /* Full-bleed photo, the studio's mark top-left, the title centred low, client and date bottom-right. 1.0 darkened the photo's foot with a
       gradient; here the foot is a band of the kit's ink, so the white words read over any photo. */
    case 'editorial': return { background: 'ink', elements: [
      pic(0, 0, 100, 100, '', 'cover'),
      box(0, 60, 100, 40, 'ink'),
      pic(6, 6, 12, 8, 'logo-dark'),
      text(10, 66, 80, '{quote_title}', { role: 'heading', size: 32, weight: 700, color: WHITE, align: 'center', lineHeight: 1.05 }),
      text(55, 88, 38, '{client_name}', { role: 'small', size: 8.5, color: WHITE, align: 'right', uppercase: true, letterSpacing: 1 }),
      text(55, 92, 38, '{date}', { role: 'small', size: 7.5, color: WHITE, align: 'right' }),
    ] }
    /* The photo on the left half; the mark, the title, an accent line, then client · date · quote number on the right. */
    case 'magazine': return { elements: [
      pic(0, 0, 50, 100, '', 'cover'),
      pic(56, 8, 18, 8, 'logo'),
      text(56, 38, 38, '{quote_title}', { role: 'heading', size: 27, weight: 700, align: 'left', lineHeight: 1.1 }),
      line(56, 60, 14, 1.5),
      text(56, 66, 38, '{client_name}', { role: 'small', size: 9, weight: 600, uppercase: true, letterSpacing: 1 }),
      text(56, 71, 38, '{date}', { role: 'small', size: 8, color: 'grey' }),
      text(56, 76, 38, '{quote_number}', { role: 'small', size: 7.5, color: 'grey', uppercase: true, letterSpacing: 0.75 }),
    ] }
    /* White, the mark centred above a short accent line, the title, client and date centred under it. */
    case 'minimal': return { elements: [
      pic(40, 22, 20, 10, 'logo'),
      line(47, 38, 6, 0.75),
      text(15, 46, 70, '{quote_title}', { role: 'heading', size: 28, weight: 600, align: 'center', lineHeight: 1.15 }),
      text(25, 66, 50, '{client_name}', { role: 'small', size: 8.5, color: 'grey', align: 'center', uppercase: true, letterSpacing: 1.5 }),
      text(25, 70, 50, '{date}', { role: 'small', size: 7.5, color: 'grey', align: 'center' }),
    ] }
    /* The page in the kit's Accent, the mark top-left, a large title, client and date at the foot. */
    case 'bold': return { background: 'accent', elements: [
      pic(7, 8, 16, 8, 'logo-dark'),
      text(7, 36, 70, '{quote_title}', { role: 'heading', size: 44, weight: 700, color: WHITE, align: 'left', lineHeight: 1 }),
      text(7, 86, 60, '{client_name}', { role: 'small', size: 8.5, weight: 600, color: WHITE, uppercase: true, letterSpacing: 1 }),
      text(7, 91, 60, '{date}', { role: 'small', size: 7.5, color: WHITE }),
    ] }
    /* The studio's block across the top, a rule, the title, the client, an introduction, a rule, then the quote number and the date. */
    case 'letterhead': return { background: '#FAFAF7', elements: [
      pic(7, 7, 16, 8, 'logo'),
      text(25, 8, 30, '{studio_name}', { role: 'heading', size: 12, weight: 600 }),
      text(25, 12, 60, '{studio_address}', { role: 'small', size: 7, color: 'grey' }),
      line(7, 19, 86, 0.75),
      text(7, 32, 86, '{quote_title}', { role: 'heading', size: 21, weight: 600, lineHeight: 1.15 }),
      text(7, 44, 86, '{client_name}', { role: 'body', size: 9, weight: 600 }),
      text(7, 54, 86, LETTERHEAD_INTRO, { role: 'body', size: 8.5, color: 'grey', lineHeight: 1.6 }),
      line(7, 86, 86, 0.75),
      text(7, 90, 30, '{quote_number}', { role: 'small', size: 7, weight: 600, color: 'grey', uppercase: true, letterSpacing: 1 }),
      text(35, 90, 30, '{date}', { role: 'small', size: 7, color: 'grey', align: 'center' }),
    ] }
  }
}
