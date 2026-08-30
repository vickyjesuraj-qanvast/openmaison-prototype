import { createClient } from '@libsql/client'
import { randomUUID } from 'node:crypto'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'

/**
 * Lead Details › Questionnaire (931:46769) — Olivia's 11 questions (7 answered by the studio, 4 open), matching the
 * overview card's 7 / 11. Idempotent (skips when she already has questions). The mock names "Do you have pets?" and
 * "Alternative phone number"; the other question texts and the studio's answers are invented demo copy (REG-188).
 */
const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })
const sec = (iso: string) => Math.floor(new Date(iso).getTime() / 1000)
const r = await client.execute({ sql: 'SELECT id FROM leads WHERE name = ? AND deleted_at IS NULL', args: ['Olivia Martinez'] })
const olivia = String(r.rows[0]?.id ?? '')
if (!olivia) throw new Error('lead not found: Olivia Martinez')
const n = Number((await client.execute({ sql: 'SELECT count(*) AS n FROM questions WHERE lead_id = ?', args: [olivia] })).rows[0]?.n ?? 0)
if (n > 0) { console.log('seed-questions: already seeded'); client.close(); process.exit(0) }
const created = sec('2026-08-26T09:00:00+05:30')
const answered = sec('2026-08-28T09:00:00+05:30')   // "1d ago" on the demo day after
type Q = { text: string; type: string; options?: string[]; answer?: string }
const QS: Q[] = [
  { text: 'Do you have pets?', type: 'text' },
  { text: 'Alternative phone number', type: 'number', answer: '81234567' },
  { text: 'What is your move-in date?', type: 'date', answer: '15/11/2026' },
  { text: 'Are the keys collected?', type: 'single', options: ['Yes', 'No'], answer: 'Yes' },
  { text: 'Which rooms are in scope?', type: 'multi', options: ['Living room', 'Kitchen', 'Master bedroom', 'Bathrooms'], answer: JSON.stringify(['Living room', 'Kitchen', 'Master bedroom']) },
  { text: 'Preferred interior style', type: 'text', answer: 'Contemporary with warm wood tones' },
  { text: 'Total renovation budget (S$)', type: 'number', answer: '70500' },
  { text: 'Is the flat currently occupied?', type: 'single', options: ['Yes', 'No'], answer: 'No' },
  { text: 'Any structural changes planned?', type: 'text' },
  { text: 'Which appliances are you keeping?', type: 'multi', options: ['Fridge', 'Hob & hood', 'Washer', 'Oven'] },
  { text: 'Best time to reach you', type: 'text' },
]
let i = 0
for (const q of QS) {
  await client.execute({
    sql: 'INSERT INTO questions (id, lead_id, text, type, options, answer, answered_by, answered_at, sort_order, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    args: [randomUUID(), olivia, q.text, q.type, q.options ? JSON.stringify(q.options) : null, q.answer ?? null, q.answer ? 'studio' : null, q.answer ? answered : null, i, created + i * 60],
  })
  i++
}
console.log(`seed-questions: ${QS.length} questions (${QS.filter((q) => q.answer).length} answered)`)
client.close()
