import type { CSSProperties } from 'react'
import { fontStack, resolveColor, type BrandKit, type FontRole, type ItemsBlock, type TextStyle } from '@/lib/templates/model'

/** Points → CSS pixels (96 dpi). */
export const pt = (v: number) => v * (96 / 72)

/** A text style resolved against the brand: role first, then the style's own overrides. */
export function textCss(style: TextStyle | undefined, brand: BrandKit, defaultRole: FontRole = 'body'): CSSProperties {
  const role = brand.fonts[style?.role ?? defaultRole]
  const family = style?.font ?? role.family
  const css: CSSProperties = {
    fontFamily: fontStack(family),
    fontSize: `${pt(style?.size ?? role.size)}px`,
    fontWeight: style?.weight ?? role.weight,
    fontStyle: (style?.italic ?? role.italic) ? 'italic' : 'normal',
    color: resolveColor(style?.color, brand),
    textAlign: style?.align ?? 'left',
    lineHeight: style?.lineHeight ?? 1.3,
  }
  if (style?.underline) css.textDecoration = 'underline'
  if (style?.uppercase) css.textTransform = 'uppercase'
  if (style?.letterSpacing) css.letterSpacing = `${pt(style.letterSpacing)}px`
  return css
}

/** Money as the block prints it: "S$1,200.00" · "$ 1,200.00" · "1,200.00". A negative gets the typographic minus. */
export function moneyText(minor: number, currency: ItemsBlock['currency'] | 'S$'): { sign: string; figure: string } {
  const v = Math.abs(minor) / 100
  const figure = `${minor < 0 ? '−' : ''}${new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`
  return currency === 'S$' ? { sign: '', figure: `S$${figure}` } : currency === '$ ' ? { sign: '$', figure } : { sign: '', figure }
}

/** Row padding by density, in px. */
export const ROW_PAD: Record<ItemsBlock['density'], string> = { compact: '2px 4px', normal: '4px 5px', relaxed: '7px 6px' }
