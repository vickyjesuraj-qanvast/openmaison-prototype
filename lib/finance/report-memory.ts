/**
 * (simplify S-13, her "build everything" 2026-10-09 — F1 §6.7) Company › Reports remembers, per browser, the last tab read (Leads · Projects ·
 * Finance) and the last Finance report — the Leads listing's remembered view (lib/leads/view-pref.ts) as a pattern, kept in a cookie so the
 * server's landing (`/company/reports`, a redirect) and the Finance tab can read it: an Owner who reads Finance lands on it. The address always
 * wins — `/company/reports/<tab>` and `?report=` are never overridden. Client-safe; a cookie that cannot be written is only a convenience lost.
 */
export const REPORTS_TAB_COOKIE = 'om_reports_tab'
export const FINANCE_REPORT_COOKIE = 'om_reports_finance'
const YEAR = 60 * 60 * 24 * 365

/** Remember a value for this browser (no navigation). */
export function rememberReport(name: typeof REPORTS_TAB_COOKIE | typeof FINANCE_REPORT_COOKIE, value: string) {
  try { document.cookie = `${name}=${encodeURIComponent(value)}; path=/company/reports; max-age=${YEAR}; samesite=lax` } catch { /* a convenience */ }
}
