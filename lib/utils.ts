import { randomUUID } from 'node:crypto'

export function createId(): string {
  return randomUUID()
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'workspace'
  )
}

/**
 * Formatters are deliberately NOT defined here. Currency, locale and date
 * format must be read off the Figma mocks (₹ vs $, en-IN vs en-US, "12 Mar
 * 2026" vs "Mar 12, 2026") rather than guessed.
 */
