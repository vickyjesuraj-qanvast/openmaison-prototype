'use client'

import { Dropdown, DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import type { TemplateSummary } from '@/lib/templates/model'

/** What a template's kebab offers — the same six items on a card and on a table row (REG-505). */
export type TemplateAction = 'edit' | 'newQuote' | 'default' | 'duplicate' | 'rename' | 'delete'
/** How many rows the menu draws (six items + a divider) — what menu-side.ts measures against. */
export const TEMPLATE_MENU_ITEMS = 7

export function TemplateMenu({ t, open, onClose, onPick, side = 'down', width = 224 }: {
  t: TemplateSummary; open: boolean; onClose: () => void; onPick: (a: TemplateAction) => void; side?: 'down' | 'up'; width?: number
}) {
  const pick = (a: TemplateAction) => { onClose(); onPick(a) }
  return (
    <Dropdown open={open} onClose={onClose} align="right" side={side} width={width} sheetTitle={t.name}>
      <DropdownItem onSelect={() => pick('edit')}>Edit</DropdownItem>
      <DropdownItem onSelect={() => pick('newQuote')} disabled={t.status !== 'published'} title={t.status !== 'published' ? 'Publish it first' : undefined}>New quote from this template</DropdownItem>
      <DropdownItem onSelect={() => pick('default')} disabled={t.isDefault || t.status !== 'published'} title={t.isDefault ? 'Already the default' : t.status !== 'published' ? 'Publish it first' : undefined}>Set as default</DropdownItem>
      <DropdownItem onSelect={() => pick('duplicate')}>Duplicate</DropdownItem>
      <DropdownItem onSelect={() => pick('rename')}>Rename</DropdownItem>
      <DropdownDivider />
      <DropdownItem tone="danger" onSelect={() => pick('delete')} disabled={t.isDefault || !!t.submitted} title={t.isDefault ? 'The default can’t be deleted' : t.submitted ? 'Awaiting approval — approve or request changes first' : undefined}>Delete</DropdownItem>
    </Dropdown>
  )
}
