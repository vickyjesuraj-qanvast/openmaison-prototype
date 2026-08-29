'use client'

import { Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Avatar } from '@/components/om/avatar'
import { CONTACT_CHANNELS } from '@/lib/leads/enums'
import { money } from '@/lib/format'
import type { Member } from '@/lib/db/schema'
import { ChoiceChips, Divider, FileTile, FloatingField, LinkButton, NotesArea, SectionRow, Dropzone } from './fields'
import type { ContactLog, WizardData } from './types'
import styles from './wizard.module.css'

const OUTCOMES = ['Callback requested', 'Meeting scheduled', 'No response']
const NEXT_STEP_BY_OUTCOME: Record<string, string> = { 'Callback requested': 'Schedule a call' }

export function NewPanel({
  team, data, update,
}: { team: Member[]; data: WizardData; update: (patch: Partial<WizardData>) => void }) {
  const toggle = (id: string) => {
    const set = new Set(data.assignees)
    if (set.has(id)) set.delete(id); else set.add(id)
    update({ assignees: Array.from(set) })
  }
  return (
    <>
      <p className={styles.panelTitle}>New</p>
      <div className={styles.stack12}>
        <SectionRow label="Assignees" />
        {team.map((m) => (
          <button key={m.id} type="button"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', width: '100%', background: 'none', border: 0, cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => toggle(m.id)}>
            <Avatar name={m.name} color={m.color} size={40} />
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ font: 'var(--om-type-body-m)', color: 'var(--om-color-on-surface-default)' }}>{m.name}</span>
              <span style={{ font: 'var(--om-type-body-s)', color: 'var(--om-color-on-surface-secondary)' }}>{m.isYou ? `${m.role} (you)` : m.role}</span>
            </span>
            <Checkbox isSelected={data.assignees.includes(m.id)} onChange={() => toggle(m.id)} aria-label={`Assign ${m.name}`} />
          </button>
        ))}
      </div>
    </>
  )
}

