import { signField, tokenChip as t } from './tokens'

/**
 * (REG-534, invented copy) The studio's starter agreement — a Singapore interior-design service agreement in plain
 * clauses, with the Smart Text chips where the records go and the signature fields at the end. It is the first contract
 * template (repair R34 seeds it as "Interior Design Service Agreement") and what a blank contract starts from.
 */
export const AGREEMENT_TITLE = 'Interior Design Service Agreement'
export function agreementHtml(): string {
  const p = (s: string) => `<p>${s}</p>`
  const h2 = (s: string) => `<h2>${s}</h2>`
  return [
    `<h1>${AGREEMENT_TITLE}</h1>`,
    p(`This Agreement is made on ${t('date.contract')}between <strong>${t('studio.name')}</strong>(UEN ${t('studio.uen')}) of ${t('studio.address')}(the “Designer”) and <strong>${t('client.name')}</strong>(the “Client”) for the renovation of ${t('lead.address')}(the “Premises”).`),
    h2('1. Scope of works'),
    p(`The Designer shall carry out the design and renovation works described in quotation ${t('quote.number')}(the “Quotation”), which forms part of this Agreement. Works not listed in the Quotation are excluded unless agreed in writing as a variation under clause 5.`),
    h2('2. Contract sum'),
    p(`The contract sum is <strong>${t('quote.total')}</strong>, inclusive of GST where the Designer is GST-registered. The sum covers labour, materials and workmanship as described in the Quotation.`),
    h2('3. Payment'),
    p('Payment follows the schedule in the Quotation. Unless stated otherwise: 10% on signing; 30% on commencement of works; 30% on completion of carpentry; 30% on handover. Each invoice is due within 7 days. Works may pause while a payment is outstanding, and any such pause extends the programme by the same period.'),
    h2('4. Programme'),
    p('Works commence within 14 days of the Designer receiving the signing payment and the permits the Premises require, and are planned to complete within the period stated in the Quotation. Dates are estimates: lead times for materials, third-party approvals and site conditions may move them, and the Designer will inform the Client of any change as soon as it is known.'),
    h2('5. Variations'),
    p('Any change to the scope, materials or finishes requested after signing is a variation. The Designer will quote the variation in writing; works on it begin only once the Client confirms the quote. Variations may change the contract sum and the programme.'),
    h2('6. Materials and workmanship'),
    p('Materials are supplied as specified in the Quotation or of equivalent quality. Natural materials such as stone, timber and veneer vary in colour and grain; such variation is not a defect. Workmanship follows the standard of good practice in the Singapore renovation trade.'),
    h2('7. Client’s responsibilities'),
    p('The Client shall give the Designer access to the Premises during working hours, obtain any consent the Premises’ management requires, and make timely decisions on selections and approvals. Delays caused by late decisions or access extend the programme accordingly.'),
    h2('8. Defects liability'),
    p('The Designer shall make good defects in workmanship reported in writing within 12 months of handover, at no cost to the Client. Wear and tear, misuse, and items installed by others are excluded. Manufacturers’ warranties on appliances and fittings pass to the Client on handover.'),
    h2('9. Termination'),
    p('Either party may end this Agreement by 14 days’ written notice if the other is in material breach and does not remedy it within that period. On termination the Client pays for works completed and materials ordered to date; the Designer hands over the Premises in a safe condition.'),
    h2('10. Liability'),
    p('The Designer’s liability under this Agreement is limited to the contract sum, and excludes indirect or consequential loss. Nothing here limits liability for death or personal injury caused by negligence.'),
    h2('11. Governing law and disputes'),
    p('This Agreement is governed by the laws of Singapore. The parties shall first try to resolve any dispute in good faith, and failing that by mediation at the Singapore Mediation Centre before any court proceedings.'),
    h2('Signatures'),
    p('Signed by the parties on the date first written above.'),
    `<p>${signField('studio-signature')}</p>`,
    p(`For ${t('studio.name')}`),
    `<p>${signField('client-signature')}</p>`,
    p(`${t('client.name')}, the Client`),
  ].join('')
}

/** A second, short template (repair R34): the variation order the reference's "Change Order" answers. (UX audit C4) It ends with the
 *  Client signature a send needs; `VARIATION_SIGN_OFF` is what R65 adds to a copy seeded before. */
