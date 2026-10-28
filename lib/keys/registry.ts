/**
 * (REG-711) Every keyboard shortcut in the app, declared once — as the tables' columns are (REG-454). The key layer answers these ids,
 * the ? panel lists them, tooltips and menu rows draw their keys, and the tips name them, all from this list, so the reference can
 * never say something the keys do not do. Owner 2026-09-28: "the shortcut keys looks good to me. Go ahead and build it all" — the
 * proposal https://claude.ai/artifact/7XFQkqgqwTQujwNRNuqAkh, every question as recommended.
 *
 * A page answers a key in one of three ways, and the panel shows only the keys the page in front of you answers:
 *  - a marked control — `data-kb="<id>"` on the button the key presses (create · filters · view · delete · clear · move-stage · assign ·
 *    edit · back · preview), so the key does exactly what the press does, with the same checks and refusals;
 *  - a list — `data-kb-list="<noun>"` round the rows, `data-kb-row` on each (`data-kb-open`, `data-kb-select` inside it), `data-kb-tabs`
 *    on a tab row — which the list keys and the numbers walk;
 *  - a handler — `useShortcut(id, run)` where no single control fits, and `useShortcutsHere(ids)` for the keys an editor answers itself.
 */
export type AreaId = 'everywhere' | 'page' | 'list' | 'leads' | 'lead' | 'quote' | 'grid' | 'contract' | 'template' | 'visualizer' | 'layer'
  | 'schedule'   // (Projects round 2)
  | 'files'   // (gaps build E, item 3) the file viewer
  | 'floorplan'   // (gaps build G) a project's floor plan
  | 'planner'   // (gaps build J) the 3D Space Planner's editor

export type KeyDef = { id: string; keys: string; label: string; area: AreaId }

/** What the ? panel's "All pages" heads each group with, in this order. */
export const AREAS: { id: AreaId; title: string; where?: string }[] = [
  { id: 'everywhere', title: 'Everywhere' },
  { id: 'list', title: 'Lists', where: 'Leads · Tasks · Quotes · Contracts · a lead’s tabs · Company' },
  { id: 'page', title: 'Pages', where: 'Wherever the page has the control' },
  { id: 'leads', title: 'The Leads listing' },
  { id: 'lead', title: 'A lead or project' },   // (parity P-08 · P-09) M, A and E answer on a project's page too
  { id: 'quote', title: 'Quote editor' },
  { id: 'grid', title: 'Items table', where: 'While a line has focus' },
  { id: 'contract', title: 'Contract editor' },
  { id: 'template', title: 'Template editors' },
  { id: 'visualizer', title: 'AI Visualizer' },
  { id: 'layer', title: 'Dialogs and menus' },
  { id: 'schedule', title: 'A project’s schedule', where: 'While a milestone’s bar has focus' },   // (Projects round 2)
  { id: 'files', title: 'A file', where: 'The file viewer' },   // (gaps build E, item 3)
  { id: 'floorplan', title: 'A floor plan', where: 'A project’s Floor plan, and the client’s' },   // (gaps build G)
]

