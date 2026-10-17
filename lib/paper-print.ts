/*
 * (pending modules S34 — the steps' notes after S03 · S07: "a real PDF renderer plugs into Files' Download for a money paper", contracts'
 * print; 1.0's POST /api/quote-pdf/render, Chromium on the server) EVERY "Download PDF" OF A PAPER, IN ONE PLACE. Client-safe and pure.
 *
 * 2.0's papers are pages — a quote's preview, a contract, an invoice, a receipt, a credit note, a purchase order, a selection receipt, a
 * floor plan, a 3D layout, the client's copies — and the prototype's PDF is the browser's own (Print › Save as PDF, the page's print styles
 * laying it out): every Download PDF press and every `?print=1` calls `printPaper()`. PRODUCTION, a real file: the developers plug a renderer
 * into lib/services/pdf.ts (`setPdfRenderer` — a headless Chromium, as 1.0's was) and build with `NEXT_PUBLIC_PDF_DOWNLOADS=1`: from then on
 * the same presses ask GET /papers/pdf?path=<this page>, which renders the page as the person sees it (their own cookies — the page keeps its
 * own permission) and answers the PDF file. `paperPath` is the allow-list: only a paper page is ever rendered.
 */

/** A build that downloads a real PDF file (a renderer is plugged in) — inlined at build time. */
export const PDF_DOWNLOADS = process.env.NEXT_PUBLIC_PDF_DOWNLOADS === '1'

/** The paper pages a renderer may draw — their address, no host, no `..`. */
const PAPER = /^\/(?:quotes\/[^/?#]+\/preview|quote\/[^/?#]+|confirm\/[^/?#]+|contracts\/[^/?#]+\/preview|sign\/[^?#]+|projects\/[^/?#]+\/(?:invoices|receipts|selection-receipts|credit-notes|purchase-orders|floor-plan)\/[^/?#]+|invoice\/[^/?#]+|receipt\/[^/?#]+|po\/[^/?#]+|planner\/[^/?#]+\/print|my\/[^/?#]+\/(?:money|choices)\/[^?#]+)(?:\?[^#]*)?$/
/** `path` when it is a paper page's address (its query kept, `print` taken off), else null. */
export function paperPath(path: string | null | undefined): string | null {
  if (typeof path !== 'string' || path.length > 600 || !path.startsWith('/') || path.startsWith('//') || path.includes('..') || path.includes('\\')) return null
  const [p, q = ''] = path.split('?', 2)
  if (!p || p.includes('%')) return null   // ids and tokens never carry an escape — `%2e%2e` never sneaks a `..` past the check
  const params = new URLSearchParams(q)
  params.delete('print')
  const clean = params.size ? `${p}?${params.toString()}` : p!
  return PAPER.test(clean) ? clean : null
}

/** The house's Download PDF / Print for a paper page: the browser's print today; the server's PDF file once a renderer is plugged in. */
export function printPaper(): void {
  if (PDF_DOWNLOADS && typeof window !== 'undefined') {
    const path = paperPath(`${window.location.pathname}${window.location.search}`)
    if (path) {
      /* a download, not a navigation — the page stays where it is */
      const a = document.createElement('a')
      a.href = `/papers/pdf?path=${encodeURIComponent(path)}`
      a.download = ''
      document.body.appendChild(a); a.click(); a.remove()
      return
    }
  }
  window.print()
}
