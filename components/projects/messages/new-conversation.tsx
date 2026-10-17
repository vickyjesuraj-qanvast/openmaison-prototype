'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { Dropdown, DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { AssigneeField } from '@/components/leads/assignee-field'
import { useLevelFocus } from '@/components/quotes/editor/items/table-menus'
import { useSheetLayout } from '@/components/om/sheet'
import { GROUP_NAME_MAX } from '@/lib/projects/messages-model'
import type { ChatStart } from '@/lib/projects/messages'
import toolbar from '@/components/om/tab-toolbar.module.css'
import styles from './messages.module.css'

/**
 * (pending modules S26 — her "build all of them" 2026-10-11; cards studio:team-chats · api:messages-free-chats) Messages' New message ▾ — 1.0's
 * New Chat · New Group (src/components/inbox/new-chat-panel.tsx) and the lead drawer's Chat, in the page header the house way (New Meeting ▾'s
 * shape, filled; C presses it): **A member ›** (the studio's members in place — one press opens the two of you), **A new group** (a name and
 * the people), **A client** (any lead or project the viewer sees — their home's conversation, invited to their page or not). 1.0's "Add New
 * Number" is not carried: a message to a typed number reached nobody — a client writes on their page, anyone else is WhatsApp.
 * *(invented copy: the rows' help lines, the dialog's words)*
 */
export function NewMessageMenu({ start, onMember, onGroup, onClient }: {
  start: ChatStart
  onMember: (memberId: string) => void
  onGroup: () => void
  onClient: () => void
}) {
  const [open, setOpen] = useState(false)
  const [sub, setSub] = useState<'members' | null>(null)
  const level = useLevelFocus(sub)
  const sheet = useSheetLayout()
  const close = () => { setOpen(false); setSub(null) }
  const toggle = () => { setOpen((o) => !o); setSub(null) }
  return (
    <span className={toolbar.menuWrap}>
      {sheet ? (
        <Tooltip shortcut="create" label="New message">
          <IconButton icon="add" label="New message" variant="primary" aria-haspopup="menu" aria-expanded={open} data-kb="create" data-kb-label="New message" onClick={toggle} data-testid="chat-new" />
        </Tooltip>
      ) : (
        <Button variant="primary" appearance="filled" iconEnd={<span className={toolbar.chev} data-open={open || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
                aria-haspopup="menu" aria-expanded={open} data-kb="create" data-kb-label="New message" onPress={toggle} data-testid="chat-new">New message</Button>
      )}
      <Dropdown open={open} onClose={close} align="right" width={MENU_WIDTH.wide} sheetTitle={sub === 'members' ? 'A member' : 'New message'}>
        <div ref={level}>
          {sub === 'members' ? (
            <>
              <DropdownItem onSelect={() => setSub(null)}><span className={styles.menuLead}><Icon name="chevron_left" size={20} /></span>A member</DropdownItem>
              <DropdownDivider />
              {start.members.length ? start.members.map((m) => (
                <DropdownItem key={m.id} help={m.role} onSelect={() => { close(); onMember(m.id) }}><span data-testid="chat-new-member" data-member={m.id}>{m.name}</span></DropdownItem>
              )) : <DropdownItem disabled title="Add members in Company › Members" onSelect={() => {}}>Nobody else in the studio yet</DropdownItem>}
            </>
          ) : (
            <>
              <DropdownItem submenu help="Just the two of you" onSelect={() => setSub('members')}><span data-testid="chat-new-direct">A member</span><span className={styles.menuTrail}><Icon name="chevron_right" size={20} /></span></DropdownItem>
              <DropdownItem help="Pick the people and name it" onSelect={() => { close(); onGroup() }}><span data-testid="chat-new-group">A new group</span></DropdownItem>
              <DropdownDivider />
              <DropdownItem help="A lead or a project’s client — they read it on their page" disabled={!start.clients.length} title={start.clients.length ? undefined : 'No clients you see yet'}
                            onSelect={() => { close(); onClient() }}><span data-testid="chat-new-client">A client</span></DropdownItem>
            </>
          )}
        </div>
      </Dropdown>
    </span>
  )
}

/** (1.0's New Group — "Name your group", "Required — enter a name to continue") A group's name and its people; you are in it. Closes only once
    it is made (the house rule — a dialog closes once its save lands). */
export function NewGroupDialog({ open, team, initial, onClose, onCreate }: {
  open: boolean
  team: ChatStart['members']
  /** people picked already — "Start a group with Germaine" */ initial: string[]
  onClose: () => void
  onCreate: (o: { name: string; memberIds: string[] }) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [ids, setIds] = useState<string[]>(initial)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [was, setWas] = useState(open)
  if (was !== open) { setWas(open); if (open) { setName(''); setIds(initial); setTried(false) } }
  const nameErr = tried && !name.trim() ? 'Name the group' : undefined
  const peopleErr = tried && !ids.length ? 'Pick at least one person' : undefined
  const create = async () => {
    setTried(true)
    if (!name.trim() || !ids.length || busy) return
    setBusy(true)
    try { if (await onCreate({ name: name.trim(), memberIds: ids })) onClose() } finally { setBusy(false) }
  }
  const firsts = team.filter((m) => ids.includes(m.id)).map((m) => m.name.trim())   // (S42 audit C-13) members as stored
  return (
    <Dialog open={open} onClose={onClose} title="New group" size="form" width={480}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void create() }} isDisabled={busy} data-testid="new-group-create">{busy ? 'Creating…' : 'Create group'}</Button></>}>
      <div className={styles.newGroup} data-testid="new-group">
        <TextField label="Group name" value={name} onChange={setName} maxLength={GROUP_NAME_MAX} required error={nameErr} autoFocus
                   placeholder={firsts.length ? `e.g. ${firsts.slice(0, 3).join(', ')}` : 'e.g. Site team'}
                   onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void create() } }} />
        <AssigneeField label="People" team={team} value={ids} onChange={setIds} error={peopleErr} />
        <p className={styles.dFoot}>You’re in it. Only its people read it — never a client.</p>
      </div>
    </Dialog>
  )
}
