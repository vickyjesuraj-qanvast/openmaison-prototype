# Quote templates — the 1.0 → 2.0 migration map (for the devs)

Written 2026-09-24 at the end of the quote templates parity rounds (REG-615…620). It says, for every 1.0 table, column, JSON shape and
rule the quote template module touches, where the same thing lives in 2.0 and which round put it there — so a migration script and the
code that follows it have one place to look. The audit (`03-quote-templates-1.0-to-2.0-audit-2026-09-24.md`) holds the reasoning and the
owner's 27 answers (§9); inventory D (`quote-templates-1.0-inventory/D-data-model.md`) holds the column-level diffs (§4) and the full
port plan (§5, D-126…D-177). This page is the short map.

Conventions: 2.0's data is Drizzle over libSQL (`lib/db/schema.ts`), rules live in `lib/`, every write is a server action with
`revalidatePath`. Money is in minor units (1.0 mixed dollars, cents and basis points); layout is in millimetres (1.0 in points: × 0.3528).
A template is **one** record — a design plus the settings a new quote starts with — published in versions; a quote pins a version.
Rounds: **R1** the Items table (REG-617) · **R2** blocks and brand (REG-618) · **R3** content (REG-619) · **R4** this map (REG-620).

## 1. Tables

| 1.0 | 2.0 | Notes | Round |
|---|---|---|---|
| `studio_document_templates` type `quote_pdf` | `quote_templates` + `quote_template_versions` | one row per template; the published design in `design_json`, the New quotes settings in `defaults_json`, the working copy in `draft_json`; every publish a versions row. 1.0 rows land **published v1** (history starts at the port), `is_default` kept (D-161) | — |
| `studio_document_templates.company_id` (entity-scoped rows) | — | not ported (owner, Q-04): 1.0 authored them but no quote render applied them. The quote's issuing entity picks the letterhead, bank, PayNow and GST instead | R2 |
| `studio_document_templates` type `tnc` · `contract` | `quote_text_templates` (kind `terms`) · `contract_templates` | tokens rewritten to 2.0's (D-167) | — |
| `studio_document_templates` type `invoice` · `po` · `vo` · `timeline` · `signing_flow` · `portal` | — | Later: Finance, Projects, Contracts (D-143, D-144) | — |
| `studio_quote_theme_presets` | code (`lib/templates/presets.ts`: Letter · Scope · Form · Presentation) | the four system rows are not ported; a studio's custom preset lands as a **Draft** template at v0 (Q-03, D-164) | — |
| `studio_assemblies` (Packages, `scope 'category'`) | `price_book_sections` (My Sections) | one saved section with its lines and sub-sections, inserted whole; dollars → cents; `region_code` not ported; `property_type` and `tags` kept (below) | R3 |
| `studio_assemblies.property_type` · `tags` | `price_book_sections.property_type` · `tags` (JSON array, ≤ 8 words) | migration `0037_price_book_section_filters`; the Add Item popover lists sections for the quote's property type (or none) first, the rest under "Show all" | R3 |
| `studio_assemblies` platform rows (`is_system`) | — | Platform: 2.0 has no Qanvast-authored content (D-149) | — |
| `quote_generation_rules` | — | held (owner, Q-07); starter sections + My Sections cover the need | — |
| `studio_quote_categories` (`name`, `subcategories`, `description`) | `settings.trades` + **`settings.trade_notes`** | the description becomes the trade's note, printed under a section of that name when the quote writes none (Q-08); sub-categories become rooms / sub-sections per quote | R1 |
| `studio_companies` (legal entities) | `settings.brand.details.entities[]` (`IssuingEntity`) | + `swift`, `logo`, `address`, `uen`, `gstReg` (Q-24, Q-26); up to six; the studio itself first | R2 |
| `studios.settings.branding` (`socialLinks`, `quotePreparedByMode`, `bankDetails`, …) | `settings.brand.details` (`socials`, …) + `settings.quote_rules.preparedBy` | the six networks: website = the company Website field, the other five in `socials` (Q-20); `team_list · studio_only · first_assignee` → `team · studio · member` (Q-25) | R2 |
| `studio_assets` (logo · badge · signature · document_image · font) | `settings.brand.kit` (logo, dark logo, stamp, badges) · `members.signature_*` · pictures inside the design | fonts: the curated 14 (uploads held, Q-14) | — |
| `platform_accreditation_badges` + `settings.enabledAccreditationIds` | `settings.brand.kit.badges` (the studio's uploads) | Q-15: the enabled badges' images copy into the kit; the catalogue stays in 1.0 | — |
| `payment_schedule_templates` | `payment_templates` | percent rows; fixed-amount rows held for Finance (Q-16) | — |
| `leads.quote_metadata.canvaBlocks` · `canvaOverrides` · `layoutOverrides` · `quotes.doc_sections` | `quotes.template_id` · `template_version` · `client_view_json` | a quote never stores a design in 2.0 (Q-02); see §4 | — |

## 2. The design JSON (`lib/templates/model.ts`)

| 1.0 | 2.0 | Round |
|---|---|---|
| layout `sections.numberingMode` `continuous-letter-number` (A1, A2) | Items block `numbering: 'lettered'` | R1 |
| other numbering modes | `group` (per section) · `area` (per room / sub-section) · `nested` (hierarchical 1.2a) · `continuous` · `none` | — |
| `sections.subtotalPosition` `in-band-header · row-after-items · both · hidden` | Items block `subtotalAt: 'band' · 'row' · 'both'` + `subtotals: false` | R1 |
| pricing table `optional.mode 'separate-column'` / the Optional Price column | Items column `optional` (label "Optional"); optional lines print in place, out of every sum. 1.0's `inline-with-tint` mode counted them in the totals — 2.0 never does (Q-11) | R1 |
| `optionalWorksSection { enabled, title, includeInTotal }` | `optionalSection` + `optionalTitle`; `includeInTotal` not ported (Q-11) | — |
| `features.sectionDescriptionEnabled` + `studio_quote_categories.description` | `groupNotes` + the trade's note | R1 |
| `pageRules.watermark { text, opacity, rotation }` | `page.watermark` + `page.watermarkOpacity` (%, 3–40, default 7); rotation not ported (Q-18) | R2 |
| `payment-milestones` `showOrdinal` · `footnote` | Payments block `ordinals` · `footnote` | R2 |
| `bank-details` labels (`holderLabel` · `accountLabel` · `swiftLabel`) · `showSwiftCode` | Bank block `labels` (bank · accountName · accountNo · swift · payNow); the SWIFT row prints when the entity has one; `extraRows` not ported (Q-24) | R2 |
| `social-row` block | canvas element `social` (`networks`, `layout`, `gap`, `style`) — a plain outline mark and the handle per filled network | R2 |
| knob "reset a group" (`resetPathsForGroup`) | "Reset this block" — the block back to a new block's settings, with Undo (Q-19) | R2 |
| everything else | D-90…D-125 | — |

## 3. Rules and where they live

| Rule | 2.0 | Round |
|---|---|---|
| A section with no note prints its trade's note | `sections()` in `components/templates/render/slices.tsx`; notes read in by `fetchBrand` (`lib/templates/queries.ts`) from `settings.trade_notes`, only for trades still in the list; removing a trade drops its note (`setTrades`) | R1 |
| An optional line never counts | `slices.tsx` (section sums, page totals) and `docTotals` (`lib/templates/data.ts`) | R1 |
| A registration number never inherits for another entity | `docLetterhead` (`lib/templates/data.ts`): name, logo, UEN, GST number from the entity; the address falls back to the studio's | R2 |
| `{prepared_by}` by the studio's choice | `fieldValues` (`lib/templates/fields.ts`) reads `studio.preparedByMode`; the lead's members come from `lead_assignees` (`fetchQuoteDocData`, `fetchQuoteEditor`) | R2 |
| `{studio_social}` | the filled networks joined " · ", else the old one-line field | R2 |
| A saved section remembers its quote's property type | `saveSectionToPriceBook` (`app/quotes/items-actions.ts`); only a value from the leads' list (`PROPERTY_TYPES`) | R3 |

## 4. Porting a 1.0 quote's look

One lead at a time, on 1.0's own ladder (D-166): a saved canva body → the lead's migrated sections → the studio's default → none.
When a lead's body differs from every studio template, it becomes **a template of its own**, named after the lead, published, and its
quotes pin to it — so a sent quote keeps printing as the client saw it (owner, Q-02). A lead with no saved body printed 1.0's legacy
design from every server path (B-80); pinning it to the studio default changes how it prints, and the port log should say so. Column
switches, optional works, the payment schedule and the signature carry into `client_view_json`; the section order, notes and sub-total
words become group rows (`quote_items` kind `group`).

## 5. Still the platform's (not in the prototype)

The stored PDF and its render hash, share tokens and OTP (the quote editor audit), fonts uploaded by a studio, the Chromium print route,
region tax wording other than Singapore's GST, platform-authored packages. 2.0's stand-in for each is named in the audit's matrix
(TR-02, TX-04, TT-10, TB-08, TC-02).

## 6. Demo data

Nothing was seeded for these rounds: no trade carries a note, no network is filled, no second entity has a letterhead and the one saved
section (`Bathrooms — full works`) suits any property type — each shows once the studio fills it in Settings › Quotes, Company › Profile
or Company › Price book. `fixtures/baseline.json` needs no change (the two new columns restore as empty).
