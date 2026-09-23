'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { PageReveal } from '@/components/shell/page-reveal'
import { SettingsSkeleton } from '@/components/shell/skeleton'
import { PageHeader } from '@/components/shell/page-header'
import { ChoiceCard } from '@/components/om/choice-card'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Switch } from '@/components/ds'
import { Tooltip } from '@/components/om/tooltip'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { formatQuoteNumber, initialsOf, isDefaultNumbering, QUOTE_APPROVAL_OPTIONS, ROUND_STEP_OPTIONS, STAGE_MOVEMENT_OPTIONS, TEMPLATE_APPROVAL_OPTIONS, type Numbering, type QuoteApproval, type QuoteRules, type StageMovement, type TemplateApproval } from '@/lib/settings/types'
import { setNumbering, setQuoteApproval, setQuoteRules, setStageMovement, setTemplateApproval, setTrades } from './actions'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './settings.module.css'

/** Modules that will live under Account setup (user 2026-08-29). Leads and — since REG-561 — Quotes have settings in this build. */
const MODULES = [
  { key: 'leads', icon: 'people_alt', label: 'Leads' },
  { key: 'stages', icon: 'flag', label: 'Stages' },
  { key: 'quotes', icon: 'request_quote', label: 'Quotes' },
  { key: 'projects', icon: 'business_center', label: 'Projects' },
  { key: 'finance', icon: 'account_balance_wallet', label: 'Finance' },
]
type Live = 'leads' | 'quotes'

