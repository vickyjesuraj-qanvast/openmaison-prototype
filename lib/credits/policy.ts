/**
 * (REG-700) Who may do what with AI credits — 1.0's rules as they are (integration A-18, B-01 · B-02 · B-03): everyone uses AI tools within
 * their monthly amount; the Owner and Admins see the studio's figures (1.0's `resolveTrustedActor`); only the Owner buys, sets monthly
 * amounts and changes the plan (1.0's `settings.editStudio` — Admins are "the same as the owner except plan/billing"). Pure, client-safe:
 * the actions, the screens and Settings › Studio › Who may do what all read these, so the table can't drift from what is enforced.
 */
export const trustedRole = (role: string | null | undefined): boolean => role === 'Owner' || role === 'Admin'
export const ownerRole = (role: string | null | undefined): boolean => role === 'Owner'
export const mayBuyCredits = ownerRole
export const maySetAmounts = ownerRole
export const mayChangePlan = ownerRole
/** Whose usage a role sees on the Company page: the studio's, or only their own. */
export const usageReach = (role: string | null | undefined): 'studio' | 'own' => (trustedRole(role) ? 'studio' : 'own')
