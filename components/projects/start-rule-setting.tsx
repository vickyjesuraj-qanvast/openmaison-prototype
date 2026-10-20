'use client'

import { useState } from 'react'
import { ChoiceCard } from '@/components/om/choice-card'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { setProjectStart } from '@/app/projects/ending-actions'
import { PROJECT_START_WORDS as W, type ProjectStartsWhen } from '@/lib/projects/start-rule'
import st from '@/app/settings/settings.module.css'

/**
 * (S44R — UAT row 358, call C7, as recommended — his UAT ask 2026-10-15) Settings › Projects › *When a project starts* — the house card with
 * the two answers as choice cards, each saying what it does (the Lead stages card's "How leads move" pattern): The quote is signed (today's, the
 * default) · The agreement is signed. Saved as it is pressed, with Undo (the portal's section switches' way, REG-1014); a refusal puts it back
 * and says why. Owners and Admins change it; anyone else is told the rule. (invented copy — lib/projects/start-rule.ts)
 */
export function StartRuleSetting({ startsWhen, canManage }: { startsWhen: ProjectStartsWhen; canManage: boolean }) {
  const snackbar = useSnackbar()
  const [value, setValue] = useState<ProjectStartsWhen>(startsWhen)
  const [seen, setSeen] = useState(startsWhen)
  if (seen !== startsWhen) { setSeen(startsWhen); setValue(startsWhen) }
  const [busy, setBusy] = useState(false)
  const pick = async (next: ProjectStartsWhen, undo = false) => {
    if (busy || next === value) return
    if (!canManage) { snackbar({ message: 'Only Owners and Admins change the project settings' }); return }
    const was = value
    setValue(next); setBusy(true)
    try {
      const r = await setProjectStart({ startsWhen: next })
      if ('error' in r) { setValue(was); snackbar({ message: couldnt('change when a project starts', refusalOf(r.error)) }); return }
      if (!undo) snackbar({ key: 'project-start', message: W.saved(r.startsWhen), actionLabel: 'Undo', onAction: () => { void pick(was, true) } })
    } catch (e) { setValue(was); snackbar({ message: couldnt('change when a project starts', refusalOf(e)) }) }
    finally { setBusy(false) }
  }
  return (
    <div className={st.setting} id="project-start" data-testid="project-start-setting">
      <div className={st.settingHead}>
        <span className={st.settingTitle}>{W.title}</span>
        <span className={st.settingHelp}>{W.help}</span>
      </div>
      <div className={st.reasonGroup}>
        <span className={st.reasonLabel} id="project-start-label">{W.label}</span>
        <div className={st.choices} role="radiogroup" aria-labelledby="project-start-label" data-testid="project-start">
          {W.options.map((o) => <ChoiceCard key={o.value} title={o.label} help={o.help} selected={value === o.value} onSelect={() => { void pick(o.value) }} />)}
        </div>
      </div>
    </div>
  )
}
