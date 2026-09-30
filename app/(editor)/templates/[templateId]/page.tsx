import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchTemplateEditor, fetchQuoteDocData, fetchEditorOrigin } from '@/lib/templates/queries'
import { readFrom } from '@/lib/nav'
import type { EditorOrigin } from '@/lib/templates/origin'
import { TemplateEditor } from '@/components/templates/editor/template-editor'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ templateId: string }> }): Promise<Metadata> {
  const { templateId } = await params
  const data = await fetchTemplateEditor(templateId)
  return { title: data ? `${data.template.name} · Template` : 'Template' }
}

/** The quote template editor (REG-486): a full-page surface without the rail, like the quote editor beside it. */
export default async function TemplateEditorPage({ params, searchParams }: { params: Promise<{ templateId: string }>; searchParams: Promise<{ preview?: string; from?: string; quote?: string; lead?: string; tab?: string }> }) {
  const { templateId } = await params
  const sp = await searchParams
  const data = await fetchTemplateEditor(templateId)
  if (!data) notFound()
  /* (REG-495) Opened from a quote or a lead: the origin rides along so Back, Preview with and Publish know it. */
  let origin: EditorOrigin | null = null
  const from = readFrom(sp.from)
  if (typeof sp.quote === 'string') {
    const [q, docData] = await Promise.all([fetchEditorOrigin({ quoteId: sp.quote }), fetchQuoteDocData(sp.quote)])
    if (q.quote && docData) origin = { from, quote: { ...q.quote, data: docData } }
  } else if (typeof sp.lead === 'string') {
    const l = await fetchEditorOrigin({ leadId: sp.lead })
    if (l.lead) origin = { from, lead: l.lead }
  } else if (from) {
    /* (audit 2026-09-26, round 3) opened from Company › Templates (a folder, a search): Back returns there (REG-465) */
    origin = { from }
  }
  /* (UX audit S4) Settings › New quotes start with opens the template on its New quotes tab (`?tab=new-quotes`) */
  return <TemplateEditor data={data} initialPreview={sp.preview === '1'} origin={origin} initialTab={sp.tab === 'new-quotes' ? 'defaults' : undefined} />
}
