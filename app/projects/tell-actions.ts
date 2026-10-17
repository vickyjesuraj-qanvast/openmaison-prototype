'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, projects } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { clientTellFacts } from '@/lib/projects/schedule-moments'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/**
 * (simplify P2 §6.8 · Q-12, the owner's "build everything" 2026-10-09) What the project page's "Tell {client}" needs to draft its WhatsApp
 * (lib/projects/tell-client.ts, contract D): the client's name and number, the studio's name as the portal wears it, and their page while they
 * can open it (invited, not withdrawn, the portal live). Read only — nothing is sent: WhatsApp opens on the studio's own press (REG-534). Who
 * reads it: whoever sees the project (its lead's rule). A refusal answers `{ error }`.
 */
export type ClientTell = { client: string; phone: string; studio: string; path: string | null }

export async function readClientTell(projectId: string): Promise<ClientTell | { error: string }> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const id = typeof projectId === 'string' ? projectId : ''
  const [row] = await db.select({ leadId: projects.leadId }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projects.id, id), isNull(projects.deletedAt), isNull(leads.deletedAt))).limit(1)
  if (!row) return { error: 'This project is not there any more' }
  if (!(await canOpenLead(await fetchViewer(), row.leadId))) return { error: 'This project is not there any more' }
  const f = await clientTellFacts(row.leadId)
  if (!f || !f.phone) return { error: 'There’s no number to send it to' }
  return { client: f.name, phone: f.phone, studio: f.studio, path: f.live && !f.paused ? f.path : null }
}
