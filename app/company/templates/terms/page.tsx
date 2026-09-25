import type { Metadata } from 'next'
import { fetchTextTemplatesData } from '@/lib/company/text-templates'
import { TextTemplatesGallery } from '@/components/company/templates/text-templates-gallery'
import { readFrom } from '@/lib/nav'
import { fetchFolders } from '@/lib/company/folders'

export const metadata: Metadata = { title: 'Terms and Notes templates' }
export const dynamic = 'force-dynamic'

/** Company › Templates › T&Cs & Notes (REG-538): the text library behind the quote editor's My Templates. */
export default async function TextTemplatesPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [data, sp, folders] = await Promise.all([fetchTextTemplatesData(), searchParams, fetchFolders('texts')])
  return <TextTemplatesGallery data={data} from={readFrom(sp.from)} folders={folders} />
}
