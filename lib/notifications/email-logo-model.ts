/*
 * (S44O — UAT rows 314 · 337, M15) The email logo's size, pure: the box it is drawn in and the reading of a picture's own size from its header,
 * so the delivery layer, the copy and a test agree. Outlook ignores CSS sizes — the `<img>` carries `width` and `height` as attributes.
 */

export type LogoSize = { width: number; height: number }
/** The box the notification email draws the studio's logo in (C10's one-column page: the logo row above the subject). */
export const EMAIL_LOGO_BOX: LogoSize = { width: 160, height: 48 }

/** A picture of `w` × `h` fitted inside the box at its own ratio — whole pixels, never 0. */
export function fitLogo(w: number, h: number, box: LogoSize = EMAIL_LOGO_BOX): LogoSize {
  if (!(w > 0) || !(h > 0)) return { ...box }
  const s = Math.min(box.width / w, box.height / h)
  return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) }
}

/** A PNG's, a GIF's or a JPEG's own size, read from its header — null for anything else (or a broken file). */
export function imageSize(b: Uint8Array): LogoSize | null {
  const u32 = (i: number) => ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0
  const u16be = (i: number) => (b[i]! << 8) | b[i + 1]!
  const u16le = (i: number) => b[i]! | (b[i + 1]! << 8)
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { width: u32(16), height: u32(20) }
  if (b.length >= 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return { width: u16le(6), height: u16le(8) }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue }
      const marker = b[i + 1]!
      /* the frame headers (SOF0…SOF15 but DHT, JPG and DAC) carry the size */
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { width: u16be(i + 7), height: u16be(i + 5) }
      i += 2 + u16be(i + 2)
    }
  }
  return null
}
