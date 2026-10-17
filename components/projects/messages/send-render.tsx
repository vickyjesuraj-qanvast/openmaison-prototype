'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Dialog } from '@/components/om/dialog'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { renderMessageTarget, sendRenderToMessages } from '@/app/projects/messages-actions'
import { withFrom } from '@/lib/nav'
import styles from './messages.module.css'

/**
 * (parity map 2026-10-10, TD-122 — 1.0's AI Visualizer › full view › Send to Chat) **Send to Messages** on the AI Visualizer's canvas bar: a
 * version of a design whose lead is a live project goes into the project's Messages — the client's conversation or the team's (house Chips),
 * with a line of text, the render filed once in Files › Renders and attached as the message's photo — and the conversation opens at it.
 * The press is only there when it applies: a design on a project whose conversations the viewer may write in, a version in view (never the
 * original photo). 1.0 fell back to "the studio's first chat" when none was linked; 2.0 has no such chat, so no project → no press.
 */
export function SendToMessages({ leadId, version }: { leadId: string | null; version: { jobId: string; variantId: number; n: number; room: string; imageUrl: string } | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const snackbar = useSnackbar()
  const [target, setTarget] = useState<{ projectId: string; projectName: string; client: string } | null>(null)
  useEffect(() => {
    if (!leadId) return
    let alive = true
    renderMessageTarget(leadId).then((t) => { if (alive) setTarget(t) }).catch(() => {})
    return () => { alive = false }
  }, [leadId])
  const [open, setOpen] = useState(false)
  const [channel, setChannel] = useState<'client' | 'team'>('client')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  if (!target || !version || !leadId) return null
  const first = target.client.split(/\s+/)[0] ?? target.client
  const start = () => { setChannel('client'); setBody(`A new look for the ${version.room.toLowerCase()} — V${version.n}. What do you think?`); setOpen(true) }
  const send = async () => {
    setBusy(true)
    try {
      const r = await sendRenderToMessages(target.projectId, { channel, body, jobId: version.jobId, variantId: version.variantId })
      if ('error' in r) { snackbar({ message: couldnt('send it to Messages', refusalOf(r.error)) }); return }
      setOpen(false)
      snackbar({ message: channel === 'team' ? `V${version.n} sent to the team on ${target.projectName}` : `V${version.n} sent to ${first} — it’s on their page` })
      const here = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`
      router.push(withFrom(r.href, here))
    } catch { snackbar({ message: couldnt('send it to Messages') }) } finally { setBusy(false) }
  }
  return (
    <>
      <Tooltip label="Send to Messages"><IconButton icon="send" label="Send to Messages" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={start} data-testid="viz-send-messages" /></Tooltip>
      {/* `portal`: the press sits in the stage's canvas bar, whose transformed box would trap the dialog under the photo (REG-444's case) */}
      <Dialog open={open} onClose={() => setOpen(false)} title="Send to Messages" subtitle={`${target.projectName} — the render goes with your line, and Files › Renders keeps it.`} size="modal" width={600} portal
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setOpen(false)}>Cancel</Button><Button onPress={() => { void send() }} isDisabled={busy} data-testid="viz-send-messages-send">{busy ? 'Sending…' : 'Send'}</Button></>}>
        <div className={styles.sendRender} data-testid="viz-send-messages-dialog">
          <Chips label="To" value={channel} onChange={(v) => setChannel(v === 'team' ? 'team' : 'client')} testId="viz-send-messages-channel"
                 options={[{ value: 'client', label: `${first} (Client)` }, { value: 'team', label: 'Team' }]} />
          <p className={styles.note}>{channel === 'team' ? `Only the team reads it — ${first} never sees this conversation.` : `${first} reads it on their page and can answer there.`}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.sendRenderPic} src={version.imageUrl} alt={`${version.room} · V${version.n}`} />
          <TextField label="A line with it" value={body} onChange={setBody} maxLength={2000} />
        </div>
      </Dialog>
    </>
  )
}
