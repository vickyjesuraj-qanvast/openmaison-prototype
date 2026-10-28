/**
 * (gaps build I, I-Q12) The Compliance Navigator's studio-level actions — 1.0's five (`src/data/compliance-actions.ts`): the HDB Directory of
 * Renovation Contractors, CaseTrust, bizSAFE, BCA licensed contractors and ACRA BizFile+. `{LegalName}` and `{UEN}` are filled from Company ›
 * Profile when shown. Data only — pure and client-safe. 1.0's Tailwind colours are left out (2.0 draws them with its own chips).
 * (one-home N-07) Which are done is the studio's one record of registrations, set on Company › Profile (below).
 * (the calm UI build 2026-10-27, 6-02 · W-493 · W-495 · T-13) The titles and the portal buttons in sentence case, named as a studio owner says them
 * (1.0's were "Check / Apply as HDB Renovation Contractor", "CaseTrust Accreditation for Renovation", "bizSAFE Enterprise Certification",
 * "BCA Licensed Contractors Verification", "ACRA Business Profile (BizFile+)"); the ids, the steps and the record are 1.0's.
 */
export type StudioAction = { id: string; title: string; subtitle: string; organisation: string; short: string; about: string; need: string[]; steps: string[]; links: { label: string; url: string }[]; primary: { label: string; url: string } }

export const STUDIO_ACTIONS: readonly StudioAction[] = [
  {
    id: "HDB_DRC", title: "HDB renovation contractor listing",
    subtitle: "Get listed in HDB's Directory of Renovation Contractors",
    organisation: "Housing & Development Board", short: "HDB",
    about: "The HDB Directory of Renovation Contractors (DRC) lists approved firms that homeowners can engage for HDB flat renovations. Being listed significantly expands your client base and builds trust with homeowners looking for licensed contractors.",
    need: [
      "Legal entity name: {LegalName}",
      "UEN: {UEN}",
      "Valid bizSAFE Enterprise or Level 3 certification",
      "Public Liability Insurance (minimum S$500,000 coverage)",
      "ACRA business registration of at least 1 year",
      "Track record of completed HDB renovation projects",
    ],
    steps: [
      "Click 'Open HDB Portal' below to access the DRC contractor search page.",
      "Search for '{LegalName}' or UEN '{UEN}' to check if you are already listed.",
      "If not listed, navigate to the contractor registration section and download the application form.",
      "Gather your bizSAFE certificate, Public Liability Insurance policy, and ACRA business profile.",
      "Complete the application form using '{LegalName}' and UEN '{UEN}' in all relevant fields.",
      "Submit the completed form and supporting documents through the HDB portal.",
      "HDB will review your application and notify you within 4–6 weeks via email.",
    ],
    links: [{ label: "HDB DRC Contractor Search", url: "https://services2.hdb.gov.sg/webapp/BN31AWERRCMobile/BN31PListingContractor.jsp" }],
    primary: { label: "Open HDB portal", url: "https://services2.hdb.gov.sg/webapp/BN31AWERRCMobile/BN31PListingContractor.jsp" },
  },
  {
    id: "CASETRUST_RENOVATION", title: "CaseTrust accreditation",
    subtitle: "Earn Singapore's trusted renovation accreditation badge",
    organisation: "Consumers Association of Singapore", short: "CaseTrust",
    about: "CaseTrust accreditation for renovation businesses signals to homeowners that your studio follows fair dealing practices, maintains transparent pricing, and has a structured complaints resolution process. Many clients actively filter for CaseTrust-accredited contractors.",
    need: [
      "Legal entity name: {LegalName}",
      "UEN: {UEN}",
      "ACRA business registration document",
      "Standard renovation contract template",
      "Deposit and refund policy (documented)",
      "Complaints handling process (documented)",
      "S$200 non-refundable processing fee",
    ],
    steps: [
      "Click 'Open CaseTrust Portal' below to access the renovation accreditation overview.",
      "Download the Renovation scheme information kit and review the criteria checklist.",
      "Use '{LegalName}' as your business name and '{UEN}' in all application fields.",
      "Prepare your standard renovation contract, deposit policy, and complaints documentation.",
      "Submit the application form along with the S$200 processing fee via the CaseTrust portal.",
      "A CaseTrust auditor will contact you within 2–3 weeks to schedule a document review.",
      "Once approved, display the CaseTrust badge on your studio profile and marketing materials.",
    ],
    links: [{ label: "CaseTrust Renovation Overview", url: "https://www.case.org.sg/casetrust/renovation/" }, { label: "Accreditation Scheme Details", url: "https://www.case.org.sg/casetrust/casetrust-accreditation-for-renovation-businesses/" }],
    primary: { label: "Open CaseTrust portal", url: "https://www.case.org.sg/casetrust/renovation/" },
  },
  {
    id: "BIZSAFE_ENTERPRISE", title: "bizSAFE certificate",
    subtitle: "Demonstrate workplace safety & health commitment",
    organisation: "Workplace Safety & Health Council", short: "WSH Council",
    about: "bizSAFE Enterprise certification from the WSH Council demonstrates that your studio has implemented a structured Workplace Safety & Health management system. This is a key prerequisite for HDB contractor listing and is required by many corporate and government clients.",
    need: [
      "Legal entity name: {LegalName}",
      "UEN: {UEN}",
      "Appointed WSH Champion (internal staff member)",
      "Completed WSH Risk Assessment",
      "Safety & Health Management System (SHMS) documentation",
      "MOM-approved WSH auditor contact (for on-site audit)",
    ],
    steps: [
      "Click 'Apply for bizSAFE' below to access the WSH Council application portal.",
      "Select 'bizSAFE Enterprise' from the available programme options.",
      "Appoint an internal WSH Champion for '{LegalName}' and register their details.",
      "Complete the online Risk Assessment training (if your champion has not done so already).",
      "Develop your Safety & Health Management System using WSH Council templates.",
      "Engage an MOM-approved WSH auditor to conduct an on-site audit of {LegalName}.",
      "Upon passing the audit, your studio is certified bizSAFE Enterprise — valid for 3 years.",
    ],
    links: [{ label: "Apply for bizSAFE", url: "https://www.tal.sg/wshc/programmes/bizsafe/apply-for-bizsafe" }, { label: "bizSAFE Enterprise Details", url: "https://www.tal.sg/wshc/programmes/bizsafe/apply-for-bizsafe/bizsafe-enterprise" }],
    primary: { label: "Open WSH Council portal", url: "https://www.tal.sg/wshc/programmes/bizsafe/apply-for-bizsafe" },
  },
  {
    id: "BCA_CONTRACTORS", title: "BCA licence check",
    subtitle: "Verify your sub-contractors' licensing for structural works",
    organisation: "Building & Construction Authority", short: "BCA",
    about: "For renovation projects involving structural, electrical, or major civil works, verifying that your sub-contractors hold valid BCA licences protects your studio and clients from legal and safety liabilities. Use the official dataset to check any contractor before signing sub-contracts.",
    need: [
      "Your studio name: {LegalName}",
      "UEN of the contractor(s) you wish to verify",
      "License type to check (Builder's License, Specialist Builder, etc.)",
    ],
    steps: [
      "Click 'Open BCA Dataset' below to access the licensed builders and contractors dataset.",
      "Use the search or filter tool to look up contractor UENs or company names.",
      "Verify the license type, grade (for Builder's Licensing), and validity period.",
      "Check whether your own studio needs a builder's license if you are undertaking structural scopes.",
      "Document the license details for each sub-contractor before signing sub-contracts.",
      "Re-verify sub-contractor licenses at the start of each new project, as licenses may expire.",
    ],
    links: [{ label: "BCA Licensed Builders Dataset", url: "https://data.gov.sg/datasets/d_19573c579879be15623f2e1e3854926d/view" }],
    primary: { label: "Open BCA dataset", url: "https://data.gov.sg/datasets/d_19573c579879be15623f2e1e3854926d/view" },
  },
  {
    id: "ACRA_BIZFILE", title: "ACRA business profile",
    subtitle: "Download and verify your official business registration",
    organisation: "Accounting & Corporate Regulatory Authority", short: "ACRA",
    about: "Your ACRA business profile is the official government record of your studio. It is required for most regulatory applications (HDB, CaseTrust, bizSAFE), client due diligence, and government tenders. Keep it up to date before starting any accreditation process.",
    need: [
      "Legal entity name: {LegalName}",
      "UEN: {UEN}",
      "CorpPass or Singpass access for authorised personnel",
      "S$5.50 per downloaded business profile report",
    ],
    steps: [
      "Click 'Open BizFile+' below to access the ACRA business portal.",
      "Log in using CorpPass with credentials authorised for '{LegalName}'.",
      "Search for your company using UEN '{UEN}' and view your current business profile.",
      "Download the latest business profile report (required for most regulatory submissions).",
      "Verify that the registered company name, UEN, business address, and SSIC activity codes are accurate.",
      "If any details are outdated, update them via BizFile+ before submitting to other agencies.",
    ],
    links: [{ label: "BizFile+ Portal", url: "https://www.bizfile.gov.sg" }],
    primary: { label: "Open BizFile+", url: "https://www.bizfile.gov.sg" },
  },
]

