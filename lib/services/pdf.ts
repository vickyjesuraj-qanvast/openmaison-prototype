import 'server-only'
import { serviceSlot } from './slots'

/*
 * (pending modules S34) The PDF renderer's slot — lib/paper-print.ts says how every paper's Download PDF reaches it. Its contract: draw the
 * page at `url` (absolute, this app's own) with the visitor's `cookie` (so it sees what they see, and nothing else), A4 by the page's print
 * styles, and answer the file's bytes — or throw (the route answers 502 and the person can still print). THE STAND-IN draws nothing: the
 * browser's own print makes the PDF, and GET /papers/pdf answers 501 saying so. 1.0's renderer was Playwright + @sparticuz/chromium-min
 * (env CHROMIUM_BINARY_URL, INTERNAL_RENDER_ORIGIN for the page's address inside the deployment).
 */
export type PdfRenderer = { name: string; render(o: { url: string; cookie: string | null; fileName: string }): Promise<Uint8Array> }
const BROWSER: PdfRenderer = { name: 'browser-print', render: async () => { throw new Error('The browser makes the PDF on this prototype — Print › Save as PDF') } }
const slot = serviceSlot<PdfRenderer>('pdf', BROWSER)
/** PRODUCTION: plug the renderer in once, at start-up (lib/services/install.ts), and build with NEXT_PUBLIC_PDF_DOWNLOADS=1. */
export function setPdfRenderer(r: PdfRenderer): void { slot.set(r) }
export const pdfRenderer = (): PdfRenderer => slot.use()
export const pdfIsStandIn = (): boolean => slot.standIn()
