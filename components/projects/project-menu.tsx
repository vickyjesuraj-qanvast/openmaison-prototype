'use client'

import { useParams, usePathname } from 'next/navigation'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { openProjectCommission } from '@/components/finance/books/project-commission-dialog'   // (parity map, FB-042 · FB-043) P-C's dialog
import { openDuplicateProject } from './ending/use-project-ending'   // (parity map, PR-058)
import type { ProjectStage } from '@/lib/projects/model'
import { RUNS_RULE, TEAM_RULE, stageRow } from './stage-menu'

/**
 * (REG-925) A project's menu — the same items wherever the project appears (the listing's row, its phone card, the project page's kebab),
 * the house rule for a lead's menu (page-checklist › Lead menus).
 *
 * (parity P-11 · A-10 · D-04 · B-12, the owner's pick 2026-10-08) In the lead's voice: **Edit details** first (key E, P-09) · the record links
 * (Open the lead’s record · Open the signed quote · Open the contract) · Invite to Portal · Copy Link · Delete — no "…" on any row (Q-12), no
 * divider, a second line only where a row is refused (REG-728) or names what it opens, one width (`PROJECT_MENU_WIDTH`). The stage rows moved to
 * the header's Stage ▾ (P-08, components/projects/stage-menu.tsx) and the create rows to the Create strip (P-03) — on a phone, where the strip
 * is hidden, the sheet carries AI Visualizer and 3D Space Planner as the lead's ⋮ carries its AI Visualizer (audit 2026-09-26, D7).
 * Rename is a field of Edit details now.
 * (simplify S-14 · Q-04, 2026-10-09) On the project page's phone sheet those two ride in the sheet's whole Create group now — the strip's seven,
 * drawn above these rows by the page (`QuickLinkItems`, components/leads/detail/quick-links.tsx); `phone` stays for any host without it.
 * (parity map, PR-058 · FB-042 · FB-043 — his "build everything that's in 1.0" 2026-10-10) after Invite to Portal: **Commission** (the project's
 * team, Owners and Admins — P-C's dialog) and **Duplicate project** (any member) — each opens its own dialog, wherever the project's id is known
 * (the project page reads it from its address); no "…", as every row here.
 * (pending modules S46B — his "fix everything" 2026-10-19 after the findability audit, M6 · M7) Two doors a 1.0 member looked for here:
 * **See it as {client}** beside Invite to Portal (1.0's *Preview as Homeowner*; the panel's own press, where the host knows the portal — the
 * project page), and **Complete handover** just before Delete (1.0's *Close project*, beside Delete project) — the Stage menu's Completed row
 * itself (`stageRow`): the same sheet, the same refusals in the row, Review the handover while one waits for this viewer, gone once completed.
 * Stage ▾ keeps every stage row (P-08 stands); this partly reverses P-08's menu, on his "fix everything".
 */
export type ProjectMenuAction = 'edit' | 'lead' | 'quote' | 'contract' | 'copy'
  | 'access'   // (Projects r4a) the Invite to Portal panel (board 8; "Client access" until one-home N-15)
  | 'delete'   // (Projects round 7)
  | 'visualizer' | 'planner'   // (parity P-03) on a phone only — the Create strip's two doors the hidden strip can't offer
  /* (parity map, PR-058 · FB-042) the rows open their own dialogs (the ending's host, P-C's commission dialog) — the host only closes its menu */
  | 'duplicate' | 'commission'
  /* (S46B, M6) Complete handover — the host opens the Hand over sheet (Review the handover while one waits for an Owner or an Admin) */
  | 'complete'
  /* (S46B, M7) See it as {client} — the host opens the client's portal as them in a new tab, on the press */
  | 'preview'
  /* (parity P-08 · P-11) no longer offered by this menu — the stage menu and Edit details run them; kept so a host's switch still reads */
  | 'rename' | 'reopen' | 'hold' | 'resume'

/** (parity P-11) One width for the project's menu wherever it opens — the house standard, as the lead's ⋮. */
export const PROJECT_MENU_WIDTH = MENU_WIDTH.standard

