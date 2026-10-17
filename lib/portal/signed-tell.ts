import 'server-only'
import { tellClient } from './client-messages-send'

/*
 * (parity map, CP-118 · FR-095 — 1.0's signing confirmation, M-265) Once something is signed, the client hears it: `client_signed` (Settings ›
 * Notifications › Messages to clients, email by default), with the link to their copy on their page (Files). Called after an agreement is
 * signed online, after a bundle is signed (one message for the set), and when the studio marks an agreement signed. A quote is signed through
 * its agreement (REG-626 `signQuoteThrough`), so the agreement's message covers it — no second one. It never throws (tellClient's rule), and
 * goes once per document (`ref`).
 */
export async function tellSigned(o: { leadId: string; ref: string; document: string }): Promise<number> {
  const document = o.document.trim() || 'your agreement'
  return tellClient({
    event: 'client_signed', leadId: o.leadId, ref: o.ref, path: 'files', fields: { '{document}': document },
    plain: { title: `Signed: ${document}`, line: `Thank you — ${document} is signed. Your copy is on your page.` },
  })
}

/** "Renovation Agreement (and 1 more)" — a bundle's documents in one name, the first in the order the client read them. */
export const bundleName = (titles: readonly string[]) => (titles.length ? `${titles[0]}${titles.length > 1 ? ` (and ${titles.length - 1} more)` : ''}` : 'your documents')