function LogCard({
  index, log, onChange, onAutoFill, collapsible,
}: {
  index: number; log: ContactLog
  onChange: (patch: Partial<ContactLog>) => void
  onAutoFill: () => void
  collapsible: boolean
}) {
  const collapsed = !!log.collapsed
  const nextStep = NEXT_STEP_BY_OUTCOME[log.outcome]
  return (
    <div className={styles.logCard} data-collapsed={collapsed || undefined}>
      <div className={styles.logHead}>
        <span className={styles.logTitle}>Log {index + 1}</span>
        {!collapsed ? (
          <button type="button" className={styles.autoFill} onClick={onAutoFill}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/figma-assets/sparkle.svg" alt="" />
            Auto Fill
          </button>
        ) : null}
        {collapsible ? (
          <button type="button" className={styles.logChevron}
                  aria-label={collapsed ? 'Expand log' : 'Collapse log'}
                  onClick={() => onChange({ collapsed: !collapsed })}>
            <Icon name={collapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'} size={24} />
          </button>
        ) : null}
      </div>
      {!collapsed ? (
        <div className={styles.logBody}>
          <ChoiceChips label="Contacted via" options={CONTACT_CHANNELS} value={log.channel}
                       onChange={(v) => onChange({ channel: v })} />
          <div className={styles.fieldPair}>
            <FloatingField label="Date & Time" value={log.when} placeholder="12/8/2026, 3:00PM"
                           onChange={(v) => onChange({ when: v })} trailingIcon="event" />
            <FloatingField label="Outcome" value={log.outcome} options={OUTCOMES}
                           onChange={(v) => onChange({ outcome: v })} />
          </div>
          {nextStep ? (
            <div className={styles.stack24}>
              <span className={styles.sectionLabel}>Next step: {nextStep}</span>
              <div className={styles.fieldPair}>
                <FloatingField label="Date & Time" value={log.nextStepWhen} placeholder="24/8/2026, 7:00PM"
                               onChange={(v) => onChange({ nextStepWhen: v })} trailingIcon="event" />
                <FloatingField label="Preferred mode" value={log.nextStepMode} options={[...CONTACT_CHANNELS]}
                               onChange={(v) => onChange({ nextStepMode: v })} />
              </div>
            </div>
          ) : null}
          <Divider />
          <div className={styles.stack12}>
            <SectionRow label="Attach screenshots of your call attempts"
                        action={<LinkButton icon="attach_file" onClick={() => onChange({ files: [...log.files, 'Q-101'] })}>Attach Files</LinkButton>} />
            {log.files.length ? (
              <div style={{ display: 'flex', gap: 12 }}>
                {log.files.map((f, i) => (
                  <FileTile key={`${f}-${i}`} name={f} image
                            onDelete={() => onChange({ files: log.files.filter((_, j) => j !== i) })} />
                ))}
              </div>
            ) : null}
          </div>
          <Divider />
          <div className={styles.stack12}>
            <span className={styles.sectionLabel}>Notes (optional)</span>
            <NotesArea value={log.notes} onChange={(v) => onChange({ notes: v })} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function ContactedPanel({
  data, update, onAutoFill,
}: { data: WizardData; update: (patch: Partial<WizardData>) => void; onAutoFill: () => void }) {
  const setLog = (i: number, patch: Partial<ContactLog>) =>
    update({ logs: data.logs.map((l, j) => (j === i ? { ...l, ...patch } : l)) })
  return (
    <>
      <div className={styles.stack12}>
        <SectionRow label="" action={undefined} />
      </div>
      {data.logs.map((log, i) => (
        <LogCard key={i} index={i} log={log} collapsible={data.logs.length > 1}
                 onChange={(p) => setLog(i, p)} onAutoFill={onAutoFill} />
      ))}
    </>
  )
}

export function MetPanel({ data, update }: { data: WizardData; update: (patch: Partial<WizardData>) => void }) {
  return (
    <div className={styles.logCard}>
      <div className={styles.logHead}>
        <span className={styles.logTitle}>Log 1</span>
      </div>
      <div className={styles.logBody}>
        <div className={styles.fieldPair}>
          <FloatingField label="Where" value={data.metWhere} options={['In person', 'Video call', 'Showroom']}
                         onChange={(v) => update({ metWhere: v })} />
          <FloatingField label="Date & Time" value={data.metWhen} placeholder="12/8/2026, 3:00PM"
                         onChange={(v) => update({ metWhen: v })} trailingIcon="event" />
        </div>
        <div className={styles.stack12}>
          <SectionRow label="Attach meeting documents"
                      action={<LinkButton icon="attach_file" onClick={() => update({ metFiles: [...data.metFiles, 'Q-101'] })}>Attach Files</LinkButton>} />
          {data.metFiles.length ? (
            <div style={{ display: 'flex', gap: 12 }}>
              {data.metFiles.map((f, i) => (
                <FileTile key={`${f}-${i}`} name={f}
                          onDelete={() => update({ metFiles: data.metFiles.filter((_, j) => j !== i) })} />
              ))}
            </div>
          ) : null}
        </div>
        <div className={styles.stack12}>
          <span className={styles.sectionLabel}>Notes (optional)</span>
          <NotesArea value={data.metNotes} onChange={(v) => update({ metNotes: v })} />
        </div>
      </div>
    </div>
  )
}

export function AttachTabs({
  tab, onTab, selected, onSelect, uploaded, onUpload, onRemoveUpload, quotes,
}: {
  tab: 'system' | 'upload'; onTab: (t: 'system' | 'upload') => void
  selected: string | null; onSelect: (name: string) => void
  uploaded: string | null; onUpload: () => void; onRemoveUpload: () => void
  quotes: { name: string; meta: string[] }[]
}) {
  return (
    <div className={styles.tabCard}>
      <div className={styles.tabBar} role="tablist">
        {(['system', 'upload'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={styles.tab} onClick={() => onTab(t)}>
            {t === 'system' ? 'From System' : 'Upload'}
            {tab === t ? <span className={styles.tabInk} /> : null}
          </button>
        ))}
      </div>
      <div className={styles.tabBody}>
        {tab === 'system' ? (
          quotes.map((q) => (
            <button key={q.name} type="button" className={styles.quoteRow}
                    data-selected={selected === q.name || undefined}
                    onClick={() => onSelect(q.name)}>
              <span className={styles.quoteRadio}>
                <Icon name={selected === q.name ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} weight={300} fill />
              </span>
              <span className={styles.quoteText}>
                <span className={styles.quoteName}>{q.name}</span>
                <span className={styles.quoteMeta}>
                  {q.meta.map((m, i) => <span key={i}>{i > 0 ? '· ' : ''}{m}</span>)}
                </span>
              </span>
              <LinkButton>View</LinkButton>
            </button>
          ))
        ) : uploaded ? (
          <div className={styles.fileRow}>
            <span style={{ color: 'var(--om-color-tertiary-red-default)', display: 'inline-flex' }}>
              <Icon name="picture_as_pdf" size={20} />
            </span>
            <span className={styles.quoteName} style={{ flex: 1, minWidth: 0 }}>{uploaded}</span>
            <button type="button" className={styles.logChevron} aria-label="Remove file" onClick={onRemoveUpload}>
              <Icon name="delete" size={24} weight={300} />
            </button>
          </div>
        ) : (
          <Dropzone title={<>Drop your file or <b>browse</b></>} helper="Supports: PDF" onPick={onUpload} />
        )}
      </div>
    </div>
  )
}

export function QuoteSentPanel({
  data, update, leadBudgetMinor,
}: { data: WizardData; update: (patch: Partial<WizardData>) => void; leadBudgetMinor: number }) {
  const quotes = [
    { name: 'Whole-home renovation', meta: ['OM-10001', `S$ ${money(leadBudgetMinor)}`, 'Approved on 19 Aug'] },
    { name: 'Whole-home renovation-v1', meta: ['OM-10001', `S$ ${money(leadBudgetMinor)}`, 'Approved on 19 Aug'] },
  ]
  return (
    <>
      <div className={styles.stack12}>
        <SectionRow label="Attach approved quote" />
        <AttachTabs
          tab={data.quoteTab} onTab={(t) => update({ quoteTab: t })}
          selected={data.quoteSelected} onSelect={(n) => update({ quoteSelected: n })}
          uploaded={data.quoteUploaded}
          onUpload={() => update({ quoteUploaded: 'Whole-home renovation.pdf' })}
          onRemoveUpload={() => update({ quoteUploaded: null })}
          quotes={quotes}
        />
      </div>
      {data.quoteTab === 'upload' && data.quoteUploaded ? (
        <FloatingField label="Quote amount (S$)" value={data.quoteAmount} placeholder="70,500"
                       onChange={(v) => update({ quoteAmount: v })} trailingIcon="" readOnly={false} />
      ) : null}
      <Divider />
      <SectionRow label="Attach meeting documents"
                  action={<LinkButton icon="attach_file">Attach Files</LinkButton>} />
      <Divider />
      <SectionRow label="Attach render (optional)"
                  action={<LinkButton icon="attach_file">Attach Files</LinkButton>} />
    </>
  )
}

export function WonPanel({
  data, update, leadBudgetMinor,
}: { data: WizardData; update: (patch: Partial<WizardData>) => void; leadBudgetMinor: number }) {
  const quotes = [{ name: 'Whole-home renovation', meta: ['OM-10001', `S$ ${money(leadBudgetMinor)}`, 'Signed on 19 Aug'] }]
  const contracts = [{ name: 'Contract_OliviaM_signed.pdf', meta: ['Signed on 19 Aug'] }]
  const totalPct = data.milestones.reduce((s, m) => s + (m.pct || 0), 0)
  const setPct = (i: number, pct: number) =>
    update({ milestones: data.milestones.map((m, j) => (j === i ? { ...m, pct } : m)) })
  return (
    <>
      <div className={styles.stack12}>
        <SectionRow label="Attach client signed quote" />
        <AttachTabs
          tab={data.wonQuoteTab} onTab={(t) => update({ wonQuoteTab: t })}
          selected={data.wonQuote} onSelect={(n) => update({ wonQuote: n })}
          uploaded={data.wonQuoteTab === 'upload' ? data.wonQuote : null}
          onUpload={() => update({ wonQuote: 'Whole-home renovation.pdf' })}
          onRemoveUpload={() => update({ wonQuote: null })}
          quotes={quotes}
        />
      </div>
      <div className={styles.stack12}>
        <SectionRow label="Attach client signed contract" />
        <AttachTabs
          tab={data.wonContractTab} onTab={(t) => update({ wonContractTab: t })}
          selected={data.wonContract} onSelect={(n) => update({ wonContract: n })}
          uploaded={data.wonContractTab === 'upload' ? data.wonContract : null}
          onUpload={() => update({ wonContract: 'Contract_OliviaM_signed.pdf' })}
          onRemoveUpload={() => update({ wonContract: null })}
          quotes={contracts}
        />
      </div>
      <div className={styles.stack12}>
        <div className={styles.rowBetween ?? ''} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
          <span className={styles.sectionLabel} style={{ flex: 1 }}>Payment milestone</span>
          <LinkButton onClick={() => update({ milestones: [
            { name: 'Deposit', meta: 'Upon signing', pct: 10 },
            { name: 'Commencement', meta: 'Works commence', pct: 30 },
            { name: 'Mid-Project', meta: '50% completion', pct: 30 },
            { name: 'Completion', meta: 'Handover', pct: 30 },
          ] })}>Reset to default</LinkButton>
          <span style={{
            background: 'var(--om-color-tertiary-green-variant2)',
            boxShadow: 'inset 0 0 0 1px var(--om-color-tertiary-green-variant1)',
            color: 'var(--om-color-on-tertiary-green-variant)',
            font: 'var(--om-type-caption-xs)', textTransform: 'uppercase',
            padding: '4px 8px', borderRadius: 4,
          }}>{totalPct}%</span>
        </div>
        <div className={styles.msCard}>
          {data.milestones.map((m, i) => {
            const amtMinor = Math.round((leadBudgetMinor * (m.pct || 0)) / 100)
            return (
              <div key={m.name} className={styles.msRow}>
                <span className={styles.msIndex}>{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={styles.msName}>{m.name}</span>
                  <span className={styles.msMeta}>{m.meta}</span>
                </span>
                <span className={styles.msPct}>
                  <input value={String(m.pct)} inputMode="numeric" aria-label={`${m.name} percentage`}
                         onChange={(e) => setPct(i, Math.max(0, Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0)))} />
                  <span>%</span>
                </span>
                <span className={styles.msAmt}>S${money(amtMinor)}</span>
              </div>
            )
          })}
          <div className={`${styles.msRow} ${styles.msTotal}`}>
            <span className={styles.msIndex} />
            <span style={{ flex: 1 }}>Total</span>
            <span className={styles.msAmt} style={{ width: 'auto' }}>S${money(leadBudgetMinor)}</span>
          </div>
        </div>
      </div>
      <FloatingField label="Project type" value={data.projectType}
                     options={['Whole-home renovation', 'Partial renovation', 'Commercial fit-out']}
                     onChange={(v) => update({ projectType: v })} />
    </>
  )
}
