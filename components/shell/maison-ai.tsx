'use client'

import { useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AiSheet } from '@/components/leads/ai-sheet'
import { useComingSoon } from '@/components/om/snackbar'
import { useMaisonAiState } from '@/lib/maison-ai'
import { MaisonFab } from './maison-fab'

/**
 * Maison AI in the shell (REG-507, owner 2026-09-18: "the maison ai fab button works only in the leads pages and rest of the
 * sidebar is not working"). One FAB and one sheet for every page inside the shell: a page with scripted suggestions
 * registers them through `useMaisonAi` (lib/maison-ai.ts); every other page opens the sheet with just Reset prototype to
 * base. A suggestion answers coming soon. Leaving the page closes the sheet.
 */
export function MaisonAi() {
  const { suggestions, raised } = useMaisonAiState()
  const comingSoon = useComingSoon()
  const [open, setOpen] = useState(false)
  const fabRef = useRef<HTMLDivElement>(null)   // the sheet exempts the FAB from outside presses so the FAB toggles (REG-153)
  const pathname = usePathname()
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) { setLastPath(pathname); setOpen(false) }
  return (
    <>
      <AiSheet open={open} suggestions={suggestions} onSelect={() => { setOpen(false); comingSoon() }} onClose={() => setOpen(false)} anchorRef={fabRef} />
      <div ref={fabRef} style={{ display: 'contents' }}>
        <MaisonFab onPress={() => setOpen((o) => !o)} raised={raised} />
      </div>
    </>
  )
}
