/**
 * (REG-911, the build record §2) A project's tabs — ONE list every round adds its own entry to when it lands: Overview · Tasks (parity
 * P-06) · Schedule · Updates · Money · Choices · … · Files · Activity. A tab not built yet is not in the list (never a coming-soon tab). The route
 * `app/projects/[id]/[tab]` serves every slug here but Overview, which is `app/projects/[id]/(overview)`. Client-safe.
 *
 * `lead` names the lead tab whose component and records the project tab carries on (Tasks, Files and Activity are the lead's own, given
 * the project's base path for their links) — a link built for the lead's tab is mapped onto the project's through `projectTabHref`.
 */
export type ProjectTab = { slug: string; label: string; lead?: 'tasks' | 'files' | 'activity' | 'notes' | 'questionnaire' | 'meetings' }   // (gaps build, package A) + notes · questionnaire

/** Round 1's tabs. Rounds 2 (Schedule), 3 (Updates), 5 (Money) and 8 (Choices) insert theirs in the order above.
    (parity P-06, the owner's pick 2026-10-08) Tasks second, as on a lead (Overview · Tasks · Quotes …): the work a studio does every day sits
    where a lead's page keeps it — and inside the number keys (REG-713).
    (simplify S-03) The strip no longer draws this list: it draws `PROJECT_TAB_GROUPS` below. This list keeps every slug — its address, the
    route's check, its label for the page title and a Back that names it. */
export const PROJECT_TABS: readonly ProjectTab[] = [
  { slug: '', label: 'Overview' },
  { slug: 'tasks', label: 'Tasks', lead: 'tasks' },   // (parity P-06) second, as the lead's
  { slug: 'schedule', label: 'Schedule' },   // (Projects round 2) the list that is also the timeline
  { slug: 'updates', label: 'Updates' },   // (REG-951, round 3) after Schedule (round 2) when it lands
  { slug: 'money', label: 'Payments' },   // (the calm UI build 2026-10-27, 3-02 · T-01) on screen “Payments” — the slug stays `money`. (Projects round 5, F-01) where money lives — the project's team, Owners and Admins see it (F-17)
  { slug: 'choices', label: 'Choices' },   // (Projects round 8) the client's choices — after Money (round 5) when it lands
  { slug: 'floor-plan', label: 'Floor plan' },   // (gaps build G, G-Q1) the plan marked up with the client — after Choices
  { slug: 'designs', label: 'Designs' },   // (simplify S-03, the Design group's third view) the renders and 3D layouts the client sees
  { slug: 'messages', label: 'Messages' },   // (gaps build H, H-Q11) the one conversation with the client's side
  { slug: 'tickets', label: 'Issues' },   // (the calm UI build 2026-10-27, 3-37 · T-01) “Issues” on screen, as the client says — the slug stays `tickets`. (gaps build H, H-Q2) the problems the client reports — and the studio raises for them
  /* (pending modules S23) the lead's own Meetings carried on — a site meeting with the client, the co-pilot and its brief; the Client group's view */
  { slug: 'meetings', label: 'Meetings', lead: 'meetings' },
  { slug: 'compliance', label: 'Compliance' },   // (gaps build I, I-Q9) Singapore's checklist for the kind of home — after Floor plan
  { slug: 'files', label: 'Files', lead: 'files' },
  /* (gaps build, package A — M-02) the lead's own Notes & Logs and Questionnaire carried on, as Tasks and Files are: a Won project's are its
     lead's records; a direct project, whose client has no lead page, gets them here at last */
  { slug: 'notes', label: 'Notes & logs', lead: 'notes' },   // (the calm UI build 2026-10-27, T-13 — B2's request) the lead's tab says it so
  { slug: 'questionnaire', label: 'Questionnaire', lead: 'questionnaire' },
  { slug: 'activity', label: 'Activity', lead: 'activity' },
]

/**
 * (simplify S-03 · Q-01 · Q-02, the owner's "build everything" 2026-10-09 — the build's contract A) The strip's SEVEN tabs, each a group of the
 * views above: Overview · Tasks · Schedule · Client · Design · Money · Files & notes. A slug keeps its address and lights its group's tab; a group's
 * tab opens its first view the viewer may see; inside a group of more than one view, the body's title line is the view switch (house Chips,
 * components/projects/project-views.tsx). Keys 1–7 reach the seven (REG-713, the house Tabs). Every slug in `PROJECT_TABS` is in exactly one group.
 */
