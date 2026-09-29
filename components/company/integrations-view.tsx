'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Switch, Tag as TagChip } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { Chips } from '@/components/om/chips'
import { StatTile } from '@/components/om/stat-tile'
import { TextField } from '@/components/om/text-field'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { EMAIL_PLATFORMS, WEBHOOK_PLATFORMS, webhookUrl, type Webhook, type WebhookPlatform } from '@/lib/settings/types'
import { connectGmail, createWebhook, disconnectGmail, regenerateWebhook, revokeWebhook, simulateWebhook, syncGmail } from '@/app/leads/capture-actions'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { useCopy } from '@/components/om/use-copy'
import { CompanyShell } from './company-shell'
import { IntegrationsGhost } from './company-ghosts'
import { ReadOnlyNote } from './read-only-note'
import { intakeAddress, type LeadCapture } from '@/lib/settings/types'
import { setLeadCapture, simulateArrival } from '@/app/leads/capture-actions'
import { displayDateTimeDot } from '@/lib/format'
import styles from './integrations-view.module.css'

type Arrival = { fileName: string; at: number; rows: number }

/** (sweep S4 #25) A secret copied through the house hook: the button reads "Copied", and a failed copy says so — never the secret in a snackbar. */
function CopyButton({ text, label, done, what, variant = 'text' }: { text: string; label: string; done: string; what: string; variant?: 'text' | 'outlined' }) {
  const { copied, copy } = useCopy(text, { done, failed: `Couldn’t copy the ${what} — please try again` })
  return variant === 'text'
    ? <Button appearance="text" iconStart={<Icon name={copied ? 'check' : 'content_copy'} size={18} />} onPress={() => { void copy() }}>{copied ? 'Copied' : label}</Button>
    : <Button variant="secondary" appearance="outlined" onPress={() => { void copy() }}>{copied ? 'Copied' : label}</Button>
}

/** The Meta form's fields and the lead fields they land in — fixed for the demo; the platform maps a real form's questions. */
const META_MAP: [string, string][] = [['Full name', 'Lead name'], ['Phone number', 'Lead phone'], ['Email', 'Lead email'], ['Property type', 'Property type'], ['What do you need?', 'Remarks']]

/**
 * Company › Integrations (REG-602, no mock — Profile's card shell on the DS): where leads come in from. Qanvast is connected
 * (the lead return flow, REG-192); the website form's email intake shows its address; Meta Lead Ads connects a page, picks
 * the forms and shows the field map; Google Calendar, Xero and Zoho Books say what they will be. Every "arrive" here is the
 * platform's job — the prototype demonstrates it with a simulated enquiry, marked as such.
 */
/** (REG-612) The webhook's setup steps per platform — 1.0's words, shortened. */
const setupSteps = (platform: WebhookPlatform): string[] => platform === 'google_ads'
  ? ['In Google Ads, open the lead form extension and choose the webhook integration.', 'Paste the Webhook URL and the Signing key.', 'Send test data — you should see a green success. (Test leads are acknowledged but not saved.)', 'Save the form. New submissions land in Leads.']
  : platform === 'meta'
    ? ['In Zapier / Make, start from “Facebook Lead Ads → New Lead”.', 'Add a “Webhooks → POST” step with the Webhook URL.', 'Map fields: full_name → name, phone_number → phone, email → email, plus any extras into notes.', 'Turn it on. New submissions land in Leads.']
    : ['Paste the Webhook URL into your form or tool.', 'POST a JSON body with the accepted fields.', 'New submissions land in Leads.']