export function ProjectMenuItems({ project, onPick, canRename = true, ends, edit = false, phone = false, seeAs }: {
  project: { direct: boolean; quoteId: string | null; contractId: string | null; stage?: ProjectStage; /** (gaps build, package A) on hold — "Since 2 Oct ’26 — …" */ hold?: string | null
    /** (parity map, PR-058 · FB-042) the project's id — Duplicate project and Commission open for it; on the project page it is read from the
        address, so a host that knows it (the listing's row) may pass it to offer them there too */
    id?: string }
  onPick: (a: ProjectMenuAction) => void
  /** The project's change rule (its team, Owners and Admins) — Edit details is refused in the row without it (REG-728). */
  canRename?: boolean
  /** (Projects round 7) Delete is the Owners' and Admins' (`runs`). */
  ends?: { mayHandover: boolean; runs: boolean; requested?: boolean; requestedBy?: string | null; requestedAt?: number | null }
  /** (parity P-09) The host opens the project's Edit details (`'edit'`) — the project page, and the listing once it does. */
  edit?: boolean
  /** (parity P-03) ≤767, where the Create strip is hidden: its AI Visualizer and 3D Space Planner ride in the sheet. */
  phone?: boolean
  /** (S46B, M7) See it as {client}: the client's first name and why this viewer can't (null when they can) — a host that knows the portal passes it. */
  seeAs?: { first: string; why: string | null }
}) {
  const pathname = usePathname()
  const params = useParams<{ id?: string | string[] }>()
  const id = project.id ?? (pathname?.startsWith('/projects/') && typeof params?.id === 'string' ? params.id : null)
  /* (S46B, M6) shown while the project isn't completed — the Stage menu's own answer for its Completed row (`stageRow`), never a second rule */
  const handover = ends && project.stage && project.stage !== 'completed'
    ? stageRow('completed', { stage: project.stage, held: !!project.hold, startedAt: null, mayChange: canRename, mayHandover: ends.mayHandover, runs: ends.runs, requested: !!ends.requested })
    : null
  return (
    <>
      {edit ? <DropdownItem onSelect={() => onPick('edit')} shortcut="edit" disabled={!canRename} title={canRename ? undefined : TEAM_RULE}>Edit details</DropdownItem> : null}
      {/* (parity P-11 · B-12) since one-home N-10 a Won lead's notes and questionnaire live on the project: the lead keeps its quotes and contracts */}
      {!project.direct ? <DropdownItem onSelect={() => onPick('lead')} help="Its quotes and contracts">Open the lead’s record</DropdownItem> : null}
      {project.quoteId ? <DropdownItem onSelect={() => onPick('quote')}>Open the signed quote</DropdownItem> : null}
      {project.contractId ? <DropdownItem onSelect={() => onPick('contract')}>Open the contract</DropdownItem> : null}
      {phone ? (
        <>
          <DropdownItem onSelect={() => onPick('visualizer')}>AI Visualizer</DropdownItem>
          <DropdownItem onSelect={() => onPick('planner')}>3D Space Planner</DropdownItem>
        </>
      ) : null}
      {/* (Projects r4a) the client's portal: who can open it, invite, See it as the client, withdraw — (one-home N-15) the panel's one name */}
      {/* (the calm UI build 2026-10-27, 3-25 · W-218) Company's name for it — the panel is the client's portal, invited or not */}
      <DropdownItem onSelect={() => onPick('access')}>Client portal</DropdownItem>
      {/* (S46B, M7 — 1.0's Preview as Homeowner) the Invite to Portal panel's own See it as, on its own row: refused in the row as the panel's rule */}
      {seeAs ? <DropdownItem onSelect={() => onPick('preview')} disabled={!!seeAs.why} title={seeAs.why ?? undefined}>{`See it as ${seeAs.first}`}</DropdownItem> : null}
      {/* (parity map, FB-042 · FB-043) the project's commission — Owners, Admins and its team (a Designer reads the rule and asks for another) */}
      {id && canRename ? <DropdownItem onSelect={() => { onPick('commission'); openProjectCommission(id) }}>Commission</DropdownItem> : null}
      {/* (parity map, PR-058) a new project from this one — for the same client, another or a new one; its schedule and a draft of its quote */}
      {id ? <DropdownItem onSelect={() => { onPick('duplicate'); openDuplicateProject(id) }}>Duplicate project</DropdownItem> : null}
      <DropdownItem onSelect={() => onPick('copy')}>Copy link</DropdownItem>   {/* (the calm UI build 2026-10-27, 3-40 · W-005) sentence case */}
      {/* (S46B, M6 — 1.0's Close project, just above Delete) the Stage menu's Completed row: its move, its words, its refusal in the row */}
      {handover ? <DropdownItem onSelect={() => onPick('complete')} disabled={!!handover.why} title={handover.why ?? undefined}>{handover.move === 'review' ? 'Review the handover' : 'Complete handover'}</DropdownItem> : null}
      {ends ? <DropdownItem onSelect={() => onPick('delete')} tone="danger" disabled={!ends.runs} title={ends.runs ? undefined : RUNS_RULE}>Delete</DropdownItem> : null}
    </>
  )
}
