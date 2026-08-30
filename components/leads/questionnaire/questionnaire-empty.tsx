'use client'

import { Button } from '@/components/ds'
import styles from './questionnaire-empty.module.css'

/**
 * Lead Details › Questionnaire — empty state (frame 201, 931:46770 / card 931:46792; spec design-source/context/
 * lead-questionnaire/01-listing-empty-dialog.txt "Empty state"): 1244×784 card, centred undraw_question-answered
 * (931:46794, 180×154 — the overview card's /figma-assets/empty-questionnaire.svg, 140×120 viewBox, at 180 wide),
 * texts 931:46835, "Add Question" primary filled (931:46839).
 * Copied from components/leads/contracts/contracts-empty.tsx with the questionnaire's copy and one button.
 */
export function QuestionnaireEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className={styles.card} data-testid="questionnaire-empty">
      <div className={styles.inner}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/figma-assets/empty-questionnaire.svg" width={180} height={154} alt="" className={styles.art} />
        <div className={styles.texts}>
          <p className={styles.title}>Create your first question</p>
          <p className={styles.body}>Create and share your questions to clarify the client’s scope.</p>
        </div>
        <div className={styles.buttons}>
          <Button onPress={onAdd}>Add Question</Button>
        </div>
      </div>
    </div>
  )
}