export const KEYS: KeyDef[] = [
  /* everywhere */
  { id: 'search', keys: 'mod+k', label: 'Search the studio', area: 'everywhere' },
  /* (the Dashboard redesigned 2026-10-26 — his Q-09, lane D4) the docked field on the Dashboard, the sheet's Ask box on every other page
     (components/maison-ai/dock/maison-dock.tsx · components/shell/maison-fab.tsx answer it) — Linear's ⌘J; ⌘K stays search */
  { id: 'maison', keys: 'mod+j', label: 'Ask Maison AI', area: 'everywhere' },
  { id: 'shortcuts', keys: '?|mod+/', label: 'Keyboard shortcuts', area: 'everywhere' },
  { id: 'find', keys: '/', label: 'Find on this page', area: 'everywhere' },
  { id: 'go.dashboard', keys: 'g d', label: 'Go to Dashboard', area: 'everywhere' },   // (pending modules S22 — 1.0's G then D) the rail's first item
  { id: 'go.leads', keys: 'g l', label: 'Go to Leads', area: 'everywhere' },
  { id: 'go.tasks', keys: 'g t', label: 'Go to Tasks', area: 'everywhere' },
  { id: 'go.quotes', keys: 'g q', label: 'Go to Quotes', area: 'everywhere' },
  { id: 'go.contracts', keys: 'g c', label: 'Go to Contracts', area: 'everywhere' },
  { id: 'go.xray', keys: 'g x', label: 'Go to Quote X-Ray', area: 'everywhere' },
  { id: 'go.visualizer', keys: 'g v', label: 'Go to AI Visualizer', area: 'everywhere' },
  { id: 'go.projects', keys: 'g p', label: 'Go to Projects', area: 'everywhere' },   // (REG-923, Projects Q-28) Projects takes G P
  { id: 'go.pricebook', keys: 'g b', label: 'Go to Price book', area: 'everywhere' },   // (REG-923) …and the Price book moves to G B
  { id: 'go.finance', keys: 'g f', label: 'Go to Finance', area: 'everywhere' },   // (gaps build F1) money out's lists
  { id: 'go.messages', keys: 'g m', label: 'Go to Messages', area: 'everywhere' },
  { id: 'go.tickets', keys: 'g e', label: 'Go to Issues', area: 'everywhere' },   // (the calm UI build 2026-10-27, 1-10) the rail's word; the id and the key stay   // (S46 — REG-2524) the rail's Tickets — 1.0's G then E (Escalations)   // (pending modules S16 — 1.0's G then I, its Inbox) the rail's Messages, the one rail place that had no key
  { id: 'go.notifications', keys: 'g n', label: 'Open notifications', area: 'everywhere' },
  { id: 'go.settings', keys: 'g s', label: 'Go to Settings', area: 'everywhere' },
  { id: 'undo', keys: 'mod+z', label: 'Undo, while a message offers it', area: 'everywhere' },
  { id: 'save', keys: 'mod+s', label: 'Save — everything saves as you type', area: 'everywhere' },
  /* lists */
  { id: 'list.next', keys: 'j|down', label: 'Next {noun}', area: 'list' },
  { id: 'list.prev', keys: 'k|up', label: 'Previous {noun}', area: 'list' },
  { id: 'list.open', keys: 'enter', label: 'Open the {noun}', area: 'list' },
  { id: 'list.review', keys: 'r', label: 'Review the {noun}', area: 'list' },   // (the Dashboard redesigned, 2026-10-26 — P-05) Needs you's Review pane
  { id: 'list.select', keys: 'x', label: 'Select the {noun}', area: 'list' },
  { id: 'list.all', keys: 'mod+a', label: 'Select every {noun} shown', area: 'list' },
  { id: 'create', keys: 'c', label: 'Create what the page lists', area: 'list' },
  { id: 'filters', keys: 'f', label: 'Filters', area: 'list' },
  { id: 'view', keys: 'v', label: 'Switch the view', area: 'list' },
  { id: 'delete', keys: 'backspace', label: 'Delete the selection — it asks first', area: 'list' },
  { id: 'clear', keys: 'esc', label: 'Clear the selection', area: 'list' },
  /* pages */
  { id: 'tabs', keys: '#1–9', label: 'Switch tabs', area: 'page' },
  { id: 'back', keys: 'esc', label: 'Back', area: 'page' },
  { id: 'preview', keys: 'p', label: 'Preview', area: 'page' },
  /* the Leads listing and a lead */
  { id: 'move-stage', keys: 'm', label: 'Move stage', area: 'lead' },
  { id: 'assign', keys: 'a', label: 'Assign', area: 'lead' },
  { id: 'edit', keys: 'e', label: 'Edit the lead / project', area: 'lead' },   // (parity P-09) E opens a project's Edit details too
  { id: 'lead.next', keys: 'j', label: 'Next lead in the list you came from', area: 'lead' },
  { id: 'lead.prev', keys: 'k', label: 'Previous lead', area: 'lead' },
  /* the quote editor and its Items table */
  { id: 'grid.find', keys: 'mod+f', label: 'Find in the quote', area: 'quote' },
  { id: 'grid.cells', keys: 'tab|shift+tab', label: 'Next · previous cell', area: 'grid' },
  { id: 'grid.column', keys: 'enter|shift+enter', label: 'Down · up the column', area: 'grid' },
  { id: 'grid.run', keys: 'shift+down|shift+up', label: 'Select cells down · up', area: 'grid' },   // (S45C — NB-07 (c)) a run down the column; its corner square continues it (invented copy)
  { id: 'grid.caret', keys: 'f2', label: 'Caret to the end of the cell', area: 'grid' },
  { id: 'grid.drop', keys: 'esc', label: 'Drop the cell’s change', area: 'grid' },
  { id: 'grid.clear', keys: 'backspace', label: 'Clear a picker cell', area: 'grid' },
  { id: 'grid.copy', keys: 'mod+c', label: 'Copy the ticked lines', area: 'grid' },
  { id: 'grid.fill', keys: 'mod+d', label: 'Fill down', area: 'grid' },
  { id: 'grid.undo', keys: 'mod+z', label: 'Undo', area: 'grid' },
  { id: 'grid.redo', keys: 'mod+shift+z|mod+y', label: 'Redo', area: 'grid' },
  /* the contract paper, Terms and Notes */
  { id: 'doc.bold', keys: 'mod+b', label: 'Bold', area: 'contract' },
  { id: 'doc.italic', keys: 'mod+i', label: 'Italic', area: 'contract' },
  { id: 'doc.underline', keys: 'mod+u', label: 'Underline', area: 'contract' },
  { id: 'doc.indent', keys: 'tab|shift+tab', label: 'Indent · outdent a list item', area: 'contract' },
  { id: 'doc.undo', keys: 'mod+z', label: 'Undo', area: 'contract' },
  { id: 'doc.redo', keys: 'mod+shift+z|mod+y', label: 'Redo', area: 'contract' },
  /* the template editors */
  { id: 'tpl.undo', keys: 'mod+z', label: 'Undo', area: 'template' },
  { id: 'tpl.redo', keys: 'mod+shift+z|mod+y', label: 'Redo', area: 'template' },
  { id: 'tpl.remove', keys: 'backspace', label: 'Remove the selected block', area: 'template' },
  { id: 'tpl.deselect', keys: 'esc', label: 'Clear the selection', area: 'template' },
  /* the AI Visualizer */
  { id: 'viz.undo', keys: 'mod+z', label: 'Undo', area: 'visualizer' },
  { id: 'viz.redo', keys: 'mod+shift+z|mod+y', label: 'Redo', area: 'visualizer' },
  { id: 'viz.versions', keys: 'left|right', label: 'Previous · next version', area: 'visualizer' },
  { id: 'viz.back', keys: 'esc', label: 'Back out one step', area: 'visualizer' },
  { id: 'viz.pin', keys: 'enter', label: 'Drop a mark in the middle of the view', area: 'visualizer' },
  { id: 'viz.note', keys: 'mod+enter', label: 'Send a pin note', area: 'visualizer' },
  /* (Projects round 2) a milestone's bar on the Schedule — what moves with it moves along, and the move lands once the keys rest */
  { id: 'sched.move', keys: 'left|right', label: 'Move it a day earlier · later', area: 'schedule' },
  { id: 'sched.week', keys: 'shift+left|shift+right', label: 'Move it a week', area: 'schedule' },
  { id: 'sched.end', keys: 'alt+left|alt+right', label: 'Its last day a day earlier · later', area: 'schedule' },
  { id: 'sched.open', keys: 'enter', label: 'Open the focused bar', area: 'schedule' },   // (fix-B, B-14) the list's own ↵ is "Open the milestone"
  { id: 'sched.cancel', keys: 'esc', label: 'Put a moving bar back', area: 'schedule' },
  /* (gaps build E, item 3 — 1.0's lightbox, H-138) the file viewer steps through the folder's files */
  { id: 'file.step', keys: 'left|right', label: 'Previous · next file in the folder', area: 'files' },
  /* (gaps build G, G-Q4 · G-Q16) the floor plan's canvas answers these itself */
  { id: 'plan.undo', keys: 'mod+z', label: 'Undo your last mark', area: 'floorplan' },
  { id: 'plan.back', keys: 'esc', label: 'Back out one step — the label, the scale, the open mark', area: 'floorplan' },
  { id: 'plan.add', keys: 'enter', label: 'Add the pin, the label or the length you typed', area: 'floorplan' },
  /* dialogs and menus */
  { id: 'layer.close', keys: 'esc', label: 'Close', area: 'layer' },
  { id: 'layer.move', keys: 'up|down', label: 'Move in a menu or a list', area: 'layer' },
  { id: 'layer.pick', keys: 'enter', label: 'Pick', area: 'layer' },
  { id: 'layer.save', keys: 'mod+enter', label: 'Save a form', area: 'layer' },
]