export type ProjectTabGroupKey = 'overview' | 'tasks' | 'schedule' | 'client' | 'design' | 'money' | 'files'
export type ProjectView = { slug: string; label: string }
export type ProjectTabGroup = { key: ProjectTabGroupKey; label: string; views: readonly ProjectView[] }
export const PROJECT_TAB_GROUPS: readonly ProjectTabGroup[] = [
  { key: 'overview', label: 'Overview', views: [{ slug: '', label: 'Overview' }] },
  /* (simplify S-06) Compliance is Tasks' second view — one record, one tick */
  { key: 'tasks', label: 'Tasks', views: [{ slug: 'tasks', label: 'All tasks' }, { slug: 'compliance', label: 'Compliance' }] },
  { key: 'schedule', label: 'Schedule', views: [{ slug: 'schedule', label: 'Schedule' }] },
  /* (Q-01) everything said with the client: what we tell them, what they ask, what they report, what we asked them */
  { key: 'client', label: 'Client', views: [{ slug: 'updates', label: 'Updates' }, { slug: 'messages', label: 'Messages' }, { slug: 'tickets', label: 'Issues' }, { slug: 'meetings', label: 'Meetings' }, { slug: 'questionnaire', label: 'Questionnaire' }] },   // (pending modules S23) Meetings — said with the client, face to face
  /* what gets built, decided with the client — Designs is a view on records that already exist (lib/projects/designs.ts) */
  { key: 'design', label: 'Design', views: [{ slug: 'choices', label: 'Choices' }, { slug: 'floor-plan', label: 'Floor plan' }, { slug: 'designs', label: 'Designs' }] },
  /* (the calm UI build 2026-10-27, 3-02) the tab reads Payments — Client payments · Costs · Variation orders inside; the key and slug stay `money` */
  { key: 'money', label: 'Payments', views: [{ slug: 'money', label: 'Payments' }] },
  /* (Q-02) the record: Files · Notes & Logs · Activity */
  { key: 'files', label: 'Files & notes', views: [{ slug: 'files', label: 'Files' }, { slug: 'notes', label: 'Notes & logs' }, { slug: 'activity', label: 'Activity' }] },
]
/** The group a slug lives in ('' = the Overview); an unknown slug answers the Overview's. */
export function groupOf(slug: string): ProjectTabGroup {
  return PROJECT_TAB_GROUPS.find((g) => g.views.some((v) => v.slug === slug)) ?? PROJECT_TAB_GROUPS[0]!
}
/** (simplify S-04 · S-06) A view whose count never reaches the strip: Compliance says "n to do this phase" in its own view instead. */
export const UNCOUNTED_VIEWS: readonly string[] = ['compliance']

export const projectBase = (projectId: string) => `/projects/${projectId}`
export const projectHref = (projectId: string, slug = '') => (slug ? `${projectBase(projectId)}/${slug}` : projectBase(projectId))
export const isProjectTab = (slug: string): boolean => PROJECT_TABS.some((t) => t.slug === slug && t.slug !== '')

/** (one-home N-10) Whether a project carries this lead tab on (Tasks · Files · Notes & Logs · Questionnaire · Activity) — once the lead has a
    live project, that tab is the project's alone. */
export const carriesLeadTab = (leadTab: string): boolean => PROJECT_TABS.some((t) => t.lead === leadTab)

/** A lead tab's address on the project, when the project carries that tab on; else null (the lead's own page keeps it). */
export function projectTabHref(projectId: string, leadTab: string): string | null {
  if (leadTab === '' || leadTab === 'overview') return projectBase(projectId)
  const t = PROJECT_TABS.find((x) => x.lead === leadTab)
  return t ? projectHref(projectId, t.slug) : null
}

/** (fix-A, A-16 · C-20) The project's Activity chips: its schedule, updates, money and choices beside the tasks and files it carries on, and the
    stage lines (lib/leads/activity.ts gives each line its group). Money is shown only to whoever sees money (F-17). */
export const PROJECT_ACTIVITY_CHIPS: readonly { value: string; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'schedule', label: 'Schedule' }, { value: 'updates', label: 'Updates' }, { value: 'money', label: 'Payments' },
  { value: 'choices', label: 'Choices' }, { value: 'tasks', label: 'Tasks' }, { value: 'files', label: 'Files' },
  { value: 'notes', label: 'Notes' },   // (gaps build, package A — M-02) the notes and logs the project now carries
  { value: 'quotes', label: 'Quotes' },   // (the calm UI build 2026-10-27, 2-50 — B2's request) the quotes', contracts' and Quote X-Ray's lines, as the lead's chip
  { value: 'floorplan', label: 'Floor plan' },   // (gaps build G) plans added, marks resolved, tasks and orders raised, the client's confirmation
  { value: 'layouts', label: '3D layouts' },   // (gaps build J) layouts started, shared, opened by the client
  { value: 'tickets', label: 'Issues' }, { value: 'messages', label: 'Messages' },   // (gaps build H, H-Q24)
  { value: 'compliance', label: 'Compliance' },   // (gaps build I) checklist items answered, the starter tasks
  { value: 'stage', label: 'Stage' },
]
