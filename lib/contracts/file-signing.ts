import { CONTRACT_FOLDERS } from '@/lib/leads/file-model'

/*
 * (S46D — D2, his "fix everything" 2026-10-19 after the findability audit, finding D2 · raw P-1 · L-4; FROM-1.0-TO-2.0.md §9 #3) 1.0's
 * *Request signature* on a lead's file (qanvast only — `document-signing-controls.tsx`, its own `/sign/document/<token>` page) is 2.0's
 * Contracts › Import a PDF → Send for digital signature: the file becomes one of the lead's contracts and goes out through the contract's
 * signing link. Files names the way there — *Send for signature* on a file's ⋮ — so a studio that signed loose documents from Files finds it
 * where it looked. Pure and client-safe: the row's words and when it shows; the server (lib/contracts/files.ts `contractPdfFromFile`) asks the
 * same questions again.
 *
 *   · a PDF whose bytes are kept: the row opens Import a contract with the file already in it — no upload;
 *   · a PDF a live contract already keeps: refused in the row, naming the contract (it is sent from Contracts);
 *   · a PDF with no bytes kept (a stand-in): refused in the row — upload it again;
 *   · a picture or a document: refused in the row — save it as a PDF. 1.0 signed PNG and JPEG too, by stamping its certificate page after the
 *     picture; 2.0 signs a PDF only, and turns a picture into one nowhere — no library in the app writes a PDF (`pdfjs-dist` only reads one,
 *     `sharp` writes none), so the rule is said where the press would be (1.0's own words for a file it couldn't sign: "Convert to PDF to
 *     request a signature");
 *   · a folder, a video or a money paper (an invoice's, a receipt's entry — it stays as it was filed): no row.
 * Who: whoever opens the studio's tools on the lead — never Marketing (the contract editors' role rule, lib/quotes/desk.ts) and never
 * Accounting (Files read-only, S06).
 */

export const SEND_FOR_SIGNATURE = 'Send for signature'
/** the row's second line while it can be pressed — where the file is going *(invented copy)* */
export const SIGN_HELP = 'It goes out as a contract'
/** a picture or a document — 1.0's "Convert to PDF to request a signature", in 2.0's words *(invented copy)* */
export const SIGN_NOT_PDF = 'Save it as a PDF first'
/** a PDF whose bytes weren't kept *(invented copy)* */
export const SIGN_NO_BYTES = 'Its pages weren’t kept — upload it again'
/** a PDF a live contract keeps already *(invented copy)* */
export const signKeptLine = (title: string) => `Already in Contracts as “${title}”`

/** The row a file's ⋮ shows: null hides it; `why` null = it can be pressed, else the reason it can't, said in the row (REG-656). */
export type SignRow = { why: string | null } | null

export function signRowFor(f: { kind: string; mime?: string | null; bytes?: boolean; paper?: string | null }, o: { signs: boolean; contract?: string | null }): SignRow {
  if (!o.signs || f.kind === 'folder' || f.paper) return null
  if (f.kind === 'pdf' || f.mime === 'application/pdf') return { why: o.contract ? signKeptLine(o.contract) : f.bytes ? null : SIGN_NO_BYTES }
  if (f.kind === 'image' || f.kind === 'doc') return { why: SIGN_NOT_PDF }
  return null
}

/** Whether a file already sits in the lead's contract folder (Files › Contract & VOs, an older "Contract" standing for it — at the top of Files,
    or inside it): the contract keeps that very file. From anywhere else a copy is kept there, so the original stays free to move or rename. */
export const inContractFolder = (trail: readonly { name: string }[]): boolean => !!trail[0] && (CONTRACT_FOLDERS as readonly string[]).includes(trail[0].name)
