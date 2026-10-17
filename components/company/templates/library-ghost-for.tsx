'use client'

import type { ComponentProps } from 'react'
import { usePathname } from 'next/navigation'
import { useFirstRunShape, useSeedFlag } from '@/lib/ghost-shape'
import { LibraryGalleryGhost } from './library-gallery.skeleton'

/** The library's page key for its remembered shape — the gallery's own `tableKey` (lib/ghost-shape.tsx, `lib.<tableKey>`). */
export const libraryShape = (tableKey: string) => `lib.${tableKey}`
/** Templates' tabs share one loading.tsx: the tab in the address names the library. */
const TEMPLATE_KEYS: Record<string, string> = { quotes: 'quote-templates', contracts: 'contract-templates', tasks: 'task-templates', terms: 'text-templates', payments: 'payment-templates', schedules: 'schedule-templates' }

/**
 * (UX audit build, REG-708 kept) The house gallery's ghost in the shape the library opens on — its first run (the bare bar and the start card,
 * REG-735) or its full list — from the reveal's own knowledge or, for `loading.tsx`, the shape this browser saw last.
 * `page`: a table key, or 'templates' to read it from the address.
 */
export function LibraryGhostFor({ page, ...props }: { page: string } & ComponentProps<typeof LibraryGalleryGhost>) {
  const path = usePathname()
  const key = page === 'templates' ? TEMPLATE_KEYS[path.split('/')[3] ?? 'quotes'] ?? 'quote-templates' : page
  const first = useFirstRunShape(libraryShape(key))
  /* (pending modules S17) a Folders row only where the library's top level has folders (the seed knows) */
  const folders = useSeedFlag(`${libraryShape(key)}.folders`, true) ? props.folders : 0
  return <LibraryGalleryGhost {...props} folders={folders} first={first} />
}
