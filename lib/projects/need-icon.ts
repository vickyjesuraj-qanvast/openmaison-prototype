/** Each Needs you kind's glyph — LEAD STAGES' 20px icon. (pending modules S22) The Dashboard's rows draw the same one; (the Dashboard
    redesigned, 2026-10-26) moved here from components/projects/overview/needs-card.tsx so the server can read it (a server file never calls
    a function from a 'use client' module). */
const ICON: Record<string, string> = {
  hold: 'pending', start: 'event', handover: 'home', 'review-handover': 'approval', 'review-update': 'article', 'approve-done': 'check_circle',
  'approve-more-time': 'schedule', 'share-ask': 'share', message: 'chat', ticket: 'error', mark: 'layers', concern: 'flag', 'choice-declined': 'undo',
  'milestone-done': 'flag', 'milestone-start': 'event', 'milestone-waiting': 'hourglass_top', 'target-passed': 'flag', share: 'share', 'week-update': 'photo_camera',
}
export const needIcon = (kind: string, tab: string) => ICON[kind] ?? (kind.startsWith('setup-') ? 'radio_button_unchecked' : kind.startsWith('cost-') ? 'receipt_long' : tab === 'money' ? 'payments' : 'radio_button_unchecked')