export function SettingsView({ stageMovement, quoteApproval, templateApproval, numbering, trades, tradesManaged, meName, section = 'leads', rules, team }: {
  stageMovement: StageMovement; quoteApproval: QuoteApproval; templateApproval: TemplateApproval
  /** (REG-561) Settings › Quotes: the number pattern and the trades list (`tradesManaged` false = the list is what the quotes use, not yet saved). */
  numbering: Numbering; trades: string[]; tradesManaged: boolean; meName: string
  /** (REG-584 · 589 · 590) The studio's quote rules and the members the backup approver is picked from. */
  rules: QuoteRules; team: { id: string; name: string; role: string }[]
  section?: Live
}) {
  const comingSoon = useComingSoon()
  const snackbar = useSnackbar()
  const [active, setActive] = useState<Live>(section)
  const [mode, setMode] = useState<StageMovement>(stageMovement)
  // The server value changed under us (another tab saved): follow it (render-phase adjust).
  const [seen, setSeen] = useState(stageMovement)
  if (seen !== stageMovement) { setSeen(stageMovement); setMode(stageMovement) }

  const [approval, setApproval] = useState<QuoteApproval>(quoteApproval)
  const [seenApproval, setSeenApproval] = useState(quoteApproval)
  if (seenApproval !== quoteApproval) { setSeenApproval(quoteApproval); setApproval(quoteApproval) }

  /* (REG-501) Template approval — the Quote approval pattern, applied to Company › Templates. */
  const [tApproval, setTApproval] = useState<TemplateApproval>(templateApproval)
  const [seenT, setSeenT] = useState(templateApproval)
  if (seenT !== templateApproval) { setSeenT(templateApproval); setTApproval(templateApproval) }
  const chooseTemplateApproval = async (next: TemplateApproval) => {
    if (next === tApproval) return
    const prev = tApproval
    setTApproval(next)
    try {
      await setTemplateApproval(next)
      snackbar({ message: `Template approval set to ${TEMPLATE_APPROVAL_OPTIONS.find((o) => o.key === next)?.title ?? next}` })
    } catch {
      setTApproval(prev)
      snackbar({ message: 'Couldn’t save the setting — please try again' })
    }
  }
  const chooseApproval = async (next: QuoteApproval) => {
    if (next === approval) return
    const prev = approval
    setApproval(next)   // optimistic, as Stage movement
    try {
      await setQuoteApproval(next)
      snackbar({ message: `Quote approval set to ${QUOTE_APPROVAL_OPTIONS.find((o) => o.key === next)?.title ?? next}` })
    } catch {
      setApproval(prev)
      snackbar({ message: 'Couldn’t save the setting — please try again' })
    }
  }

  const choose = async (next: StageMovement) => {
    if (next === mode) return
    const prev = mode
    setMode(next)   // optimistic — the cards answer at once, the studio setting follows
    try {
      await setStageMovement(next)
      snackbar({ message: `Stage movement set to ${STAGE_MOVEMENT_OPTIONS.find((o) => o.key === next)?.title ?? next}` })
    } catch {
      setMode(prev)
      snackbar({ message: 'Couldn’t save the setting — please try again' })
    }
  }

  /* (REG-561) Quote numbers: the pattern's parts edit in place with a live example; Save writes them. */
  const [num, setNum] = useState<Numbering>(numbering)
  const [savedNum, setSavedNum] = useState<Numbering>(numbering)
  const [numBusy, setNumBusy] = useState(false)
  const numDirty = JSON.stringify(num) !== JSON.stringify(savedNum)
  const example = isDefaultNumbering(num) ? 'OM-10012' : formatQuoteNumber(num, Math.max(1, num.next || 1), { initials: initialsOf(meName || 'Dane Tan'), date: new Date() })
  const exampleCom = num.commercial.on ? formatQuoteNumber(num, Math.max(1, num.commercial.next || 1), { initials: initialsOf(meName || 'Dane Tan'), date: new Date(), commercial: true }) : null   /* (REG-586) */
  /* (REG-584 · 589 · 590) The studio's rules write at once, each with its own word. */
  const [rulesState, setRulesState] = useState<QuoteRules>(rules)
  const writeRules = async (patch: Partial<QuoteRules>, done: string) => {
    const prev = rulesState
    setRulesState((r) => ({ ...r, ...patch }))
    try { const clean = await setQuoteRules(patch); setRulesState(clean); snackbar({ message: done }) }
    catch { setRulesState(prev); snackbar({ message: 'Couldn’t save the setting — please try again' }) }
  }
  const saveNumbering = async () => {
    setNumBusy(true)
    try { const clean = await setNumbering(num); setNum(clean); setSavedNum(clean); snackbar({ message: `Quote numbers will follow ${isDefaultNumbering(clean) ? 'the default pattern' : formatQuoteNumber(clean, Math.max(1, clean.next || 1), { initials: initialsOf(meName || 'Dane Tan'), date: new Date() })}` }) }
    catch { snackbar({ message: 'Couldn’t save the numbering — please try again' }) }
    finally { setNumBusy(false) }
  }

  /* (REG-561) Trades: a managed list — add one, remove one — written at once. */
  const [list, setList] = useState<string[]>(trades)
  const [managed, setManaged] = useState(tradesManaged)
  const [newTrade, setNewTrade] = useState('')
  const writeTrades = async (next: string[], done: string) => {
    const prev = list
    setList(next)
    try { const clean = await setTrades(next); setList(clean); setManaged(true); snackbar({ message: done }) }
    catch { setList(prev); snackbar({ message: 'Couldn’t save the trades — please try again' }) }
  }
  const addTrade = () => {
    const t = newTrade.trim()
    if (!t) return
    if (list.some((x) => x.toLowerCase() === t.toLowerCase())) { snackbar({ message: `${t} is already in the list` }); return }
    setNewTrade('')
    void writeTrades([...list, t], `${t} added to the trades`)
  }

  return (
    <PageReveal skeleton={<SettingsSkeleton />}>
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        <PageHeader title="Settings" />
        <div className={styles.content}>
          <nav className={styles.nav} aria-label="Settings sections">
            {MODULES.map((m) => {
              const live = m.key === 'leads' || m.key === 'quotes'
              return (
                <button key={m.key} type="button" className={styles.tab} data-active={m.key === active || undefined}
                        aria-current={m.key === active ? 'page' : undefined}
                        onClick={live ? () => setActive(m.key as Live) : comingSoon}>
                  <span className={styles.tabIcon}><Icon name={m.icon} size={20} weight={300} /></span>
                  <span>{m.label}</span>
                </button>
              )
            })}
          </nav>
          {active === 'leads' ? (
            <section className={styles.panel} aria-labelledby="settings-leads-title">
              <div className={styles.sectionHead}>
                <h2 id="settings-leads-title" className={styles.sectionTitle}>Leads</h2>
                <p className={styles.sectionHelp}>Applies to every lead in Demo Studio — the table, the kanban board and imports.</p>
              </div>
              <div className={styles.setting}>
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Stage movement</span>
                  <span className={styles.settingHelp}>How leads move from one stage to the next. On Hold and Lost always ask for a reason.</span>
                </div>
                <div className={styles.choices} role="radiogroup" aria-label="Stage movement">
                  {STAGE_MOVEMENT_OPTIONS.map((o) => (
                    <ChoiceCard key={o.key} title={o.title} help={o.help} selected={mode === o.key} onSelect={() => { void choose(o.key) }} />
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section className={styles.panel} aria-labelledby="settings-quotes-title" data-testid="settings-quotes">
              <div className={styles.sectionHead}>
                <h2 id="settings-quotes-title" className={styles.sectionTitle}>Quotes</h2>
                <p className={styles.sectionHelp}>Applies to every quote in Demo Studio — the editor, the lists, the templates and the client’s copy.</p>
              </div>
              {/* Quote approval (user 2026-08-30) and Template approval (REG-501) lived under Leads until this module was built (REG-561). */}
              <div className={styles.setting}>
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Quote approval</span>
                  <span className={styles.settingHelp}>Whether a quote is reviewed inside the studio before it goes to the client. This sets the stages a quote moves through.</span>
                </div>
                <div className={styles.choices} role="radiogroup" aria-label="Quote approval">
                  {QUOTE_APPROVAL_OPTIONS.map((o) => (
                    <ChoiceCard key={o.key} title={o.title} help={o.help} selected={approval === o.key} onSelect={() => { void chooseApproval(o.key) }} />
                  ))}
                </div>
              </div>
              <div className={styles.setting}>
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Template approval</span>
                  <span className={styles.settingHelp}>Whether a designer’s quote template needs an Owner’s or Admin’s approval before the studio can use it. Applies to Company › Templates.</span>
                </div>
                <div className={styles.choices} role="radiogroup" aria-label="Template approval">
                  {TEMPLATE_APPROVAL_OPTIONS.map((o) => (
                    <ChoiceCard key={o.key} title={o.title} help={o.help} selected={tApproval === o.key} onSelect={() => { void chooseTemplateApproval(o.key) }} />
                  ))}
                </div>
              </div>
              {/* (REG-561) Quote numbers — the testers' "our numbering convention": prefix · designer initials · year-month · running number. */}
              <div className={styles.setting} data-testid="numbering">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Quote numbers</span>
                  <span className={styles.settingHelp}>The pattern new quotes are numbered with. Quotes already numbered keep their numbers.</span>
                </div>
                <div className={styles.numGrid}>
                  <TextField label="Prefix" value={num.prefix} maxLength={8} onChange={(v) => setNum((n) => ({ ...n, prefix: v.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} helper="Letters and digits, up to 8" />
                  <TextField label="Next number" value={num.next ? String(num.next) : ''} numeric="digits" maxLength={6} onChange={(v) => setNum((n) => ({ ...n, next: v ? Number(v) : 0 }))} helper="Blank continues from the highest number given" />
                  <TextField label="Digits" value={num.digits ? String(num.digits) : ''} numeric="digits" maxLength={1} onChange={(v) => setNum((n) => ({ ...n, digits: v ? Math.min(6, Number(v)) : 0 }))} helper="Pads the number: 4 prints 0012" />
                  <label className={styles.switchRow}><Switch size="sm" isSelected={num.initials} onChange={(v: boolean) => setNum((n) => ({ ...n, initials: v }))} aria-label="Designer's initials" /><span>Designer’s initials <span className={styles.settingHelp}>· who creates the quote</span></span></label>
                  <label className={styles.switchRow}><Switch size="sm" isSelected={num.yearMonth} onChange={(v: boolean) => setNum((n) => ({ ...n, yearMonth: v }))} aria-label="Year and month" /><span>Year and month <span className={styles.settingHelp}>· YYYYMM</span></span></label>
                  {/* (REG-586) Commercial work on its own sequence — the lead's property type decides (Commercial — Office / Retail). */}
                  <label className={styles.switchRow}><Switch size="sm" isSelected={num.commercial.on} onChange={(v: boolean) => setNum((n) => ({ ...n, commercial: { ...n.commercial, on: v } }))} aria-label="A separate sequence for commercial work" /><span>Commercial work on its own sequence <span className={styles.settingHelp}>· offices and shops, by the lead’s property type</span></span></label>
                  {num.commercial.on ? <TextField label="Commercial prefix" value={num.commercial.prefix} maxLength={8} onChange={(v) => setNum((n) => ({ ...n, commercial: { ...n.commercial, prefix: v.toUpperCase().replace(/[^A-Z0-9]/g, '') } }))} helper="Letters and digits, up to 8" /> : null}
                  {num.commercial.on ? <TextField label="Commercial next number" value={num.commercial.next ? String(num.commercial.next) : ''} numeric="digits" maxLength={6} onChange={(v) => setNum((n) => ({ ...n, commercial: { ...n.commercial, next: v ? Number(v) : 0 } }))} helper="Blank continues from the highest given" /> : null}
                </div>
                <div className={styles.example}><span className={styles.settingHelp}>Next quote:</span> <span className={styles.exampleNo} data-testid="number-example">{example}</span>{exampleCom ? <><span className={styles.settingHelp}>· commercial:</span> <span className={styles.exampleNo} data-testid="number-example-commercial">{exampleCom}</span></> : null}</div>
                <div className={styles.settingActions}>
                  <Button variant="secondary" appearance="outlined" onPress={() => setNum(savedNum)} isDisabled={!numDirty || numBusy}>Discard</Button>
                  <Button onPress={() => { void saveNumbering() }} isDisabled={!numDirty || numBusy}>{numBusy ? 'Saving…' : 'Save numbering'}</Button>
                </div>
              </div>
              {/* (REG-561) Trades — the Category column's list and what templates group by; free text on a quote is kept as its own label. */}
              <div className={styles.setting} data-testid="trades">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Trades</span>
                  <span className={styles.settingHelp}>The trades the Category column offers on every quote and the templates group by. {managed ? '' : 'Not set yet — these are the trades your quotes already use.'}</span>
                </div>
                <ul className={styles.trades} aria-label="Trades">
                  {list.map((t) => (
                    <li key={t} className={styles.trade}>
                      <span>{t}</span>
                      <Tooltip label={`Remove ${t}`}><IconButton icon="close" label={`Remove ${t}`} size={24} variant="bare" iconSize={16} onClick={() => { void writeTrades(list.filter((x) => x !== t), `${t} removed — quotes already using it keep the label`) }} /></Tooltip>
                    </li>
                  ))}
                  {list.length === 0 ? <li className={styles.settingHelp}>No trades yet.</li> : null}
                </ul>
                <div className={styles.addTrade}>
                  <TextField label="Add a trade" value={newTrade} onChange={setNewTrade} maxLength={60} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTrade() } }} />
                  <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={addTrade} isDisabled={!newTrade.trim()}>Add</Button>
                </div>
              </div>
              {/* (REG-584) Selling prices rounded as they are entered — Cloud Creation's "multiples of 5". */}
              <div className={styles.setting} data-testid="rounding">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Selling prices</span>
                  <span className={styles.settingHelp}>Round every selling price to a step as it is typed or added from My Items. The cost never moves; the markup takes the difference. Round Prices on a quote still rounds the whole quote at once.</span>
                </div>
                <div className={styles.numGrid}>
                  <TextField label="Round selling prices to" mode="select" value={ROUND_STEP_OPTIONS.find((o) => o.key === rulesState.roundStep)?.label ?? 'Not rounded'} options={ROUND_STEP_OPTIONS.map((o) => o.label)}
                             onChange={(v) => { const o = ROUND_STEP_OPTIONS.find((x) => x.label === v); if (o) void writeRules({ roundStep: o.key }, o.key ? `Selling prices round to ${o.label.toLowerCase()}` : 'Selling prices are not rounded') }} />
                </div>
              </div>
              {/* (REG-589) The payment schedule kept to Owners and Admins — Mavid's "the owner fixes it; IDs cannot change it". */}
              <div className={styles.setting} data-testid="payment-lock">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Payment schedule</span>
                  <span className={styles.settingHelp}>Who may change a quote’s payment schedule. Locked, designers see the milestones but cannot edit, reorder, add or replace them.</span>
                </div>
                <label className={styles.switchRow}><Switch size="sm" isSelected={rulesState.paymentLock} onChange={(v: boolean) => { void writeRules({ paymentLock: v }, v ? 'Only Owners and Admins change the payment schedule now' : 'Every member can change the payment schedule') }} aria-label="Only Owners and Admins can change the payment schedule" /><span>Only Owners and Admins can change it</span></label>
              </div>
              {/* (REG-590) A backup approver beside the Owners and Admins — H Design's ask. */}
              <div className={styles.setting} data-testid="backup-approver">
                <div className={styles.settingHead}>
                  <span className={styles.settingTitle}>Backup approver</span>
                  <span className={styles.settingHelp}>A member who may approve quotes and publish templates when an Owner or Admin is away. Owners and Admins always can.</span>
                </div>
                <div className={styles.numGrid}>
                  <TextField label="Backup approver" mode="select" value={team.find((m) => m.id === rulesState.backupApproverId)?.name ?? 'None'} options={['None', ...team.filter((m) => m.role !== 'Owner' && m.role !== 'Admin').map((m) => m.name)]}
                             onChange={(v) => { const m = team.find((x) => x.name === v) ?? null; void writeRules({ backupApproverId: m?.id ?? null }, m ? `${m.name} can approve as the backup` : 'No backup approver') }} />
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </PageReveal>
  )
}
