'use client'

import { useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { Button, SearchBar } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import type { QuoteTextTemplate } from '@/lib/db/schema'
import { TEXT_LABEL, TOKENS, textPreview, tokenText, type TextKind } from '@/lib/quotes/text'
import { createTextTemplate, deleteTextTemplate, updateTextTemplate } from '@/app/quotes/text-actions'
import { RichEditor, type RichEditorHandle } from './rich-editor'
import styles from './templates-modal.module.css'
import { FolderCrumbs } from '@/components/om/folders/folder-crumbs'
import { FolderPickRow } from '@/components/om/folders/folder-pick-row'
import { useFolderBrowse } from '@/components/om/folders/use-folder-browse'
import type { FolderNode } from '@/lib/folders'

/**
 * My Templates (1238:33084 empty · 1238:33258 list · 1238:33173 New Template; REG-420): the L 800 modal titled
 * "{Section} Templates" with Search + Create New under the title; cards 752×88 — TITLE · the body's first line · "Add" ·
 * kebab (Edit Template · Delete). New / Edit Template: Title* (36) over the framed editor whose toolbar ends in
 * "Insert Token ▾" (Client Full Name · Studio Name · Studio Phone Number · Team Member Full Name); footer Save · Save and Add.
 * "Add" appends the template to the section (owner 2026-09-11) with its tokens resolved to the quote's records.
 */
/** The card's second line (1238:33448 "1. Agreement…"): the body's FIRST block — minus a heading that merely repeats the title —
    with an ellipsis when more follows. */
const previewOf = (t: QuoteTextTemplate) => {
  const blocks = t.body.split(/<\/(?:p|div|li|h\d)>/i).map((b) => textPreview(b, 400)).filter(Boolean)
  const first = blocks[0] ?? ''
  const rest = first.toLowerCase() === t.title.toLowerCase() ? blocks[1] ?? '' : first
  const more = blocks.length > (rest === first ? 1 : 2)
  const line = rest.length > 140 ? rest.slice(0, 139).trimEnd() : rest
  return more || line !== rest ? `${line}…` : line
}

export function TemplatesModal({ open, kind, templates, onClose, onAdd, onTemplates, folders = [] }: {
  open: boolean
  kind: TextKind
  templates: QuoteTextTemplate[]
  onClose: () => void
  /** The template's body, ready to append — the host resolves the tokens. */
  onAdd: (t: QuoteTextTemplate) => void
  onTemplates: (next: QuoteTextTemplate[]) => void
  /** (REG-664) T&Cs & Notes' folders — the library is browsed as Company › Templates files it. */
  folders?: FolderNode[]
}) {
  const { run } = useRun()
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<{ id: string | null; title: string; body: string } | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [removing, setRemoving] = useState<QuoteTextTemplate | null>(null)
  const [tokenOpen, setTokenOpen] = useState(false)
  const tokenRef = useRef<HTMLButtonElement>(null)
  const editor = useRef<RichEditorHandle>(null)
  const label = TEXT_LABEL[kind]
  const browse = useFolderBrowse(folders, templates, { query })
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) browse.go(null) }   // every opening starts at the top
  const shown = browse.hereEntries.filter((t) => !query.trim() || t.title.toLowerCase().includes(query.trim().toLowerCase()))   // Search matches titles — a body match would light up templates whose text merely mentions the word
  const close = () => { setEditing(null); setMenuFor(null); onClose() }

  const save = (andAdd: boolean) => {
    const e = editing
    if (!e || !e.title.trim()) return
    void run('save the template', async () => {
      const row = e.id ? await updateTextTemplate(e.id, { title: e.title, body: e.body }) : await createTextTemplate(kind, { title: e.title, body: e.body }, browse.finding ? null : browse.openAt)
      onTemplates(e.id ? templates.map((t) => (t.id === row.id ? row : t)) : [...templates, row])
      setEditing(null)
      if (andAdd) { onAdd(row); onClose() }
    }, andAdd ? 'Template saved and added' : 'Template saved')
  }
  const remove = (t: QuoteTextTemplate) => {
    setRemoving(null)
    const before = templates
    onTemplates(templates.filter((x) => x.id !== t.id))
    /* (wave E, E7) the action answers its rule ("only its author, an Owner or an Admin …"); a refused delete puts the card back */
    void run('delete the template', () => deleteTextTemplate(t.id), 'Template deleted').then((ok) => { if (!ok) onTemplates(before) })
  }

  if (editing) {
    /* New / Edit Template (1238:33173): arrow_back · the "{Section} Templates /" crumb over the title, no rule; Title* resting in
       its box (no autofocus); the framed editor whose toolbar ends in the "Insert Token ▾" trigger (200 menu). The panel is the
       mock's 663 and the editor's body scrolls inside it (REG-437: an edited template's long body grew the modal past the screen). */
    return (
      <Dialog open={open} onClose={close} title={editing.id ? 'Edit Template' : 'New Template'} size="modal" width={800} height={663}
              eyebrow={`${label} Templates /`}
              leading={<Tooltip label="Back"><IconButton icon="arrow_back" label="Back to templates" size={24} variant="bare" iconSize={24} onClick={() => setEditing(null)} /></Tooltip>}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => save(false)} isDisabled={!editing.title.trim()}>Save</Button><Button onPress={() => save(true)} isDisabled={!editing.title.trim()}>Save and Add</Button></>}>
        <div className={styles.form}>
          <TextField label="Title" required size="s" value={editing.title} onChange={(v) => setEditing((e) => (e ? { ...e, title: v } : e))} />
          <RichEditor ref={editor} framed fill value={editing.body} onChange={(html) => setEditing((e) => (e ? { ...e, body: html } : e))} placeholder={`Add your ${label}.`} label={`${label} template`} minHeight={359}
                      right={
                        <span className={styles.tokenAnchor}>
                          <button ref={tokenRef} type="button" className={styles.tokenBtn} aria-haspopup="menu" aria-expanded={tokenOpen} onMouseDown={(e) => e.preventDefault()} onClick={() => setTokenOpen((o) => !o)}>
                            Insert Token<span className={styles.tokenChev} data-open={tokenOpen || undefined}><Icon name="expand_more" size={20} /></span>
                          </button>
                          <PortalMenu open={tokenOpen} anchor={tokenRef} onClose={() => setTokenOpen(false)} role="menu" width={200} align="right" sheetTitle="Insert Token">
                            {TOKENS.map((t) => <DropdownItem key={t.key} onSelect={() => { setTokenOpen(false); editor.current?.insertText(tokenText(t.key)) }}>{t.label}</DropdownItem>)}
                          </PortalMenu>
                        </span>
                      } />
        </div>
      </Dialog>
    )
  }
  return (
    <>
      {/* The library (1238:33084 empty · 1238:33258 list): a 96 head with no rule, 600 tall, no footer — the close ✕ ends it. */}
      <Dialog open={open} onClose={close} title={`${label} Templates`} size="modal" width={800} height={600}
              subtitle={
                <div className={styles.headRow}>
                  <SearchBar appearance="outlined" size="md" placeholder="Search" aria-label="Search templates" value={query} onChange={setQuery} className={styles.search} />
                  <span className={styles.spacer} />
                  {/* (REG-538) The library has a page now — Company › Templates › T&Cs & Notes — which comes back here. */}
                  <Button variant="secondary" appearance="text" iconStart={<Icon name="style" size={18} weight={300} />} onPress={() => { close(); router.push(withFrom('/company/templates/terms', pathname)) }}>Manage Templates</Button>
                  <Button onPress={() => setEditing({ id: null, title: '', body: '' })}>Create New</Button>
                </div>
              }>
        {!browse.finding && browse.openAt ? <FolderCrumbs root="My Templates" trail={browse.trail} onGo={browse.go} /> : null}
        {shown.length === 0 && browse.hereFolders.length === 0 ? (
          <div className={styles.empty} role="status">
            <span className={styles.emptyTitle}>{templates.length ? 'No templates match' : 'No templates yet'}</span>
            <span className={styles.emptyLine}>{templates.length ? 'Try another search' : 'Create a template and you’ll see it here'}</span>
          </div>
        ) : (
          <div className={styles.list} role="list" aria-label={`${label} templates`}>
            {browse.hereFolders.map((f) => <div key={f.id} role="listitem"><FolderPickRow name={f.name} holds={browse.holds(f, 'template', 'templates')} onOpen={() => browse.go(f.id)} /></div>)}
            {shown.map((t) => (
              <div key={t.id} className={styles.card} role="listitem">
                <div className={styles.cardText}>
                  <span className={styles.cardTitle}>{t.title}</span>
                  <span className={styles.cardLine}>{browse.where(t) ? `${browse.where(t)} · ` : ''}{previewOf(t)}</span>
                </div>
                <div className={styles.cardActions}>
                  <Button variant="primary" appearance="outlined" onPress={() => { onAdd(t); onClose() }}>Add</Button>
                  <Tooltip label="More options" disabled={menuFor === t.id}>
                    <IconButton icon="more_vert" label={`More options for ${t.title}`} aria-haspopup="menu" aria-expanded={menuFor === t.id} onClick={() => setMenuFor((m) => (m === t.id ? null : t.id))} />
                  </Tooltip>
                  <Dropdown open={menuFor === t.id} onClose={() => setMenuFor(null)} align="right" sheetTitle={t.title}>
                    <DropdownItem onSelect={() => { setMenuFor(null); setEditing({ id: t.id, title: t.title, body: t.body }) }}>Edit Template</DropdownItem>
                    <DropdownItem tone="danger" onSelect={() => { setMenuFor(null); setRemoving(t) }}>Delete</DropdownItem>
                  </Dropdown>
                </div>
              </div>
            ))}
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={!!removing} title="Delete this template?" message={removing ? `“${removing.title}” leaves the library. Quotes that already use it keep their text.` : ''} confirmLabel="Delete"
                     onConfirm={() => { if (removing) remove(removing) }} onCancel={() => setRemoving(null)} />
    </>
  )
}
