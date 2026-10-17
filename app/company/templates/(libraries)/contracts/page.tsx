import type { Metadata } from 'next'
import { fetchContractTemplates } from '@/lib/contracts/queries'
import { fetchBrand } from '@/lib/templates/queries'
import { longDate } from '@/lib/contracts/model'
import type { TokenValues } from '@/lib/contracts/tokens'
import { ContractTemplatesGallery } from '@/components/company/templates/contract-templates-gallery'
import { readFrom } from '@/lib/nav'
import { fetchFolders } from '@/lib/company/folders'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const metadata: Metadata = { title: 'Contract templates' }
export const dynamic = 'force-dynamic'

/** Company › Templates › Contracts (REG-534): the studio's contract templates — a simple library. */
export default async function ContractTemplatesPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/company/templates/contracts')) return <AccessGate section="Templates" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [data, brand, sp, folders] = await Promise.all([fetchContractTemplates(), fetchBrand(), searchParams, fetchFolders('contracts')])
  const values: TokenValues = {
    'client.name': 'Client name', 'client.phone': 'Client phone', 'client.email': 'client@email.com', 'lead.address': 'Property address', 'lead.propertyType': 'Property type', 'lead.projectRef': 'Project ref',
    'studio.name': brand.details.name, 'studio.address': brand.details.address, 'studio.phone': brand.details.phone, 'studio.email': brand.details.email, 'studio.uen': brand.details.uen, 'studio.gst': brand.details.gstReg,
    'quote.number': 'OM-00000', 'quote.total': 'S$0.00', 'quote.validUntil': 'Quote valid until', 'date.today': longDate(new Date(data.now)), 'date.contract': 'Contract date',
  }
  return <ContractTemplatesGallery data={data} brand={brand.kit} studio={brand.details} values={values} from={readFrom(sp.from)} folders={folders} />
}
