import type { CSSProperties } from 'react'

/**
 * Material Symbols glyph, rendered as the variable font — exactly how the
 * mocks render icons. `family` mirrors the mock's usage: rounded everywhere,
 * outlined only where the mock uses it (search bar, modal close).
 */
export function Icon({
  name,
  size = 20,
  weight = 400,
  fill = false,
  family = 'rounded',
  className,
  style,
}: {
  name: string
  size?: number
  weight?: 300 | 400
  fill?: boolean
  family?: 'rounded' | 'outlined'
  className?: string
  style?: CSSProperties
}) {
  const base = family === 'rounded' ? 'msr' : 'mso'
  return (
    <span
      aria-hidden
      className={className ? `${base} ${className}` : base}
      data-weight={weight === 300 ? '300' : undefined}
      data-fill={fill ? '1' : undefined}
      style={{ fontSize: size, ...style }}
    >
      {name}
    </span>
  )
}
