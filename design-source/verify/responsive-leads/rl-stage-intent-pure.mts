// (REG-2655, the Leads audit's B-01) The owner gate on every forward stage move, pure. Run: npx tsx design-source/verify/responsive-leads/rl-stage-intent-pure.mts
import { stageIntent } from '../../../lib/leads/stage-policy'

let pass = 0, fail = 0
const ok = (c: boolean, what: string) => { if (c) { pass++; console.log(`  ✓ ${what}`) } else { fail++; console.log(`  ✗ ${what}`) } }
const owner = [{ id: 'm1', name: 'Dane', role: 'Owner' }] as never[]
const lead = (stage: string, assignees: never[] = []) => ({ stage, resumeStage: null, assignees, project: null }) as never

ok(stageIntent(lead('New'), 'Contacted', 'linear').kind === 'blocked', 'Linear: an unowned New lead cannot open the Contacted step (B-01)')
ok((stageIntent(lead('New'), 'Contacted', 'linear') as { message?: string }).message === 'Assign a member first', '…and says the rule the stage menu says')
ok(stageIntent(lead('New'), 'Met', 'flexible').kind === 'blocked', 'Flexible: an unowned New lead cannot quick-move to Met')
ok(stageIntent(lead('New'), 'Won', 'flexible').kind === 'blocked', 'Flexible: …nor open Won')
ok(stageIntent(lead('New', owner), 'Contacted', 'linear').kind === 'wizard', 'an owned New lead opens the Contacted step as before')
ok(stageIntent(lead('New', owner), 'Met', 'flexible').kind === 'quick', 'an owned New lead quick-moves in Flexible as before')
ok(stageIntent(lead('New'), 'On Hold', 'linear').kind === 'hold' && stageIntent(lead('New'), 'Lost', 'linear').kind === 'lost', 'On Hold and Lost still open their dialogs for an unowned lead')
ok(stageIntent(lead('New'), 'New', 'linear').kind === 'none', 'the stage it is in is no move')
console.log(`${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