export function IntegrationsView({ capture: initial, studioName, arrivals, from, canManage = true }: { capture: LeadCapture; studioName: string; arrivals: Arrival[]; from?: string; /** (REG-612) Owners and Admins change the connections; everyone reads */ canManage?: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const [capture, setCapture] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const address = intakeAddress(studioName, capture.emailSlug)
  const { copied, copy } = useCopy(address, { done: 'Intake address copied' })
  const emailArrivals = arrivals.filter((a) => a.fileName.startsWith('Website form'))
  const metaArrivals = arrivals.filter((a) => a.fileName.startsWith('Meta Lead Ads'))
  const save = async (patch: Partial<LeadCapture>, done: string) => {
    const prev = capture
    setCapture((c) => ({ ...c, ...patch, meta: { ...c.meta, ...(patch.meta ?? {}) } }))
    try { const next = await setLeadCapture(patch); setCapture(next); snackbar({ message: done }) }
    catch { setCapture(prev); snackbar({ message: 'Couldn’t save the integration — please try again' }) }   // (sweep S4 #28)
  }
  const simulate = async (channel: 'email' | 'meta', formName?: string) => {
    if (busy) return
    setBusy(channel)
    try {
      const r = await simulateArrival(channel, formName)
      snackbar({ message: r.flagged ? `${r.name} enquired — a lead with that number exists, so it waits in Review imported leads` : `${r.name} enquired — a new lead, unread`, actionLabel: 'Open leads', onAction: () => router.push('/leads') })
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t simulate the lead — please try again' }) } finally { setBusy(null) }
  }
  /* (REG-612, parity Q-36) Webhooks + Email lead sources — the stand-ins' state and handlers. */
  const [platform, setPlatform] = useState<WebhookPlatform>('generic')
  const [hookLabel, setHookLabel] = useState('')
  const [hookNotes, setHookNotes] = useState('')
  const [created, setCreated] = useState<{ webhook: Webhook; key: string | null } | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'regen' | 'revoke'; w: Webhook } | null>(null)
  const [domain, setDomain] = useState('')
  const activeHooks = capture.webhooks.filter((w) => w.active)
  const email = capture.email
  const generate = async () => {
    if (busy) return
    setBusy('hook')
    try { const r = await createWebhook({ platform, label: hookLabel, notes: hookNotes }); setCapture((c) => ({ ...c, webhooks: [r.webhook, ...c.webhooks] })); setCreated(r); setHookLabel(''); setHookNotes(''); snackbar({ message: 'Webhook created' }); router.refresh() }
    catch { snackbar({ message: 'Couldn’t create the webhook — please try again' }) } finally { setBusy(null) }   // (REG-645, E-106) the house error line
  }
  const post = async (w: Webhook) => {
    if (busy) return
    setBusy(w.id)
    try {
      const r = await simulateWebhook(w.id)
      setCapture((c) => ({ ...c, webhooks: c.webhooks.map((x) => (x.id === w.id ? { ...x, received: x.received + 1, created: x.created + (r.outcome === 'created' ? 1 : 0), duplicates: x.duplicates + (r.outcome === 'duplicate' ? 1 : 0), lastAt: Date.now() } : x)), webhookLog: [{ at: Date.now(), webhookId: w.id, outcome: r.outcome, name: r.name }, ...c.webhookLog].slice(0, 50) }))
      snackbar({ message: r.outcome === 'created' ? `${r.name} arrived via ${w.label} — a new lead, unread` : `${r.name} arrived via ${w.label} — a known number, waiting in Review imported leads`, actionLabel: 'Open leads', onAction: () => router.push('/leads') })
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t simulate the POST — please try again' }) } finally { setBusy(null) }
  }
  const regen = async (w: Webhook) => { try { const next = await regenerateWebhook(w.id); if (next) { setCapture((c) => ({ ...c, webhooks: c.webhooks.map((x) => (x.id === w.id ? next : x)) })); setCreated({ webhook: next, key: next.key }); snackbar({ message: 'Token regenerated — copy the new URL' }) } } catch { snackbar({ message: 'Couldn’t regenerate the token — please try again' }) } }
  const revoke = async (w: Webhook) => { try { await revokeWebhook(w.id); setCapture((c) => ({ ...c, webhooks: c.webhooks.map((x) => (x.id === w.id ? { ...x, active: false } : x)) })); if (created?.webhook.id === w.id) setCreated(null); snackbar({ message: 'Webhook revoked' }); router.refresh() } catch { snackbar({ message: 'Couldn’t revoke the webhook — please try again' }) } }
  const connect = async () => { try { setCapture(await connectGmail()); snackbar({ message: 'Gmail connected — the platforms below are monitored' }); router.refresh() } catch { snackbar({ message: 'Couldn’t connect Gmail — please try again' }) } }
  const disconnect = async () => { try { setCapture(await disconnectGmail()); snackbar({ message: 'Gmail disconnected' }); router.refresh() } catch { snackbar({ message: 'Couldn’t disconnect Gmail — please try again' }) } }
  const sync = async () => {
    if (busy) return
    setBusy('gmail')
    try {
      const r = await syncGmail()
      setCapture((c) => ({ ...c, email: { ...c.email, lastSyncAt: Date.now(), stats: { ...c.email.stats, found: c.email.stats.found + 1, created: c.email.stats.created + (r.outcome === 'created' ? 1 : 0), duplicates: c.email.stats.duplicates + (r.outcome === 'duplicate' ? 1 : 0) } } }))
      snackbar({ message: r.outcome === 'created' ? `${r.name} enquired via ${r.platform} — a new lead, unread` : `${r.name} enquired via ${r.platform} — a known number, waiting in Review imported leads`, actionLabel: 'Open leads', onAction: () => router.push('/leads') })
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t sync Gmail — please try again' }) } finally { setBusy(null) }
  }
  const addDomain = () => { const d = domain.trim().toLowerCase().replace(/^@?/, '@'); if (d.length < 2 || email.custom.includes(d)) return; setDomain(''); void save({ email: { ...email, custom: [...email.custom, d] } }, `${d} monitored`) }
  const last = (list: Arrival[]) => (list.length ? `${list.length} ${list.length === 1 ? 'lead' : 'leads'} so far · last ${displayDateTimeDot(new Date(Math.max(...list.map((a) => a.at))))}` : 'Nothing has arrived yet')
  return (
    <CompanyShell title="Integrations" from={from} skeleton={<IntegrationsGhost />}>
      <div className={styles.layout} data-testid="integrations">
        {canManage ? null : <ReadOnlyNote text="Only Owners and Admins connect, generate or change integrations." />}   {/* (sweep S4 #16) */}
        <section className={styles.card} aria-labelledby="int-qanvast">
          <div className={styles.cardHead}>
            <div className={styles.titleRow}><h2 id="int-qanvast" className={styles.cardTitle}>Qanvast</h2><MetaChip color="green">Connected</MetaChip></div>
            <p className={styles.cardHelp}>Leads from your Qanvast profile arrive as New with the source Qanvast. Return Lead sends one back with a reason; Qanvast Ops › Leads shows every return.</p>
          </div>
        </section>

        <section id="email" className={styles.card} aria-labelledby="int-email" data-testid="int-email">
          <div className={styles.cardHead}>
            <div className={styles.titleRow}><h2 id="int-email" className={styles.cardTitle}>Website form by email</h2><MetaChip color="green">Ready</MetaChip></div>
            <p className={styles.cardHelp}>Set your website form to email this address. Each enquiry becomes a lead with the source Website, unread until someone opens it. A phone number already on a lead goes to Review imported leads instead of a second lead.</p>
          </div>
          <div className={styles.row}>
            <code className={styles.address} data-testid="intake-address">{address}</code>
            <Button variant="secondary" appearance="outlined" iconStart={<Icon name="content_copy" size={20} />} onPress={() => { void copy() }}>{copied ? 'Copied' : 'Copy'}</Button>
          </div>
          <div className={styles.meta}>
            <span>{last(emailArrivals)}</span>
            {canManage ? <Button appearance="text" iconStart={<Icon name="mail" size={18} />} isDisabled={busy !== null} onPress={() => { void simulate('email') }}>{busy === 'email' ? 'Arriving…' : 'Simulate an enquiry arriving (demo)'}</Button> : null}
          </div>
        </section>

        <section id="meta" className={styles.card} aria-labelledby="int-meta" data-testid="int-meta">
          <div className={styles.cardHead}>
            <div className={styles.titleRow}><h2 id="int-meta" className={styles.cardTitle}>Meta Lead Ads</h2>{capture.meta.connected ? <MetaChip color="green">Connected</MetaChip> : <MetaChip>Not connected</MetaChip>}</div>
            <p className={styles.cardHelp}>Connect the Facebook page your ads run on, pick the lead forms, and every submission becomes a lead with the source Meta Ads. The form’s questions land in the lead’s fields as mapped below.</p>
          </div>
          {capture.meta.connected ? (
            <>
              <div className={styles.row}>
                <span className={styles.page}><Icon name="storefront" size={20} weight={300} />{capture.meta.page}</span>
                {canManage ? <Button variant="secondary" appearance="outlined" onPress={() => { void save({ meta: { ...capture.meta, connected: false } }, 'Meta Lead Ads disconnected') }}>Disconnect</Button> : null}   {/* (REG-646, Q-07) Owners and Admins */}
              </div>
              {/* (sweep S4 #20) the house list of switches — Settings' event table: a caption head, 56px rows, the switch under its column */}
              <div className={styles.formTable} role="table" aria-label="Lead forms" data-card-table="">
                <div className={styles.formHead} role="row"><span role="columnheader">Lead form</span><span role="columnheader" className={styles.formCol}>Sends leads</span></div>
                {capture.meta.forms.map((f) => (
                  <label key={f.id} className={styles.formRow} role="row">
                    <span className={styles.formName} role="cell">{f.name}</span>
                    <span className={styles.formCol} role="cell">
                    <Switch size="sm" isSelected={f.on} isDisabled={!canManage} aria-label={`${f.name} sends leads`} onChange={(on: boolean) => { void save({ meta: { ...capture.meta, forms: capture.meta.forms.map((x) => (x.id === f.id ? { ...x, on } : x)) } }, on ? `${f.name} now sends leads` : `${f.name} no longer sends leads`) }} /></span>
                  </label>
                ))}
              </div>
              <div className={styles.map} role="table" aria-label="Field map">
                <span className={styles.eyebrow}>Field map</span>
                {META_MAP.map(([a, b]) => <div key={a} className={styles.mapRow} role="row"><span role="cell">{a}</span><Icon name="arrow_forward" size={16} /><span role="cell">{b}</span></div>)}
              </div>
              <div className={styles.meta}>
                <span>{last(metaArrivals)}</span>
                {canManage ? <Button appearance="text" iconStart={<Icon name="send" size={18} />} isDisabled={busy !== null || !capture.meta.forms.some((f) => f.on)} onPress={() => { void simulate('meta', capture.meta.forms.find((f) => f.on)?.name) }}>{busy === 'meta' ? 'Arriving…' : 'Simulate a form submission (demo)'}</Button> : null}
              </div>
            </>
          ) : (
            <div className={styles.row}>
              {canManage ? <Button iconStart={<Icon name="link" size={20} />} onPress={() => { void save({ meta: { ...capture.meta, connected: true, page: `${studioName.replace(/ Pte\.? Ltd\.?$/i, '')} · Facebook page` } }, 'Meta Lead Ads connected') }}>Connect a Facebook page</Button> : null}
              <span className={styles.hint}>{canManage ? 'The platform opens Meta’s login; the prototype connects a stand-in page.' : 'An Owner or an Admin connects the studio’s Facebook page.'}</span>
            </div>
          )}
        </section>

        {/* (REG-612, parity Q-36 · I-07) Webhooks — 1.0's Lead Webhooks tab as a stand-in on the DS: a URL per endpoint (a signing key for
            Google, shown once), counters, a log; "Simulate a POST" plays what a real POST would through the same intake. */}
        <section id="webhooks" className={styles.card} aria-labelledby="int-webhooks" data-testid="int-webhooks">
          <div className={styles.cardHead}>
            <div className={styles.titleRow}><h2 id="int-webhooks" className={styles.cardTitle}>Webhooks</h2>{activeHooks.length ? <MetaChip color="green">{`${activeHooks.length} active`}</MetaChip> : <MetaChip>None yet</MetaChip>}</div>
            <p className={styles.cardHelp}>Generate webhook URLs for external systems to push leads directly into your studio. Supports any platform that can POST JSON (Zapier, Make, Typeform, Facebook Lead Ads, etc.).</p>
          </div>
          <ol className={styles.steps}>
            <li>Generate a URL below and paste it into your form / integration tool.</li>
            <li>When someone submits the form, a POST request is sent to the URL.</li>
            <li>The lead appears in your Leads page — unread, or in Review imported leads when the phone is already known.</li>
          </ol>
          <span className={styles.hint}>Accepted JSON fields: name, phone, email, budget, property_type, notes, source. Also accepts common aliases like full_name, mobile, message.</span>
          {canManage ? (
            <div className={styles.newHook} data-testid="new-webhook">
              <span className={styles.eyebrow}>New webhook endpoint</span>
              <div className={styles.hookForm}>
                <TextField label="Source" mode="select" options={WEBHOOK_PLATFORMS.map((p) => p.label)} value={WEBHOOK_PLATFORMS.find((p) => p.key === platform)!.label} onChange={(v) => setPlatform(WEBHOOK_PLATFORMS.find((p) => p.label === v)?.key ?? 'generic')} helper={WEBHOOK_PLATFORMS.find((p) => p.key === platform)!.help} />
                <TextField label="Source label (optional)" value={hookLabel} onChange={setHookLabel} maxLength={80} trailingIcon={null} helper="Incoming leads are tagged with this source name." />
                <TextField label="Notes (optional)" value={hookNotes} onChange={setHookNotes} maxLength={200} trailingIcon={null} helper="Internal — not shown to clients." />
              </div>
              <div><Button iconStart={<Icon name="add" size={20} />} isDisabled={busy !== null} onPress={() => { void generate() }}>{busy === 'hook' ? 'Creating…' : 'Generate webhook URL'}</Button></div>
            </div>
          ) : null}
          {created ? (
            <div className={styles.created} role="status" data-testid="webhook-created">
              <span className={styles.createdTitle}>{created.webhook.platform === 'google_ads' ? 'Connect in Google Ads' : created.webhook.platform === 'meta' ? 'Connect Meta via Zapier / Make' : 'Webhook created'}</span>
              <span className={styles.eyebrow}>Webhook URL</span>
              <div className={styles.row}><code className={styles.address} data-testid="webhook-url">{webhookUrl(created.webhook.token)}</code><CopyButton variant="outlined" text={webhookUrl(created.webhook.token)} label="Copy URL" done="Webhook URL copied" what="webhook URL" /></div>
              {created.key ? (
                <>
                  <span className={styles.eyebrow}>Signing key</span>
                  <div className={styles.row}><code className={styles.address} data-testid="webhook-key">{created.key}</code><CopyButton variant="outlined" text={created.key} label="Copy key" done="Key copied" what="signing key" /></div>
                  <span className={styles.hint}>Shown once — copy it now. You can regenerate later, but the old key stops working.</span>
                </>
              ) : null}
              <ol className={styles.steps}>{setupSteps(created.webhook.platform).map((step) => <li key={step}>{step}</li>)}</ol>
              <div><Button appearance="text" onPress={() => setCreated(null)}>Done</Button></div>
            </div>
          ) : null}
          {activeHooks.length ? (
            <ul className={styles.hooks} aria-label="Webhook endpoints">
              {activeHooks.map((w) => (
                <li key={w.id} className={styles.hook} data-testid="webhook-row">
                  <div className={styles.hookHead}><span className={styles.hookLabel}>{w.label}</span><MetaChip>{WEBHOOK_PLATFORMS.find((p) => p.key === w.platform)?.label ?? w.platform}</MetaChip>{w.notes ? <span className={styles.hint}>{w.notes}</span> : null}</div>
                  <div className={styles.meta} data-testid="webhook-counters"><span>{w.received} received</span><span>{w.created} created</span><span>{w.duplicates} {w.duplicates === 1 ? 'duplicate' : 'duplicates'}</span><span>{w.lastAt ? `Last: ${displayDateTimeDot(new Date(w.lastAt))}` : 'No requests received yet.'}</span></div>
                  <div className={styles.row}>
                    {/* (sweep S4 #17) the URL carries the endpoint's secret token — only Owners and Admins are sent it, and only they copy it */}
                    {canManage && w.token ? <CopyButton text={webhookUrl(w.token)} label="Copy URL" done="Webhook URL copied" what="webhook URL" /> : null}
                    {canManage ? (
                      <>
                        <Button appearance="text" iconStart={<Icon name="send" size={18} />} isDisabled={busy !== null} onPress={() => { void post(w) }}>{busy === w.id ? 'Arriving…' : 'Simulate a POST (demo)'}</Button>
                        <Button appearance="text" iconStart={<Icon name="refresh" size={18} />} onPress={() => setConfirm({ kind: 'regen', w })}>Regenerate</Button>
                        <Button appearance="text" iconStart={<Icon name="delete" size={18} />} onPress={() => setConfirm({ kind: 'revoke', w })}>Revoke</Button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : <span className={styles.hint} data-testid="webhooks-empty">No webhook endpoints yet. Generate one above to start receiving leads from external systems.</span>}
          {capture.webhookLog.length ? (
            <div className={styles.log} data-testid="webhook-log">
              <span className={styles.eyebrow}>Recent activity</span>
              <ul className={styles.logList}>
                {capture.webhookLog.slice(0, 10).map((e) => (
                  <li key={`${e.at}-${e.name}`} className={styles.logRow}><MetaChip color={e.outcome === 'created' ? 'green' : 'yellow'}>{e.outcome === 'created' ? 'Created' : 'Duplicate'}</MetaChip><span>{e.name}</span><span className={styles.hint}>{capture.webhooks.find((w) => w.id === e.webhookId)?.label ?? 'Webhook'} · {displayDateTimeDot(new Date(e.at))}</span></li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* (REG-612, parity Q-36 · I-10) Email lead sources — 1.0's Gmail ingestion as a stand-in: an inbox, the platforms to monitor, Sync now. */}
        <section id="gmail" className={styles.card} aria-labelledby="int-gmail" data-testid="int-gmail">
          <div className={styles.cardHead}>
            <div className={styles.titleRow}><h2 id="int-gmail" className={styles.cardTitle}>Email lead sources</h2>{email.connected ? <MetaChip color="green">Active</MetaChip> : <MetaChip>Not connected</MetaChip>}</div>
            <p className={styles.cardHelp}>Leads that arrive by email from the portals — Homereno, Houzz, Renopedia and more — are read and added to the listing with the portal as their source; a known phone waits in Review imported leads.</p>
          </div>
          {email.connected ? (
            <>
              <div className={styles.row}><code className={styles.address} data-testid="gmail-address">{email.address}</code><span className={styles.hint}>{email.lastSyncAt ? `Last sync: ${displayDateTimeDot(new Date(email.lastSyncAt))}` : 'Not yet synced'}</span></div>
              <div className={styles.forms}>
                <span className={styles.eyebrow}>Platforms to monitor</span>
                {/* (REG-614) The house chips; the custom domains below are the DS Tag with its remove, as the lead form's picked members. */}
                <Chips multiple label="Platforms to monitor" options={EMAIL_PLATFORMS} value={email.platforms} disabled={!canManage}
                       onChange={(platforms) => { const added = platforms.find((x) => !email.platforms.includes(x)); const gone = email.platforms.find((x) => !platforms.includes(x)); void save({ email: { ...email, platforms } }, added ? `${added} monitored` : `${gone} no longer monitored`) }} />
              </div>
              <div className={styles.forms}>
                <span className={styles.eyebrow}>Custom domains</span>
                <div className={styles.chips}>
                  {email.custom.map((d) => canManage ? (
                    <button key={d} type="button" className={styles.tagBtn} aria-label={`Remove ${d}`} onClick={() => { void save({ email: { ...email, custom: email.custom.filter((x) => x !== d) } }, `${d} removed`) }}>
                      <TagChip appearance="outlined" iconEnd={<Icon name="close" size={12} />}>{d}</TagChip>
                    </button>
                  ) : <TagChip key={d} appearance="outlined">{d}</TagChip>)}
                  {!email.custom.length ? <span className={styles.hint}>None yet.</span> : null}
                </div>
                {canManage ? <div className={styles.addDomain}><TextField label="Add a domain" value={domain} onChange={setDomain} maxLength={60} trailingIcon={null} placeholder="@example.com" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDomain() } }} /><Button variant="secondary" appearance="outlined" onPress={addDomain} isDisabled={!domain.trim()}>Add</Button></div> : null}
              </div>
              <div className={styles.stats} data-testid="gmail-stats">
                <span className={styles.eyebrow}>Last sync</span>
                <div className={styles.statRow}>
                  {([['Emails found', email.stats.found], ['Leads created', email.stats.created], ['Duplicates', email.stats.duplicates], ['Parse fails', email.stats.failed]] as [string, number][]).map(([l, n]) => <StatTile key={l} label={l} value={n} />)}
                </div>
              </div>
              <div className={styles.row}>
                {canManage ? <Button iconStart={<Icon name="refresh" size={20} />} isDisabled={busy !== null || email.platforms.length + email.custom.length === 0} onPress={() => { void sync() }}>{busy === 'gmail' ? 'Syncing…' : 'Sync now'}</Button> : null}
                {canManage ? <Button variant="secondary" appearance="outlined" onPress={() => { void disconnect() }}>Disconnect</Button> : null}
              </div>
            </>
          ) : (
            <div className={styles.row}>
              <div className={styles.emptyMail}><span className={styles.emptyTitle}>No email accounts connected</span><span className={styles.hint}>Connect your Gmail to automatically import leads from Homereno, Houzz, Renopedia and more.</span></div>
              {canManage ? <Button iconStart={<Icon name="mail" size={20} />} onPress={() => { void connect() }}>Connect Gmail</Button> : null}
            </div>
          )}
        </section>

        <section className={styles.card} aria-labelledby="int-soon">
          <div className={styles.cardHead}><h2 id="int-soon" className={styles.cardTitle}>Coming</h2></div>
          <ul className={styles.soon}>
            <li><span><strong>Google Calendar</strong> — meeting invites from a lead’s Met log, once the Meetings tab lands.</span><Button appearance="text" onPress={comingSoon}>Notify me</Button></li>
            <li><span><strong>Xero · Zoho Books</strong> — invoices and payments two ways.</span><Button appearance="text" onPress={comingSoon}>Notify me</Button></li>
          </ul>
        </section>
      </div>
      <ConfirmDialog open={!!confirm} title={confirm?.kind === 'regen' ? 'Regenerate the token?' : 'Revoke this webhook?'} message={confirm?.kind === 'regen' ? 'The old URL will stop working immediately.' : 'Any external system using it will stop receiving leads.'} confirmLabel={confirm?.kind === 'regen' ? 'Regenerate' : 'Revoke'} tone={confirm?.kind === 'regen' ? 'primary' : 'danger'}
                     onCancel={() => setConfirm(null)} onConfirm={() => { const c = confirm; setConfirm(null); if (c) void (c.kind === 'regen' ? regen(c.w) : revoke(c.w)) }} />
    </CompanyShell>
  )
}
