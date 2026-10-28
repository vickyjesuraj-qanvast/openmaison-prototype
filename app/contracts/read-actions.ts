'use server'

import { fetchContractOptions, fetchContractTemplateOptions, fetchDeletedContracts, fetchStandardDocs, type ContractPickerData, type StandardDoc } from '@/lib/contracts/queries'
import { fetchFolders } from '@/lib/company/folders'
import { fetchBrand } from '@/lib/templates/queries'
import { offDesk } from '@/lib/quotes/desk'   // (S44Z) the editors' role rule on the server

/* (REG-534) Reads the client asks for on demand — the template picker's list and the Deleted Contracts sheet — as server actions
   (lib/contracts/queries is server-only). (S44Z) The studio's reads answer nothing for a role that keeps off contracts (Marketing — ON_DESK),
   as a list read under Who sees leads answers nothing; the signing page's one read below asks no role (a client has none). */
export async function fetchContractTemplateOptionsAction(): Promise<ContractPickerData> {
  if (await offDesk()) return { templates: [], folders: [] }
  const [templates, folders, brand] = await Promise.all([fetchContractTemplateOptions(), fetchFolders('contracts'), fetchBrand()])   // (REG-664)
  /* (the calm UI build 2026-10-27, 4-38) + the letterhead the cards draw their page under — a read, as the gallery's page reads it */
  return { templates, folders: folders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId })), paper: { brand: brand.kit, studio: brand.details } }
}
export async function fetchDeletedContractsAction(leadId: string | null) { return (await offDesk()) ? [] : fetchDeletedContracts(leadId) }
export async function fetchContractOptionsAction() { return (await offDesk()) ? [] : fetchContractOptions() }   // (REG-538) New template › From a contract…
export async function fetchStandardDocsAction(): Promise<StandardDoc[]> { return (await offDesk()) ? [] : fetchStandardDocs() }   // (pending modules S03) Send together's standard PDFs
/** (S42 B-03) Whether the signing code is the prototype's stand-in (no text goes, any six digits sign) — the studio's Send dialogs say so. */
export async function signingCodeIsDemoAction(): Promise<boolean> {
  const { isStandInProvider } = await import('@/lib/auth/provider')
  return isStandInProvider()
}
