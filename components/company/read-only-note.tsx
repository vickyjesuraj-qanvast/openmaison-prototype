import { Icon } from '@/components/om/icon'
import styles from './read-only-note.module.css'

/** (REG-646, settings parity Q-08) The one read-only line — Settings' modules and the Company pages a member may only read say it alike. */
export function ReadOnlyNote({ text = 'Only Owners and Admins change these.' }: { text?: string }) {
  return <p className={styles.note} data-testid="read-only-line"><Icon name="lock" size={16} weight={300} />{text}</p>
}
