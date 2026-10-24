'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { ProTag } from '@/components/credits/pro-tag'
import { useRef, useState, type SyntheticEvent } from 'react'
import { Button, Switch, TextArea } from '@/components/ds'
import { Dialog, FootStart } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { PortalMenu } from '@/components/om/portal-menu'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { HelpLink } from '@/components/company/help-link'
import { renderTemplate } from '@/lib/notifications/model'
import { setClientChannel, setClientTemplate } from '@/app/notifications/client-messages-actions'
import { slugFromName } from '@/lib/portal/model'   // (pending modules S31)
import { CLIENT_CHANNELS, CLIENT_EVENTS, CLIENT_FIELDS, SAMPLE_CLIENT_FIELDS, clientTemplateFor, houseClientTemplate, type ClientChannel, type ClientEvent, type ClientMessageRules, type ClientTemplate } from '@/lib/portal/client-messages'
import styles from './settings.module.css'

/**
 * (gaps build H — H-Q17…H-Q19) Settings › Notifications › Messages to clients — what reaches a client by itself, by email or WhatsApp, on the
 * studio's switches: the event table (the Events and channels card's grammar, a DS sm switch per channel) and each message's words, edited
 * like the studio's own (subject · message · Insert a field · preview). They go to everyone a home's portal is open to; every one is listed
 * under Sent messages. Owners and Admins change it; the card sits in the module's read-only scope for everyone else.
 */
