'use client'

import { Button } from '@/components/ds'
import { HelpLink } from '@/components/company/help-link'
import styles from './questionnaire-empty.module.css'

/**
 * Lead Details › Questionnaire — empty state (frame 201, 931:46770 / card 931:46792; spec design-source/context/
 * lead-questionnaire/01-listing-empty-dialog.txt "Empty state"): 1244×784 card, centred undraw_question-answered
 * (931:46794, 180×154 — the overview card's /figma-assets/empty-questionnaire.svg, 140×120 viewBox, at 180 wide).
 * The mock's "Add Question" button (931:46839) and copy are replaced (REG-246, user 2026-09-01): questions come
 * from studio-level setup by admins/owners (a Company tab later), so this lead-side state only explains that.
 * Copied from components/leads/contracts/contracts-empty.tsx with the questionnaire's copy.
 * (the calm UI build 2026-10-27 — 3-33 · 2-23 · W-627 · W-330) Plain words — "Your studio has 11 questions ready" (never "the question bank"),
 * the way in an OUTLINED "Add them" (the record page's one filled button is its header's), and with no questions set up, where they are set
 * up: a link to Company › Questionnaire for whoever may set them up (`setUpHref`), the same words unlinked for everyone else.
 */
export function QuestionnaireEmpty({ bankCount = 0, onAddBank, noun = 'lead', setUpHref = null }: { /** (REG-612) the studio's enabled questions this lead could take */ bankCount?: number; onAddBank?: () => void
  /** (parity P-12) the record the host carries the tab on — a project's page says "this project" */ noun?: 'lead' | 'project'
  /** Company › Questionnaire, for an Owner or an Admin */ setUpHref?: string | null }) {
  return (
    <div className={styles.card} data-testid="questionnaire-empty">
      <div className={styles.inner}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/figma-assets/empty-questionnaire.svg" width={180} height={154} alt="" className={styles.art} />
        <div className={styles.texts}>
          <p className={styles.title}>No questions yet</p>
          <p className={styles.body}>
            {bankCount > 0
              ? `Your studio has ${bankCount} question${bankCount === 1 ? '' : 's'} ready for this ${noun}.`
              : setUpHref
                ? <>Set them up in <HelpLink href={setUpHref} testId="questionnaire-set-up">Company › Questionnaire</HelpLink>.</>
                : 'Your studio sets them up in Company › Questionnaire.'}
          </p>
        </div>
        {bankCount > 0 && onAddBank ? <Button variant="primary" appearance="outlined" onPress={onAddBank}>Add them</Button> : null}   {/* (REG-612, parity Q-21) */}
      </div>
    </div>
  )
}
