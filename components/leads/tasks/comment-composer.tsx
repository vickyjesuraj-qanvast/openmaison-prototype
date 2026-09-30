'use client'

import { useState } from 'react'
import { Button, TextArea } from '@/components/ds'
import type { Member } from '@/lib/db/schema'
import { CommentAvatar } from './comments-panel'
import styles from './comments-panel.module.css'

/**
 * (UX audit 2026-09-30, T8) One comment composer for a task's comments and a file's: my avatar · a multi-line field ("Chat with your team
 * here") · "Clients can’t see these comments" · Submit. Enter posts, Shift+Enter starts a new line; an empty box posts nothing. The file
 * viewer's composer was a one-line field with no Submit (931:39946); it now takes the task panel's (902:28619 frame 73), made multi-line.
 */
export function CommentComposer({ me, onSubmit }: { me: Member; onSubmit: (body: string) => void }) {
  const [draft, setDraft] = useState('')
  const submit = () => {
    const body = draft.trim()
    if (!body) return
    onSubmit(body)
    setDraft('')
  }
  return (
    <div className={styles.composer}>
      <CommentAvatar member={me} />
      <div className={styles.composerCol}>
        <TextArea label="Chat with your team here" value={draft} onChange={setDraft} className={styles.composerField}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() } }} />
        <div className={styles.composerRow}>
          <span className={styles.privacy}>Clients can’t see these comments</span>
          <Button onPress={submit}>Submit</Button>
        </div>
      </div>
    </div>
  )
}
