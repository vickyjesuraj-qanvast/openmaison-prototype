// Leads on the move, L2 — the pure rules: what a Log press logs and whether its save carries the lead on (P-03: a New lead's first contact moves
// it to Contacted through the move's own path and REG-130's owner rule; a site visit on a Contacted lead is the Met step), the sheet's words,
// and Q-02 (a contact log's screenshot is optional at every width — validateStage).
// Run: npx tsx design-source/verify/responsive-leads/rl-l2-pure.mts  (verify-rl-l2.cjs counts its ✓ / ✗ lines)
import { chipOfChannel, contactChannelOf, defaultMode, followUpTitle, logPlan, logTitle, nextLabel, savedWords, type PlanFacts } from '../../../components/leads/log/log-plan'
import { emptyWizardData, validateStage, type WizardData } from '../../../lib/leads/stage-data'

let pass = 0, fail = 0
const ok = (c: boolean, name: string) => { if (c) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const base: PlanFacts = { name: 'Farah Ahmad', stage: 'New', resumeStage: null, assignees: [{ id: 'm1' }], project: null, stageMovement: 'linear', role: 'Owner', canAssign: true, assignHint: null, assignTo: null }
const f = (o: Partial<PlanFacts>): PlanFacts => ({ ...base, ...o })

// ── what a press logs, and where the save takes the lead ──
const newCall = logPlan('Call', f({}))
ok(newCall.kind === 'contact' && newCall.moveTo === 'Contacted' && newCall.save === 'Save log' && newCall.line === 'Saving moves Farah to Contacted.', 'New, owned: a call logs AND moves to Contacted — "Save log", the line says so')
ok(logPlan('WhatsApp', f({})).moveTo === 'Contacted' && logPlan('Visit', f({})).moveTo === 'Contacted' && logPlan('Visit', f({})).kind === 'contact', 'New, owned: a WhatsApp chat and a visit are first contacts too (a contact log, not Met)')
const unowned = logPlan('Call', f({ assignees: [] }))
ok(unowned.ownerRow && unowned.moveTo === null && /stays in New until someone owns the lead/.test(unowned.line ?? ''), 'New, nobody owns it (REG-130): the owner row shows, no pick = the log alone, the line says why it stays')
const picked = logPlan('Call', f({ assignees: [], assignTo: { id: 'm2', name: 'Sarah Lim' } }))
ok(picked.ownerRow && picked.moveTo === 'Contacted' && picked.line === 'Saving puts Sarah on Farah and moves Farah to Contacted.', 'New, nobody owns it, Sarah picked: the save assigns her and moves the lead')
const designer = logPlan('Call', f({ assignees: [], canAssign: false, assignHint: 'Designers keep the leads assigned to them. Ask your manager to reassign.' }))
ok(!designer.ownerRow && designer.moveTo === null && /^Farah stays in New until someone owns the lead — designers keep the leads/.test(designer.line ?? ''), `New, nobody owns it, a Designer: no owner row, the log alone, the hint said ("${designer.line}")`)
const visitMet = logPlan('Visit', f({ stage: 'Contacted' }))
ok(visitMet.kind === 'meeting' && visitMet.moveTo === 'Met' && visitMet.save === 'Save & move to Met' && visitMet.line === null, 'Contacted: a site visit is the Met step — "Save & move to Met"')
ok(logPlan('Call', f({ stage: 'Contacted' })).moveTo === null && logPlan('Call', f({ stage: 'Contacted' })).save === 'Save log', 'Contacted: a call is a log alone')
ok(logPlan('Visit', f({ stage: 'Met' })).kind === 'contact' && logPlan('Visit', f({ stage: 'Met' })).moveTo === null, 'Met: a visit is a contact log (In person), no move')
ok(logPlan('Visit', f({ stage: 'Contacted', role: 'Marketing' })).moveTo === 'Met', 'Contacted, Marketing: Met is theirs to move to (only Quote Sent and Won are not)')
ok(logPlan('Visit', f({ stage: 'Contacted', stageMovement: 'flexible' })).moveTo === 'Met', 'Flexible: the visit still moves to Met through the step\'s own path')
const note = logPlan('Note', f({}))
ok(note.kind === 'note' && note.moveTo === null && note.save === 'Save note', 'Note: a note, never a move — "Save note"')
ok(logPlan('Call', f({ stage: 'On Hold', resumeStage: 'Contacted' })).moveTo === null && logPlan('Call', f({ stage: 'Lost', resumeStage: 'New' })).moveTo === null, 'On Hold / Lost: a log never resumes the lead (Resume is its own confirm)')
ok(logPlan('Call', f({ stage: 'Won', project: { number: 'P-2026-001' } })).moveTo === null, 'Won: a log alone')

// ── the words ──
ok(logTitle('Call', 'Farah Ahmad') === 'How did the call with Farah go?' && logTitle('WhatsApp', 'Farah Ahmad') === 'How did the WhatsApp chat with Farah go?' && logTitle('Note', 'Farah Ahmad') === 'A note on Farah', 'the title asks the drawn screen\'s question')
ok(nextLabel('Callback requested') === 'Call back' && nextLabel('Meeting scheduled') === 'Meeting on' && nextLabel('No response') === 'Try again' && nextLabel('Not interested') === null, 'the call-back row is named by the outcome; none after "Not interested"')
ok(defaultMode('Meeting scheduled', 'Call') === 'In person' && defaultMode('Callback requested', 'WhatsApp') === 'WhatsApp' && defaultMode('No response', 'Visit') === 'In person', 'the follow-up\'s way: a meeting in person, else how this contact went')
ok(followUpTitle('Callback requested', 'Call', 'Farah Ahmad') === 'Call Farah back' && followUpTitle('Callback requested', 'WhatsApp', 'Farah Ahmad') === 'WhatsApp Farah back' && followUpTitle('Meeting scheduled', 'In person', 'Farah Ahmad') === 'Meet Farah'
   && followUpTitle('No response', 'Call', 'Farah Ahmad') === 'Try Farah again' && followUpTitle('Connected', 'Email', 'Farah Ahmad') === 'Follow up with Farah on Email', 'the call-back\'s task names the person and the act — its day is the due\'s own')
ok(contactChannelOf('Visit') === 'In person' && contactChannelOf('Note') === null && chipOfChannel('In person') === 'Visit' && chipOfChannel('Email') === 'Email', 'a visit is the "In person" contact channel, both ways')
const words = savedWords({ channel: 'Call', kind: 'contact', name: 'Farah Ahmad', moved: 'Contacted', reminder: { label: 'Call back', when: 'tomorrow · 10:00 AM' }, planned: null })
ok(words === 'Call logged — Farah is in Contacted. Call back tomorrow · 10:00 AM is in Tasks.', `the snackbar: what was kept, where the lead is, the call-back ("${words}")`)
ok(savedWords({ channel: 'Visit', kind: 'meeting', name: 'Farah Ahmad', moved: 'Met', reminder: null, planned: null }) === 'Visit logged — Farah is in Met.' && savedWords({ channel: 'Note', kind: 'note', name: 'Farah', moved: null, reminder: null, planned: null }) === 'Note saved.', 'the snackbar for a visit and a note')   // (the calm UI build 2026-10-27, a deliberate change — 2-08: one word for the visit, the chip's)

// ── Q-02: a contact log's screenshot is optional (validateStage) ──
const d: WizardData = { ...emptyWizardData(['m1']), logs: [{ channel: 'Call', when: '23/10/2026, 4:12 PM', outcome: 'Connected', nextStepWhen: '', nextStepMode: '', files: [], notes: '' }] }
ok(Object.keys(validateStage('Contacted', d)).length === 0, 'Q-02: a call with no screenshot passes the Contacted step')
ok(!!validateStage('Contacted', { ...d, logs: [{ ...d.logs[0]!, outcome: '' }] })['logs.0.outcome'], 'the outcome is still asked for')
ok(!!validateStage('Contacted', { ...d, logs: [{ ...d.logs[0]!, when: '' }] })['logs.0.when'], 'the moment is still asked for')

console.log(`rl-l2 pure: ${pass} passed, ${fail} failed`)
if (fail) process.exitCode = 1
