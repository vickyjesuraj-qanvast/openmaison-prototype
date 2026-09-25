import { offeredEntities, type StudioDetails } from '@/lib/templates/model'

/**
 * (REG-632, contracts parity Q-10) Who a contract is issued by — the quote's letterhead rule (REG-618, `docLetterhead`): the studio's
 * own, or for another issuing entity its name, logo and registration numbers, the address falling back to the studio's. A registration
 * number never inherits. A name that is not (or no longer) one of Company › Profile's entities prints as written over the studio's
 * details. Client-safe.
 */
export type ContractIssuer = { name: string; address: string; uen: string; gstReg: string; logo: string | null; own: boolean }
export function contractIssuer(studio: StudioDetails, entityName: string | null | undefined): ContractIssuer {
  const list = studio.entities ?? []
  const named = entityName?.trim() || null
  const e = named ? list.find((x) => x.name === named) ?? null : null
  if (!e || e === list[0]) {
    const first = list[0]
    return { name: named && !e ? named : studio.name, address: studio.address, uen: studio.uen, gstReg: (first && !first.gstRegistered) || studio.gstRegistered === false ? '' : studio.gstReg, logo: null, own: true }   // (REG-645) the studio's own registration
  }
  return { name: e.name || studio.name, address: e.address || studio.address, uen: e.uen, gstReg: e.gstRegistered ? e.gstReg : '', logo: e.logo, own: false }
}
/** The entities a contract can be issued by — Company › Profile's list; the studio itself is the first. Offered only when there are two or more. */
export const issuerChoices = (studio: StudioDetails, current?: string | null) => offeredEntities(studio.entities ?? [], current).map((e) => e.name).filter(Boolean)   // (REG-647) a retired entity is offered only where it is already named