/** A step with the studio's name and UEN filled in; a blank one reads "your company" / "your UEN". */
export const fillStudio = (s: string, legalName: string, uen: string) => s.replaceAll('{LegalName}', legalName.trim() || 'your company').replaceAll('{UEN}', uen.trim() || 'your UEN')

/* ── (one-home N-07) The studio's registrations: ONE record ──────────────────────────────────────────────────────────────────────────────
 * Which of the five the studio has done — with who and when — is recorded once, on Company › Profile › Registrations & accreditations
 * (settings `compliance_studio`, the key the Navigator's Done always wrote). The Compliance Navigator's *Your studio* reads it, and so do the
 * signing pages: CaseTrust done = the deposit-protection disclosure and its tick (`lib/contracts/casetrust.ts`). Settings › Quotes & pricing's
 * own CaseTrust switch (settings `casetrust`) is gone. Pure and client-safe — the server reads are `lib/compliance/queries.ts`. */
export const REGISTRATIONS_KEY = 'compliance_studio'
/** The registration the signing pages follow. */
export const CASETRUST_ID = 'CASETRUST_RENOVATION'
export type StudioActionState = { done: boolean; by: string | null; at: number }
export function parseStudioStates(v: unknown): Record<string, StudioActionState> {
  const raw = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown } catch { return null } })() : v
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, StudioActionState> = {}
  for (const a of STUDIO_ACTIONS) {
    const s = (raw as Record<string, unknown>)[a.id] as { done?: unknown; by?: unknown; at?: unknown } | undefined
    if (s && typeof s.done === 'boolean' && typeof s.at === 'number') out[a.id] = { done: s.done, by: typeof s.by === 'string' ? s.by : null, at: s.at }
  }
  return out
}
