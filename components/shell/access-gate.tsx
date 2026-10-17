'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { EmptyState } from '@/components/om/empty-state'
import { PageHeader } from '@/components/shell/page-header'
import { companySectionOf } from '@/lib/company/sections'
import { opensPath, projectsHome, roleGate } from '@/lib/settings/roles'
import styles from './record-not-found.module.css'   // the record notice's own frame: the header, then the notice under it

/**
 * (parity map, PR-022 · FR-040) The house gate — an address the signed-in member's role does not open lands here, never a crash and never
 * Next's bare 404: the shell stays (the rail, the header), one plain sentence says so and the way to their own work is one press. Accounting
 * opens the books only (lib/settings/roles.ts `opensPath`); every other role opens everything the shell offers, so this draws for them only.
 * The pages that read records render it from the server before any record is read (`refusesWorkspace`); `AccessGuard` draws it for every
 * other address of the shell, so the rule holds wherever a link, a key or a typed address leads. *(invented copy: the notice's words)*
 */
export function AccessGate({ section, role }: { section: string
  /** (S44O — call C6) the role refused — the server's pages pass it; the shell's net reads it from the signed-in role */ role?: string | null }) {
  const router = useRouter()
  /* (S44O — call C6) the sentence and the one press are the role's own: Accounting's books, Marketing's leads (lib/settings/roles.ts `roleGate`) */
  const signedIn = useContext(SignedInRole)
  const gate = roleGate(role ?? signedIn)
  return (
    <div className={styles.page} data-testid="access-gate">
      <PageHeader title={section} />
      <div className={styles.body}>
        {/* (S42E, E-09) an address no section names reads "this page" in the sentence, never "This page" */}
        <EmptyState icon="lock" tone="plain" testId="access-gate-notice" title={`You don’t have access to ${section === UNNAMED ? 'this page' : section}`}
                    help={gate.help}
                    primary={{ label: gate.label, onPress: () => router.push(gate.href), testId: 'access-gate-home' }} />
      </div>
    </div>
  )
}

/** What a gated address is called in the gate's header — its section's own name (each page's own header word). (S42E, E-09) The pending
    modules' sections joined: the Marketplace, Market Insights, Meetings and the Dashboard (and Tools' own pages) — their pages' own gate was
    never reached, as this net answers first. */
const SECTIONS: Record<string, string> = {
  leads: 'Leads', projects: 'Projects', chat: 'Messages', tasks: 'Tasks', quotes: 'Quotes', contracts: 'Contracts', 'quote-x-ray': 'Quote X-Ray',
  visualizer: 'AI Visualizer', planner: '3D Space Planner', compliance: 'Compliance', 'qanvast-ops': 'Qanvast Ops', templates: 'Templates', settings: 'Settings',
  marketplace: 'Marketplace', 'market-insights': 'Market Insights', meetings: 'Meetings', dashboard: 'Dashboard', tools: 'Tools',   // (S42 audit C-07 · E-09) Tools › Meeting Copilot, a meeting's page, the Marketplace, Market Insights — the gate names the section, never "This page"
}
const UNNAMED = 'This page'
export function sectionOfPath(pathname: string): string {
  const seg = pathname.split('?')[0]!.split('/')[1] ?? ''
  if (seg === 'company') return companySectionOf(pathname) ?? 'Company'
  return SECTIONS[seg] ?? UNNAMED
}

/** (pending modules S07) The signed-in member's role, for the pages under the guard that word a way somewhere by it. */
const SignedInRole = createContext<string | null>(null)
/** (pending modules S07 — the steps' note after S06) A project's pages start their crumb at Projects — Finance for Accounting (`projectsHome`). */
export const useProjectsCrumb = () => projectsHome(useContext(SignedInRole))
/** (S44O — call C6) The signed-in member's role, for a page under the guard that lists only the doors it opens (Reports' tabs for Marketing). */
export const useSignedInRole = () => useContext(SignedInRole)

/** (parity map, PR-022) The shell's net: the page itself, or the house gate when this member's role does not open its address. */
export function AccessGuard({ role, children, open = false }: { role: string | null; children: ReactNode
  /** (pending modules S41b-2) the page is no section's — the app-wide "page not found" answers every role alike, never the gate */ open?: boolean }) {
  const pathname = usePathname()
  /* (S44O — call C6) the role rides both branches, so a page's own gate (rendered by the server inside the shell) words itself by it too */
  return <SignedInRole.Provider value={role}>{open || opensPath(role, pathname) ? children : <AccessGate section={sectionOfPath(pathname)} />}</SignedInRole.Provider>
}

/** (parity map, PR-022) Inside a project's frame, a view Accounting does not open — its Schedule, Client or Design pages: the frame stays (the
    header, the Money · Files strip), the body says so and the way to the project's Money is one press. *(invented copy)* */
export function ProjectViewGate({ view, moneyHref }: { view: string; moneyHref: string }) {
  const router = useRouter()
  return (
    <div className={styles.body} data-testid="project-view-gate">
      <EmptyState icon="lock" tone="plain" testId="project-view-gate-notice" title={`You don’t have access to ${view}`}
                  help="Accounting opens a project’s Money and Files — its schedule, its client’s pages and its design are its team’s."
                  primary={{ label: 'Open Money', onPress: () => router.push(moneyHref), testId: 'project-view-gate-money' }} />
    </div>
  )
}
