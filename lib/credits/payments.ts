import 'server-only'
import { serviceSlot } from '@/lib/services/slots'

/*
 * (pending modules S34 — her "build all of them" 2026-10-11; the steps' note after S19: "a real payment provider replaces `completeCheckout`
 * for every kind — topup · plan · auto_topup · seats' invoice; auto top-up then charges the card on file") THE ONE SEAM FOR THE STUDIO'S
 * PAYMENTS to OpenMaison — plans, AI-credit top-ups, auto top-ups and added seats (1.0: Dodo Payments' overlay, its webhook and the card on
 * file; integration Q-14 · B-20 · B-29).
 *
 * THE STAND-IN is the demo checkout and says so ("This is the prototype, so no card is taken"): the Plans and top-up dialogs' Pay step calls
 * `completeCheckout`, which writes what Dodo's webhook writes; an auto top-up and added seats charge nothing ("no card is charged").
 * PRODUCTION: `setPaymentProvider(p)` once at start-up, and from then on
 *   · `checkout(ask)` opens the provider's own checkout for the pending session — the dialogs send the Owner to its address (`payUrl`) and
 *     the browser can no longer complete a checkout itself (`completeCheckout` refuses: only the provider says it was paid);
 *   · the provider's webhook calls POST /api/webhooks/payments → `readWebhook` (verify the signature there; null refuses it) → each paid
 *     session finishes through `finishCheckout` (app/credits/checkout.ts — the same records the demo writes: the plan or the top-up, the tax
 *     invoice, the Owner's receipt), each failed one is marked failed;
 *   · `charge(…)` takes an auto top-up or added seats from the card on file before the credits or seats are given (a refusal changes nothing);
 *   · `billingPortal()` is Manage billing's address (Dodo's customer portal) when the provider has one.
 * Prices are in cents (S$), as the plans hold them (lib/credits/plans.ts). The demo's own words stay until the developers replace the
 * dialogs' honest lines.
 */

export type CheckoutAsk = {
  sessionId: string
  kind: 'plan' | 'topup'
  amountCents: number
  /** "Pro — Studio · 3 seats · monthly", "1,000 AI credits" */
  forWhat: string
  trial: boolean
  /** the Owner paying — the provider's customer */
  owner: { id: string; name: string; email: string | null }
  /** where the provider sends them back (absolute) */
  returnTo: string
}
export type PaymentProvider = {
  name: string
  checkout(ask: CheckoutAsk): Promise<{ url: string } | { error: string }>
  charge(o: { ref: string; amountCents: number; forWhat: string }): Promise<{ ok: true; providerRef?: string | null } | { error: string }>
  readWebhook(raw: { text: string; headers: Headers }): Promise<{ paid: string[]; failed: string[] } | null>
  billingPortal?(): Promise<string | null>
}

/** The demo checkout: the dialogs pay through `completeCheckout`; nothing is charged anywhere. */
const DEMO: PaymentProvider = {
  name: 'demo-checkout',
  checkout: async () => ({ error: 'The demo checkout pays inside the dialog.' }),
  charge: async () => ({ ok: true }),
  readWebhook: async () => null,
}
const slot = serviceSlot<PaymentProvider>('payments', DEMO)
/** PRODUCTION: plug the payment provider in once, at start-up (lib/services/install.ts). */
export function setPaymentProvider(p: PaymentProvider): void { slot.set(p) }
export const paymentProvider = (): PaymentProvider => slot.use()
/** Whether the demo checkout still answers — no card is taken anywhere. */
export const paymentsAreStandIn = (): boolean => slot.standIn()
