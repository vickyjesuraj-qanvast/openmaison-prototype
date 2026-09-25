'use server'

import { fetchContractOptions, fetchContractTemplateOptions, fetchDeletedContracts, type ContractPickerData } from '@/lib/contracts/queries'
import { fetchFolders } from '@/lib/company/folders'

/* (REG-534) Reads the client asks for on demand — the template picker's list and the Deleted Contracts sheet — as server actions
   (lib/contracts/queries is server-only). */
export async function fetchContractTemplateOptionsAction(): Promise<ContractPickerData> {
  const [templates, folders] = await Promise.all([fetchContractTemplateOptions(), fetchFolders('contracts')])   // (REG-664)
  return { templates, folders: folders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId })) }
}
export async function fetchDeletedContractsAction(leadId: string | null) { return fetchDeletedContracts(leadId) }
export async function fetchContractOptionsAction() { return fetchContractOptions() }   // (REG-538) New template › From a contract…