export const VARIATION_TITLE = 'Variation Order'
export const VARIATION_SIGN_OFF = () => `<p>${signField('client-signature')}</p><p>${t('client.name')}, the Client</p>`
export function variationHtml(): string {
  return [
    `<h1>${VARIATION_TITLE}</h1>`,
    `<p>Variation to the Interior Design Service Agreement dated ${t('date.contract')}between ${t('studio.name')}and ${t('client.name')}for ${t('lead.address')}.</p>`,
    '<h2>Change requested</h2>',
    '<p>Describe the change to the scope, materials or finishes here.</p>',
    '<h2>Effect on the contract sum</h2>',
    `<p>The contract sum of ${t('quote.total')}is adjusted by the amount quoted for this variation. The revised sum is due under the payment schedule of the Agreement.</p>`,
    '<h2>Effect on the programme</h2>',
    '<p>The completion date moves by the number of working days stated in the variation quote.</p>',
    '<h2>Agreement</h2>',
    '<p>Both parties agree that this Variation Order forms part of the Agreement.</p>',
    `<p>${signField('studio-initial')}</p>`,
    `<p>${signField('client-initial')}</p>`,
    VARIATION_SIGN_OFF(),   // (UX audit C4) somewhere for the client to sign — the initials alone could never be sent
  ].join('')
}

/** (S44R — UAT row 358, call C7, invented copy) A letter of appointment — Spaces Studio's way of starting a project: the client appoints the
 *  studio on the quote's terms and pays the deposit (the Deposit field: the quote's first payment). Repair R127 seeds it as a template. */
export const APPOINTMENT_TITLE = 'Letter of Appointment'
export function appointmentHtml(): string {
  const p = (s: string) => `<p>${s}</p>`
  return [
    `<h1>${APPOINTMENT_TITLE}</h1>`,
    p(`${t('date.contract')}`),
    p(`Dear ${t('client.name')},`),
    p(`Thank you for appointing <strong>${t('studio.name')}</strong>(UEN ${t('studio.uen')}) to design and renovate ${t('lead.address')}. This letter confirms our appointment on the terms of quotation ${t('quote.number')}, for ${t('quote.total')}.`),
    '<h2>The deposit</h2>',
    p(`On signing, a deposit of <strong>${t('quote.deposit')}</strong>secures your project and starts the detailed design. The remaining payments follow the schedule in the quotation.`),
    '<h2>What happens next</h2>',
    p('Once the deposit is in, we confirm the works programme with you and apply for the permits your home needs. Any change to the scope after today is quoted to you as a variation before work on it begins.'),
    '<h2>Your acceptance</h2>',
    p(`By signing below, you appoint ${t('studio.name')}for the works in quotation ${t('quote.number')}and agree to pay the deposit above.`),
    `<p>${signField('studio-signature')}</p>`,
    p(`For ${t('studio.name')}`),
    `<p>${signField('client-signature')}</p>`,
    p(`${t('client.name')}, the Client`),
  ].join('')
}

/** (S44R — UAT row 359, call C9, invented copy) The completion & warranty letter the Hand over sheet sends — filled from the project (the
 *  Handover fields: its number, the completion day, the defects period and the day it ends). Repair R129 seeds it, marked *Use at handover*. */
export const COMPLETION_TITLE = 'Completion & Warranty Letter'
export function completionHtml(): string {
  const p = (s: string) => `<p>${s}</p>`
  return [
    `<h1>Completion &amp; Warranty Letter</h1>`,
    p(`${t('date.contract')}`),
    p(`Dear ${t('client.name')},`),
    p(`We are pleased to confirm that the renovation of ${t('lead.address')}(project ${t('project.number')}) was completed and handed over to you on ${t('project.completedOn')}.`),
    '<h2>Defects liability period</h2>',
    p(`${t('studio.name')}will make good any defect in our workmanship that you report in writing within ${t('project.defectsPeriod')}of completion — that is, by ${t('project.defectsUntil')}— at no cost to you. Fair wear and tear, misuse, and items installed by others are not covered.`),
    '<h2>Warranties</h2>',
    p('The manufacturers’ warranties on appliances, fittings and materials pass to you from the completion date. Please keep their cards and receipts with this letter.'),
    '<h2>Reporting a defect</h2>',
    p(`Write to us at ${t('studio.email')}or call ${t('studio.phone')}, with photos where you can, and we will arrange a visit within 7 working days.`),
    p('Thank you for trusting us with your home.'),
    `<p>${signField('studio-signature')}</p>`,
    p(`For ${t('studio.name')}`),
    `<p>${signField('client-signature')}</p>`,
    p(`Received by ${t('client.name')}`),
  ].join('')
}
