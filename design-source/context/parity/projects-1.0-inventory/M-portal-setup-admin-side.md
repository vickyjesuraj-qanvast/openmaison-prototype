# M — 1.0 homeowner portal: setup and administration

Reader M. Read on 2026-10-05 from the 1.0 working tree `/Users/vicky/Documents/GitHub/qanvast-id-tool`, branch `integ/security-non-qanvast` @ `620190192`, read-only, nothing run. Read in full: the studio's settings page `src/app/(main)/tools/homeowner-portal/page.tsx`; every component it mounts in `src/components/settings/` (`portal-config-hub`, `portal-features-config`, `portal-branding-config`, `theme-preset-picker`, `color-preset-row`, `font-picker`, `portal-layout-picker`, `voice-config`, `studio-profile-config`, `scope-form-builder`, `team-page-editor`, `about-us-editor`, `portal-live-preview`, `portal-paused-shell`, `save-indicator`) with `src/lib/hooks/use-debounced-save.ts` and `src/components/ui/image-upload.tsx`; what the settings feed (`src/lib/portal-presets.ts`, `portal-branding-resolve.ts`, `portal-nav.ts`, `entity-branding.ts`, `src/app/my/[studioSlug]/layout.tsx`, its `page.tsx`, `about`, `team`, `preview/[view]`, the five layouts, `portal-theme-styles`, `portal-shell`, `portal-header`, `branded-portal-chrome`, `studio-profile-card`, `team-page`, `about-us-page`, two login layouts and the welcome message); the APIs (`api/identity/studio-settings`, `api/studio-setup/portal-slug`, `api/portal/studio-settings`, `api/portal/upload-asset`, `api/portal/family-members`, `api/scope-questions/records/**`, `api/homeowner/scope-answers`, `api/projects/[id]/send-questionnaire`, `lib/scope-answers/*`, `api/config/pages`); the studio-side questionnaire widget and its invite dialog; the portal-related parts of `src/app/(main)/accounts/page.tsx` (found by search, then read region by region), `feature-flags-tab.tsx`, `notification-settings.tsx`; the gates (`lib/access-control.ts`, `app/(main)/layout.tsx`, `components/layout/app-sidebar.tsx`, `topbar.tsx`, `context/platform-config-context.tsx`, `proxy.ts` portal block); the platform admin (`api/admin/studios/**`, `api/admin/page-visibility`, `app/admin/studios/**`, `app/admin/settings` page list, the analytics routes' portal metrics); first-time setup (`app/studio-setup/page.tsx`, welcome modal, coach marks, the slug migration); and the docs named in the brief. `team-settings.tsx` and `theme-skin-selector.tsx` were searched only: neither mentions the portal (the first is Accounts › Team Members, the second the studio app's own skin in Settings). The earlier reader's file `I-homeowner-side.md` (§1, §2, §4, §10) was read first; its rows are cited as `I-nn` where they already hold. Anything worked out rather than read is marked **[inferred]**.

**Path aliases used in citations**

| Alias | Path |
|---|---|
| `TOOLS` | `src/app/(main)/tools/homeowner-portal/page.tsx` |
| `HUB` | `src/components/settings/portal-config-hub.tsx` |
| `FEAT` | `src/components/settings/portal-features-config.tsx` |
| `BRAND` | `src/components/settings/portal-branding-config.tsx` |
| `set/…` | `src/components/settings/…` |
| `ACC` | `src/app/(main)/accounts/page.tsx` |
| `RES` | `src/lib/portal-branding-resolve.ts` |
| `PRE` | `src/lib/portal-presets.ts` |
| `SL` | `src/app/my/[studioSlug]/layout.tsx` |
| `HOME` | `src/app/my/[studioSlug]/page.tsx` |
| `PV` | `src/app/my/[studioSlug]/preview/[view]/page.tsx` |
| `HP` | `src/app/my/projects/[projectId]/page.tsx` |
| `EP` | `src/app/my/engagement/[linkId]/page.tsx` |
| `PP` | `src/app/(main)/projects/[projectId]/page.tsx` |
| `cmp/…` | `src/components/homeowner/…` |
| `SSR` | `src/app/api/identity/studio-settings/route.ts` |
| `api/…` | `src/app/api/…` |
| `AC` | `src/lib/access-control.ts` |
| `ML` | `src/app/(main)/layout.tsx` |
| `ADM` | `src/app/admin/studios/[id]/page.tsx` |
| `SETUP` | `src/app/studio-setup/page.tsx` |

---

## Bottom line

- **A new studio has no portal address.** The studio is created by OpenMaison's admin without a `portal_slug`; only a one-off migration ever gave studios one (`api/admin/studios/route.ts:193-204`, `supabase/migrations/20260503000017_studio_portal_slug.sql:11-21`). Until the owner types a slug in the settings and presses Save, there is no login page, no preview, no questionnaire link, and "Invite to Portal" sends clients to a signpost page with no way in (`HUB:187-215`, `src/app/my/login/page.tsx:47-58`). Nothing in first-time setup mentions it (`SETUP:29-37`).
- **The settings have two doors with different locks.** The same hub is mounted at Tools › Homeowner Portal (owner only, by sidebar and route guard) and at Accounts Setup › HomeOwner Portal, a page any owner, admin, designer or accounting member can open, with no per-tab check (`AC:107,126`, `ACC:147-151,1941-1954`). The save route checks only that someone is signed in (`SSR:49-51`).
- **OpenMaison's on/off switch for a studio hides the setup, not the portal.** It removes the sidebar item, the Accounts group, Preview as Homeowner, the questionnaire and Share to Portal in the studio app; no homeowner page or homeowner API reads it, so clients keep logging in. A studio member can also write the switch back on through the studio's own settings route, which merges any key it is sent (`api/config/pages/route.ts:28-50`, `SSR:95-110`) **[inferred, not run]**.
- **Most of what a studio configures never reaches the page its clients live on.** The project page uses the generic shell, which reads only logo, primary colour, accent strip, fonts, favicon, surface tint and whether the top bar is dark. Layout, card style, corner radius, density, header text, footer text, watermark, social and footer links, and tab names apply to the home, About, Team and lead-stage pages only (`cmp/portal-shell.tsx:84-103`, `cmp/portal-header.tsx:78-85`).
- **The live preview is honest for about half the sections.** Branding, Layout, Profile and About show real results. Features, Voice (greeting), Scope and Team do not: the preview shows every tab "regardless of which features are enabled", a fixed greeting "Good evening, Sample", invented scope questions, and has no Team view (`PV:188-189,119-121,382-389`, `set/portal-live-preview.tsx:76-80`).
- **Feature switches: fifteen shown, four dead, three different default tables, none enforced on the server** (confirms I-402). New here: "Material Selections" also hides the Renders tab; "Action Queue" does not hide the home page's pending strip; the settings screen, the resolver and the project page each carry their own defaults (`FEAT:42-63`, `RES:81-97`, `HP:66-72,82-83`, `HOME:63-67`).
- **Scope questions barely reach the homeowner.** The questionnaire is drawn on one page only — the lead-stage page — and only until the first quote is shared (`EP:119-130`). The project page never shows it, the "Ask homeowner" link lands on the home list or the project page, "Required" is not enforced, questions cannot be edited or reordered, and the empty state promises "default lifestyle questions" that do not exist.
- **"Portal paused" is half a pause** (extends I-37): it blocks the branded pages and the login, and empties the home list, but the project page, the lead-stage page and every homeowner API go on working for anyone already signed in (`SL:151-160`, `api/homeowner/dashboard/route.ts:54-59`).
- **Autosave can lose work.** Leaving a section inside its debounce window cancels the pending save; every save rewrites the whole `portal` block from the browser's cached copy; the Branding panel overwrites what is being typed when a save returns; a deep link straight to Team can open an empty editor that then saves over the stored team (`src/lib/hooks/use-debounced-save.ts:68-70`, `TOOLS:82-89`, `BRAND:87-89`, `set/team-page-editor.tsx:33-34`) **[inferred]**.
- **The public, pre-login settings route hands out drafts.** It returns the About page's HTML and every team member whether or not they are published or visible, plus the company's address, registration number, phone and email from general branding (`RES:177-192,212-219`, `api/portal/studio-settings/route.ts:24-53`).
- **Three places hold bank details and the portal's pay card reads only one.** The setup wizard and Studio Branding write `settings.branding.bankDetails`; the homeowner's "pay" card appears only when Accounts › Finance › Payment Methods has been saved (`settings.payment_details`) (`SETUP:346-357`, `api/homeowner/projects/[id]/payment-info/route.ts:73-81`, `HP:811`).
- **The studio types the same facts twice.** Company tagline, social links and accreditations in Studio Branding are not used by the portal, which has its own Tagline, Social and Awards fields; only logo, brand colour and footer text fall through (`RES:163-181`, `set/studio-profile-config.tsx:129-144`).
- **White-label slips:** the Premium layout prints "Powered by OpenMaison"; the trust badge claims "Secure · End-to-end encrypted"; the fallback login page shows the OpenMaison logo (`cmp/layouts/premium-layout.tsx:108`, `BRAND:315`, `src/app/my/login/page.tsx:38`).
- **The platform admin can do one thing about a studio's portal** — hide its setup — and see two numbers (portal logins, issues reported). It cannot see or change a slug, branding or who has access (`ADM:55-104`, `api/admin/analytics/leaderboard/route.ts:136-137`).

---

## The setup flow, step by step

### A. A studio, from zero to a portal a client can open

| # | Step | Where | Required? | If skipped |
|---|---|---|---|---|
| 0 | OpenMaison staff create the studio and its owner (studio name, owner name, email, phone, plan, password). The row gets name, plan, region; **no portal slug**. | `/admin/studios` → `POST /api/admin/studios` (`api/admin/studios/route.ts:99-249`) | Required (there is no self sign-up in this fork) | — |
| 0b | The Homeowner Portal page switch for the studio. Default is on (no override stored). | `/admin/studios/{id}` › Features (`ADM:696-750`) | Nothing to do | If staff turn it off, the studio loses the setup screens (M-012…M-017); the portal itself keeps running |
| 1 | Owner signs in and is forced through the seven-step studio setup: Studio Profile · Branding & Identity · Bank Details · Document Numbering · Lead Funnel · Workflow Rules · Your Studio Is Live. No step is about the portal. | `/studio-setup` (`ML:138-141`, `SETUP:29-37`) | Step 1 required; the rest can be skipped | Logo, brand colour and bank details stay empty; the portal falls back to the studio's initial letter and purple |
| 2 | Owner finds the portal settings. Nothing points there: no setup step, no welcome item, no coach mark. | Sidebar › Tools › "Homeowner Portal" (owner only), or profile menu › Accounts Setup › HomeOwner Portal | Required to go any further | The portal does not exist for clients (step 3) |
| 3 | **Save a Portal URL.** Type a slug, press Save. | Hub's second row (`HUB:187-215`) | **Required in practice** — the UI never says so | No `/my/{slug}`; the invite's link is `/my/login` (a signpost, M-277); preview panel reads "Save your portal slug to enable live preview."; "Ask homeowner" answers 409 "Studio has no portal slug configured yet" (`api/projects/[id]/send-questionnaire/route.ts:76-81`) |
| 4 | Features: leave as is, or switch sections off. | Hub › Features | Optional | Everything is on except Chat and Homeowner Tasks |
| 5 | Branding: theme, logos, colours, fonts, login screen, fine-tuning. | Hub › Branding | Optional | Company logo and brand colour from general branding, else platform purple, Outfit / Inter, centred login reading "Welcome" |
| 6 | Layout: one of five. | Hub › Layout | Optional | Modern |
| 7 | Voice: greeting tone, tab names. | Hub › Voice | Optional | Friendly ("Hi / Hello / Good evening, {first name}") |
| 8 | Profile: year, awards, social, contact, footer links. | Hub › Profile | Optional | No About link in the portal menu unless a tagline or a published About page exists |
| 9 | Scope: add questions. | Hub › Scope | Optional | No questionnaire anywhere, on either side |
| 10 | Team: add people **and** switch Draft → Published. | Hub › Team | Optional | No Team link; homeowners never see the team |
| 11 | About Us: write the story **and** switch Draft → Published. | Hub › About Us | Optional | No About text on the home page or About page |
| 12 | Payment details clients pay against. | Accounts › Finance › Payment Methods (`ACC:3239-3615`) | Required before a client can pay from the portal | The pay card and "I've Made Payment" never appear (`HP:811`) |
| 13 | Who reviews what before a client sees it (progress updates, timeline, invoices). | Accounts › Workflow › Workflow Rules; Finance › PO Settings › Invoice Approval | Optional | Defaults: every review on (`api/studio-config/workflow/route.ts:16-29`) |

There is no "go live" step, no checklist that must be complete, and no test login. The portal is "on" from the moment the slug is saved, because `settings.portal.enabled` counts as on unless it is exactly `false` (`RES:209`).

### B. One client, one project

| # | Step | Where | Required? | Notes |
|---|---|---|---|---|
| 1 | The lead is saved with a phone number. A database trigger creates the homeowner profile and an active link. | Lead form | Automatic | I-39. Access exists from here, invited or not |
| 2 | "Invite to Portal" → WhatsApp opens with a ready message carrying the studio's login address. | Project header / lead drawer | Optional — it only tells the client the address | I-14…I-36. The message is sent from the designer's own WhatsApp; nothing records that it went |
| 3 | The client opens `/my/{slug}/login`, enters the phone, gets an OTP, lands on the home list. | Portal | — | Fails with "not found" wording if the phone typed differs from the lead's; fixed from Tools › Homeowner Portal › Project Links › Update Contact Details (I-126) |
| 4 | Family: add a spouse or co-owner with their own phone. | Tools › Homeowner Portal › Project Links | Optional | No message is sent to them (I-130); the studio must pass on the address |
| 5 | Share something. A project page with nothing shared shows empty sections. | Project page, item by item | Required for the client to see anything of substance | Milestones must be published; quotes sent to the portal; progress updates approved; selections shared; files shown; invoices sent (I-85…I-95) |
| 6 | Ask the scope questions. | Lead drawer / project Overview › Homeowner Questionnaire › "Ask homeowner" | Optional | Works only at the lead stage, before a quote is shared (M-176, M-181, M-182) |
| 7 | Check what the client sees. | "Preview as Homeowner" | Optional | I-51…I-79 |

Withdrawing access: there is no control. A family member can be removed (hard delete); the primary cannot be switched off (I-41).

---

## Settings trace table

One row per setting or control. "Home pages" means the branded tree `/my/{slug}` (home list, About, Team) and the lead-stage page, which wear the chosen layout. "Project page" means `/my/projects/{id}`, which wears the generic shell. All portal settings live in `studios.settings.portal` unless noted.

### Hub level

| Setting | Where it is set | Stored as | Read by | Effect on the homeowner | Works? |
|---|---|---|---|---|---|
| Portal URL (slug) | Hub, second row | `studios.portal_slug` (column, unique when not null) | `api/portal/studio-settings` (every `/my/{slug}/*` page), `api/homeowner/auth/login` + `verify`, invite and questionnaire links | The portal's address | **Partly** — no slug on new studios, no reserved words, renaming breaks every link already sent, "taken" reads as a generic failure |
| Portal Enabled / Disabled | Hub › Features, top right | `portal.enabled` | `SL:151`, `api/homeowner/dashboard/route.ts:56-59` | "Portal paused" on branded pages and login; home list empties | **Partly** — project page, lead-stage page and all homeowner APIs ignore it |

### Features (`portal.features.*`)

| Setting | Where it is set | Stored as | Read by | Effect on the homeowner | Works? |
|---|---|---|---|---|---|
| Progress Updates | Hub › Features | `progressUpdates` | `HP:544` | Shows / hides the updates section of Overview | Yes, client-side only. Help text says "Adds an Updates tab"; there is no such tab |
| Milestone Approvals | same | `milestoneApprovals` | nothing | None | **No** — dead |
| Invoices and Payments | same | `invoicesAndPayments` | `HP:106` | Shows / hides the whole Finance tab — quotes and variation orders go with it | Yes, client-side only |
| View Quotes | same | `quoteViewing` | `HP:660,737-771` | Quote card and "Contract Value" in Finance | Yes, client-side only. "homeowners can comment" is not true |
| Variation Orders | same | `variationOrders` | `HP:354,661,782` | Variation list in Finance | Yes, client-side only |
| View and Sign Contracts | same | `contractSigning` | nothing | None | **No** — dead |
| Material Selections | same | `designSelections` | `HP:82-83,105`, `HOME:97` | Hides **Selections and Renders** sub-tabs, and "Recent Design Assets" on the home page | Partly — one switch, two sections; label names only one |
| Auto-share Selections | same | `selectionAutoShare` | nothing | None | **No** — dead |
| Raise a Support Ticket | same | `escalations` | `HP:91,108` | Support › tickets sub-tab | Yes, client-side only |
| Documents | same | `documents` | `HP:107` | Documents tab | Yes, client-side only |
| Floor Plan Collaboration | same | `floorPlanCollab` | `HP:84,105` | Design › Floor Plan sub-tab | Yes, client-side only. Resolver's default says off, page's default says on |
| Action Queue | same | `actionQueue` | `HP:408` | To-do widget on Overview | Partly — the home page's pending strip ignores it (`HOME:63-67`) |
| Homeowner Tasks | same | `homeownerTasks` | `HP:355,451` | Task list on Overview | Yes, client-side only |
| Scope Details | same | `scopeQuestions` | nothing | None | **No** — dead; the questionnaire shows whenever enabled questions exist |
| Chat | same | `chat` | `HP:92,108` | Support › Chat sub-tab | Yes, client-side only. "real-time" is polling |

### Branding (`portal.branding.*`)

| Setting | Where it is set | Stored as | Read by | Effect on the homeowner | Works? |
|---|---|---|---|---|---|
| Start from a theme (12) | Hub › Branding, top | Writes `primaryColor`, `accentColor`, `surfaceTint`, `headingFont`, `bodyFont`, `cardStyle`, `cornerRadius`, `density` | — | Sets those eight at once; leaves layout and login layout alone | Yes. Nothing marks which theme is applied |
| Studio Logo | Branding › Identity | `logoUrl` | `RES:207` → all layouts, `cmp/portal-header.tsx:63-76`, login | Logo in header and login | Yes. Fallback: chat avatar → company logo → `studios.logo_url` → initial letter |
| Login Page Logo | same | `loginLogoUrl` | `src/app/my/[studioSlug]/login/page.tsx:190` | Logo on the login screen only | Yes |
| Favicon | same | `faviconUrl` | `cmp/layouts/portal-theme-styles.tsx:73-102` | Browser-tab icon on home pages and project page | Partly — not on the login screen; the picker refuses `.ico` and `.svg` though the server accepts them |
| Cover Photo | same | `coverPhotoUrl` | `cmp/studio-profile-card.tsx:34-46` | Wide image heading the About page's profile card | Partly — help says "About / Portfolio"; there is no Portfolio (I-408) |
| Recolor logo to white | same | `whitenLogo` | Modern, Traditional, Detailed, Premium layouts; dark project-page bar; all six login screens | Logo drawn as a white silhouette | Partly — ignored by Minimal and by light project-page bars; on the default Centered login the white logo sits on a pale ground |
| Logo size (50–200 %) | same | `logoScale` | Login layouts, `cmp/layouts/premium-layout.tsx:35,48` | Scales the login logo and the Premium hero logo | Partly — as labelled ("login screen (and the portal hero)"); no effect in four layouts or the project page |
| Studio Tagline | same | `studioTagline` | `HOME:43-47`, About card, login layouts, `src/lib/portal-nav.ts:35` | Line under the greeting, on login, on About; also makes the About link appear | Yes |
| Quick color presets (9) | Branding › Colors | `primaryColor` + `accentColor` | as below | Two colours at once | Yes |
| Primary Color | same | `primaryColor` | `portal-theme-styles.tsx:116-137` | Buttons, active states, tints, dark chrome on every portal page | Yes — clamped darker if too light; wins over the company colour only when it differs from `#5500FF` |
| Accent Color | same | `accentColor` | Modern stripe, Traditional strip, Detailed breadcrumb, Premium lines, project-page strip | A thin brand line | Partly — nothing in Minimal |
| Surface Tint (optional) | same | `surfaceTint` | Layouts and `PortalShell` via `resolveSurfaceTint` (16 % wash); login layouts raw | Page background wash | Partly — clamped to a light wash on portal pages but used at full strength on the login screen |
| Heading Font / Body Font (14) | Branding › Typography | `headingFont`, `bodyFont` | `portal-theme-styles.tsx:46-63,138-143` | Typeface on home pages and project page | Partly — the login screen never loads them |
| Login Layout (6) | Branding › Login Screen | `loginLayout` | login page `:191` | Shape of the login screen | Yes |
| Login Title / Login Subtitle | same | `loginTitle`, `loginSubtitle` | login page `:187-188` | Heading and line above the phone field | Yes |
| Background Image | same | `loginBackgroundUrl` | Split, Split Reverse, Hero Top, Full Bleed | Photo behind / beside the form | Yes for those four; nothing in Centered and Framed (as the help text says) |
| Overlay Color / Overlay Opacity | same (shown only once an image is set) | `loginBackgroundOverlayColor`, `…Opacity` | same four | Tint over the photo | Yes |
| Welcome Message (optional) | same | `loginWelcomeMessage` | all six login layouts via `WelcomeMessage` | Short text near the form | Yes — "HTML allowed" but cut down to a small tag list on render |
| Show trust badge | same | `loginShowTrustBadge` | all six | "Secure · End-to-end encrypted" under the form | Works, but the claim is not true of the product |
| Card Style | Branding › Layout fine-tuning | `cardStyle` | Modern, Traditional, Premium content card | Border / shadow of the one content card | Partly — not Minimal, not Detailed, not the project page |
| Corner Radius | same | `cornerRadius` | same three | Corner of that card | Partly — same limits |
| Density | same | `density` | all five layouts (padding) | Padding around home-page content | Partly — not the project page |
| Header Text | same | `headerText` | five layouts, five login layouts | Replaces the studio name in the home-page header | Partly — the project page still prints the studio name (`cmp/portal-header.tsx:78-85`) |
| Footer Text | same | `footerText` | five layouts | Footer line on home pages | Partly — no footer on the project page; when empty, falls back to the **invoice** footer text from Studio Branding |
| Watermark | same | `watermarkEnabled` | five layouts | Faint logo (Premium: studio name) bottom right | Partly — home pages only |
| Portal Layout (5) | Hub › Layout | `layout` | `SL:121-124`, `cmp/branded-portal-chrome.tsx:47`, `cmp/portal-shell.tsx:21-30,58` | Chrome of home, About, Team, lead-stage pages; on the project page only light vs dark top bar | Partly (I-404, I-424) |
| Greeting Tone | Hub › Voice | `greetingTone` | `HOME:19-20,148-164` | Greeting word on the home page | Partly — examples shown do not match output (I-406); preview never shows it |
| Navigation Labels: About | Hub › Voice | `customNavLabels.about` | `src/lib/portal-nav.ts:36` | Renames the About menu item | Yes |
| Navigation Labels: Overview, Updates, Finance, Design, Moodboard, Scope, Issues, Chat, Floor Plan | Hub › Voice | `customNavLabels.*` | `PV:186-201` only | None — they rename tabs of the mock preview | **No** (I-405) |

### Profile, Scope, Team, About

| Setting | Where it is set | Stored as | Read by | Effect on the homeowner | Works? |
|---|---|---|---|---|---|
| Year Established | Hub › Profile | `portal.studioProfile.yearEstablished` | `cmp/studio-profile-card.tsx:54-59`, `portal-nav.ts:30` | "Est. 2010 · {studio}" on About | Yes |
| Awards and Certifications (logo, name, year) | same | `studioProfile.awards[]` | profile card `:62-98` | "Awards & Recognition" grid on About | Yes — an award with an empty name is saved and drawn as a blank card |
| Social and Web (7 links) | same | `studioProfile.socialLinks` | profile card "Follow us"; layout footers | Icons on About and in home-page footers | Partly — not on the project page; URLs are not checked |
| Contact (Phone, WhatsApp, Email, Office Address) | same | `studioProfile.contact` | profile card "Get in touch" | Tap-to-call, WhatsApp, mail, map links on About | Yes |
| Footer Links (Privacy, Terms, Contact) | same | `studioProfile.footerLinks` | layout footers | "Privacy · Terms · Contact" on home pages | Partly — not on the project page |
| Scope question (text, type, options, Required, on/off) | Hub › Scope | table `studio_scope_questions` | `api/homeowner/scope-answers` (homeowner), `api/leads|projects/[id]/scope-answers` (studio) | "A few questions" card on the lead-stage page | **Partly** — only before a project exists and before any quote is shared; Required ignored for the homeowner |
| Team member (photo, name, role, bio, visible) | Hub › Team | `portal.aboutTeam.members[]` | `src/app/my/[studioSlug]/team/page.tsx:17-20` | "Our Team" cards | Yes, when Published and at least one member is visible |
| Team: Published | Hub › Team | `aboutTeam.isPublished` | team page, `portal-nav.ts:39-42` | Adds the Team menu item and page | Yes — but drafts are still served by the public route |
| About Us content | Hub › About Us | `portal.aboutUs.htmlContent` | `HOME:31-32,139-143`, about page | "About {studio}" on the home page and About page | Yes, when Published |
| About: Published | Hub › About Us | `aboutUs.isPublished` | same, `portal-nav.ts:35` | Shows the text; adds the About link | Yes — but drafts are still served by the public route |

### Settings elsewhere that change what a homeowner gets

| Setting | Where it is set | Stored as | Read by | Effect on the homeowner | Works? |
|---|---|---|---|---|---|
| Studio Logo, Brand Color (company) | Setup step 2; Accounts › Branding & Comms › Studio Branding | `settings.branding.logoUrl`, `.primaryColor` | `RES:163-181,207` | Portal logo and colour when the portal's own are unset or left at default | Yes |
| Custom Footer Text (company) | Studio Branding | `settings.branding.footerText` | `RES:177-181` → layout footers | The quote / invoice footer line appears as the portal footer | Works, unintended **[inferred]** |
| Chat avatar | No screen found that sets it — the Chat Identity tab has no image field (`ACC:1314-1375`) | `studios.chat_identity_avatar_url` (column) | `RES:207` | Where a value exists, it becomes the portal logo ahead of the company logo | Yes (legacy rule kept on purpose) |
| Bank details, PayNow / DuitNow ID, Custom Payment QR | Accounts › Finance › Payment Methods | `settings.payment_details` | `api/homeowner/projects/[id]/payment-info/route.ts:73-100` | The pay card in Finance, with QR | Yes — but only this store; the wizard's bank details do not count |
| Who confirms payments? | same | `settings.payment_approval` | `api/homeowner/projects/[id]/payment-notify/route.ts:104`, `payment-submit/route.ts:230` | Who on the studio side is told "homeowner says paid" | Yes |
| Trust homeowner submissions | same | `settings.payment_settings.trust_homeowner_submissions` | `payment-submit/route.ts:124` | Proof upload marks the invoice paid at once | Yes (see I's "uncertain" note on the cascade) |
| Progress review required (+ approvers) | Accounts › Workflow › Workflow Rules | `settings.workflow.progressReviewRequired`, `.approvers.progressUpdate` | `api/projects/[id]/progress-updates/route.ts:159-181` | A designer's update is held until an approver passes it | Yes |
| Require approval before sending invoices | Accounts › Finance › PO Settings | studio settings | invoice send route | A designer's invoice is held before the homeowner sees it | Not traced beyond the label |
| CaseTrust signing step (Singapore only) | Accounts › Workflow › Feature Flags | `settings.features.casetrust_signing_step` | `api/homeowner/engagement/[linkId]/route.ts:165-175`, `EP:270` | Adds a deposit-protection disclosure step to signing | Yes (SG only) |
| Quote Sharing › Sharing Methods (Both / Standalone Link Only / Homeowner Portal Only) | Accounts › Quotes & Pricing › Quote Sharing | `settings.quoteSharingMethod` | nothing | None | **No** — written, never read |
| Customer Notifications (per event) | Settings › Notifications (owner only) | table `customer_notification_preferences` | `src/lib/notifications/preferences.ts:51` | Whether optional client emails go out | Yes for email events; the portal bell is separate (I-104…I-114) |
| Show chat history | Invite dialog, per person | `homeowner_project_links.chat_history_visible` | chat route | I-10, I-38 | Yes |
| Homeowner Portal page switch | Platform admin, per studio | `studios.settings.page_visibility["tools/homeowner-portal"]` | studio app only (`TOOLS:34`, `ACC:224`, `PP:1758,1799,2282`, lead drawer, post-update dialog, Visualizer) | None | **No** as an off switch for the portal |

---

## 1. Entry points, gates and who may configure

### (1) What it is / entry points

- **M-001** The portal's settings hub is one component, `PortalConfigHub`, mounted in **two** places: Tools › Homeowner Portal › Configuration, and Accounts Setup › "HomeOwner Portal" group › "HomeOwner Portal". Both pass the same data and the same save functions. `TOOLS:157-164`, `ACC:1941-1954`
- **M-002** I-419 called the docs wrong for placing the hub in `/accounts`; the docs are half right — it is in both. The Accounts mount also takes `?section=` (features · branding · layout · scope · team · about) so a link can open one section; the Tools mount always opens on Features. `ACC:226-245,1951`, `TOOLS:157-164`
- **M-003** Sidebar: Tools › **"Homeowner Portal"** (icon `Home`), last of nine tools, shown only to owners and only when the platform has the page enabled. `src/components/layout/app-sidebar.tsx:28,425`
- **M-004** Accounts Setup is reached from the profile menu's **"Accounts Setup"** row, which only owners see; the page itself opens for owners, admins, designers and accounting members who type the address. `src/components/layout/topbar.tsx:493-512`, `AC:126`
- **M-005** Three links elsewhere point into the Accounts mount: the setup wizard's "Set up your branding" (`/accounts?tab=portal&section=branding`), the questionnaire widget's "Accounts → HomeOwner Portal → Scope" (`…&section=scope`), and five legacy tab ids (`portal-features`, `portal-branding`, `portal-scope`, `portal-team`, `portal-about`) kept "so old bookmarks / chat links still land on the right inner section". `SETUP:705-711`, `src/components/shared/homeowner-questionnaire.tsx:213-215`, `ACC:191-200`
- **M-006** Only the Tools page carries the second tab, **Project Links** (family members, contact details). The Accounts mount has the hub alone. `TOOLS:142-181`

### (7) Rules and logic — who may do it

- **M-007** Client, Tools door: the route table lists `tools/homeowner-portal` as owner only, and the main layout's guard redirects anyone else who types the address to their default page. I-419's "no owner check for anyone who types the address" is therefore not quite right — the check exists, in the layout, on the client. `AC:96-107`, `ML:132-146`
- **M-008** Client, Accounts door: no check. The sidebar inside Accounts filters only items flagged `ownerOnly` (one item, "Studio Health"); the "HomeOwner Portal" group is not flagged, so an admin, a designer or an accounting member sees and can use the full hub. `ACC:650-653,147-151`
- **M-009** The code knows this: a comment beside the route table says the Configuration tab "has no owner check anywhere, including its save route", and that widening access "must also gate the Configuration tab and its save API". `AC:96-106`
- **M-010** Server: `PATCH /api/identity/studio-settings` requires a studio session and nothing else. The session payload holds only `userId` and `studioId` — no role — so the route cannot tell an owner from a designer. Any signed-in member can change the slug, pause the portal or rewrite its branding with a direct request. `SSR:49-51`, `src/lib/api-auth.ts:14-34`
- **M-011** The same is true of every other setup route in this slice: scope questions (create, edit, delete), asset upload, family members (list, add, remove), questionnaire invites. All check "signed in to this studio" only. `api/scope-questions/records/route.ts:85-87`, `api/portal/upload-asset/route.ts:24-29`, `api/portal/family-members/route.ts:121-123,224-226`

### (5) States — when the platform has switched the page off

- **M-012** The sidebar item disappears and the Accounts "HomeOwner Portal" group is not drawn. `app-sidebar.tsx:425`, `ACC:646-649`
- **M-013** Typing `/tools/homeowner-portal` shows the layout's generic block — a "?" tile, **"Coming Soon"**, **"This feature is not yet available. Check back later!"** — because the main layout swaps out any disabled page before the page renders. `ML:120-129,187-196`
- **M-014** The page's own message (I-378: "This feature isn't enabled for your studio. Contact OpenMaison support if you'd like to turn it on.") is therefore never seen: both checks read the same flag in the same render, and the layout's wins. **[inferred]** `TOOLS:44-53`, `ML:187-196`
- **M-015** While the page-visibility request is still loading, every page counts as enabled, so a studio with the portal switched off sees the full hub for a moment before "Coming Soon" replaces it. **[inferred]** `src/context/platform-config-context.tsx:46-51`
- **M-016** Typing `/accounts?tab=portal` with the page off shows an empty content card: the tab is selected, nothing matches, no message. **[inferred]** `ACC:1942`
- **M-017** Also hidden in the studio app: "Preview as Homeowner" (I-51), the Homeowner Questionnaire on the project Overview and in the lead drawer, the "Preview" button in the post-update dialog, and every "Share to Portal" control in the AI Visualizer. `PP:1758,1799,2282`, `src/components/leads/lead-detail-drawer.tsx:1612`, `src/components/projects/post-update-dialog.tsx:73,340`, `src/components/projects/visualizer.tsx:1278,4818,5011,5616`
- **M-018** **Not** hidden: "Invite to Portal" in the project header and the lead drawer, "Show to homeowner" on files, and the whole homeowner side. No file under `src/app/my`, `src/app/api/homeowner` or `src/app/api/portal` reads the switch. `PP:1708-1716`, `lead-detail-drawer.tsx:1552-1562`

### (10) Problems

- **M-019** A studio can undo the platform's switch. The studio settings route shallow-merges whatever keys it is sent into `studios.settings`, with no allow-list; `page_visibility` is one of those keys, and `/api/config/pages` lets the studio's copy win over the global default. A member posting `{ settings: { page_visibility: { "tools/homeowner-portal": true } } }` re-enables the page. **[inferred, not run]** `SSR:95-110`, `api/config/pages/route.ts:28-50`
- **M-020** Two doors, two names, two guards for one screen: "Homeowner Portal" under Tools (owner), "HomeOwner Portal" under Accounts Setup (anyone who can open Accounts). `app-sidebar.tsx:28`, `ACC:147-151`
- **M-021** The settings page calls hooks after an early return (I-414). `TOOLS:44-56`

---

## 2. Tools › Homeowner Portal — the page around the hub

### (2) Layout

- **M-022** One column with `px-6 lg:px-8 pt-6 lg:pt-8 pb-6`: page header, the Portal URL card (`mt-4`), a two-tab strip (`mt-6`, bottom border), then the tab's content (`mt-4`). `TOOLS:98-183`

### (3) UI elements

- **M-023** Header **"HomeOwner Portal"** with the sub-line quoted in I-379. `TOOLS:99-102`
- **M-024** Portal URL card (only when a slug exists): tinted `bg-primary-variant/10`, rounded-xl, a `Link2` icon, caption **"Studio Portal URL · share with all your homeowners — they log in with their own phone"**, the full address in monospace (truncated), and two buttons, **"Copy"** (outline) and **"Open"** (ghost, `Eye` icon). `TOOLS:107-139`
- **M-025** Tabs: **"Configuration"** (`Settings` icon) and **"Project Links"** (`Users` icon); the active tab has purple text and a 2 px purple underline. `TOOLS:142-149,187-202`
- **M-026** Configuration intro, verbatim: **"Customize what the portal looks like and what every homeowner can access — features, branding, layout, scope questions, team, and your About Us page."** It names six of the eight sections; Voice and Profile are missing. `TOOLS:154-156`, `HUB:51-60`

### (4) Interactions

- **M-027** "Copy" writes the address to the clipboard and toasts **"Link copied"**; there is no failure path. "Open" opens `/my/{slug}` in a new tab — where a studio member with no homeowner login is sent on to the login page. `TOOLS:124,132`, `src/proxy.ts:270-274`
- **M-028** Tab choice is component state only: not in the address, lost on reload, and not linkable (so nothing can link to Project Links). `TOOLS:39`

### (5) States

- **M-029** No slug: the URL card is simply absent. Nothing on the page says a slug is needed; the only hint is inside the preview panel (M-218). `TOOLS:107`
- **M-030** Settings still loading: the hub draws immediately with defaults, because `studioSettings` is undefined until the request returns. There is no loader. `TOOLS:55,158`

### (6) Motion

- **M-031** Tab buttons: `transition-colors` (150 ms default) on text and hover wash. Nothing else moves. `TOOLS:193`

### (9) Responsive

- **M-032** Padding steps up at `lg`. The URL card's row does not wrap: on a narrow screen the address truncates and the two buttons keep their width. `TOOLS:98,109-136`

---

## 3. The hub — shell, slug, autosave

### (2) Layout

- **M-033** One card (`rounded-xl overflow-hidden`) with four stacked bands: status row, slug row, section row, body. `HUB:164-347`
- **M-034** Body is `grid grid-cols-1 lg:grid-cols-[3fr_2fr]`: editor on the left (`p-5`, right border at `lg`), preview on the right on a grey ground (`lg:p-3 lg:bg-surface-bg`), the preview `lg:sticky lg:top-3` and 640 px tall. `HUB:243-345`

### (3) UI elements

- **M-035** Status row: green tick, **"{done}/{total} sections configured"** (count bold), and, when a slug exists, the link **"View live portal →"** to `/my/{slug}` in a new tab. `HUB:166-181`
- **M-036** Slug row (tinted): **"Portal URL /my/{draft or your-studio}"**, helper **"Lowercase letters, digits, hyphens. Used in the branded login URL + live preview."**, a 160 px input (placeholder **"my-studio"**, 32 characters max) and a purple **"Save"** button that reads **"Saving..."** while it runs. `HUB:187-214`
- **M-037** Section row: eight pill buttons with icon and label, in this order — **Features · Branding · Layout · Voice · Profile · Scope · Team · About Us**. The active one is tinted purple; an inactive one counted as done carries a 10 px green tick. `HUB:51-60,218-240`
- **M-038** Each section has a one-line description in the code (I-383) that is never drawn — the `help` strings are not rendered anywhere. `HUB:51-60,219-239`

### (4) Interactions

- **M-039** Saving the slug: the draft is lower-cased, stripped to `a–z 0–9 -`, cut to 32 characters, and sent. Success toasts **"Portal URL saved"**; an empty result toasts **"Slug must be at least 1 character (letters / digits / hyphens)"**; any failure toasts **"Failed to save portal URL"**. `HUB:77-94`
- **M-040** The input shows what was typed, not what will be saved: "My Studio!" stays in the box until Save, then the box snaps to "mystudio" when the saved value comes back. Spaces are removed, not turned into hyphens. `HUB:74-79,198-204`
- **M-041** The Save button is disabled while saving and while the draft equals the saved slug. `HUB:208`
- **M-042** Every successful section save bumps a key that reloads the preview frame. `HUB:133-136`
- **M-043** Picking a section swaps the editor at once; nothing is kept mounted. `HUB:226,245-316`

### (4b) Autosave, as built

- **M-044** There is no Save button in any section. Each editor watches its own value and saves after a quiet period: Features **200 ms**; Branding, Voice, Profile, Team **1,500 ms**; About Us **2,500 ms**. The master Enabled switch and the Layout cards save at once, without the timer. `FEAT:112-117`, `BRAND:91-96`, `set/voice-config.tsx:35-40`, `set/studio-profile-config.tsx:21-26`, `set/team-page-editor.tsx:39-44`, `set/about-us-editor.tsx:61-66`, `HUB:143-146,272-284`
- **M-045** Save indicator, top right of each editor: nothing when idle; a spinner and **"Saving…"**; a green tick and **"Saved"**, then **"Saved {n}s ago"** / **"Saved {n}m ago"** (the text only refreshes when the component re-renders, so it is often stale); red **"Failed — retry"**. `set/save-indicator.tsx:17-33`, `src/lib/hooks/use-debounced-save.ts:77-88`
- **M-046** "Failed — retry" is a label, not a button. Nothing retries; the next edit triggers the next attempt. `set/save-indicator.tsx:29-33`
- **M-047** **"Reset"** (a text link beside the indicator, in Branding, Voice, Profile, Team and About — not Features) puts the editor back to the value the hub last passed in, i.e. the last saved state, not the platform defaults. Once an autosave has landed it changes nothing; before that it reverts the edit and then autosaves the reverted value. There is no "restore defaults". `BRAND:127`, `set/voice-config.tsx:54`, `set/studio-profile-config.tsx:67`, `set/team-page-editor.tsx:69`, `set/about-us-editor.tsx:133-137`
- **M-048** A failed save also toasts **"Failed to save portal settings"** from the page. `TOOLS:90-93`

### (5) States — the progress count

- **M-049** "{done}/{total}" counts flags for six of the eight sections: Features and Layout are always counted; Branding counts when header text or footer text is set, or the login title or primary colour differs from default; Team when at least one member exists; About when the text is over 20 characters; Scope is fixed at false; Voice and Profile have no flag. `HUB:149-161`
- **M-050** So the count starts at **"2/8 sections configured"** on a brand-new studio and can never pass **5/8**. I-407 said "never 8/8"; the ceiling is five. Uploading a logo, choosing a theme, adding questions or filling in the profile move nothing. `HUB:150-160`

### (5b) States — paused

- **M-051** With the portal disabled, every section except Features sits under a sticky amber banner — **"Portal is paused"** / **"Homeowners see a “Portal paused” page. Re-enable to apply changes."** / button **"Enable Portal"** — and the editor below is at 60 % opacity with pointer events off. `set/portal-paused-shell.tsx:23-41`
- **M-052** "Re-enable to apply changes" is misleading in two ways: nothing can be changed while paused (the editors are inert), and anything already saved is live the moment the portal is re-enabled. `set/portal-paused-shell.tsx:28-30,37-39`

### (6) Motion

- **M-053** Section pills `transition-colors`; the paused editors change opacity without a transition; the "Saving…" spinner is `animate-spin`. No motion between sections. `HUB:228`, `set/portal-paused-shell.tsx:37`, `set/save-indicator.tsx:21`
- **M-054** In the Accounts mount the hub fades in (`animate-in fade-in duration-300`) inside a card that rises (`animate-fade-up`, 60 ms delay). `ACC:1943`, `ACC:702`

### (7) Rules and logic — the slug

- **M-055** Server: the same normalisation, no minimum length (a comment says "3-32 chars"; the code enforces neither end beyond the cut at 32), `null` clears. A direct request can store an empty string. `SSR:14-15,115-119`
- **M-056** Uniqueness is a database index on non-null slugs. A taken slug fails the update with the database's message and a 500; the hub shows the generic **"Failed to save portal URL"**, so the owner is not told the name is taken. `supabase/migrations/20260503000017_studio_portal_slug.sql:7`, `SSR:131-134`, `HUB:88-90`
- **M-057** No reserved words. The edge proxy treats `projects`, `engagement` and `login` as route words, not slugs; a studio that saves one of them gets addresses that collide with the portal's own routes (`/my/projects/login` is read as project id "login"). **[inferred]** `src/proxy.ts:262-274`, `HUB:79`
- **M-058** Slugs made only of hyphens ("-", "---") pass both checks. `HUB:79-83`
- **M-059** The UI cannot clear a slug (an empty draft is refused); the API can. `HUB:80-83`, `SSR:116-117`
- **M-060** Renaming a slug moves the portal. Every WhatsApp invite, questionnaire link and bookmark carries the old slug and now shows **"Studio not found"** / **"The portal link may be incorrect. Please contact your designer."**; signed-in homeowners' sessions carry the old slug too, so their "Back to Dashboard" lands on the same message. No redirect, no warning, no confirmation (extends I-409). **[inferred]** `SL:141-150`, `cmp/portal-header.tsx:40`

### (7b) Rules and logic — how a save is built

- **M-061** Each save sends the whole `portal` block: the page takes its cached copy of `settings.portal`, lays the changed slice over it, and posts the result. The server then lays that over `studios.settings` at the top level only, so the incoming `portal` object replaces the stored one outright. `TOOLS:82-89`, `SSR:108-109`
- **M-062** Inside Branding the same thing happens one level down: Layout and Voice save `{ ...branding, layout }` / `{ ...branding, ...next }`, where `branding` is defaults merged with the cached copy. `HUB:266,277,312`

### (8) Data

- **M-063** `studios.settings.portal` = `{ enabled, features, branding, aboutTeam: { members[], isPublished }, aboutUs: { htmlContent, isPublished }, studioProfile: { yearEstablished, awards[], socialLinks, contact, footerLinks } }`, stored in camelCase and passed through the settings transformer untouched. The slug is the column `studios.portal_slug`. Scope questions are the table `studio_scope_questions`. Images go to the `studio-assets` storage bucket. `HUB:31-38`, `src/lib/transformers.ts:1578-1593`, `api/portal/upload-asset/route.ts:21`
- **M-064** Reads: `GET /api/identity/studio-settings` (cached five minutes in the browser). Writes: `PATCH` to the same route with `{ settings: { portal } }` or `{ portalSlug }`. `src/lib/queries/studio.ts:7-25,161-173`

### (9) Responsive

- **M-065** Below `lg` the body is one column and the preview hides behind a full-width ghost button **"Live Preview"** with a chevron; pressing it shows the 640 px panel under the editor. `HUB:322-333`
- **M-066** The slug row stacks (`flex-col sm:flex-row`); the section pills wrap onto more lines. `HUB:188,218`

### (10) Problems

- **M-067** Leaving a section inside its quiet period drops the edit. The autosave hook clears its timer when the editor unmounts, and switching sections unmounts it; nothing flushes first. With a 1.5 s (2.5 s for About) window this is easy to hit. **[inferred]** `src/lib/hooks/use-debounced-save.ts:68-70`, `HUB:245-316`
- **M-068** Two quick changes can undo each other. Both saves are built from the same cached `portal` object until the refetch lands, so the second (say, a feature switch) writes back the first's old value (say, the master switch). **[inferred]** `TOOLS:82-89`
- **M-069** Two people, or two tabs, editing different sections overwrite each other for the same reason: each save carries a whole, possibly stale, `portal` block. **[inferred]** `SSR:108-109`
- **M-070** The Branding panel copies the saved value back into the form whenever the hub's data refreshes, which happens after every save; typing during a save round trip is overwritten. The Team editor's own comment says it avoids exactly this ("would clobber the user's in-flight edits"). **[inferred]** `BRAND:87-89`, `set/team-page-editor.tsx:29-34`
- **M-071** Voice, Profile and Team read their starting values once. Opened by deep link before settings have loaded (`/accounts?tab=portal&section=team`, or a legacy `portal-team` link), the Team editor starts empty and stays empty; adding one member then saves a one-person, unpublished team over the stored one. **[inferred]** `set/team-page-editor.tsx:33-34`, `ACC:194-200,243-245`
- **M-072** A layout or voice save bakes every default (purple included) into `portal.branding`; the resolver has to work around this by counting a portal value only when it differs from the default. A studio therefore cannot deliberately choose platform purple for the portal while its company colour is something else. `RES:135-140,165-175`

---

## 4. Features

### (2) Layout

- **M-073** Header row (32 px tinted tile with a `Settings` icon, title, sub-line; on the right the save indicator, the word Enabled / Disabled and the master switch), then a `space-y-2` list of fifteen rows, each label + ⓘ + description on the left and a switch on the right. `FEAT:130-211`

### (3) UI elements

- **M-074** Title **"HomeOwner Portal"**, sub-line **"Configure what homeowners can access"**. `FEAT:136-137`
- **M-075** The fifteen labels and descriptions are as listed in I-385 (verified verbatim). Order on screen: Progress Updates · Milestone Approvals · Invoices and Payments · View Quotes · Variation Orders · View and Sign Contracts · Material Selections · Auto-share Selections · Raise a Support Ticket · Documents · Floor Plan Collaboration · Action Queue · Homeowner Tasks · Scope Details · Chat. `FEAT:65-81`
- **M-076** The ⓘ tooltips, verbatim, in the same order: `FEAT:66-80`
  - "Adds an Updates tab on the homeowner portal showing each progress entry the studio publishes."
  - "Lets homeowners approve or reject completed milestones. Pending approvals show a banner on their dashboard. Milestones only appear once you publish them from the project Timeline tab."
  - "Adds a Finance tab. Homeowners see invoice history, due amounts, and payment status."
  - "Shows the signed quote (or lead-stage quote when no project quote exists) inside the Finance tab. Read-only — homeowners can comment but not edit."
  - "Adds approved variation orders as line additions under the quote in the Finance tab, with their cost impact rolled into the contract value summary. Margin is never shown."
  - "Homeowners can review and sign contracts directly in the portal."
  - "Adds a Selections tab. Studio creates option boards under Project > Management > Materials and shares each one explicitly. Homeowner picks an option (with optional comment) and the choice + their comment land back on the same row for the studio to action."
  - "Default off. Off = studio creates a draft, reviews, then explicitly clicks Share. On = the homeowner sees a new selection the moment it's saved. Most studios prefer off so they can build option boards collaboratively before exposing them."
  - "Adds the Support tab on the homeowner portal where homeowners can raise tickets. Studio sees each one in Escalations."
  - "Adds a Documents tab where homeowners can download their signed contract, the signed quote PDF, and any files the studio explicitly shares."
  - "Adds a Floor Plan tab. Studio uploads the master plan image; you and the homeowner can both draw, drop pins, and comment on each mark. Per-mark resolve state keeps the conversation cleanly closed."
  - "Adds a top-of-page widget that aggregates pending milestone approvals, selection responses, VO responses, and overdue invoices. Click an item to jump to the relevant section."
  - "Lets the studio assign tasks directly to the homeowner — e.g. 'pick tile color by Friday'. Default off because most studios use chat for this."
  - "Adds a Scope tab where homeowners answer custom questions. Configure the questions in the Scope section."
  - "Default off. Enables real-time chat with the studio under the portal Support tab."
- **M-077** Defaults on the settings screen: everything on except Chat, Homeowner Tasks and Auto-share Selections. `FEAT:42-63`

### (4) Interactions

- **M-078** Flipping a feature switch updates the row at once and saves the whole fifteen-key object 200 ms later. The first flip on a new studio therefore writes all fifteen defaults into the studio's settings. `FEAT:119-121,112-117`, `HUB:256`
- **M-079** The master switch flips optimistically, saves `{ enabled }` immediately and toasts **"Portal enabled"** or **"Portal disabled — homeowners will see a paused page"**. `FEAT:96-108,123-126`, `HUB:143-146`
- **M-080** Tooltips open after 200 ms on hover or focus, above the icon, `max-w-xs`. `FEAT:166,186-195`

### (5) States

- **M-081** Paused: an amber strip — **"Portal is paused. Feature toggles below are inactive — turn the master toggle on to manage them."** — the list at 50 % opacity (`transition-opacity`), every feature switch disabled, the master switch still live. `FEAT:157-170,203-207`

### (7) Rules and logic

- **M-082** There are three default tables and they disagree. Settings screen: Scope Details **on**, Floor Plan **on**. Shared resolver: Scope Details **off**, Floor Plan **off**. Project page: Scope Details **off**, Floor Plan **on**. Only `designSelections` is ever read from the resolver's copy, so the disagreement shows nowhere today — but it is three places to keep in step. `FEAT:42-63`, `RES:81-97`, `HP:66-72`
- **M-083** The project API forwards the stored `features` object raw ("Defaults are applied client-side"); the page fills gaps with its own table and hides tabs. No homeowner route checks a feature flag, so a switched-off section's data is still served to anyone who asks (confirms I-33). `api/homeowner/projects/[id]/route.ts:336-339`, `HP:162-177`
- **M-084** A top tab hides only when all of its children are off: Design needs both Material Selections and Floor Plan off; Support needs both Chat and Raise a Support Ticket off. Overview can never be hidden. `HP:104-109,170-171`

### (10) Problems

- **M-085** "Material Selections" hides two things. Both the Renders and the Selections sub-tabs are keyed to `designSelections`, and so is "Recent Design Assets" on the home page; there is no switch for renders on their own. `HP:82-83`, `HOME:97`
- **M-086** "Action Queue" is described as a widget "on Overview + Dashboard" in the code comment and hides only the Overview one; the home page's pending-actions strip is always shown. `FEAT:27-29`, `HP:408`, `HOME:63-67`
- **M-087** "Invoices and Payments" off removes the Finance tab — and with it the quote and variation orders, whose own switches then mean nothing. `HP:106,660-661`
- **M-088** Four switches read by nothing (I-402, confirmed by search): Milestone Approvals, View and Sign Contracts, Auto-share Selections, Scope Details. The last was "flipped to true" by a UAT fix so that "newly-created studios see the scope questionnaire … by default" — the flag still gates nothing. `FEAT:51-56`
- **M-089** Tooltip promises that are not true (extends I-403): "Adds an Updates tab", "Adds a Scope tab", "Adds a Selections tab" (it is a sub-tab of Design), "homeowners can comment" on quotes, "banner on their dashboard", "real-time chat", "Click an item to jump". `FEAT:66-80`

---

## 5. Branding

### (2) Layout

- **M-090** A `space-y-6` stack: header row with save indicator and Reset; the theme picker (grey rounded-xl panel); then five bordered sub-panels, each with a 14 px icon, a title and a sub-line — **Identity** ("Logos, tagline, cover image"), **Colors** ("Pick a preset or fine-tune"), **Typography** ("Heading and body fonts"), **Login Screen** ("What homeowners see when they sign in"), **Layout fine-tuning** ("Card style, corner radius, density, header, footer"). `BRAND:116-380,386-399`
- **M-091** Header: title **"Branding"**, sub-line **"Identity, colors, fonts, login screen, layout fine-tuning"**. `BRAND:123-124`

### (3) UI elements — theme

- **M-092** **"Start from a theme"** — **"One click sets colors, fonts and spacing — not your layout. Fine-tune anything after."** — a `grid-cols-2 sm:grid-cols-3` grid of twelve buttons, each with three 14 px swatches (primary, accent, surface or white), the name and a two-line description. `set/theme-preset-picker.tsx:19-62`
- **M-093** The twelve, with descriptions verbatim: **Minimalist Studio** "Clean and quiet. Whitespace does the talking." · **Heritage Studio** "Formal serif typography on a navy-and-gold parchment palette." · **Boutique Studio** "Warm cream and brass. Hospitality-grade, editorial feel." · **Modern Studio** "Friendly, card-based, brand color forward." · **Industrial Studio** "Charcoal and amber. Technical, structured, no-nonsense." · **Coastal Studio** "Soft sage and slate. Relaxed and approachable." · **Botanical Studio** "Forest and sage greens. Organic, calm, and grounded." · **Scandi Studio** "Warm light neutrals. Airy, unfussy, Scandinavian." · **Editorial Studio** "Stark black & white with one bold red. Magazine-grade." · **Terracotta Studio** "Sun-baked clay and warm earth tones. Mediterranean." · **Blossom Studio** "Soft blush and rose. Gentle, modern, and welcoming." · **Ocean Studio** "Deep teal and seafoam. Fresh, crisp, and confident." `PRE:107-312`
- **M-094** Each preset also names a layout and a login layout; applying a theme deliberately throws those two away and keeps the studio's own. `PRE:92-104`, `BRAND:102-113`

### (3b) UI elements — Identity

- **M-095** Four upload wells in a two-column grid, each a dashed square (128 px; Favicon 80 px) showing an upload icon, a spinner, or the image with a 20 px red ✕: **"Studio Logo"** — "Shown in the portal header. See the recolor toggle below if your logo shouldn't be turned white."; **"Login Page Logo"** — "Optional, can be larger. Falls back to studio logo if empty."; **"Favicon"** — "Square icon for browser tabs (ideally 32×32 or larger)."; **"Cover Photo"** — "Hero image used in About / Portfolio sections." `BRAND:135-156`, `src/components/ui/image-upload.tsx:27-31,106-150`
- **M-096** **"Recolor logo to white"** switch — "Keep on for a dark, single-color logo on dark/colored headers. Turn off to show a light or full-color logo in its original colors." Default off. `BRAND:157-165`, `RES:40-44`
- **M-097** **"Logo size"** — "Scales your logo on the login screen (and the portal hero). Increase it if your uploaded logo looks too small." — a range slider 0.5–2 in steps of 0.05 with the value as a percentage. Default 100 %. `BRAND:166-188`
- **M-098** **"Studio Tagline"** text field, placeholder **"E.g., Thoughtfully designed homes since 1987"**. `BRAND:189-197`

### (3c) UI elements — Colors, Typography

- **M-099** **"Quick color presets"**: a horizontally scrolling row of nine pills (two overlapping dots and a name; the matching one tinted with a tick) — OpenMaison `#5500FF/#4400CC` · Warm Earth · Modern Mono · Botanical · Coastal · Architectural · Boutique Brass · Heritage Navy · Pop Pastel. Each preset also defines a surface colour that the row never applies. `set/color-preset-row.tsx:17-51`, `PRE:21-31`
- **M-100** Three colour fields, each a 32 px native colour well beside a hex text box: **"Primary Color"**, **"Accent Color"**, **"Surface Tint (optional)"** — "Subtle background tint behind content. Leave default for plain white/gray." (placeholder "Leave empty for default"). `BRAND:207-217,401-428`
- **M-101** **"Heading Font"** and **"Body Font"** selects (fourteen fonts, each option drawn in its own face) with a live sample under each: "The quick brown fox" and "The quick brown fox jumps over the lazy dog. Sample of body text in this typeface for previewing readability." The fonts: Outfit, Inter, DM Sans, Montserrat, Poppins, Space Grotesk, IBM Plex Sans, Source Sans 3, Playfair Display, Cormorant Garamond, EB Garamond, Lora, Merriweather, Fraunces. `set/font-picker.tsx:39-78`, `PRE:49-64`

### (3d) UI elements — Login Screen

- **M-102** **"Login Layout"**: six tiles in `grid-cols-2 sm:grid-cols-3`, each a 4:3 schematic drawn in the studio's primary colour, a name and a line (names and lines as in I-389). `BRAND:233-256,432-502`
- **M-103** **"Login Title"** (placeholder "Welcome") and **"Login Subtitle"** (placeholder "Log in to view your project"), side by side. `BRAND:258-267`
- **M-104** **"Background Image"** well with the help text quoted in I-389; picking an image smaller than 1600×900 px raises a warning toast — **"This image is {w}×{h}px. For a crisp background we recommend at least 1600×900px; smaller images may look blurry on large screens."** — and uploads anyway. `BRAND:269-280`, `image-upload.tsx:70-80`
- **M-105** **"Overlay Color"** and **"Overlay Opacity"** (range 0–1 step 0.05, caption "{n}% opacity") appear only after a background image is set. Defaults black, 40 %. `BRAND:282-299`, `PRE:324-325`
- **M-106** **"Welcome Message (optional)"**, a three-row text area, placeholder **"A short message above the login form. HTML allowed."** `BRAND:301-310`
- **M-107** **"Show trust badge"** — "Adds a small “Secure · End-to-end encrypted” line under the form." Default off. `BRAND:312-318`

### (3e) UI elements — Layout fine-tuning

- **M-108** Three selects: **"Card Style"** (Flat (border only) · Soft shadow · Heavy shadow · Borderless), **"Corner Radius"** (Sharp · Soft · Pill), **"Density"** (Compact · Comfortable · Spacious). Defaults Soft shadow, Soft, Comfortable. `BRAND:324-359`, `PRE:316-319`
- **M-109** **"Header Text"** (placeholder "Your Studio Name") and **"Footer Text"** (placeholder "All rights reserved"); **"Watermark"** switch — "Show a faint studio watermark on portal screens." `BRAND:361-378`

### (4) Interactions

- **M-110** An upload well opens the file picker on press (`image/jpeg, image/png, image/webp, image/gif` only); the file posts to `/api/portal/upload-asset` and the returned address is stored; the ✕ clears the field (the stored file is not deleted). The component's comment says "click-or-drop" but there is no drop handler. `image-upload.tsx:56-58,97-104,151-161`
- **M-111** Applying a theme, a colour preset, a font or any field updates the form at once and autosaves 1.5 s after the last change; the preview reloads after the save, not as the studio types. `BRAND:91-100`, `HUB:133-136,266`

### (5) States

- **M-112** Upload errors (toasts): the server's text — **"File too large (max 5MB)"**, **"Invalid file type. Allowed: JPEG, PNG, WebP, GIF, SVG, ICO"**, **"Invalid purpose"**, **"No file provided"**, **"Failed to upload"**, **"Unauthorized"** — or **"Upload failed"**. A broken stored image hides itself silently. `api/portal/upload-asset/route.ts:27-71`, `image-upload.tsx:86-91,131-134`

### (6) Motion

- **M-113** Tiles, pills and wells use `transition-colors`; the upload spinner spins; the layouts' nav buttons use `transition-all`. `set/theme-preset-picker.tsx:36`, `image-upload.tsx:114,119`

### (7) Rules and logic — what the homeowner actually gets

- **M-114** Merge order (I-400, confirmed): platform defaults → company branding (`settings.branding`) → portal values that differ from the default. `RES:171-181`
- **M-115** Logo order: portal logo → chat avatar → company logo → `studios.logo_url` → none (the layouts then draw the studio's initial). I-400 named the first step; the chat avatar outranking the company logo is deliberate "legacy Tree-1 behaviour". `RES:146-147,200-207`
- **M-116** Primary colour is darkened when its perceived brightness is above 190/255, "keeping the hue", so white button text stays readable; pure white collapses to dark grey. The studio is not told. `cmp/layouts/portal-theme-styles.tsx:27-43`
- **M-117** Surface Tint is washed to 16 % over white on portal pages "so it always lands as a light wash". The login layouts skip this and use the raw colour. `PRE:349-367`, `cmp/login-layouts/split-login-layout.tsx:84`, `cmp/login-layouts/centered-login-layout.tsx:30-31`
- **M-118** Per-layout wording a studio cannot change: Traditional prints **"Client Portal"** under the name and **"Confidential · Authorized Access Only"** in the footer, with **"© {year} {studio}. All rights reserved."** when Footer Text is empty; Detailed prints **"Workspace"** twice and a search box reading **"Search…"** that does nothing; Premium prints **"— Private Residences Concierge —"**, **"{studio} — Established Excellence"** when Footer Text is empty, and **"Powered by OpenMaison"**. `cmp/layouts/traditional-layout.tsx:33,78-80`, `cmp/layouts/detailed-layout.tsx:45,50-55,60`, `cmp/layouts/premium-layout.tsx:54,104,108`
- **M-119** Favicon and fonts are injected by `PortalThemeStyles`, which the five layouts and the project page's shell render and the login page does not — so the login screen keeps the platform's fonts and icon. `portal-theme-styles.tsx:45-102`, `cmp/portal-shell.tsx:89`
- **M-120** The welcome message is cleaned on display to `p br strong em u a ul ol li h2 h3 h4 blockquote span`; anything else typed as "HTML" is dropped. `cmp/login-layouts/welcome-message.tsx:11-18`

### (8) Data

- **M-121** Uploads: at most 5 MB; types JPEG, PNG, WebP, GIF, SVG, ICO; purpose `team`, `about-us` or `paynow-qr`; stored at `studio-assets/{studioId}/{purpose}/{uuid}.{ext}`; the public URL is saved into settings. Every branding upload uses the purpose `about-us`, whatever it is. `api/portal/upload-asset/route.ts:14-21,49-68`, `BRAND:139-154`

### (9) Responsive

- **M-122** Grids drop to one column below `sm` (uploads, colours, fonts, title/subtitle, header/footer); the theme and login-layout grids keep two columns; the colour presets scroll sideways with the scrollbar hidden. `BRAND:135,207,234,258,324,361`, `set/color-preset-row.tsx:21`

### (10) Problems

- **M-123** Twenty-eight controls, of which roughly a third change nothing on the page clients spend their time on (trace table). The screen gives no hint which is which.
- **M-124** The file picker's accept list blocks `.ico` and `.svg`, so the Favicon well cannot take the two formats a favicon usually is, though the server would accept them. `image-upload.tsx:154`, `api/portal/upload-asset/route.ts:15`
- **M-125** SVG is accepted by the server into a public bucket and served from its public URL; an SVG can carry script. **[inferred]** `api/portal/upload-asset/route.ts:15,56,63`
- **M-126** Replaced or cleared images are never removed from storage. `image-upload.tsx:101-104`
- **M-127** "Show trust badge" prints a security claim ("End-to-end encrypted") nothing in the product backs. `BRAND:315`
- **M-128** Footer Text falls back to the company's quote / invoice footer when the portal's is empty, because both layers use the key `footerText`. **[inferred]** `RES:177-181`, `src/components/accounts/branding-editor.tsx:507-509`
- **M-129** With "Recolor logo to white" on, the default Centered login draws the white silhouette on its pale wash of the brand colour, where it all but disappears; the switch's help text speaks only of "dark/colored headers". **[inferred]** `src/app/my/[studioSlug]/login/page.tsx:201-209`, `cmp/login-layouts/centered-login-layout.tsx:30-31`
- **M-130** Nothing shows which theme or colour preset is in force after a reload unless the two colours still match a preset exactly; themes never show as selected. `set/theme-preset-picker.tsx:30-59`

---

## 6. Layout

### (3) UI elements

- **M-131** Title **"Portal Layout"**, sub-line **"Click a layout to apply it — the preview updates instantly"**; five cards in `grid-cols-1 sm:grid-cols-2` with name, description (I-391) and the word **"Active"** on the chosen one. `set/portal-layout-picker.tsx:25-59`

### (4) Interactions

- **M-132** A press marks the card active at once, pushes the choice to the preview as `?previewLayout=`, and saves behind; on failure the mark returns and a toast says **"Could not change layout"** (I-396). `HUB:269-285,341`
- **M-133** The cards carry no picture of the layout — only a name and one line. The older hover preview was removed because "hovering over cards while reading them was changing the iframe, which felt jumpy". `set/portal-layout-picker.tsx:12-21`

### (10) Problems

- **M-134** "The preview updates instantly" is true only if the preview is showing Dashboard, About Us or Empty state. It opens on **Login screen**, which no page layout touches, so pressing a layout card visibly changes nothing until the studio changes the preview's view. **[inferred]** `set/portal-live-preview.tsx:45`, `SL:161-163`
- **M-135** In the mock Project detail view the outer chrome follows the pressed layout at once but the tab strip follows the saved one, so for a moment the two disagree. `PV:184`, `SL:119-124`
- **M-136** The layout does not dress the project page (I-404, I-424); there it only decides whether the top bar is dark (Traditional, Detailed, Premium) or light. `cmp/portal-shell.tsx:21-30`

---

## 7. Voice

### (3) UI elements

- **M-137** Title **"Voice and Copy"**, sub-line **"Greeting tone and custom navigation labels"**. `set/voice-config.tsx:50-51`
- **M-138** Panel **"Greeting Tone"** — "Used for the greeting on the homeowner dashboard." — three cards: **Formal** `"Welcome, Mr. Tan."`, **Friendly** `"Hi Sarah!"`, **Casual** `"Hey there!"`. Default Friendly. `set/voice-config.tsx:59-82`, `PRE:321`
- **M-139** Panel **"Navigation Labels"** — "Rename any portal tab. Leave blank to keep the default. Empty fields fall back to the default label." — ten inputs in two columns, each placeholder "Default: {label}": Overview, Updates, Finance, Design, Moodboard, Scope, Issues, Chat, Floor Plan, About. `set/voice-config.tsx:12-23,86-108`

### (7) Rules and logic

- **M-140** What the greeting really prints, by time of day: Formal "Good morning / Good afternoon / Good evening"; Friendly "Hi / Hello / Good evening"; Casual "Morning / Hey / Evening" — each followed by ", {first name}" (or "there"). None of the three examples on the cards can appear. `HOME:21,148-164`
- **M-141** The real portal menu has three items — Home, About, Team — and reads `customNavLabels.home`, `.about`, `.team`. The screen offers an input for About only; Home and Team can be renamed in the data but not in the UI; the other nine inputs rename tabs that exist only in the mock preview. The project page's own tabs (Overview · Design · Finance · Documents · Support) cannot be renamed at all. `src/lib/portal-nav.ts:21-41`, `PV:186-201`, `HP:104-109`

### (10) Problems

- **M-142** The preview's dashboard prints a fixed "Good evening, Sample", so a tone change shows nothing; the only place the section visibly "works" is the mock tab strip, which is not what clients get (I-405, I-406). `PV:119-121`

---

## 8. Profile

### (2) Layout

- **M-143** `space-y-5`: header with save indicator and Reset, then five bordered panels — Year Established, Awards and Certifications, Social and Web, Contact, Footer Links. `set/studio-profile-config.tsx:55-170`

### (3) UI elements

- **M-144** Title **"Studio Profile"**, sub-line **"Identity facts homeowners see across the portal"**. `set/studio-profile-config.tsx:63-64`
- **M-145** **"Year Established"**: a 128 px number box, placeholder "2010", helper **"Optional. Shown as “Est. {year or YYYY}” in the About section."** `set/studio-profile-config.tsx:71-81`
- **M-146** **"Awards and Certifications"** with **"Add Award"**: each row is a 48 px logo well, **"Award name"**, **"Year"** and a bin; empty state **"No awards added yet."** `set/studio-profile-config.tsx:84-126`
- **M-147** **"Social and Web"**: Website, Instagram, Facebook, Pinterest, LinkedIn, TikTok, YouTube — placeholders `https://yourstudio.com`, `https://instagram.com/yourstudio`, `https://facebook.com/yourstudio`, `https://pinterest.com/yourstudio`, `https://linkedin.com/company/yourstudio`, `https://tiktok.com/@yourstudio`, `https://youtube.com/@yourstudio`. `set/studio-profile-config.tsx:130-143`
- **M-148** **"Contact"**: Phone ("+65 9123 4567"), WhatsApp ("+65 9123 4567"), Email ("hello@yourstudio.com"), Office Address ("123 Studio Lane, Singapore"). `set/studio-profile-config.tsx:147-157`
- **M-149** **"Footer Links"** — "Optional links shown in the portal footer." — Privacy Policy URL, Terms URL, Contact URL, each placeholder "https://...". `set/studio-profile-config.tsx:161-168`

### (4) Interactions

- **M-150** Every edit autosaves the whole profile 1.5 s later. Adding an award appends an empty row; the bin removes a row at once, no confirmation, no undo. `set/studio-profile-config.tsx:21-26,40-53`

### (7) Rules and logic — where it shows

- **M-151** On the About page a profile card draws, in order: the cover photo as a 3:1 hero with the studio name and tagline over a dark gradient (or the tagline alone, italic, when there is no photo); **"Est. {year} · {studio}"**; **"Awards & Recognition"** (two-column cards with logo or an award icon); **"Get in touch"** (Phone → `tel:`, WhatsApp → `wa.me`, Email → `mailto:`, Office → Google Maps search); **"Follow us"** (18 px icons). It draws nothing at all when every part is empty. `cmp/studio-profile-card.tsx:21-150`
- **M-152** Social icons and the three footer links also sit in the footer of every layout, i.e. on the home, About, Team and lead-stage pages. `cmp/portal-footer-extras.tsx:29-78`, `cmp/layouts/modern-layout.tsx:96-100`
- **M-153** Any year, award, social link or contact entry makes the **About** item appear in the portal menu, published About page or not. Footer links alone do not. `src/lib/portal-nav.ts:28-37`

### (10) Problems

- **M-154** No field is checked: a year can be negative or five digits, an email need not be an email, a link need not be a link, a phone need not be a number. Links are used as `href` exactly as typed. `set/studio-profile-config.tsx:73-77,174-186`, `cmp/portal-footer-extras.tsx:39`
- **M-155** The page's helper says the year appears "in the About section"; the card label on the page is "Awards & Recognition" while the editor's is "Awards and Certifications". `set/studio-profile-config.tsx:80,88`, `cmp/studio-profile-card.tsx:66-68`
- **M-156** The studio enters company facts twice: Accounts › Studio Branding already holds a tagline, mission statement, company phone, email, address, website, social links and accreditations; none of these feed the portal's Profile (different keys: `tagline` vs `studioTagline`; `settings.branding.socialLinks` vs `portal.studioProfile.socialLinks`). `src/components/accounts/branding-editor.tsx:227-334`, `RES:150-152,220-226`
- **M-157** The profile does not reach the project page: its shell has no footer and no About link. `cmp/portal-shell.tsx:84-103`

---

## 9. Scope — questions, the studio's widget, and what the homeowner gets

### (2) Layout

- **M-158** A card inside the hub's card (`rounded-xl p-5`): header with **"Add Question"**, the list of questions, and an inline add form that opens below the list. `set/scope-form-builder.tsx:99-187`

### (3) UI elements

- **M-159** Title **"Scope Questions"**, sub-line **"Customize the questions homeowners answer about their project"**. `set/scope-form-builder.tsx:103-106`
- **M-160** A question row: a grip icon, the question, a caption **"{Type} · Required · {n} options"** (the last two only when they apply), an on/off switch and a bin. `set/scope-form-builder.tsx:115-131`
- **M-161** Add form: a text box (**"Enter your question..."**, focused on open), **"Type"** select — **Yes / No · Text · Number · Single Select · Multi Select · Date** (default Text) — a **"Required"** switch, and, for the two select types, **"Options"** as a tag input (**"Type an option, press Enter"**); buttons **"Add"** and **"Cancel"**. `set/scope-form-builder.tsx:22-29,140-185`
- **M-162** Empty state: **"No custom questions yet. The default lifestyle questions are always available."** `set/scope-form-builder.tsx:132-136`

### (4) Interactions

- **M-163** Add saves at once (no autosave here) with the new question enabled and last in order; toast **"Question added"**; a select type with no options toasts **"Add at least one option"**; failure **"Failed to add question"**. `set/scope-form-builder.tsx:43-71`
- **M-164** The row switch enables or disables a question immediately and silently (a failure is only logged). The bin deletes immediately — toast **"Question removed"** or **"Failed to remove"** — with no confirmation. `set/scope-form-builder.tsx:73-97`
- **M-165** A question cannot be edited after it is added — not its wording, type, options or Required flag. The only way to change one is delete and re-add. `set/scope-form-builder.tsx:113-131`
- **M-166** The grip icon shows a grab cursor and does nothing; there is no drag handler and no other way to reorder. New questions take `sortOrder = current count`, so after a deletion two questions can share an order number. `set/scope-form-builder.tsx:117,59`

### (5) States

- **M-167** Loading shows nothing (the empty state waits for the load to finish). Cancel closes the add form but keeps what was typed for next time. `set/scope-form-builder.tsx:132,183`
- **M-168** This section has no save indicator and no Reset; it is the only one that writes straight to its own table. The hub never counts it as configured (M-049). `HUB:287,155`

### (7) Rules and logic — the studio's side of the questionnaire

- **M-169** The studio sees the questions as a **"Homeowner Questionnaire"** block in the lead drawer and inside the project Overview's customer card, with **"{answered}/{total} answered"**, **"Fill answers"** and **"Ask homeowner"**. `src/components/shared/homeowner-questionnaire.tsx:337-371`, `PP:2282-2289`
- **M-170** Each question row shows the answer read-only, a pill saying who answered — **"Homeowner"** (green, house icon) or **"Studio"** (grey, person icon) — a pencil to answer on the client's behalf (Save / Cancel inline), and a clock icon that opens the answer history. A required question carries a red asterisk here. `homeowner-questionnaire.tsx:219-311,374-389`
- **M-171** States, verbatim: no phone — **"Add a phone number to this lead to enable the questionnaire — the homeowner link is created automatically when the phone is saved."** / **"This project's originating lead has no phone number yet — add one to enable the questionnaire."**; link failed — **"The lead has a phone number but we couldn't bind it to a homeowner profile."** followed by the raw error code in monospace; no questions — **"No questions configured yet. Set them up in Accounts → HomeOwner Portal → Scope."**; load failure — **"Could not load the questionnaire. Refresh to try again."** `homeowner-questionnaire.tsx:163-217`
- **M-172** "Ask homeowner" opens **"Ask the homeowner"** — **"We'll notify {name} in their portal and they can answer your questions there."** (or **"There are no enabled questions yet. Configure them in Accounts → HomeOwner Portal → Scope before sending."**) — with a read-only **"Portal link"**, **"Copy"** / **"Copied"**, **"Last sent: {relative} — please wait a few minutes before sending again"**, and buttons **"Cancel"** / **"Send notification"** (**"Sending..."**). `src/components/shared/invite-to-answer-dialog.tsx:78-147`
- **M-173** Sending is throttled to once per five minutes per link, on both sides. It raises one notification event (`homeowner.questionnaire_requested`, "v1 ships in-app only; SMS/email channels are deferred"), stamps the link, and logs `questionnaire_invite_sent` on the lead. The link it carries is `/my/{slug}/p/{token}?action=answer-questions`. `src/lib/scope-answers/invite.ts:16,48-145,160-162`, `src/lib/notifications/events.ts:505-518`
- **M-174** Route errors: **"No homeowner link for this project"** (409), **"Studio has no portal slug configured yet"** (409), **"Lead has no phone — add one before sending."** (409), **"Project not found"**, **"Internal error"**. `api/projects/[id]/send-questionnaire/route.ts:38,51-56,76-81,98-102`
- **M-175** Answers belong to the homeowner, not to the link: reads gather every answer that person has given in the studio and keep the newest per question, so one person with two leads has one set of answers. Every overwrite appends two history rows (old value, new value). `src/lib/scope-answers/server.ts:94-146,320-405`

### (7b) Rules and logic — the homeowner's side

- **M-176** The questionnaire is drawn in exactly one place: the lead-stage page `/my/engagement/{linkId}`, under the heading **"A few questions"**, and only while no quote has been shared ("Once the studio sends a quote to the portal, the homeowner shifts to reviewing/signing, so the questionnaire is hidden"). `EP:119-130`
- **M-177** It is not on the home list ("Scope questionnaire is NOT shown on the dashboard list") and not on the project page, although that same comment and the component's own header both say it is. `HOME:69-73`, `cmp/scope-questions-section.tsx:3-7`, `HP` (no import of the section)
- **M-178** The homeowner sees every enabled question as one form with **"Save Responses"** (**"Saving..."**); after a first save it turns into a read-only summary with **"Edit responses"**; success toast **"Thanks — your answers are saved"**, failure **"Could not save answers"**. Saving notifies the studio: **"Questionnaire updated: {project or lead}"**. `cmp/scope-questions-section.tsx:99-137`, `cmp/scope-questions-form.tsx:104-146`, `api/homeowner/scope-answers/route.ts:139-170`
- **M-179** With no enabled questions the block draws nothing; so does a load error. `cmp/scope-questions-section.tsx:80-92`

### (8) Data

- **M-180** `studio_scope_questions` (studio_id, question, question_type, options[], is_required, is_enabled, sort_order); `homeowner_scope_responses` (unique on link + question); `homeowner_scope_response_history`; `homeowner_project_links.last_questionnaire_invite_at`. Routes: `GET/POST /api/scope-questions/records`, `PATCH/DELETE /api/scope-questions/records/{id}`, `GET/POST /api/leads|projects/{id}/scope-answers` (+ `/history`), `POST /api/leads|projects/{id}/send-questionnaire`, `GET/POST /api/homeowner/scope-answers`. `api/scope-questions/records/route.ts:22-32`, `src/lib/scope-answers/server.ts:4-8`

### (10) Problems

- **M-181** "Ask homeowner" does not land on the questions. For a lead the token page forwards to the home list with `?action=answer-questions`; the list has no questionnaire and the flag is not carried into the lead-stage page. For a project it forwards to the project page, which has no questionnaire. **[inferred]** `src/app/my/[studioSlug]/p/[portalToken]/page.tsx:113-122`, `cmp/project-card.tsx:35-46`
- **M-182** Once a lead becomes a project — or as soon as a quote is shared — the homeowner can no longer see or answer the questions, while the studio's block goes on offering "Ask homeowner". **[inferred]** `EP:123`, `PP:2282-2289`
- **M-183** "Required" is display only. The studio's list shows an asterisk; the homeowner's form is given no required flag (the mapping drops it) and saves with anything blank. `cmp/scope-questions-section.tsx:84-90`, `homeowner-questionnaire.tsx:231`
- **M-184** "The default lifestyle questions are always available" — there are none. No default question exists in code or in the table's migration; a studio that adds nothing has no questionnaire. `set/scope-form-builder.tsx:134`, `supabase/migrations/20260503000013_scope_form_builder.sql`
- **M-185** Deleting a question takes it away from both sides at once; what happens to answers already given depends on a foreign key not read. Disabling hides it from the homeowner but keeps it for the studio. `api/scope-questions/records/[id]/route.ts:122-124`
- **M-186** The Features switch "Scope Details" and its tooltip ("Adds a Scope tab… Configure the questions in the Scope section") describe a tab that does not exist and gate nothing (M-088).
- **M-187** The studio's block requires a link with role "primary"; a client invited from the project header gets role "owner" (I-47) and the block then reads as "no phone number yet" or a bind error. `src/lib/scope-answers/server.ts:72-78`
- **M-188** The file the code cites as this feature's spec, `docs/features/homeowner-questions/spec.md`, is not in the repository. `src/lib/scope-answers/invite.ts:8-9`

---

## 10. Team

### (3) UI elements

- **M-189** Header: `Users` icon, **"Team Members"**, **"Visible on the homeowner portal"**; on the right the save indicator with Reset, then a label reading **"Published"** or **"Draft"** beside a switch. `set/team-page-editor.tsx:60-77`
- **M-190** Empty state (dashed box): `Users` icon, **"No team members yet"**, **"Add the people homeowners will work with."** `set/team-page-editor.tsx:80-86`
- **M-191** A member card: an 80 px photo well; **"Member {n}"**; an eye / eye-off button (title **"Hide from portal"** / **"Show on portal"**); a bin; **"Name"** ("Full name") and **"Role"** ("E.g., Senior Designer") side by side; **"Bio (2 lines max)"**, a two-row text area ("Brief intro..."). Below the list: **"Add Member"**. `set/team-page-editor.tsx:88-139`

### (4) Interactions

- **M-192** Everything autosaves 1.5 s after the last change; rows with an empty name are left out of the save "so empty placeholders don't pollute storage" (they stay on screen until reload). `set/team-page-editor.tsx:36-44`
- **M-193** The bin removes a member at once, no confirmation; the eye flips visibility; there is no reordering — members show in the order added. `set/team-page-editor.tsx:50-56,101-112`

### (7) Rules and logic

- **M-194** Homeowners get a **Team** item in the portal menu and the page **"Our Team"** only when the section is Published **and** at least one member is visible. The page is a `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` of cards: a square photo (or a circle with the initial), name, role, and the bio clamped to three lines. `src/lib/portal-nav.ts:39-42`, `cmp/team-page.tsx:18-58`
- **M-195** These people are typed by hand. They are not the studio's members, not the project's assigned designer, and not the "team" the project page shows from the project record. `set/team-page-editor.tsx:14-20`
- **M-196** "Bio (2 lines max)" is a label only: the box takes any length and the portal clamps at three lines. `set/team-page-editor.tsx:126-127`, `cmp/team-page.tsx:51`

### (10) Problems

- **M-197** Draft is not private. The public settings route returns every member, visible or not, published or not; only the portal's pages filter. `RES:212-215`, `api/portal/studio-settings/route.ts:46-53`
- **M-198** The live preview has no Team view in its menu; a studio can see the page only by publishing and then pressing "Team" inside the preview's own navigation. `set/portal-live-preview.tsx:76-80`, `PV:101-107`
- **M-199** Reset after an autosave restores the list the editor opened with, then autosaves it — it can bring back a member the studio just deleted or drop one it just added, depending on timing. **[inferred]** `set/team-page-editor.tsx:69`
- **M-200** The deep-link wipe in M-071 lands here.

---

## 11. About Us

### (3) UI elements

- **M-201** Header: `Info` icon, **"About Us"**, **"Tell homeowners about your studio"**; save indicator with Reset; **"Published"** / **"Draft"** with a switch. `set/about-us-editor.tsx:124-145`
- **M-202** Toolbar (28 px buttons in a bordered strip, groups split by hairlines): Bold · Italic | Heading 2 · Heading 3 | Bullet list · Numbered list | Insert image · Embed YouTube · Add link | Undo · Redo. The active mark is tinted purple. `set/about-us-editor.tsx:206-254`
- **M-203** Editor: a rich-text box at least 260 px tall, placeholder **"Write about your studio, your approach, your values..."**; helper below — **"Insert images via the image button. Embed YouTube videos by URL via the video button. Changes auto-save."** `set/about-us-editor.tsx:47-53,167-169`
- **M-204** Dialogs: **"Embed YouTube video"** (field "https://www.youtube.com/watch?v=...", **"Cancel"** / **"Embed"**) and **"Add link"** (field "https://...", **"Cancel"** / **"Apply"**, which reads **"Remove link"** when the field is empty). `set/about-us-editor.tsx:171-201`

### (4) Interactions

- **M-205** Autosave 2.5 s after the last keystroke — "a longer debounce so heavy typing doesn't thrash the iframe". `set/about-us-editor.tsx:59-66`
- **M-206** Insert image opens the file picker (JPEG, PNG, WebP, GIF), refuses over 5 MB with **"Image too large (max 5MB)"**, uploads, and drops the image in at the cursor; failure toasts the server's text or **"Upload failed"**. `set/about-us-editor.tsx:82-100,155-165`
- **M-207** A link typed without a scheme gets `https://` added; links open in a new tab. YouTube embeds are 640×360 with controls, served from the no-cookie domain. `set/about-us-editor.tsx:45-46,109-120`

### (7) Rules and logic

- **M-208** Published text appears in two places: at the foot of the portal home page, under a rule, and on the About page — both headed **"About {studio}"**. Text with no real characters is treated as empty. `HOME:31-32,139-143`, `src/app/my/[studioSlug]/about/page.tsx:20-23`, `cmp/about-us-page.tsx:59-74`
- **M-209** The HTML is saved as typed and cleaned on display to a fixed tag list (headings, paragraphs, lists, links, images, tables, code, `iframe`). `cmp/about-us-page.tsx:24-49`
- **M-210** The About item in the menu appears when the page is published, **or** a tagline exists, **or** any profile fact exists — so a studio with a tagline and a draft About gets an About page showing only the profile card. `src/lib/portal-nav.ts:35-37`

### (10) Problems

- **M-211** Draft is not private: the public settings route returns `aboutUs.htmlContent` whatever the Published switch says. `RES:216-219`
- **M-212** The comment says embeds are limited to YouTube and Vimeo; the rule only requires `https`, so any https page can be framed by pasted HTML. `cmp/about-us-page.tsx:44-48`
- **M-213** There is no heading 1, no image alignment or caption, no table button (though tables would display), and no character guidance; the hub counts About as "configured" at 21 characters. `set/about-us-editor.tsx:41-43`, `HUB:157`

---

## 12. Live preview

### (2) Layout

- **M-214** A bordered panel: a toolbar row (wraps), then a scrolling grey area holding either a browser frame or a phone frame. `set/portal-live-preview.tsx:67-138`

### (3) UI elements

- **M-215** Toolbar: a view select (**Login screen · Dashboard · Project detail · About Us · Empty state**, 130 px), for Project detail a second select of ten tabs (120 px), two 28 px device buttons (monitor, phone; the active one tinted), **"Reload"** and **"Open"** (new tab). Opens on **Login screen**, desktop. `set/portal-live-preview.tsx:44-46,69-119`
- **M-216** Desktop: a browser window drawing — three traffic-light dots, a padlock and the full address in monospace — around the page rendered at a true 1,280 px width and scaled down to fit, so the portal's desktop chrome shows instead of its phone chrome. `set/portal-live-preview.tsx:141-199,281-305`
- **M-217** Phone: a 390×820 handset drawing (44 px corner radius, side buttons, a notch pill, "9:41", signal and battery glyphs) with the page inside. `set/portal-live-preview.tsx:206-251`

### (5) States

- **M-218** No slug: the panel is a centred line, **"Save your portal slug to enable live preview."** `set/portal-live-preview.tsx:49-57`
- **M-219** Each reload shows the portal's own loader — the word **"Loading..."** pulsing — then the page. `SL:136-140`

### (7) Rules and logic — what each view is

- **M-220** **Login screen** is the real login page. While the portal is paused it shows the real **"Portal paused"** page instead, since only `/preview/` routes bypass the pause. `set/portal-live-preview.tsx:22`, `SL:106-108,151`
- **M-221** **Dashboard** is a mock: "Good evening, Sample", "Your projects with {studio}.", two invented projects ("4-Bedroom HDB · Clementi" In Progress; "Master Bedroom Refresh" Planning) and three "Sample render" tiles, inside the real chosen layout. `PV:115-171`
- **M-222** **Project detail** is the ten-tab mock (I-404) with invented figures: "S$72,000", "INV-001 Deposit", four scope questions, two issues, a three-bubble chat. `PV:286-453`
- **M-223** **About Us** is real content, drafts included, under a banner: **"Draft preview — this About page is not published, so homeowners can't see it yet. Toggle “Published” in the About Us editor to make it live."**; empty reads **"No About content yet"** / **"Add your studio story in the About Us editor — it'll appear here."** `PV:67-99`
- **M-224** **Empty state** is a mock of a homeowner with no projects: **"No projects yet"** / **"Your studio will invite you when your project begins."** `PV:43-61`
- **M-225** The preview routes are public — no studio or homeowner login is needed — and take the layout from `?previewLayout=`. Menu presses inside the frame stay within the preview. `src/proxy.ts:239-248`, `SL:116-124,171-182`

### (10) Problems

- **M-226** Section by section, does the preview show the truth? Features — no ("Show every tab in preview"). Branding — yes for login and chrome. Layout — yes, once off the Login view. Voice — no. Profile — yes (About view and footers). Scope — no (invented questions). Team — no view. About — yes. `PV:188-189`
- **M-227** The preview reloads only after a save lands, so it trails typing by the debounce plus a round trip; nothing in the panel says so. `HUB:133-136`
- **M-228** "Open" on the desktop preview opens the same mock address in a full tab, where the mock reads as a real page. The view the studio most wants — its client's actual project page — is not here; that is "Preview as Homeowner" on a project (I-51). `set/portal-live-preview.tsx:111-118`
- **M-229** The phone frame is a fixed 390 px wide inside a panel that is about two-fifths of the hub; on narrow settings pages it overflows and scrolls sideways. **[inferred]** `set/portal-live-preview.tsx:121,217`

---

## 13. Project Links — verification of I-115…I-134 and additions

- **M-230** I-115 to I-134 hold as written, with the corrections and additions below. `TOOLS:229-731`
- **M-231** The list is every lead and every unarchived project the member may see — lost and closed leads included — loaded whole, with no paging; a project replaces the lead it came from. `TOOLS:238-270`
- **M-232** The designer filter (I-127) can never apply on this page: the page is owner only (M-007), and an owner sees everything. `TOOLS:242,258`, `AC:107`
- **M-233** "Portal Users" shows no state for anyone: not whether they have logged in, not when they last looked, not whether they were invited. The link records a last-seen time; it is used only to decide whether a progress update can still be unpublished. `TOOLS:541-600`, `api/projects/[id]/progress-updates/[updateId]/unpublish/route.ts:56-68`
- **M-234** The Add Family Member dialog never sends a country code, and the server then assumes Singapore for both the check and the E.164 form — a Malaysian, UAE or Indian studio's family members are refused or stored with the wrong prefix. **[inferred]** `TOOLS:667-672`, `api/portal/family-members/route.ts:131,137-142`
- **M-235** If the phone already belongs to a homeowner in the studio, the name and email typed are ignored — the existing profile is linked as it is. `api/portal/family-members/route.ts:157-180`
- **M-236** A family member added at the lead stage is not carried over when the lead becomes a project: only the link with role "primary" is given the project id. The family member's link stays lead-only, drops out of the project's Portal Users list, and no longer reaches the project. **[inferred]** `src/lib/homeowner-binding.ts:171-188`, `api/homeowner-links/promote-lead-link/route.ts:41-48`, `api/portal/family-members/route.ts:86-91`
- **M-237** A family link is inserted with no portal token, so the "Ask homeowner" style token links cannot address a family member. `api/portal/family-members/route.ts:201-208`
- **M-238** "Update Contact Details" validates against the studio's own region only; the Update button is disabled until the number differs; errors toast **"Phone is required"** and **"Invalid phone: {reason}"** (two that I-126 did not list). `TOOLS:390-406,627`
- **M-239** Removing a family member is a hard delete of the link (I-125); the list refreshes with no toast and no undo. `TOOLS:589-597`, `src/lib/queries/family-members.ts:64-75`
- **M-240** For a lead the top-right button is **"Open portal link"** with the tooltip **"Lead entries have no project — falls back to the public portal (homeowner OTP required)."**; for a project it is **"Open as homeowner"**, tooltip **"Open the live portal as this homeowner — read-only, no OTP required."** `TOOLS:503-524`
- **M-241** Layout and copy otherwise as I-117…I-123. Responsive: one column below `lg` (list above details); the list scrolls inside 480 px. `TOOLS:286-301`

---

## 14. The APIs behind setup

- **M-242** `GET /api/identity/studio-settings` — the session studio's row, shaped for the UI; 404 **"Studio not found"**. `PATCH` — accepts `chatIdentityName`, `settings` (a slice, always merged at the top level), `countryCode`, `currencyCode`, `timezone`, `locale`, `portalSlug`. No field list beyond that, no role check, no validation of what is inside `settings`. `SSR:24-143`
- **M-243** The merge exists because whole-object replacement "erased Mavid's `settings.branding` (2026-08-21)"; it is one level deep, so each editor's own key (`portal`) is still replaced whole (M-061). `SSR:75-94,108-109`
- **M-244** `GET /api/studio-setup/portal-slug` → `{ portalSlug }` or null, for the invite dialog. `api/studio-setup/portal-slug/route.ts:23-47`
- **M-245** `GET /api/portal/studio-settings?slug=` — **public**, listed in the proxy's public paths, read with the service-role client. Returns the full resolved settings: studio id and name, logo, slug, enabled, features, merged branding, team, About, profile. Unknown slug → `{ settings: null }`; missing slug → 400 **"slug required"**. `api/portal/studio-settings/route.ts:24-57`, `src/proxy.ts:21`
- **M-246** The resolver removes two keys before answering — `bankDetails` and `emailSignature` — because the company branding block "also carries SENSITIVE keys". Everything else in `settings.branding` goes out with it: company name, address, registration number, phone, email, website, mission statement, accreditations, PayNow QR address, currency override. `RES:183-192`, `api/studio-config/branding/route.ts:58-88`
- **M-247** `POST /api/portal/upload-asset` — multipart `file` + `purpose`; answers `{ url, name, uploadedAt }`. Limits and errors in M-112 and M-121. `api/portal/upload-asset/route.ts:23-73`
- **M-248** `GET/POST/DELETE /api/portal/family-members` — as I-124, I-125, I-133, plus M-234…M-237. Errors: **"projectId or leadId is required"**, **"Project not found"**, **"Lead not found"**, **"projectId or leadId, phone, and name are required"**, **"Invalid phone: {reason}"**, **"Failed to add member"**, **"Failed to create homeowner"**, **"Failed to link homeowner"**, **"linkId is required"**, **"Link not found"**, **"Failed to remove member"**, **"Failed to load family members"**. `api/portal/family-members/route.ts:59-249`
- **M-249** `GET/POST /api/scope-questions/records`, `PATCH/DELETE …/{id}` — tenant-scoped through row-level security; errors **"question and questionType are required"**, **"No updatable fields provided"**, **"Not found"**. The question type is stored as sent, unchecked. `api/scope-questions/records/route.ts:99-119`, `api/scope-questions/records/[id]/route.ts:72-104`
- **M-250** `GET /api/config/pages` — the page switches a studio sees: the platform's global map with the studio's own `settings.page_visibility` laid over it; a key that is missing counts as on. `api/config/pages/route.ts:8-51`, `src/context/platform-config-context.tsx:46-51`
- **M-251** Preview and invite routes are as I-14…I-36 and I-60…I-68; nothing to add.

---

## 15. Accounts Setup — the other places that shape the portal

### (1) What it is / entry points

- **M-252** `/accounts`, header **"Accounts Setup"** — "Configure your studio's lead pipeline, AI rules, and workspace settings." A 224–256 px sticky sidebar of collapsible groups with a **"Search settings..."** box, and a content card at least 600 px tall. Nine groups; the eighth is **"HomeOwner Portal"** with the single item "HomeOwner Portal". `ACC:76-164,631-700`

### (3) UI elements — portal-related tabs

- **M-253** **Branding & Comms › Studio Branding** — "Customize your branding on quotes, contracts, emails, and client-facing pages." Fields: Company Name, Tagline, Mission Statement, Studio Logo, Brand Color, PayNow / DuitNow QR, Company Address, Registration (UEN), Company Phone, Company Email, Currency Symbol on Quotes, accreditation badges, bank block ("Displayed on invoices and the client payment portal."), Custom Footer Text ("Shown at the bottom of quotes, contracts, and invoices."), Email Signature. The portal takes logo and brand colour as fallbacks and, unintentionally, the footer text (M-128). `src/components/accounts/branding-editor.tsx:218-520`
- **M-254** **Finance › Payment Methods** — "Configure bank details, payment methods, and who confirms incoming payments." **Bank Details** ("Shown on invoices and the homeowner payment portal."): Bank Name (a list with "Select bank..." and "Other"), Account Name, Account Number, Branch Code, SWIFT / BIC Code. **Custom Payment QR** — "Optional — upload your own QR (Stripe, Razorpay, etc.). Shown to homeowners in place of the auto-generated PayNow/DuitNow QR when set.", with the warning "Heads-up: a static QR won't pre-fill the invoice amount when scanned. Homeowners enter the amount manually." **PayNow QR** (Singapore only) — "A QR code will be auto-generated for homeowners to scan and pay." — with **PayNow ID (UEN or Phone)** and a live "PayNow QR Preview". A DuitNow block for Malaysia. `ACC:3239-3475`
- **M-255** Same tab, **Payment Confirmation** — "Who gets notified when a homeowner says they have made payment?" — **"Who confirms payments?"**: Assigned Designer · Studio Owner · Specific Team Member (then **"Select Team Member"**). Default Assigned Designer. `ACC:3545-3586`, `api/homeowner/projects/[id]/payment-submit/route.ts:230`
- **M-256** Same tab, **Homeowner payment trust mode** — "Decide what happens the moment a homeowner uploads a payment screenshot." — switch **"Trust homeowner submissions"** with a description that changes: on, "ON — invoices are marked paid immediately when a homeowner uploads proof. Your team can still reject and the cascade reverses. The homeowner sees a "received, pending review" message until management verifies."; off, "OFF — homeowner uploads stay unverified until your team confirms. Invoice is marked paid only after verification. Safer default." Default off. `ACC:3590-3608`
- **M-257** That tab saves with one button, **"Save Payment Settings"** (toast **"Payment settings saved"** / **"Failed to save payment settings"**), unlike the hub. Its checks: PayNow UEN "8-10 digits with an optional trailing letter", "a Singapore 8-digit mobile number", DuitNow "a Malaysian mobile number or business registration number"; QR "must be under 5MB". `ACC:3129-3167,3223-3229,3611-3615`
- **M-258** **Workflow › Workflow Rules** — eleven switches that save one by one with a toast "{label} enabled / disabled". The ones a homeowner feels: **"Progress review required"** — "Require owner review of progress updates before they're visible to homeowners"; **"Timeline approval required"** — "Require owner approval of the project Gantt timeline before it goes live (distinct from individual milestone approval)."; each, when on, shows an approver picker labelled "Approvers (owners are always included; add extra members to route this approval to)". All default on. `ACC:1622-1690`, `api/studio-config/workflow/route.ts:16-29`
- **M-259** **Finance › PO Settings › Invoice Approval** — "Require an owner or admin to approve invoices before they're sent to homeowners." — switch **"Require approval before sending invoices"**. `ACC:2992-3004`
- **M-260** **Workflow › Feature Flags** — "Studio-level feature toggles. Take effect immediately." Four switches; the portal-facing one is **"CaseTrust signing step (Singapore only)"** — "Insert a CaseTrust deposit-protection disclosure step into the client signing flow. Has no effect outside Singapore." — with a **"Preview disclosure"** button. **"Lock project on handover"** affects the studio only. Each saves at once: **"Setting saved"** / **"Could not save setting"**. `src/app/(main)/accounts/feature-flags-tab.tsx:79-124`
- **M-261** **Quotes & Pricing › Quote Sharing › Sharing Methods** — three radio cards: **"Both Methods (Recommended)"** — "Team can choose between standalone link or homeowner portal link when sharing. Best for flexibility."; **"Standalone Link Only"** — "Only show the quick shareable link option. Best for studios that don't use the homeowner portal."; **"Homeowner Portal Only"** — "Only show the portal link option. Best for studios that want all clients using the portal." Saves at once: **"Sharing preference updated"**. `ACC:1466-1536`
- **M-262** **Workflow › Proactive Alerts** is studio-internal (review tasks before milestone due dates); its **"Auto-create progress update"** switch can add an update to the project when a designer asks for an extension, which then follows the progress-review rule. `ACC:2755-2860`
- **M-263** **Studio › Legal Entities** — each entity's bank block says "Used on invoice PDFs and the payment portal. Each field falls back to your studio bank settings when empty." It feeds invoices; the portal's pay card does not read it. `src/app/(main)/accounts/legal-entities-tab.tsx:583`
- **M-264** **Quotes & Pricing › Document Templates** does not mention the homeowner portal; it authors quote terms and the contract a client signs. `src/app/(main)/accounts/document-templates-tab.tsx:106,182-191`
- **M-265** Outside Accounts: **Settings › Notifications** (owner only; others are sent back to Settings) ends with **"Customer Notifications"** — "Optional emails sent to your clients and prospects" — one switch per informational client event, default on. Named rows: "Send signing confirmation email to client", "Send payment confirmation email to client", "Notify homeowner when meeting is assigned"; the rest take the event's own label (Payment Verified by Studio, Timeline Published to Homeowner, Selection Shared with Homeowner, Studio Requested Questionnaire, Escalation Resolved, Studio Annotated Floor Plan, Floor Plan Shared). Failure toast **"Failed to update customer notification preference"**. `src/components/settings/notification-settings.tsx:51-55,150-153,326-361`, `src/lib/notifications/events.ts:826-835`

### (10) Problems

- **M-266** "Sharing Methods" is saved and read by nothing; the type it is saved under even lists different values ("link" | "pdf" | "both"). A studio choosing "Homeowner Portal Only" changes nothing. `ACC:1499-1508`, `src/types/app.ts:625`
- **M-267** Bank details are kept in three places — Payment Methods (`payment_details`, plus a legacy copy in `bank_details`), Studio Branding and the setup wizard (`branding.bankDetails`), and each legal entity — and the homeowner's two money views read different ones: the pay card reads Payment Methods; the invoice view reads branding or the entity. `ACC:3185-3219`, `api/homeowner/projects/[id]/payment-info/route.ts:73-100`, `api/homeowner/projects/[id]/invoices/[invoiceId]/route.ts:58-109`
- **M-268** So a studio that entered its bank in the wizard and never opened Payment Methods has invoices that show a bank and a portal Finance tab with no pay card and no "I've Made Payment". **[inferred]** `HP:806-811`
- **M-269** Everything in M-253…M-262 is open to any member who can reach `/accounts`; the routes behind them check only the session (M-008, M-010).
- **M-270** The portal's settings are split across at least six screens (the hub, Studio Branding, Payment Methods, Workflow Rules, Feature Flags, Settings › Notifications) with three save models: autosave (hub), save-per-switch (workflow, flags), and a Save button (payments, branding).

---

## 16. First-time setup and the defaults

- **M-271** A new owner is redirected to `/studio-setup` on every page until setup is marked complete. `ML:138-141`
- **M-272** The wizard has seven steps and none configures the portal. Step 2's tagline is the only mention of clients: "Your logo and address appear on every quote, invoice, and contract." `SETUP:29-37`
- **M-273** Its last step, **"Your Studio Is Live"**, lists "Recommended next steps": Create your first lead · Invite your team · (only if Branding was skipped) **"Set up your branding"** · Upload sample quotes · Connect Gmail for lead ingestion. The portal is not on the list. `SETUP:684-727`
- **M-274** "Set up your branding" goes to `/accounts?tab=portal&section=branding` — the **portal's** Branding section, not the company branding the skipped step was about (which lives at `?tab=client-portal`). A studio sent there sets portal colours and still has no logo or address on its quotes. `SETUP:705-711`, `ACC:141,1436-1442`
- **M-275** The welcome dialog's owner list — "Invite your team", "Configure your lead pipeline", "Connect email for auto-import" — and the page coach marks have nothing for the portal. `src/components/ui/welcome-modal.tsx:12-16`, `src/components/ui/page-coach-marks.tsx:27-110`
- **M-276** How the slug first came to exist: one migration filled it for the studios of the day from their names (lower-cased, spaces to hyphens, a four-character id suffix on duplicates). There is no trigger and the create route does not set it, so every studio made since starts with none. `supabase/migrations/20260503000017_studio_portal_slug.sql:4-34`, `api/admin/studios/route.ts:193-204`
- **M-277** Until a slug is saved, the address in every invite is `/my/login`: the OpenMaison logo, **"Use your studio's portal link"**, **"Each interior design studio has its own portal. Your designer should have shared a link with you — it looks like:"** `openmaison.ai/my/studio-name`, **"Don't have it? Ask your designer to resend."**, and a box **"Or enter your studio's name"** that needs the very slug the studio does not have. `src/app/my/login/page.tsx:36-90`, `api/homeowner/invite/route.ts:370-372`
- **M-278** A brand-new studio's portal with nothing configured, once a slug is saved: portal on; login Centered on a faint wash of the brand colour, title "Welcome", subtitle "Log in to view your project"; logo from the wizard if one was uploaded, else the studio's initial; primary `#5500FF` (or the wizard's brand colour), accent `#4400CC`; Outfit headings, Inter body; Modern layout, soft-shadow card, soft corners, comfortable spacing; greeting "Hi / Hello / Good evening, {first name}"; no menu at all (Home alone shows no menu); no footer text; no watermark; no trust badge. `RES:34-76`, `src/lib/portal-nav.ts:44-45`
- **M-279** Same studio, features: everything on except Chat and Homeowner Tasks. Team and About unpublished. No scope questions. `HP:66-72`, `HUB:107-108`
- **M-280** The login subtitle's richer fallback ("Log in to view your project with {studio}") can never show, because the resolved branding always carries the plain default. `src/app/my/[studioSlug]/login/page.tsx:188`, `RES:57`

---

## 17. Platform admin

### (1) What it is / entry points

- **M-281** OpenMaison's own console at `/admin` (separate login and cookie, `qanvast_admin_session`). Twenty-one sidebar items; the ones that touch a studio's portal are **Studios**, **Analytics** and **Settings**. `src/app/admin/layout.tsx:22-42`

### (3) UI elements and (4) interactions

- **M-282** **Studios list**: nine sortable columns — Studio, Owner, Plan, Members, Leads, Projects, Status, **Portal**, Joined — and an open button per row. Portal is a pill reading **"On"** (green) or **"Off"** (grey). `src/app/admin/studios/page.tsx:140-156,204-207`
- **M-283** **Create studio**: studio name, owner name, email, phone, plan, password, country. It makes the auth user, profile, studio (active, "not_submitted" verification, chat name = studio name, region defaults) and the owner's membership with tags owner + admin + id, and seeds default taxonomies. No portal slug, no portal settings. `api/admin/studios/route.ts:99-249`
- **M-284** **Studio detail › Features** (fifth tab of Overview · Members · Refunds · Billing · Features): a "Pause internal notifications" switch, then **"Per-Studio Feature Visibility"** — "Overrides the global defaults for this studio only. Toggle to enable/disable a feature, or reset to inherit the global setting." — four groups of switches. **"Homeowner Portal"** is the seventh of eight under Tools. `ADM:53-104,696-750`
- **M-285** A switched-off row is struck through; a row with an override carries a **"Studio override"** chip and a **"Reset to global"** link. Toggling is optimistic with rollback: **"Feature visibility updated"** / **"Failed to update feature visibility"**; reset: **"Override removed — using global default"** / **"Failed to reset feature visibility"**. All switches lock while one saves. `ADM:341-360,394-417,712-741`
- **M-286** **Admin › Settings** holds the global page list (Main Pages, Finance, Qanvast Ops, Tools, Other). **Homeowner Portal is not in it** — the portal can be switched per studio only, never globally from the UI. `src/app/admin/settings/page.tsx:10-51`
- **M-287** **Analytics**: the studio leaderboard has a **"Portal"** column (tooltip "Homeowner portal logins in window") and a **"Portal logins"** total tile; a studio's health page has a **"Homeowner engagement"** block with two tiles, **"Portal logins"** and **"Issues reported"** (amber when above zero), over 30 days. `src/components/admin/analytics/studio-leaderboard.tsx:122,269-270,331`, `src/components/analytics/studio-health-view.tsx:150-157`
- **M-288** The studio's own owner sees the same health view at Accounts › Studio › "Studio Health" (owner only). `ACC:82`, `src/components/settings/usage-dashboard.tsx:13-35`

### (7) Rules and logic

- **M-289** Per-studio switches need an admin with access to the "studios" admin page; the global list needs `super_admin`. `api/admin/studios/[id]/page-visibility/route.ts:37-39`, `api/admin/page-visibility/route.ts:48-50`
- **M-290** The two numbers come from two tracked events: `portal_login` on a successful homeowner OTP, and `portal_issue_reported` when a homeowner files a ticket. Nothing else about portal use is counted — no views, no approvals, no payments, no questionnaire answers. `api/homeowner/auth/verify/route.ts:117`, `api/homeowner/projects/[id]/issues/route.ts:206`
- **M-291** Demo studios (`settings.is_demo`) are left out of the leaderboard unless `includeDemo=true`, and "must never trigger real outbound notifications". The homeowner bell writes its rows directly, not through the dispatcher, so it is not covered by that rule. **[inferred]** `api/admin/analytics/leaderboard/route.ts:21,317`, `src/lib/studio-demo.ts:6-10`
- **M-292** What the platform admin cannot do: see or set a studio's slug; see, reset or override its portal branding or features; pause its portal; see its homeowners, links or family members; act as a homeowner. None of the admin routes read `portal_slug` or `settings.portal`. (search of `src/app/admin`, `src/app/api/admin`)

### (10) Problems

- **M-293** The switch is described in the code as turning "the whole portal feature off per studio"; it turns off the studio's setup screens and four studio-side shortcuts, and leaves the portal open to clients (M-018). `TOOLS:41-43`
- **M-294** The list's "Portal" pill and the detail tab's switch both read the studio's override alone and show "On" when there is none — even if the global default were off. `api/admin/studios/route.ts:73-76`, `ADM:714-715`
- **M-295** With the switch off, "Invite to Portal" stays in the studio app and still produces a working login link. `PP:1708-1716`

---

## 18. Where docs and code disagree

- **M-296** `docs/rules/homeowner-portal.md:98` — the hub is an "owner-only tab in `/accounts`". Code: it is in `/accounts` **and** under Tools; the Tools one is owner only, the Accounts one is not, and the save route has no role check (M-001, M-008, M-010).
- **M-297** Same file, line 99 — portal branding's "single source of truth is `studios.settings.branding`". Code: the portal has its own store, `settings.portal.branding`, which wins wherever it differs from the default (M-114).
- **M-298** Same file, line 92 — layout and branding are "configured per-studio under `studios.settings.portal`" and themed for the portal. True for the home pages; the project page takes only a subset (trace table).
- **M-299** `docs/rules/tools.md:31` calls `/tools/homeowner-portal` the "Homeowner Portal Preview — Studio-side preview of the homeowner portal". It is the configuration hub plus Project Links.
- **M-300** `docs/prd/03-homeowner-portal.md:52` — "Per-studio toggle: admins turn the portal on/off per studio." Code: the admin toggle hides setup; the studio's own Enabled switch is the only thing that pauses anything, and only partly (M-018, bottom line).
- **M-301** Same PRD, line 50 — the questionnaire is "a scope questionnaire widget mounted in the lead drawer". Code: also on the project Overview; and for the homeowner only on the lead-stage page before a quote (M-169, M-176).
- **M-302** Same PRD, line 75 — "Branding missing → resolves from `settings.branding` (no longer shows platform defaults)". Code: only logo, primary colour and footer text fall through; fonts, accent and the rest are platform defaults (M-114).
- **M-303** `docs/prd/02-studio-customization.md:51,57` — "a single source of truth (`settings.branding`)" and "One branding source feeds quotes, invoices, signing page, PO portal, and homeowner portal". Code: two branding stores for the portal, three for bank details (M-267).
- **M-304** `docs/features/homeowner-portal/spec.md:45-47,181-191` — access is by invitation; do not create a profile otherwise (I-422). Nothing in the spec describes studio-side configuration at all: no slug, no hub, no features, no layouts, no Team or About, no pause — the whole of this file is unspecified there.
- **M-305** Same spec, lines 413-415 and decision 4 — "The portal shell (sidebar, header, footer) uses Qanvast branding". Code: white-label by intent ("the OpenMaison platform logo must NOT appear to the homeowner"), with the slips in M-118.
- **M-306** `docs/features/portal-merge-integration/uat-deep-findings.md:103` says the preview shows "Save your portal slug…" "since slug isn't set in `studios.settings.portal`". The slug is a column, not a key in that block; and the note's "UX nice-to-have would be to auto-populate" was never done (M-276).
- **M-307** `uat-plan.md:160` — "Studio sends scope questionnaire to homeowner via `/api/scope/invite`". The routes are `/api/leads/{id}/send-questionnaire` and `/api/projects/{id}/send-questionnaire`.
- **M-308** `uat-transition-scope.md:142` — "Submit scope questionnaire from `/my/projects/[id]`". The project page has no questionnaire (M-177).
- **M-309** `uat-deep-findings.md:101` marks `/tools/homeowner-portal` as passing because "8 sections all render". Rendering was the test; which settings take effect was not checked.
- **M-310** In-code claims that do not hold: the Scope empty state's "default lifestyle questions" (M-184); the dashboard and section comments placing the questionnaire on the project page (M-177); the About sanitiser's "restrict src" to YouTube / Vimeo (M-212); the upload well's "click-or-drop" (M-110); the route comment's slug length "3-32 chars" (M-055); the page comment that the admin switch turns "the whole portal feature off" (M-293).

---

## 19. The earlier reader's rows — what stands, what changes

| Row | Verdict | Change |
|---|---|---|
| I-378 | Partly wrong | The "isn't enabled for your studio" message is never shown; the layout's "Coming Soon" block wins (M-013, M-014) |
| I-379…I-381 | Stand | — |
| I-382 | Stands | Add: the section buttons' one-line descriptions are never drawn (M-038) |
| I-383 | Stands | — |
| I-384 | Stands | Add M-039…M-041, M-055…M-060 |
| I-385, I-386 | Stand | Add the tooltips (M-076), the 2/8 start (M-050) |
| I-387…I-390 | Stand | Theme names are "… Studio"; add where each control takes effect (trace table) |
| I-391, I-392 | Stand | — |
| I-393 | One row for four sections | Replaced by §8, §9, §10, §11 here |
| I-394 | Stands | Add what each view is (M-220…M-225) |
| I-395 | Incomplete | Profile and Team 1.5 s, About 2.5 s; Reset exists on five sections and resets to last saved, not to defaults (M-044, M-047) |
| I-396, I-397 | Stand | — |
| I-399 | Incomplete | Scope lives in its own table; images in a storage bucket (M-063) |
| I-400 | Stands | Add: chat avatar outranks the company logo (M-115) |
| I-401…I-406, I-408 | Stand | — |
| I-407 | Imprecise | Ceiling is 5/8, start is 2/8 (M-050) |
| I-409 | Stands | Extended in M-060 |
| I-410 | Stands | A third spelling site: the Features panel's own title (M-074) |
| I-419 | Partly wrong | The hub **is** also in `/accounts`; and the Tools page **is** owner-guarded, by the layout — the open door is the Accounts mount and the API (M-001, M-007, M-008, M-010) |
| I-115…I-134 | Stand | Add M-231…M-240; I-127's designer filter is unreachable (M-232) |
| I-37, I-33 (bottom line) | Stand | Pause also blocks login and spares the lead-stage page (M-220, bottom line) |

---

## Uncertain / not verified

- Nothing was run. Every row marked **[inferred]** is a reading of the code: the platform switch being overridable by a studio (M-019), the "Coming Soon" block masking the page's own message (M-013…M-015), reserved-word slugs colliding (M-057), old links dying after a rename (M-060), the four autosave loss paths (M-067…M-071), the footer-text fall-through (M-128), SVG risk (M-125), the questionnaire link landing on the wrong page (M-181, M-182), the country-code default for family members (M-234), lead-stage family members not following the project (M-236), the pay card's absence after wizard-only bank details (M-268).
- Whether the `studio-assets` bucket is public and what its size or type policies are — no migration creates it; the route simply returns its public URL.
- What happens to stored answers when a scope question is deleted (cascade or orphan) — the foreign key was not read.
- Whether `resolveStudioBranding` / the invoice send route honour "Require approval before sending invoices" as its label says — the label and its storage were read, not its enforcement.
- The four login layouts not read line by line (Split Reverse, Full Bleed, Hero Top, Framed); their use of each setting is taken from a search for the setting's name and from the two that were read in full.
- `src/app/(main)/accounts/page.tsx` (3,825 lines) was read by region — menu, tab resolution, portal save, sidebar, Studio Branding mount, Quote Sharing, Workflow Rules, the hub mount, Proactive Alerts, Invoice Approval, Payment Methods — not end to end. A portal-related control outside those regions could have been missed; a search for "portal", "homeowner", "customer", "paynow", "trust", "progressReview", "casetrust" found no others.
- `branding-editor.tsx`, `legal-entities-tab.tsx` and `document-templates-tab.tsx` were read for their labels and portal mentions only.
- The platform admin pages beyond Studios, Settings and Analytics were checked by search for "portal" / "homeowner", not read; the Users page (1,021 lines) has no homeowner management by that search.
- Whether any production studio has an empty-string or reserved-word slug, or a `page_visibility` override written from the studio side, is unknown.
- Whether the homeowner bell fires for demo studios (M-291) depends on the binding helper bypassing the dispatcher, which was read in the earlier slice, not re-read here.
- `docs/features/studio-customization/*` beyond the lines that mention the portal, and `docs/features/portal-merge-integration/uat-qa-sheet.csv`, were searched rather than read.