const BY_ID = new Map(KEYS.map((k) => [k.id, k]))
export const keyDef = (id: string): KeyDef | undefined => BY_ID.get(id)
/** The keys a tooltip or a menu row shows for an id. */
export const keysOf = (id: string): string | undefined => BY_ID.get(id)?.keys

/** The G then … places, in the order the hint lists them. */
export const GO: { key: string; id: string; label: string; href?: string }[] = [
  { key: 'd', id: 'go.dashboard', label: 'Dashboard', href: '/dashboard' },   // (pending modules S22) 1.0's G then D
  { key: 'l', id: 'go.leads', label: 'Leads', href: '/leads' },
  { key: 'p', id: 'go.projects', label: 'Projects', href: '/projects' },   // (REG-923)
  { key: 't', id: 'go.tasks', label: 'Tasks', href: '/tasks' },
  { key: 'q', id: 'go.quotes', label: 'Quotes', href: '/quotes' },
  { key: 'c', id: 'go.contracts', label: 'Contracts', href: '/contracts' },
  { key: 'x', id: 'go.xray', label: 'Quote X-Ray', href: '/quote-x-ray' },
  { key: 'v', id: 'go.visualizer', label: 'AI Visualizer', href: '/visualizer' },
  { key: 'b', id: 'go.pricebook', label: 'Price book', href: '/company/price-book' },   // (REG-923) was P
  { key: 'f', id: 'go.finance', label: 'Finance', href: '/company/finance' },   // (gaps build F1) · (REG-1360) Company › Finance
  { key: 'e', id: 'go.tickets', label: 'Issues', href: '/tickets' },   // (S46 — REG-2524) a rail place now, so its key is listed (1.0's G then E)
  { key: 'm', id: 'go.messages', label: 'Messages', href: '/chat' },   // (pending modules S16) 1.0's G then I (Inbox) — the word is Messages here (one-home N-08)
  { key: 'n', id: 'go.notifications', label: 'Notifications' },
  { key: 's', id: 'go.settings', label: 'Settings', href: '/settings' },
]

