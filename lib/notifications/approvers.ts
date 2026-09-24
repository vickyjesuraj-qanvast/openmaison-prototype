import 'server-only'
import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { fetchQuoteRules } from '@/lib/settings/queries'

/** (REG-604) Who approves quotes: Owners and Admins, plus the backup approver (REG-590). */
export async function approverIds(): Promise<string[]> {
  const [rows, rules] = await Promise.all([db.select({ id: members.id }).from(members).where(inArray(members.role, ['Owner', 'Admin'])), fetchQuoteRules()])
  return [...new Set([...rows.map((r) => r.id), ...(rules.backupApproverId ? [rules.backupApproverId] : [])])]
}
