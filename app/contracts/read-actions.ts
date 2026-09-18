'use server'

import { fetchContractTemplateOptions, fetchDeletedContracts } from '@/lib/contracts/queries'

/* (REG-534) Reads the client asks for on demand — the template picker's list and the Deleted Contracts sheet — as server actions
   (lib/contracts/queries is server-only). */
export async function fetchContractTemplateOptionsAction() { return fetchContractTemplateOptions() }
export async function fetchDeletedContractsAction(leadId: string | null) { return fetchDeletedContracts(leadId) }
