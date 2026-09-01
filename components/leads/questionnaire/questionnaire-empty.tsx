'use client'

import styles from './questionnaire-empty.module.css'

/**
 * Lead Details › Questionnaire — empty state (frame 201, 931:46770 / card 931:46792; spec design-source/context/
 * lead-questionnaire/01-listing-empty-dialog.txt "Empty state"): 1244×784 card, centred undraw_question-answered
 * (931:46794, 180×154 — the overview card's /figma-assets/empty-questionnaire.svg, 140×120 viewBox, at 180 wide).
 * The mock's "Add Question" button (931:46839) and copy are replaced (REG-246, user 2026-09-01): questions come
 * from studio-level setup by admins/owners (a Company tab later), so this lead-side state only explains that.
 * Copied from components/leads/contracts/contracts-empty.tsx with the questionnaire's copy.
 */
export function QuestionnaireEmpty() {
  return (
    <div className={styles.card} data-testid="questionnaire-empty">
      <div className={styles.inner}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/figma-assets/empty-questionnaire.svg" width={180} height={154} alt="" className={styles.art} />
        <div className={styles.texts}>
          <p className={styles.title}>No questions yet</p>
          <p className={styles.body}>Questions are set up by your studio’s admins and will appear here.</p>
        </div>
      </div>
    </div>
  )
}
