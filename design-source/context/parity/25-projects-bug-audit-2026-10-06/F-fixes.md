# F — the client portal: fix outcomes (package fix-F, 2026-10-06)

Findings: `F-portal-client.md` (47) + routed: C-07 (Seen by the person who opened it), C's note "the portal's Updates page at 1440 is
a narrow column pinned left". Status as I go — Fixed (what, where) · Not a bug (the rule) · Owned by another package (which).

| ID | Outcome |
|---|---|
| F-01 | Fixed — the bell's phone sheet renders through a portal to `document.body` (as the desk popover), inside `.brandScope` so it keeps the studio's colour (`components/portal/bell.tsx`, `portal.module.css`). |
| F-02 | Fixed — at ≤1024 the name gives way, the sections scroll in their own row, the bell and Sign out keep their size; probe: no sideways scroll and Sign out on screen at 768 touch · 834 · 1024 (`portal.module.css`). |
| F-03 | Fixed — every portal record names its person: Schedule (`LiveStage.answeredById`, `answer.mine`, `confirmBlock(…, readerId)`), Money (`waiting[].by/mine`), Choices (`project_selections.chosen_homeowner_id`, `chosen.person/mine`, `clientPickBlock(…, by)`); "You" only for the reader (`portalPeopleOf` · `portalWho`, `lib/portal/household.ts`). |
| F-04 | Fixed — `sayPaid` logs `person`; Activity reads "Mei Ling Han, from Benjamin Han’s household, said they paid …" (`app/portal/payment-actions.ts`, `lib/leads/activity.ts`). |
| F-05 | Fixed — `AnswerInput` takes a `label`; the portal passes the client's words "Your answer" · "Pick one" · "Pick any" (invented copy); the studio's tab keeps the Question Types names (`question-card.tsx`, `portal-questions.tsx`). |
| F-06 | Fixed — what leaves the portal's pages opens in a new tab (`hrefFor`); the floor plan gets real bytes in R77b. |
| F-07 | Fixed — the due / to-confirm block lists each confirmed part payment with its Receipt (`portal-money.tsx`). |
| F-08 | Fixed — `components/portal/money/pay-box.tsx`: the QR a PNG picture (saves on a long press) that opens large in the house viewer; Copy on the amount, reference, PayNow ID (house `useCopy`). Invented copy flagged (board 4 draws the QR only). |
| F-09 | Fixed — board 7's Money card on the home (`MoneyCard` on the Money tab's `PaidSoFar`), off with the Money switch. |
| F-10 | Fixed — `focusWhenLive`: the number field on arrival, box 1 once the code is sent, after the ghost's `inert` lifts. |
| F-11 | Owned by another package — D (the invoice / receipt papers' own content, `invoice-paper.tsx` · `payments-receipt.tsx`, per the routing). |
| F-12 | Fixed — Download PDF beside Back to Money (the studio page's: the browser's print); print rules hide the bar, the phone bar and the preview strip (`portal-doc.tsx`, `portal.module.css`, `money.module.css`). |
| F-13 | Fixed — the contact link only goes to a mobile: the designer's, else the studio's own when a mobile ("Message Demo Studio on WhatsApp"), else none (`contact.label`, `components/portal/contact-line.tsx`); R77b seeds designers' mobiles. |
| F-14 | Fixed — the file route marks a shown file opened for that person (`portal_bell_reads` key `file:<id>`); `HomeFile.opened` keeps it out of What needs you / More / Files count. |
| F-15 | Fixed — an update opened since publish reads its bell row (`BellUpdate.opened`); the bell re-reads when the page stamps one (`BELL_REFRESH`). |
| F-16 | Fixed — a household person's rows from before their invite read as read (`BellHome.since`, `VisitorLink.invitedAt`). |
| F-17 | Fixed — Money reads `?open=<invoice>` (and `#pay-`): scroll, pulse, the address goes back. |
| F-18 | Fixed — due soon / overdue follow what is still owed (`overdueMinor` / owed), part paid or not. |
| F-19 | Fixed — the signed-out refusal (`SIGNED_OUT`) carries **Sign in** back to this page (`use-portal-say.ts`; Schedule, Money, Choices, Questions, the bell). |
| F-20 | Fixed — signed-out pages go to `login?next=<this page>`; `verifyCode` returns it (`safeNext` · `loginPath`). |
| F-21 | Fixed — a withdrawn number reads "Demo Studio has stopped this number’s access. Ask your designer if you need it again." (invented copy). |
| F-22 | Fixed — `resolvePortalSlug` lower-cases; a different spelling redirects to the kept address, as an old one does. |
| F-23 | Fixed — not theirs → the portal notice "This isn’t on your page any more" + Back to Money / Back to your page (`PortalNotice kind="gone"`, `app/my/[slug]/gone`). |
| F-24 | Fixed — one rule: documents, designs links and files open in a new tab; portal pages in place (`hrefFor`). |
| F-25 | Fixed — a pick brings Confirm into view when it is below the fold (`choice-board.tsx`). |
| F-26 | Fixed — a moved stage says it once on its row (the old range struck before the new, `StageMark.wasRange`); the side card is a summary ("1 week later", "New") — `lib/portal/schedule-model.ts` `moveOf`. |
| F-27 | Fixed — the thank-you for "Something is not right" wears a chat glyph on the studio's tint; "With your designer" in the open (amber) tone, never red (Vicky may prefer neutral). |
| F-28 | Fixed — "Under way" (`CLIENT_STATE_LABEL`). |
| F-29 | Fixed — `clientDay(ms, now)` ("6 Oct", the year only when not this year) on Choices, Home, Files › Documents, Money, Designs. |
| F-30 | Fixed — Choices · Designs · Files head with the tab's word (pages and ghosts). |
| F-31 | Fixed — no lede over an empty page; "Pick the one you like" (invented copy). |
| F-32 | Fixed — stage names sentence-cased for the client (`clientStageName`): "Mid-project". Board 4's own words ("When works started", "At handover") as template defaults are Vicky's call. |
| F-33 | Fixed — the contract's parts in cents (`PaidSoFar`). |
| F-34 | Fixed — a planned day already past reads the quote's words, else "When {stage} is done". |
| F-35 | Fixed — Paid on checked against the send day before Send; "Add a screenshot or PDF" on touch (`ProofField title`). |
| F-36 | Fixed — What needs you skips a need the current Before step carries. |
| F-37 | Not a bug — board 5 (`SignIn.dc.html`) draws the code step's "Ask Germaine at Demo Studio to update it"; the mock wins. Flagged for Vicky: it names the designer to anyone who types a client's number. |
| F-38 | Fixed — R77b: the designers' mobiles; Benjamin's floor plan with pages; board 3's "Confirm this stage" (Germaine's update "The water test passed in both bathrooms" on Electrical & plumbing, with a PDF report, approved by Dane, opened by Benjamin); Kevin Ng invited with his designs open (Designs); board 6 — Serena Koh's quote sent for her confirmation, invited, three questions asked. Idempotent (0 records on a second run); every check passes on the scratch copy and on a fresh baseline rebuild. |
| F-39 | Fixed — neutral house hover, hover-capable pointers only. |
| F-40 | Fixed — the confirm card's two answers at 14/500 with no side padding, one line at 390 (`project.module.css`). |
| F-41 | Fixed — sign-in white, the 56 mark on a phone, a centred column at a desk. |
| F-42 | Fixed — frame ghost: plain mark bone, the bell's glyph, the name and Sign out as text; Home's ghost: the stages card and the Money card. |
| F-43 | Fixed — no phone bar when Home is the only place. |
| F-44 | Fixed — "Send my answers" is the portal's step button, full width at ≤767. |
| F-45 | Owned by another package — D (`invoice-paper.module.css`, the paper's totals). |
| F-46 | Fixed — Sign out in More on a phone (the header keeps it only with no bar); a desk need's button "See how to pay" (board 7). |
| F-47 | Fixed — a refused bell read clears the rows and says why (signed out → sign in again). |
| C-07 | Fixed (routed) — `project_updates.client_opened_by`; the studio card reads "Seen by Mei Ling" (`markUpdatesSeen`, `lib/projects/updates.ts`, `update-card.tsx`). |
| C-note | Fixed (routed) — Updates at a desk is the split page (feed + the designer line beside it), as Schedule and Money. |

## Counts

47 findings + 2 routed (C-07, C's Updates note): **46 fixed** (incl. both routed) · **1 not a bug** (F-37 — board 5 draws it; flagged for
Vicky) · **2 owned by package D** (F-11, F-45 — the invoice / receipt papers' own content). F-32: one case for the client now; board 4's own
stage words as template defaults are Vicky's call.

Probes (each on its own fresh copy of the repaired scratch DB, :3125): verify-pj-fix-F 44/44 · r1 83/83 · r2 83/83 · r3 86/86 · r4a 73/73 ·
r4b 74/74 · r5 90/90 · r6 79/79 · r7 63/63 · r8 65/65 · r9 65/65. Where R77b adds a record (an update, two invited clients, the floor plan's
pages) r3 · r4a · r4b · r9 now assert the rule with counts read from the records; r4a · r6 · r9 follow three changed rules (Sign out in More,
"Mid-project", the withdrawn wording). Shots: `shots/F-after/` and `design-source/verify/projects/fix-F/`.
