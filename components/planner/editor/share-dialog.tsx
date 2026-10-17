'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { displayDate } from '@/lib/format'
import type { LayoutShareFacts } from '@/lib/planner/queries'
import styles from './share-dialog.module.css'

/**
 * (gaps build J, J-Q14 · J-Q16) Share with client — the AI Visualizer's button, for a layout: a read-only 3D link holding the layout as it
 * is now (the client reads what was shared, never the work in progress). Once shared: the link to copy or send on WhatsApp (the message
 * opens on the press), *Share changes* when the layout moved on since, and *Stop sharing* (Undo on the snackbar). A project's layout also
 * sits on the client's portal under Designs while it is shared; a personal one shares the link only.
 */
export function ShareDialog({ open, onClose, name, client, portal, share, changed, url, busy, onShare, onCopy, onWhatsApp, onStop }: {
  open: boolean; onClose: () => void
  name: string
  client: { name: string; phone: string | null } | null
  /** where the portal stands for this layout: 'on' (it shows under Designs) · 'invite' (no portal yet) · 'off' (Designs switched off) · null (a personal layout) */
  portal: 'on' | 'invite' | 'off' | null
  share: LayoutShareFacts | null
  changed: boolean
  url: string | null
  busy: boolean
  onShare: (message: string | null) => void
  onCopy: () => void
  onWhatsApp: () => void
  onStop: () => void
}) {
  const [message, setMessage] = useState('')
  const first = client?.name.split(/\s+/)[0] ?? null
  const portalLine = portal === 'on' ? `It also stays on ${first ?? 'the client'}’s portal, under Designs, while it is shared.`
    : portal === 'invite' ? `Invite ${first ?? 'the client'} to their portal to keep it there too.`
    : portal === 'off' ? 'Designs is switched off on the client portal — the link alone reaches them.'
    : 'A personal layout shares a link only — link it to a project to put it on the client’s portal too.'
  return (
    <Dialog open={open} onClose={onClose} title="Share with client" subtitle={client ? `${client.name} walks through “${name}” in 3D — they can look, not change it.` : `Anyone with the link walks through “${name}” in 3D — they can look, not change it.`}
            size="modal" width={600} closeOnScrim={false}
            footer={share ? (
              <>
                <Button variant="secondary" appearance="text" onPress={onStop} isDisabled={busy} data-testid="planner-stop-share">Stop sharing</Button>
                <span className={styles.grow} />
                {changed ? <Button onPress={() => onShare(null)} isDisabled={busy} iconStart={<Icon name="send" size={20} weight={300} />} data-testid="planner-share-changes">{busy ? 'Sharing…' : 'Share changes'}</Button>
                  : <Button variant="secondary" appearance="outlined" onPress={onClose}>Done</Button>}
              </>
            ) : (
              <>
                <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                <Button onPress={() => onShare(message.trim() || null)} isDisabled={busy} iconStart={<Icon name="link" size={20} weight={300} />} data-testid="planner-create-link">{busy ? 'Making the link…' : 'Make the link'}</Button>
              </>
            )}>
      <div className={styles.body} data-testid="planner-share-dialog">
        {share && url ? (
          <>
            {changed ? <p className={styles.changed} role="status" data-testid="planner-changes-note"><Icon name="info" size={18} weight={300} />{`You changed the layout since you shared it on ${displayDate(new Date(share.updatedAt))} — the client still sees that copy. Share changes sends the layout as it is now.`}</p> : null}
            <div className={styles.linkRow}>
              <span className={styles.link} data-testid="planner-share-url">{url}</span>
              <Button variant="secondary" appearance="outlined" onPress={onCopy} iconStart={<Icon name="content_copy" size={20} weight={300} />} data-testid="planner-copy-link">Copy link</Button>
            </div>
            {client?.phone ? <Button variant="secondary" appearance="outlined" onPress={onWhatsApp} iconStart={<Icon name="chat" size={20} weight={300} />} data-testid="planner-whatsapp">{`Send to ${first} on WhatsApp`}</Button> : null}
            <ul className={styles.facts}>
              <li>{`Shared ${displayDate(new Date(share.sharedAt))}${share.updatedAt > share.sharedAt + 60_000 ? ` · changes shared ${displayDate(new Date(share.updatedAt))}` : ''}`}</li>
              <li>{share.firstViewedAt ? `Opened first on ${displayDate(new Date(share.firstViewedAt))} · ${share.viewCount} ${share.viewCount === 1 ? 'visit' : 'visits'}` : 'Not opened yet'}</li>
              <li>{portalLine}</li>
            </ul>
          </>
        ) : (
          <>
            <TextField label="A note with the link (optional)" value={message} onChange={setMessage} multiline={3} maxLength={500} />
            <ul className={styles.facts}>
              <li>The link opens on a phone or a computer, no sign-in — they can turn it, walk inside it and look at each room.</li>
              <li>It has no end date. Stop sharing ends it.</li>
              <li>{portalLine}</li>
            </ul>
          </>
        )}
      </div>
    </Dialog>
  )
}
