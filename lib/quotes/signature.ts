/**
 * (Dane UAT 6.23, g-signature) A member's own signature: drawn (an SVG path on the 752×140 box), typed (the name in the signature face) or —
 * new — uploaded, a picture of the hand-signed mark (1.0's upload: contracts audit DEF-13; templates TE-08, its 1 MB cap). One shape for
 * every reader — the quote's print, Preview and the client's pages (canvas.tsx), the contract paper and its signed copy — so an uploaded
 * signature prints wherever a drawn one does. Pure: the browser checks a picked file with these words, the server checks the data again.
 */
export const SIGNATURE_KINDS = ['draw', 'type', 'image'] as const
export type SignatureKind = (typeof SIGNATURE_KINDS)[number]
export const isSignatureKind = (k: unknown): k is SignatureKind => typeof k === 'string' && (SIGNATURE_KINDS as readonly string[]).includes(k)

/** The saved signature as every page reads it; `data` is the drawing's path or the picture's data URL. */
export type MemberSignature = { kind: SignatureKind; name: string; data: string | null }

/** 1.0's cap for a signature picture: 1 MB. */
export const SIGNATURE_IMAGE_MAX = 1024 * 1024
/** PNG, or a JPG on white — the two a printed page draws cleanly. */
export const SIGNATURE_IMAGE_TYPES = ['image/png', 'image/jpeg'] as const
export const SIGNATURE_IMAGE_ACCEPT = '.png,.jpg,.jpeg,image/png,image/jpeg'

/** The words the Upload choice says (invented copy, Dane UAT 6.23). */
export const SIGNATURE_UPLOAD_HELP = 'PNG is best, or a JPG on a white background · up to 1 MB'
export const SIGNATURE_TOO_BIG = 'That picture is over 1 MB — choose a smaller one'
export const SIGNATURE_WRONG_TYPE = 'Choose a PNG or JPG picture'

/** Why a picked file can't be the signature, or null when it can. */
export function signatureFileProblem(file: { size: number; type: string; name: string }): string | null {
  const type = file.type || (/\.png$/i.test(file.name) ? 'image/png' : /\.jpe?g$/i.test(file.name) ? 'image/jpeg' : '')
  if (!(SIGNATURE_IMAGE_TYPES as readonly string[]).includes(type)) return SIGNATURE_WRONG_TYPE
  if (file.size > SIGNATURE_IMAGE_MAX) return SIGNATURE_TOO_BIG
  return null
}

const DATA_URL = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/
/** A stored picture is a PNG or JPEG data URL of at most 1 MB — never a link, never markup. */
export function isSignatureImage(v: unknown): v is string {
  if (typeof v !== 'string') return false
  const m = DATA_URL.exec(v)
  if (!m) return false
  const b64 = m[2]!
  const bytes = Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0)
  return bytes > 0 && bytes <= SIGNATURE_IMAGE_MAX
}
/** A stored drawing is an SVG path of M / L commands only — the shape `saveMemberSignature` accepts. */
export const isSignaturePath = (v: unknown): v is string => typeof v === 'string' && v.length <= 20_000 && /^(M[\d.\s]+(L[\d.\s]+)*\s*)+$/.test(v.trim())

/** A member row's signature as the pages draw it — null while it is not set up, or when what is stored can't be drawn. */
export function memberSignatureOf(m: { name: string; signatureKind: string | null; signatureName: string | null; signatureData: string | null } | null | undefined): MemberSignature | null {
  if (!m || !isSignatureKind(m.signatureKind)) return null
  const name = m.signatureName ?? m.name
  if (m.signatureKind === 'image') return isSignatureImage(m.signatureData) ? { kind: 'image', name, data: m.signatureData } : null
  return { kind: m.signatureKind, name, data: m.signatureData }
}

/**
 * (pending modules S03 — 1.0's member_signatures.auto_apply: "Automatically stamp your signature on quotes you prepare … Revocable anytime")
 * A member's signature goes on the documents they prepare only once they said yes: Your profile › Your signature holds the switch, and
 * saving a signature in Signature Settings answers it for a member who never had (the dialog says what Save does). 'no' keeps it off every
 * quote and contract; null = never answered (nothing printed). The member's own views — Your profile, the quote's Signature section — show it
 * either way.
 */
export const SIGNATURE_CONSENTS = ['yes', 'no'] as const
export type SignatureConsent = (typeof SIGNATURE_CONSENTS)[number]
export const consentsToSign = (m: { signatureConsent?: string | null } | null | undefined) => m?.signatureConsent === 'yes'
/** The signature a document prints for its preparer: their saved one, when they allowed it — else none. */
export function appliedSignatureOf(m: { name: string; signatureKind: string | null; signatureName: string | null; signatureData: string | null; signatureConsent?: string | null } | null | undefined): MemberSignature | null {
  return consentsToSign(m) ? memberSignatureOf(m) : null
}
/** The switch's words (invented copy, 1.0's card as the model). */
export const CONSENT_LABEL = 'Put it on the quotes and contracts I prepare'
export const CONSENT_HELP = 'Off: you sign printed quotes by hand.'   // (the calm UI build 2026-10-27, 1-29) the one helper that changes a decision