/**
 * (S46A — the findability audit's N-5 · H1, his "fix everything" 2026-10-19) 1.0's G then I (its Inbox) and G then E (its Escalations), kept as
 * quiet aliases: each goes where the place lives now — Messages, and Projects › Tickets — and neither is listed in the ? panel or the G hint,
 * which teach 2.0's keys (G then M). REG-1830 had left both out; the audit found two keys a 1.0 hand still presses, so they answer now.
 * (S46 — REG-2524) Tickets became a rail place, so G then E is a listed key in GO; only G then I stays a quiet alias.
 */
export const GO_ALIASES: { key: string; id: string; label: string; href: string }[] = [
  { key: 'i', id: 'go.messages', label: 'Messages', href: '/chat' },
]
/** The place G then `key` goes to — the listed keys first, then the quiet aliases. */
export const goFor = (key: string) => GO.find((g) => g.key === key) ?? GO_ALIASES.find((g) => g.key === key)

/** The page keys a marked control answers, by its `data-kb` value. */
export const MARKED = ['create', 'filters', 'view', 'delete', 'clear', 'move-stage', 'assign', 'edit', 'back', 'preview'] as const
export type MarkedId = (typeof MARKED)[number]

/** (REG-714, Q-24) The keys every editor's tools name in their tooltips — the text tools and the one Undo. */
export const FORMAT_KEYS: Record<string, string> = {
  Undo: 'mod+z', Redo: 'mod+shift+z', Bold: 'mod+b', Italic: 'mod+i', Underline: 'mod+u',
}
/** The keys the Items table answers itself, listed by the ? panel while the quote editor is open. */
export const GRID_KEYS = ['grid.find', 'grid.cells', 'grid.column', 'grid.run', 'grid.caret', 'grid.drop', 'grid.clear', 'grid.copy', 'grid.fill', 'grid.undo', 'grid.redo'] as const
/** …the contract paper's and the Terms / Notes editors'. */
export const DOC_KEYS = ['doc.bold', 'doc.italic', 'doc.underline', 'doc.indent', 'doc.undo', 'doc.redo'] as const
export const TEMPLATE_KEYS = ['tpl.undo', 'tpl.redo', 'tpl.remove', 'tpl.deselect'] as const
export const VISUALIZER_KEYS = ['viz.undo', 'viz.redo', 'viz.versions', 'viz.back', 'viz.pin', 'viz.note'] as const
/** (Projects round 2) the keys a schedule's bars answer themselves, listed by the ? panel while the Schedule is open. */
export const SCHEDULE_KEYS = ['sched.move', 'sched.week', 'sched.end', 'sched.open', 'sched.cancel'] as const
/** (gaps build E, item 3) the keys the file viewer answers itself, listed by the ? panel while a file is open. */
export const FILE_VIEWER_KEYS = ['file.step'] as const
/** (gaps build G) the keys the floor plan's canvas answers itself, listed by the ? panel while a floor plan is open. */
export const FLOOR_PLAN_KEYS = ['plan.undo', 'plan.back', 'plan.add'] as const

