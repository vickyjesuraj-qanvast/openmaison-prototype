import type { ReactNode } from 'react'
import { SnackbarProvider } from '@/components/om/snackbar'
import { GlobalSearch } from '@/components/shell/global-search'
import { NotificationsPanel } from '@/components/shell/notifications-panel'
import { ShortcutsLayer } from '@/components/shell/shortcuts/shortcuts-layer'
import { CreditsHost } from '@/components/credits/credits-host'
import { fetchCreditsChrome } from '@/lib/credits/chrome'
import styles from './layout.module.css'

/** The editor surface (`/quotes/[quoteId]`, route group `(editor)`): no rail, no page header — see layout.module.css.
 *  The studio-wide list at `/quotes` lives in the shell (app/quotes, REG-422).
 *  (REG-701) The credits' host rides here too: the AI Visualizer charges from inside this group, and its out-of-credits moments, the
 *  top-up and Plans open over the design without leaving it.
 *  (REG-714, Q-23) The editors get what every other page has: ⌘K's search, the bell (G then N) and the keyboard with its ? panel —
 *  ⌘S says the editor has saved. Nothing here draws until a key or a press opens it. */
export default async function EditorLayout({ children }: { children: ReactNode }) {
  const credits = await fetchCreditsChrome().catch(() => null)
  return (
    <SnackbarProvider>
      <div className={styles.surface}>{children}</div>
      <CreditsHost chrome={credits} />
      <NotificationsPanel />
      <GlobalSearch />
      <ShortcutsLayer editor />
    </SnackbarProvider>
  )
}
