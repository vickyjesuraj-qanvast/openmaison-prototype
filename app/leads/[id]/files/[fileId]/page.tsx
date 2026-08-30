import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchFileView } from '@/lib/leads/files'
import { FileViewer } from '@/components/leads/files/file-viewer'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string; fileId: string }> }): Promise<Metadata> {
  const { id, fileId } = await params
  const data = await fetchFileView(id, fileId)
  return { title: data ? `${data.file.name} · ${data.lead.name}` : 'File' }
}

/**
 * Lead Details › Files › file viewer (931:39831 frames 92–95): a full page — the L2 header carries the file name, the lead
 * frame (tabs, info column) is gone. A missing, trashed or folder id is a 404 (`fetchFileView` returns null for all three).
 * Spec: design-source/context/lead-files/03-viewer-panels.txt.
 */
export default async function FileViewPage({ params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await params
  const data = await fetchFileView(id, fileId)
  if (!data) notFound()
  return <FileViewer data={data} />
}
