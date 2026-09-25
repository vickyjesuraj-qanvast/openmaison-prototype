import 'server-only'
import { fetchViewer } from '@/lib/leads/visibility'
import { templateChangeBlock, templateDefaultBlock } from './template-rules'

/* (REG-646, settings parity Q-07) The template rules on the server — a public action never takes the page's word for them. */
export async function assertMayChangeTemplate(createdBy: string | null | undefined): Promise<void> {
  const block = templateChangeBlock(await fetchViewer(), createdBy)
  if (block) throw new Error(block)
}
export async function assertMaySetDefault(): Promise<void> {
  const block = templateDefaultBlock(await fetchViewer())
  if (block) throw new Error(block)
}
/** The ids among `rows` the viewer may restore or delete forever; the rest are left and counted back. */
export async function changeableIds(rows: { id: string; createdBy: string | null }[]): Promise<string[]> {
  const viewer = await fetchViewer()
  return rows.filter((r) => templateChangeBlock(viewer, r.createdBy) === null).map((r) => r.id)
}