/* (gaps build J, J-Q17) The 3D Space Planner's editor answers these itself (its stage is `data-kb-own`); listed by the ? panel while a
   layout is open. Read before the dialogs' group, as the floor plan's are. */
AREAS.splice(AREAS.findIndex((a) => a.id === 'layer'), 0, { id: 'planner', title: '3D Space Planner', where: 'A layout’s editor' })
KEYS.splice(KEYS.findIndex((k) => k.area === 'layer'), 0,
  { id: 'plan3d.undo', keys: 'mod+z', label: 'Undo', area: 'planner' },
  { id: 'plan3d.redo', keys: 'mod+shift+z|mod+y', label: 'Redo', area: 'planner' },
  { id: 'plan3d.remove', keys: 'delete|backspace', label: 'Remove the piece, room, door or window picked', area: 'planner' },
  { id: 'plan3d.duplicate', keys: 'mod+d', label: 'Duplicate the piece or room picked', area: 'planner' },
  { id: 'plan3d.copy', keys: 'mod+c|mod+v', label: 'Copy · paste the piece picked', area: 'planner' },
  { id: 'plan3d.rotate', keys: 'r', label: 'Turn the piece a quarter', area: 'planner' },
  { id: 'plan3d.nudge', keys: 'up|down|left|right', label: 'Move it 5 cm (with Shift, 1 cm)', area: 'planner' },
  { id: 'plan3d.views', keys: '1|2|3', label: 'Top · 3D · Walk', area: 'planner' },
  { id: 'plan3d.walk', keys: 'w|a|s|d', label: 'Walk (in Walk) — the arrows too', area: 'planner' },
  { id: 'plan3d.back', keys: 'esc', label: 'Let go of the selection, stop drawing, or clear the ruler', area: 'planner' },
  { id: 'plan3d.present', keys: 'left|right', label: 'Present: the room before · the next (Esc ends it)', area: 'planner' },   // (parity map, TD-092)
)
export const PLANNER_KEYS = ['plan3d.undo', 'plan3d.redo', 'plan3d.remove', 'plan3d.duplicate', 'plan3d.copy', 'plan3d.rotate', 'plan3d.nudge', 'plan3d.views', 'plan3d.walk', 'plan3d.back', 'plan3d.present'] as const
