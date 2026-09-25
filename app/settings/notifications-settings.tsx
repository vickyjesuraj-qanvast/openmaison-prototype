'use client'

import { useRef, useState, type SyntheticEvent } from 'react'
import { Button, Switch, TextArea } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { CHANNELS, EVENTS, FIELDS, SAMPLE_FIELDS, UNTOUCHED_OPTIONS, DEFAULT_TEMPLATES, renderTemplate, templateFor, type Channel, type EventKey, type MessageTemplate, type NotificationRules } from '@/lib/notifications/model'
import { setMessageTemplate, setNotificationRules } from '@/app/notifications/actions'
import { ReadOnlyScope } from '@/components/om/read-only'
import { ModuleHead } from './module-head'
import { Tooltip } from '@/components/om/tooltip'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem } from '@/components/leads/dropdown'
import styles from './settings.module.css'

/**
 * (REG-604) Settings › Notifications, no mock — the Settings shell's cards on the DS: which channels carry each event and who
 * receives it, the follow-up delay and the stop rule, and every message with its fields, previewed as a recipient would read it.
 * The sending is the platform's; the rules and the copy live here.
 */
export function NotificationsSettings({ rules: initial, templates: initialTemplates, canManage = true }: { rules: NotificationRules; templates: MessageTemplate[]; /** (REG-646, settings parity Q-07 · Q-08) Owners and Admins change it; everyone else reads it. */ canManage?: boolean }) {
  const readOnly = !canManage
  const snackbar = useSnackbar()
  const [rules, setRules] = useState(initial)
  const [templates, setTemplates] = useState(initialTemplates)
  const [edit, setEdit] = useState<MessageTemplate | null>(null)
  const [draft, setDraft] = useState<MessageTemplate | null>(null)
  const save = async (patch: Partial<NotificationRules>, done: string) => {
    const prev = rules
    setRules((r) => ({ ...r, ...patch, channels: { ...r.channels, ...(patch.channels ?? {}) } }))
    try { const next = await setNotificationRules(patch); setRules(next); snackbar({ message: done }) }
    catch { setRules(prev); snackbar({ message: 'Couldn’t save the notification setting — please try again' }) }   // (sweep S4 #28) says what failed
  }
  const toggle = (event: EventKey, channel: Channel, on: boolean) => {
    const label = EVENTS.find((e) => e.key === event)?.label ?? event
    void save({ channels: { ...rules.channels, [event]: { ...rules.channels[event], [channel]: on } } }, `${label}: ${CHANNELS.find((c) => c.key === channel)?.label} ${on ? 'on' : 'off'}`)
  }
  const openEdit = (t: MessageTemplate) => { setCaret(null); setEdit(t); setDraft({ ...t }) }
  /* (sweep S4 #21) Insert a field where the caret is — the template inspector's Insert a field menu (a portal of named fields), not a row of
     code pills that always appended at the end. The caret is read as the message box reports it; with none yet, the field goes at the end. */
  const [caret, setCaret] = useState<number | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const fieldsAnchor = useRef<HTMLSpanElement>(null)
  const [fieldsOpen, setFieldsOpen] = useState(false)
  const noteCaret = (e: SyntheticEvent) => { const t = e.target as HTMLTextAreaElement; if (t.tagName === 'TEXTAREA') setCaret(t.selectionStart) }
  const insertField = (key: string) => {
    setFieldsOpen(false)
    if (!draft) return
    const body = draft.body
    const at = Math.min(caret ?? body.length, body.length)
    const before = body.slice(0, at), after = body.slice(at)
    const lead = before && !/\s$/.test(before) ? ' ' : ''
    const trail = after && !/^\s/.test(after) ? ' ' : ''
    const next = `${before}${lead}${key}${trail}${after}`
    if (next.length > 2000) { snackbar({ message: 'The message is at its 2,000 characters' }); return }
    const pos = before.length + lead.length + key.length
    setCaret(pos)
    setDraft({ ...draft, body: next })
    requestAnimationFrame(() => { const t = boxRef.current?.querySelector('textarea'); if (t) { t.focus(); t.setSelectionRange(pos, pos) } })
  }
  const saveTemplate = async () => {
    const d = draft
    if (!d) return
    setEdit(null)
    try { const next = await setMessageTemplate(d); setTemplates(next); snackbar({ message: 'Message saved' }) }
    catch { snackbar({ message: 'Couldn’t save the message — please try again' }) }
  }
  const house = (t: MessageTemplate) => DEFAULT_TEMPLATES.find((d) => d.event === t.event && d.channel === t.channel)!
  return (
    <section className={styles.panel} aria-labelledby="settings-notifications-title" data-testid="settings-notifications">
      <ModuleHead id="settings-notifications-title" title="Notifications" readOnly={readOnly}
                  help="What the studio hears about, on which channels, and the words each message uses. In app rows land in the bell; email and WhatsApp go out with them, sent by the platform with the same words." />
      <ReadOnlyScope readOnly={readOnly}>

      <div className={styles.setting} data-testid="notification-channels">
        <div className={styles.settingHead}>
          <span className={styles.settingTitle}>Events and channels</span>
          <span className={styles.settingHelp}>Who receives each event is fixed by the event; the channels are yours to switch.</span>
        </div>
        <div className={styles.eventTable} role="table" aria-label="Events and channels">
          <div className={styles.eventHead} role="row">
            <span role="columnheader">Event</span><span role="columnheader">Who</span>
            {CHANNELS.map((c) => <span key={c.key} role="columnheader" className={styles.eventCol}>{c.label}</span>)}
          </div>
          {EVENTS.map((e) => (
            <div key={e.key} className={styles.eventRow} role="row" data-testid={`event-${e.key}`}>
              <span role="cell" className={styles.eventName}><Icon name={e.icon} size={20} weight={300} /><span><span>{e.label}</span><span className={styles.eventHelp}>{e.help}</span></span></span>
              <span role="cell" className={styles.eventWho} data-label="Who">{e.who}</span>   {/* (sweep S4 #9) stacked on a phone, it says what it is */}
              {CHANNELS.map((c) => {
                /* (REG-647, settings parity Q-14 · E-103) Email and WhatsApp go out with the in-app notice: with In app off they show off and say why — their own choice is kept for when it comes back on. */
                const rides = c.key !== 'in_app' && !rules.channels[e.key].in_app
                const sw = <Switch size="sm" isSelected={rules.channels[e.key][c.key] && !rides} isDisabled={readOnly || rides} onChange={(on: boolean) => toggle(e.key, c.key, on)} aria-label={`${e.label} — ${c.label}`} />
                return (
                  <span key={c.key} role="cell" className={styles.eventCol} data-label={c.label}>
                    {rides ? <Tooltip label="Goes out with the in-app notice — switch In app on first"><span>{sw}</span></Tooltip> : sw}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.setting} data-testid="notification-followups">
        <div className={styles.settingHead}>
          <span className={styles.settingTitle}>Follow-ups</span>
          <span className={styles.settingHelp}>A New lead with no contact logged raises “untouched” after the delay; a task with a time is raised 30 minutes before it; the rule below keeps closed leads quiet.</span>
        </div>
        <div className={styles.numGrid}>
          <TextField label="Raise an untouched lead after" mode="select" options={UNTOUCHED_OPTIONS.map((o) => o.label)} value={UNTOUCHED_OPTIONS.find((o) => o.minutes === rules.untouchedMinutes)?.label ?? '30 minutes'}
                     onChange={(v) => { const o = UNTOUCHED_OPTIONS.find((x) => x.label === v); if (o) void save({ untouchedMinutes: o.minutes }, `Untouched leads raised after ${o.label}`) }} />
        </div>
        <label className={styles.switchRow}>
          <Switch size="sm" isSelected={rules.stopWhenClosed} isDisabled={readOnly} onChange={(on: boolean) => { void save({ stopWhenClosed: on }, on ? 'Closed leads get no follow-ups' : 'Follow-ups continue on closed leads') }} aria-label="No follow-ups once a lead is Won, Lost or On Hold" />
          <span>No follow-ups once a lead is Won, Lost or On Hold</span>
        </label>
      </div>

      <div className={styles.setting} data-testid="notification-messages">
        <div className={styles.settingHead}>
          <span className={styles.settingTitle}>Messages</span>
          <span className={styles.settingHelp}>Every email and WhatsApp the rules can send, with its fields filled the way a recipient reads it. The link always points at the record.</span>
        </div>
        <ul className={styles.messages}>
          {EVENTS.map((e) => (['whatsapp', 'email'] as const).map((ch) => {
            const t = templateFor(templates, e.key, ch)
            const on = rules.channels[e.key][ch]
            return (
              <li key={`${e.key}-${ch}`} className={styles.message} data-off={on ? undefined : ''} data-testid={`message-${e.key}-${ch}`}>
                <div className={styles.messageHead}>
                  <span className={styles.messageTitle}><Icon name={ch === 'whatsapp' ? 'chat' : 'mail'} size={18} weight={300} />{e.label} · {ch === 'whatsapp' ? 'WhatsApp' : 'Email'}{on ? '' : ' · off'}</span>
                  {readOnly ? null : <Button appearance="text" onPress={() => openEdit(t)}>Edit</Button>}
                </div>
                {ch === 'email' && t.subject ? <span className={styles.messageSubject}>{renderTemplate(t.subject, SAMPLE_FIELDS)}</span> : null}
                <p className={styles.messageBody}>{renderTemplate(t.body, SAMPLE_FIELDS)}</p>
              </li>
            )
          }))}
        </ul>
      </div>
      </ReadOnlyScope>

      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit ? `${EVENTS.find((e) => e.key === edit.event)?.label} · ${edit.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}` : 'Message'} size="modal" width={600}
              subtitle="The fields fill themselves when the message is sent — the preview shows a sample lead."
              footer={<>
                <Button appearance="text" iconStart={<Icon name="restart_alt" size={18} />} isDisabled={!draft || (draft.body === house(draft).body && draft.subject === house(draft).subject)} onPress={() => { if (draft) setDraft({ ...draft, ...house(draft) }) }}>Reset to the house draft</Button>
                <span style={{ flex: 1 }} />
                <Button variant="secondary" appearance="outlined" onPress={() => setEdit(null)}>Cancel</Button>
                <Button isDisabled={!draft?.body.trim()} onPress={() => { void saveTemplate() }}>Save</Button>
              </>}>
        {draft ? (
          <div className={styles.messageEdit}>
            {draft.channel === 'email' ? <TextField label="Subject" value={draft.subject} onChange={(v) => setDraft({ ...draft, subject: v })} maxLength={120} /> : null}
            <div ref={boxRef} className={styles.messageBox} onSelect={noteCaret} onKeyUp={noteCaret} onClick={noteCaret}><TextArea label="Message" value={draft.body} onChange={(v: string) => setDraft({ ...draft, body: v })} maxLength={2000} /></div>
            <span ref={fieldsAnchor} className={styles.fieldsAnchor}>
              <Button appearance="text" iconStart={<Icon name="data_object" size={20} weight={300} />} aria-haspopup="menu" aria-expanded={fieldsOpen} onPress={() => setFieldsOpen((o) => !o)}>Insert a field</Button>
              <PortalMenu open={fieldsOpen} anchor={fieldsAnchor} onClose={() => setFieldsOpen(false)} align="left" width={280} role="menu" sheetTitle="Insert a field">
                {FIELDS.map((f) => <DropdownItem key={f.key} onSelect={() => insertField(f.key)}>{f.label}</DropdownItem>)}
              </PortalMenu>
            </span>
            <div className={styles.preview}>
              <span className={styles.previewLabel}>Preview</span>
              {draft.channel === 'email' && draft.subject ? <span className={styles.messageSubject}>{renderTemplate(draft.subject, SAMPLE_FIELDS)}</span> : null}
              <p className={styles.messageBody}>{renderTemplate(draft.body, SAMPLE_FIELDS)}</p>
            </div>
          </div>
        ) : null}
      </Dialog>
    </section>
  )
}
