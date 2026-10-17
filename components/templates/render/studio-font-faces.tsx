'use client'

import { fontFaceCss, type FontFace } from '@/lib/templates/model'

/**
 * (pending modules S11 — card held:quote-templates) The studio's own fonts as @font-face rules, wherever a document or a font sample is
 * drawn. React hoists the one stylesheet into the head and keeps one copy however many documents a page draws (the same `href`); a new
 * upload or a removal gives it a new key.
 */
export function StudioFontFaces({ faces }: { faces: FontFace[] | undefined }) {
  if (!faces?.length) return null
  const key = faces.map((f) => f.id).join('.')
  return <style href={`om-studio-fonts-${key}`} precedence="default">{fontFaceCss(faces)}</style>
}
