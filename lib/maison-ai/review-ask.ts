/**
 * (pending modules S14 — card held:settings-company, "Review Link … revisit: 'Ask for a review' sends a WhatsApp with no link"; 1.0's Review
 * Request Link, "sent … to selected leads or project clients") Maison AI's **Ask for a review**, one press for a Won lead's brief
 * (components/leads/detail/use-lead-maison.ts) and a completed project's (components/projects/use-project-maison.ts):
 *   · the studio has a review link (Company › Profile › Reviews) → the WhatsApp draft carries it; it opens in WhatsApp on the press;
 *   · it has none → an answer, not a message with nowhere to write the review: the one button opens Company › Profile › Reviews for whoever
 *     may set it (Owners and Admins), and *Ask without a link* still opens the plain ask for whoever wants to send it now.
 * Read on the press (`studioReviewLink`), so a link saved a moment ago is the one sent. Nothing is metered. Client-side. *(invented copy)*
 */
import { studioReviewLink } from '@/app/company/review-actions'
import { withFrom } from '@/lib/nav'
import { waLink } from '@/lib/portal/model'
import { reviewLinkText } from '@/lib/company/review-link'
import { DRAFTS, type DraftLead } from './drafts'
import type { MaisonAnswer, MaisonProposal } from '@/lib/maison-ai'

/** Company › Profile › Reviews — the page, then its card (the hash stays last: `withFrom` adds the way back to the page's address). */
export const REVIEWS_PAGE = '/company/profile'
export const REVIEWS_CARD = 'reviews'

export async function reviewAsk(o: { lead: DraftLead; phone: string; first: string; done: boolean; here: string }): Promise<MaisonProposal | MaisonAnswer> {
  const { link, mayEdit } = await studioReviewLink()
  if (link) {
    const text = DRAFTS.review(o.lead, link, o.done)
    return {
      title: `WhatsApp ${o.first}`, text: `“${text}”`, confirm: 'Open WhatsApp',
      lines: [`It carries your review link, ${reviewLinkText(link)}.`, 'It opens in WhatsApp with this message — change anything before you send it.'],
      run: async () => { window.open(waLink(o.phone, text), '_blank', 'noopener'); return true },
    }
  }
  const plain = DRAFTS.review(o.lead, null, o.done)
  return {
    title: 'Add your review link first',
    text: mayEdit
      ? `The message would ask ${o.first} for a review with nowhere to write it. Add the page where clients review you — Google, Qanvast or your own — on Company › Profile, and every review ask carries it.`
      : `The message would ask ${o.first} for a review with nowhere to write it. An Owner or an Admin adds the studio’s review page on Company › Profile — then every review ask carries it.`,
    rows: [{ id: 'without', label: 'Ask without a link', meta: `“${plain}”`, run: () => { window.open(waLink(o.phone, plain), '_blank', 'noopener') } }],
    ...(mayEdit ? { link: { label: 'Add your review link', href: `${withFrom(REVIEWS_PAGE, o.here)}#${REVIEWS_CARD}` } } : {}),
  }
}
