# B5 main — Company (Profile · Members · public profile · Integrations · Client portal set-up · Questionnaire · the Company panel) + Settings › Finance's frame

Files: `components/company/{members-view.tsx, members-view.module.css, member-drawer.tsx (new), preferences-dialog.tsx, preferences-dialog.module.css,
company-popover.tsx, company-popover.module.css, profile-view.tsx, about-card.tsx, integrations-view.tsx, integrations-view.module.css,
questionnaire-view.tsx, qanvast-listing-card.tsx, qanvast-listing.module.css, company-ghosts.tsx}` · `components/company/portal/{portal-card.tsx (new),
portal-card.module.css (new), portal-setup-view.tsx, portal-sections-card.tsx, portal-ghosts.tsx}` · `components/portfolio/{public-profile-view.tsx,
public-profile-ghost.tsx, designer-card.tsx, designer-card.module.css, designer-card-ghost.tsx}` · `components/finance/finance-settings.tsx` (B5-S's and
B5-F's requests) · `lib/company/{copy.ts, sections.ts, folder-libraries.ts, question-bank.ts, preferences.ts}` (display words only).
No server action, rule, schema or stored value touched.

## 1 · Built

- **5-01 Members — the owner's own example.** One row a member: avatar · name ("Dane (you)") and email — a press opens the member's drawer — · the
  Role select (the only inline control) · "14 leads" · ⋮. A second line only for what is off the usual: an invitation that waits (its words + the one
  verb **Send again** / **Send invitation**), "Not taking new leads", your own "Add your signature". The ⋮ (house PortalMenu + DropdownItem, a sheet on
  a phone): Edit details (your own row: Edit your details → Your profile) · Public profile · Copy invitation link · Cancel invitation · Deactivate
  (a refusal stays in the menu, disabled, its rule as the row's second line). **The member drawer** (house Drawer `wide` 480, a sheet on a phone —
  `member-drawer.tsx`): Details (role, email, the signature's state and way, Edit details) · Leads (Open to new leads, Lead preferences + Change,
  Max projects, Reports to — or a Manager's team) · Pay (PayNow + Add / Change) · Public profile (shown on your client portal or not + Open). The
  Add member snackbar's "Set who they report to" opens the drawer on that member with the Reports to list open. Deactivated rows' Reactivate /
  Invite again are the house text verb. Page 1,406 → 1,024 px at 1440; 4,588 → 1,615 px at 390.
- **5-02** — the card title "People and roles" and the five-line rules paragraph are gone; the list ends with two doors: **What can each role do?**
  (→ Settings › Roles & access, opening the roles list, `#studio-roles`) · **Who sees which leads** (→ #lead-visibility, `members-visibility-link`
  kept). The read-only note for non-runners stays; the seats note (a state) stays at the list's head.
- **5-03** — "Max projects" with "4 (studio usual)" (was Projects at once · Studio default · 4), its snackbar "Sarah takes up to 4 projects (the
  studio usual)"; "Runs the studio" / "Keeps the books" / "Looks after the leads" gone (the Role says it); "On the About page" off the row (the
  drawer says "Shown on your client portal"); "Reports to: Nobody" → "No manager" (drawer only; "{name} has no manager now"); "No preferences set"
  gone; "Signature: not set" only on your own row as **Add your signature** (others' in their drawer); the "Closed to new leads" chip gone ("Not
  taking new leads" line, the snackbar "… isn’t taking new leads").
- **5-46** — solved by the one-row model (every row the same grid; the actions in the ⋮ at every role).
- **5-31 Lead preferences** — title "James’s lead preferences"; one line "What kind of leads suit James? Leave a row on Any if it doesn’t matter.";
  priority "Any · Nice to have · Must match" (`DONT_CARE` is a display label — the stored priorities are unchanged); the four "Select a priority to
  configure" lines gone; the "n of 4 configured" count kept for a screen reader only (`pref-count`, role=status).
- **1-15 · 5-40 · W-147 Company panel** — one heading "Company" (sentence case, bold) over the house group titles **Studio** and **Money & reports**
  (Integrations joins Studio, so the money group holds Finance and Reports); the cut help lines are gone from the rows — each is the row's tooltip
  (and stays ⌘K's sub line, `CompanySection.help`); rows 44 high.
- **1-02 · 1-03 (touch)** — the panel's counts in one word and quietly: "1 approval" (Templates, was 1 awaiting), "1 approval" (Price book, was 1
  proposed), "4 approvals" (Finance, was 4 to approve; `company-finance-badge` kept) — grey text, not a tinted chip (§2's Approvals).
- **1-13 (touch)** — `lib/company/sections.ts`'s group words above; the rail itself is B1's.
- **5-36 Profile — four tabs** (`PROFILE_TABS`, one page, `?tab=`): **Details** (company details, social links, review link) · **Bank & entities** ·
  **Registrations** (registrations & accreditations + Listed on Qanvast) · **About page**. Old card addresses (#entities, #registrations, #qanvast,
  #reviews, #about — ⌘K, Settings, 1.0's /verify, the bell, Maison AI) open the card's tab and land on the card. A field to fix on the other tab
  opens that tab. The Brand kit door went from a card to a link in Company details' one line ("… with the logo and colours of your **Brand kit**",
  `brand-kit-link` kept). The ghost reads `?tab=`. Page 3,743 → 1,166 px (the longest tab).
- **5-18 (Company side)** — Profile has ONE Discard · Save in the header for the open tab (Details and Bank & entities save the company details; About
  page saves the About form — the card's own pair moved up, `about-save` on the header's Save; Registrations saves as it changes, so no pair); "Save
  changes" → **Save** on Profile and a member's public profile. Each form keeps its leave guard on every tab.
- **5-35** — Company details "These print on your quotes, invoices and contracts — with the logo and colours of your Brand kit."; Tagline "A short
  line for your quote cover or footer."; Social links "As you want them printed, e.g. @demostudio.sg."; GST "· off: quotes under this company have
  no GST" (the field codes are the template editor's Insert field menu's).
- **5-14 Integrations** — no filled button: Connect a Facebook page · Connect Gmail · Connect Xero · Sync now · Make a link are the DS secondary
  outlined button, each Connect at its card's right; two status words — **Connected** (green) · **Not connected** — Qanvast (listed), Website form
  (was Ready), Meta, Other forms "Connected · 1" (was 1 active / None yet), Gmail (was Active), Xero; Calendar invites "No set-up needed" (no chip).
- **5-15** — Webhooks → **Other forms (Zapier, Typeform…)** with "Connect any form tool: make a link, paste it into the tool, and each answer arrives
  as a lead."; the steps, POST / JSON and the field keys behind **For your developer** (the house fold, every word kept); **Make a link**; "New link";
  a link's row: one verb **Copy link**, its ⋮ = Try it · Regenerate · Revoke; the platform as quiet text (5-24, was a caps tag); "Link made".
- **5-16 (touch)** — every "Simulated on this prototype —" line (Integrations' five, Profile's Listed on Qanvast) is a quiet **Demo** chip in the
  card's title row, the sentence its tooltip and accessible name (`int-simulated-*` / `qanvast-simulated` kept); Meta's "the prototype connects a
  stand-in page" → "Meta’s login opens to pick the page." ; "Simulate … (demo)" → **Try it** (W-377).
- **5-30 Questionnaire** — "Questions" (was Question bank); one help line "The questions every new lead starts with. Ask the client sends them to the
  client’s portal." with the rest behind **How this works**; types "Short answer · Yes or no · Number · Pick one · Pick several · Date" (display map;
  stored types unchanged); the dialog's "Required — the client must answer it". **Not done here:** the row's tools (↑ ↓ ✎ 🗑 → a ⋮) and the type as
  text, not a caps chip — both are the house `DefinitionTable` (components/om/definition-list.tsx, B1; shared with Settings › Custom fields) → Request.
- **5-29** — Members "Add member" (filled, header — kept); Questionnaire **New question** moved from the card head to the page header as its one
  filled button (`data-kb="create"`); Materials' New material is drawn by B4's `LibraryGallery` → Request.
- **5-23 (Client portal)** — every Set up card wears the Company card head (bold sentence case, its count or link at the end) — a new `PortalCard`
  on the Overview card's frame, so every body lands where it did; the lead / project Overview keep their caps caption.
- **5-37** — tab **Set up** (W-366); "See it as Ryan" outlined in the header (the checklist keeps the same press); the Privacy notice step says "Not
  linked yet." (the PDPA why is said once, on Privacy and terms, which Add the link brings into view). **Kept:** the Clients card on Set up — its
  handles (`portal-clients-card`, `portal-client-row`) are read by another lane's probe (pj-r4a) and the guard forbids losing them; it shows up to 4
  clients and opens the Clients tab (▲).
- **5-51 · 5-24 public profile** — help "Clients read it on your client portal and your studio’s public pages."; "About them" (was A line or two);
  "Known for: … — set in **Lead preferences**"; switch **Show on your client portal** · "Clients see it under Our team."; Shown on: your client
  portal · your Qanvast Hangout booking page — {name} · Meetings; the designer card's Known for is a line of words ("Known for HDB & BTO homes ·
  Compact layouts", `known-for`), not capital tags (also on the portal's Our team and Hangout pages — same component). "Save".
- **5-41** — Questionnaire "client" (was homeowners); the Qanvast listing's "Homeowners find your studio" lives in B1's lib → Request.
- **4-06 (touch)** — Company › Templates tab **Project schedules** (was Schedules; its crumb top too); Payment schedules' help "The payment splits the
  studio offers." (was Milestone splits). The editors' words are B4's.
- **4-39 (touch)** — Price book tabs **Items · Sections** (was My Items · My Sections; `PRICE_BOOK_TABS`, `PRICE_BOOK_KINDS`, the folder crumbs'
  top); the rest (row menus, the quote's Templates link) is B4's.
- **6-20 (touch)** — the AI Visualizer's folder crumb top **Designs** (was All designs, `LIBRARY_ROOT`); the gallery is B6's.
- **4-35 (touch)** — `BrandKitGhost` (company-ghosts.tsx) follows whatever B4 does to the brand kit page → Request (I can't see B4's page).
- **5-42 (touch)** — the Access chip's words come from `accessChip` (lib/portal/model.ts, B3) → Request.
- **5-52** — kept by the contract (Settings and Company stay two places). The smallest step taken: each Settings module ends with one Related line
  (B5-S); Members ends with its two doors to Roles & access. No Settings group in the Company panel — it would take the panel past ten rows (T-14).
- **Settings › Finance's frame (B5-S · B5-F requests)** — `finance-settings.tsx`: the head is one help line (the deprecated links prop and the "How a
  client pays …" pointer sentence gone — the sentence is the Related line's Profile door's tooltip with `finance-profile-pointer`); the groups read
  **Client payments · Costs · Commission** (`FINANCE_GROUP_LABELS`; ids unchanged); 5-34's **Printed papers**: the invoice paper and the PO paper under
  one group, house Chips Invoice · Purchase order (`finance-papers-pick`), both mounted so an unsaved edit and its leave guard survive a switch.

## 2 · The ledger (moved, nothing removed)

| What | Was | Now |
|---|---|---|
| Edit details (`member-edit`) | the pencil beside a name | the row's ⋮ › Edit details; also the member's drawer › Details › Edit details |
| Edit your details (`member-your-profile`) | the pencil on your row | your row's ⋮ › Edit your details; the drawer's Details |
| Reports to select (`data-reports-to`) | the row | the member's drawer › Leads (the snackbar's "Set who they report to" opens it there) |
| A Manager's team ("Team: …") | the row | the drawer › Leads |
| Open to new leads switch (`{name} open to new leads`) | the row's second line | the drawer › Leads; the row says "Not taking new leads" when off |
| "Closed to new leads" chip | the row | "Not taking new leads" line (`member-closed`) |
| Projects at once select (`member-capacity`) | the row's second line | the drawer › Leads › Max projects |
| Preferences summary + Preferences button | the row's second line | the drawer › Leads › Lead preferences + Change (`member-prefs`, `member-prefs-edit`); `?prefs=<id>` still opens the dialog |
| PayNow + Add PayNow / Change (`member-paynow`, `member-paynow-edit`) | the row's second line | the drawer › Pay |
| Public profile (`member-about`) | a text button | the row's ⋮ › Public profile; the drawer › Public profile › Open public profile |
| "On the About page" tag | the row | the drawer › Public profile ("Shown on your client portal") |
| Signature: not set (others) | a line on their row (tooltip) | their drawer › Details |
| Signature: not set · Set it up (yours, `member-signature`) | your row | your row: **Add your signature** (same dialog) |
| Copy link (`member-invite-copy`) | the invitation line | the row's ⋮ › Copy invitation link |
| Cancel invitation (`member-invite-cancel`) | the invitation line | the row's ⋮ › Cancel invitation |
| Deactivate | a text button | the row's ⋮ › Deactivate (refused: disabled with its rule) |
| The roles paragraph + its Settings link (`members-visibility-link`) | the card head | the list's foot: What can each role do? · Who sees which leads |
| Company panel help lines | under each row (cut) | each row's tooltip; ⌘K's sub line |
| Profile cards | one page | four tabs (Details · Bank & entities · Registrations · About page); old #card addresses open their tab |
| Brand kit door (`brand-kit-link`) | a card at the page's foot | a link in Company details' help line |
| About page's Discard · Save (`about-save`) | the card's foot | the page header on the About page tab |
| "Simulated on this prototype" lines (`int-simulated-*`, `qanvast-simulated`) | a line under each card's help | a Demo chip in the title row, the sentence its tooltip / accessible name |
| Webhook steps + JSON field list | on the card | For your developer (fold, `webhooks-developer`) |
| A link's Simulate a POST · Regenerate · Revoke | text buttons on its row | its ⋮ › Try it · Regenerate · Revoke (Copy link stays on the row) |
| Questionnaire Add question | the card head (filled) | the page header (filled), New question |
| Questionnaire's long help | the card head | How this works (fold, `bank-how`) |
| Lead preferences' "n of 4 configured" (`pref-count`) | visible | for a screen reader only |
| Client portal's "See it as {client}" (`portal-test`) | filled | outlined (same place) |
| Settings › Finance's "How a client pays …" | under the module head | the Related line's Profile door's tooltip (B5-S) |
| Invoice paper · PO paper cards | under Money in · Money out | Printed papers, by chip (both kept mounted) |

## 3 · Words (B5 main's files)

Applied (52): W-054 · W-057 · W-072 · W-073 · W-074 · W-078 · W-088 (§2: "n approvals") · W-095 · W-100 · W-109 · W-142 · W-147 · W-163 · W-180 ·
W-201 · W-202 · W-206 · W-207 · W-210 · W-223 · W-233 · W-245 · W-267 · W-268 (tabs, kinds, crumbs) · W-276 · W-279 · W-292 · W-304 · W-312 · W-313 ·
W-320 · W-329 · W-336 · W-346 · W-350 · W-355 · W-357 · W-366 · W-371 · W-374 · W-377 · W-389 · W-400 · W-401 · W-407 · W-429 · W-433 · W-444 ·
W-514 · plus "Save" (5-18) on Profile / public profile and "Not taking new leads".
Not applied (another lane's file — requested): W-449 (Your profile's line, B1 renders it) · W-527 · W-541 (lib/qanvast-listing/model.ts, B1) · W-264
(lib/portal sections, B3) · W-054's Workload half (B3). W-533 kept by §2 ("Issues" on screen).
