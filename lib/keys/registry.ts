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

export type KeyDef = { id: string; keys: string; label: string; area: AreaId }

/** What the ? panel's "All pages" heads each group with, in this order. */
export const AREAS: { id: AreaId; title: string; where?: string }[] = [
  { id: 'everywhere', title: 'Everywhere' },
  { id: 'list', title: 'Lists', where: 'Leads · Tasks · Quotes · Contracts · a lead’s tabs · Company' },
  { id: 'page', title: 'Pages', where: 'Wherever the page has the control' },
  { id: 'leads', title: 'The Leads listing' },
  { id: 'lead', title: 'A lead' },
  { id: 'quote', title: 'Quote editor' },
  { id: 'grid', title: 'Items table', where: 'While a line has focus' },
  { id: 'contract', title: 'Contract editor' },
  { id: 'template', title: 'Template editors' },
  { id: 'visualizer', title: 'AI Visualizer' },
  { id: 'layer', title: 'Dialogs and menus' },
]

export const KEYS: KeyDef[] = [
  /* everywhere */
  { id: 'search', keys: 'mod+k', label: 'Search the studio', area: 'everywhere' },
  { id: 'shortcuts', keys: '?|mod+/', label: 'Keyboard shortcuts', area: 'everywhere' },
  { id: 'find', keys: '/', label: 'Find on this page', area: 'everywhere' },
  { id: 'go.leads', keys: 'g l', label: 'Go to Leads', area: 'everywhere' },
  { id: 'go.tasks', keys: 'g t', label: 'Go to Tasks', area: 'everywhere' },
  { id: 'go.quotes', keys: 'g q', label: 'Go to Quotes', area: 'everywhere' },
  { id: 'go.contracts', keys: 'g c', label: 'Go to Contracts', area: 'everywhere' },
  { id: 'go.xray', keys: 'g x', label: 'Go to Quote X-Ray', area: 'everywhere' },
  { id: 'go.visualizer', keys: 'g v', label: 'Go to AI Visualizer', area: 'everywhere' },
  { id: 'go.pricebook', keys: 'g p', label: 'Go to Price book', area: 'everywhere' },
  { id: 'go.notifications', keys: 'g n', label: 'Open notifications', area: 'everywhere' },
  { id: 'go.settings', keys: 'g s', label: 'Go to Settings', area: 'everywhere' },
  { id: 'undo', keys: 'mod+z', label: 'Undo, while a message offers it', area: 'everywhere' },
  { id: 'save', keys: 'mod+s', label: 'Save — everything saves as you type', area: 'everywhere' },
  /* lists */
  { id: 'list.next', keys: 'j|down', label: 'Next {noun}', area: 'list' },
  { id: 'list.prev', keys: 'k|up', label: 'Previous {noun}', area: 'list' },
  { id: 'list.open', keys: 'enter', label: 'Open the {noun}', area: 'list' },
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
  { id: 'edit', keys: 'e', label: 'Edit the lead', area: 'lead' },
  { id: 'lead.next', keys: 'j', label: 'Next lead in the list you came from', area: 'lead' },
  { id: 'lead.prev', keys: 'k', label: 'Previous lead', area: 'lead' },
  /* the quote editor and its Items table */
  { id: 'grid.find', keys: 'mod+f', label: 'Find in the quote', area: 'quote' },
  { id: 'grid.cells', keys: 'tab|shift+tab', label: 'Next · previous cell', area: 'grid' },
  { id: 'grid.column', keys: 'enter|shift+enter', label: 'Down · up the column', area: 'grid' },
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
  { key: 'l', id: 'go.leads', label: 'Leads', href: '/leads' },
  { key: 't', id: 'go.tasks', label: 'Tasks', href: '/tasks' },
  { key: 'q', id: 'go.quotes', label: 'Quotes', href: '/quotes' },
  { key: 'c', id: 'go.contracts', label: 'Contracts', href: '/contracts' },
  { key: 'x', id: 'go.xray', label: 'Quote X-Ray', href: '/quote-x-ray' },
  { key: 'v', id: 'go.visualizer', label: 'AI Visualizer', href: '/visualizer' },
  { key: 'p', id: 'go.pricebook', label: 'Price book', href: '/company/price-book' },
  { key: 'n', id: 'go.notifications', label: 'Notifications' },
  { key: 's', id: 'go.settings', label: 'Settings', href: '/settings' },
]

/** The page keys a marked control answers, by its `data-kb` value. */
export const MARKED = ['create', 'filters', 'view', 'delete', 'clear', 'move-stage', 'assign', 'edit', 'back', 'preview'] as const
export type MarkedId = (typeof MARKED)[number]

/** (REG-714, Q-24) The keys every editor's tools name in their tooltips — the text tools and the one Undo. */
export const FORMAT_KEYS: Record<string, string> = {
  Undo: 'mod+z', Redo: 'mod+shift+z', Bold: 'mod+b', Italic: 'mod+i', Underline: 'mod+u',
}
/** The keys the Items table answers itself, listed by the ? panel while the quote editor is open. */
export const GRID_KEYS = ['grid.find', 'grid.cells', 'grid.column', 'grid.caret', 'grid.drop', 'grid.clear', 'grid.copy', 'grid.fill', 'grid.undo', 'grid.redo'] as const
/** …the contract paper's and the Terms / Notes editors'. */
export const DOC_KEYS = ['doc.bold', 'doc.italic', 'doc.underline', 'doc.indent', 'doc.undo', 'doc.redo'] as const
export const TEMPLATE_KEYS = ['tpl.undo', 'tpl.redo', 'tpl.remove', 'tpl.deselect'] as const
export const VISUALIZER_KEYS = ['viz.undo', 'viz.redo', 'viz.versions', 'viz.back', 'viz.pin', 'viz.note'] as const
