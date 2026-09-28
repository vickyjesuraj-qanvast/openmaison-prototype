'use server'

import { searchStudio } from '@/lib/global-search/queries'
import { isScope, type SearchResult } from '@/lib/global-search/model'

/** (REG-709) The global search: what was typed and the scope, in one object (the house rule for strings sent to an action). */
export async function globalSearch(input: { query: string; scope: string }): Promise<SearchResult> {
  const scope = isScope(input.scope) ? input.scope : 'all'
  return searchStudio(String(input.query ?? ''), scope)
}