export function ClientMessagesSettings({ rules: initial, readOnly, studio = 'Demo Studio' }: { rules: ClientMessageRules; readOnly: boolean; /** (pending modules S31) the open studio's name — the samples print it and its portal's address */ studio?: string }) {
  const sample = studio === 'Demo Studio' ? SAMPLE_CLIENT_FIELDS : { ...SAMPLE_CLIENT_FIELDS, '{studio}': studio, '{link}': `https://app.openmaison.sg/my/${slugFromName(studio)}` }
  const snackbar = useSnackbar()
  const [rules, setRules] = useState(initial)
  const [draft, setDraft] = useState<ClientTemplate | null>(null)
  const [caret, setCaret] = useState<number | null>(null)
  const [fieldsOpen, setFieldsOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const label = (e: ClientEvent) => CLIENT_EVENTS.find((x) => x.key === e)?.label ?? e
  const waLock = usePlanLock('whatsapp_notifications')   // (pending modules S19) WhatsApp to clients is Pro: turning it on opens the lock on Free
  const toggle = async (event: ClientEvent, channel: ClientChannel, on: boolean) => {
    if (channel === 'whatsapp' && on && waLock.locked) { waLock.open(); return }
    const prev = rules
    setRules((r) => ({ ...r, channels: { ...r.channels, [event]: { ...r.channels[event], [channel]: on } } }))
    try {
      const r = await setClientChannel({ event, channel, on })
      if ('error' in r) { setRules(prev); snackbar({ message: couldnt('save the setting', refusalOf(r.error)) }); return }
      setRules(r.rules); snackbar({ message: `${label(event)}: ${channel === 'email' ? 'Email' : 'WhatsApp'} to the client ${on ? 'on' : 'off'}` })
    } catch { setRules(prev); snackbar({ message: 'Couldn’t save the setting — please try again' }) }
  }
  const save = async () => {
    const d = draft
    if (!d) return
    try {
      const r = await setClientTemplate(d)
      if ('error' in r) { snackbar({ message: couldnt('save the message', refusalOf(r.error)) }); return }
      setRules(r.rules); setDraft(null); snackbar({ message: 'Message saved' })
    } catch { snackbar({ message: 'Couldn’t save the message — please try again' }) }
  }
  const noteCaret = (e: SyntheticEvent) => { const t = e.target as HTMLTextAreaElement; if (t.tagName === 'TEXTAREA') setCaret(t.selectionStart) }
  const insert = (key: string) => {
    setFieldsOpen(false)
    if (!draft) return
    const at = Math.min(caret ?? draft.body.length, draft.body.length)
    const before = draft.body.slice(0, at), after = draft.body.slice(at)
    const lead = before && !/\s$/.test(before) ? ' ' : '', trail = after && !/^\s/.test(after) ? ' ' : ''
    setDraft({ ...draft, body: `${before}${lead}${key}${trail}${after}`.slice(0, 2000) })
    setCaret(before.length + lead.length + key.length)
  }
  return (
    <>
      <div className={styles.setting} data-testid="client-messages">
        <div className={styles.settingHead}>
          <span className={styles.settingTitle}>Messages to clients</span>
          <span className={styles.settingHelp}>What reaches a client by itself — to the client and anyone from their household invited to their page, on the email and mobile you hold for them, with the link to the thing on their page. Nothing goes while the portal is paused, for a section switched off under <HelpLink href="/company/portal">Company › Client portal</HelpLink>, or to a client not invited yet.</span>
        </div>
        <div className={styles.eventTable} role="table" aria-label="Messages to clients" data-card-table="">
          <div className={styles.eventHead} role="row">
            <span role="columnheader">Event</span><span role="columnheader">Who</span>
            {CLIENT_CHANNELS.map((c) => <span key={c.key} role="columnheader" className={styles.eventCol}>{c.label}</span>)}
          </div>
          {CLIENT_EVENTS.map((e) => (
            <div key={e.key} className={styles.eventRow} role="row" data-testid={`client-event-${e.key}`}>
              <span role="cell" className={styles.eventName}><Icon name={e.icon} size={20} weight={300} /><span><span>{e.label}</span><span className={styles.eventHelp}>{e.help}</span></span></span>
              <span role="cell" className={styles.eventWho} data-label="Who">The client and their household</span>
              {CLIENT_CHANNELS.map((c) => (
                <span key={c.key} role="cell" className={styles.eventCol} data-label={c.label}>
                  <Switch size="sm" isSelected={rules.channels[e.key][c.key]} isDisabled={readOnly} onChange={(on: boolean) => { void toggle(e.key, c.key, on) }} aria-label={`${e.label} — ${c.label} to the client`} />
                </span>
              ))}
            </div>
          ))}
        </div>
        <ul className={styles.messages}>
          {CLIENT_EVENTS.map((e) => (['email', 'whatsapp'] as const).map((ch) => {
            const t = clientTemplateFor(rules.templates, e.key, ch)
            const on = rules.channels[e.key][ch]
            return (
              <li key={`${e.key}-${ch}`} className={styles.message} data-off={on ? undefined : ''} data-testid={`client-message-${e.key}-${ch}`}>
                <div className={styles.messageHead}>
                  <span className={styles.messageTitle}><Icon name={ch === 'whatsapp' ? 'chat' : 'mail'} size={18} weight={300} />{e.label} · {ch === 'whatsapp' ? 'WhatsApp' : 'Email'}{on && !(ch === 'whatsapp' && waLock.locked) ? '' : ' · off'}{ch === 'whatsapp' && waLock.locked ? <> <ProTag /></> : null}</span>
                  {readOnly ? null : <Button appearance="text" onPress={() => { setCaret(null); setDraft({ ...t }) }}>Edit</Button>}
                </div>
                {ch === 'email' && t.subject ? <span className={styles.messageSubject}>{renderTemplate(t.subject, sample)}</span> : null}
                <p className={styles.messageBody}>{renderTemplate(t.body, sample)}</p>
              </li>
            )
          }))}
        </ul>
      </div>
      <Dialog open={!!draft} onClose={() => setDraft(null)} title={draft ? `To the client · ${label(draft.event)} · ${draft.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}` : 'Message'} size="modal" width={600}
              subtitle="The fields fill themselves when the message goes — the preview shows a sample client."
              footer={<>
                {/* (responsive audit 2026-10-23, W4-23) the house FootStart, not a spacer: at 320 the reset ran 71px off the foot's left edge */}
                <FootStart><Button appearance="text" iconStart={<Icon name="restart_alt" size={18} />} isDisabled={!draft || (draft.body === houseClientTemplate(draft).body && draft.subject === houseClientTemplate(draft).subject)} onPress={() => { if (draft) setDraft({ ...draft, ...houseClientTemplate(draft) }) }}>Reset to the house draft</Button></FootStart>
                <Button variant="secondary" appearance="outlined" onPress={() => setDraft(null)}>Cancel</Button>
                <Button isDisabled={!draft?.body.trim()} onPress={() => { void save() }} data-testid="client-message-save">Save</Button>
              </>}>
        {draft ? (
          <div className={styles.messageEdit}>
            {draft.channel === 'email' ? <TextField label="Subject" value={draft.subject} onChange={(v) => setDraft({ ...draft, subject: v })} maxLength={120} /> : null}
            <div ref={box} className={styles.messageBox} onSelect={noteCaret} onKeyUp={noteCaret} onClick={noteCaret}><TextArea label="Message" value={draft.body} onChange={(v: string) => setDraft({ ...draft, body: v })} maxLength={2000} /></div>
            <span ref={anchor} className={styles.fieldsAnchor}>
              <Button appearance="text" iconStart={<Icon name="data_object" size={20} weight={300} />} aria-haspopup="menu" aria-expanded={fieldsOpen} onPress={() => setFieldsOpen((o) => !o)}>Insert a field</Button>
              <PortalMenu open={fieldsOpen} anchor={anchor} onClose={() => setFieldsOpen(false)} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="Insert a field">
                {CLIENT_FIELDS.map((f) => <DropdownItem key={f.key} onSelect={() => insert(f.key)}>{f.label}</DropdownItem>)}
              </PortalMenu>
            </span>
            <div className={styles.preview}>
              <span className={styles.previewLabel}>Preview</span>
              {draft.channel === 'email' && draft.subject ? <span className={styles.messageSubject}>{renderTemplate(draft.subject, sample)}</span> : null}
              <p className={styles.messageBody}>{renderTemplate(draft.body, sample)}</p>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  )
}
