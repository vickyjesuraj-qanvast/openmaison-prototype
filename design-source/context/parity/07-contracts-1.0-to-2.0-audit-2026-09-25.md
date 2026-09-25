# Contracts — 1.0 → 2.0 parity audit (2026-09-25)

**Written for:** the owner, to mark row by row; and the 1.0 developers, as the migration map for contracts.

**The brief** (owner, 2026-09-24, night — the parity programme's fourth module, after Leads, quote templates and the quote editor): "Post doing all the quote editor changes start the contracts template and contracts editor, same here as well, you take a call i will go with your recommendations but make sure everything in intact with 2.0 experience … do it step by step and everything audit carefully and build in 2.0 experience only." Every call in §6 is therefore set *As recommended* (§9) and built in the rounds of §7; the decisions doc "Contracts parity — the decisions" carries each call with a dropdown so the owner can override any of them.

## 0.1 Sources

- **1.0** = `qanvast-id-tool` at `67f42e469` on `integ/security-non-qanvast`. Five readers read the code and docs whole; their inventories are banked beside this file under `contracts-1.0-inventory/` and are the references cited in the rows: **A** the contract flow and the contract document · **B** the signing library, packets and the signing page · **C** the contract's life and its reach into other modules · **D** the data model and the port plan · **E** what 2.0 has today. Rows the quote editor audit already covered (the quote's own signature request, the signing page's steps, OTP, the bundle) are cited as *quote-editor C-nn*; the template editor's contract and T&C types as *templates A-nn*. The live app on :3001 was not browsed; every row rests on the code reading.
- **2.0** = `openmaison-prototype` on `main` (8733d6d) plus the uncommitted quote templates and quote editor rounds (REG-616…628).

## 0.2 Scope rules

- **In scope:** everything a studio does to make, send and sign a contract — the contract record and its statuses, contract templates, the document and its smart text, the signing library (the studio's standing documents), what is sent with a contract, the signing page and who signs, the signed copy and its certificate, the quote a contract comes from, who may do what, and the data behind it.
- **Done already (cited, not re-audited):** the quote's own signature request and signing page steps (quote editor audit, C-64…C-93), the T&C and contract template types in the document template editor (templates audit).
- **Later modules (their own audits):** Projects (what a signed contract creates), Finance (contract value, the contract freeze, variation orders), the homeowner portal. Their contract-side touchpoints are listed; their internals are not.
- **Not for a prototype:** real e-signature infrastructure (OTP by SMS, stored PDFs, hashing of stored files, email delivery), listed as *Platform* with the stand-in 2.0 keeps.

## 0.3 Status legend

| Status | Meaning |
|---|---|
| **Built** | 2.0 has it, in its own shape. |
| **Partial** | 2.0 has part of it; the gap is named. |
| **Missing** | 1.0 has it, 2.0 has nothing; a proposal follows. |
| **Mismatch** | both have it and they disagree; a question decides (all collected in §2). |
| **Later** | another module's internals. |
| **Platform** | live infrastructure; 2.0 keeps a stand-in. |
| **Dead** | code no 1.0 user can reach; not ported unless asked. |
| **2.0 only** | no 1.0 counterpart; kept and listed so the devs know it is new. |

## 0.4 How to mark

Answer in the decisions doc — a call per question and per left-out feature — or write **go** · **hold** · **no** in the *Mark* column here. Rows marked go are built in the rounds of §7, each logged in `REGISTER.md` as `user-directed` with "1.0 · <inventory row>" as the source, verified on :3011 and banked under `design-source/verify/contracts-parity/`.

Reading order: **§1 Definitions** first — 1.0 has **no contract record** at all, and every later row leans on that.

## 1. Definitions — the same thing under two names

| # | Concept | 1.0 | 2.0 | Verdict · question |
|---|---|---|---|---|
| DEF-01 | **What a contract is** | Nothing is stored as a contract. Four unrelated things stand for one: a signed signing request (the e-signed quote, its documents, the executed PDF), a paper file flagged on the lead (`contract_uploaded` + a file **name**), a composed PDF e-mailed as a lead file, and a project's contract file (A-69, C-01, D-01). | A `contracts` row on the lead: a document (composed HTML, or an uploaded file's name), a recipient, three statuses and its own signing link; several per lead (E-7, E-87, D-40). | **Mismatch.** **Q-01** keep 2.0's record; the port lands each 1.0 artefact as a row (D-211…D-221). |
| DEF-02 | **What the client signs** | The **quote**, always pinned, plus whatever documents the send form added; one signature over the set. A composed contract never reaches signing (A-67, A-68, B-22, B-30). | A **contract**, or a bundle of contracts; the quote is signed **through** the contract raised from it (REG-626). The client never sees the quote on the page (E-47, E-49). | **Mismatch.** **Q-02** keep 2.0 · **Q-20** the client can open the quote from the page. |
| DEF-03 | **The signing library** | Accounts › Signing Documents: reusable PDFs and rich-text documents, each with *read to the end* and *tick to accept* gates and the tick's words, per issuing entity, added per send (B-01…B-09, B-15…B-19). | Contract templates (rich text only) copied into a contract; *Send together* signs several contracts at once (E-57…E-61, E-63…E-75). | **Partial.** **Q-15** the gates on contracts and templates · **Q-16** the walk · **Q-26** PDF documents held. |
| DEF-04 | **Contract templates** | `studio_document_templates` of type `contract` / `tnc`: one HTML body with `{{tokens}}`, a default flag, per-entity copies, edited in Accounts; the contract flow only copies them (A-21…A-30; templates C-52). | Company › Templates › Contracts: a gallery, an editor with chips and signature fields, soft delete, usage counts, last used (E-63…E-75). | **Built** — 2.0 fuller. **Q-13** a default · **Q-24** the in-use guard. |
| DEF-05 | **Statuses** | A request is *pending · viewed · signed · expired · cancelled*; a composed or paper contract has no status (A-70, C-03, D-140). | *Draft · Sent to Client · Signed*; archive and delete are stamps (E-42). | **Mismatch.** **Q-03** keep the three; *viewed* becomes a stamp (**Q-17**); *expired* / *cancelled* stay the platform's (**Q-28**). |
| DEF-06 | **When the text is fixed** | Each document is resolved and hashed **at send**; the page refuses a signature whose document changed; the executed PDF and the packet are the record (B-13, B-25…B-29, B-31). | Chips re-resolve on **every** render — a signed contract re-prints with today's records (E-111, D-45). | **Mismatch.** **Q-05** freeze at signing · **Q-06** refuse a text that changed while the client read it. |
| DEF-07 | **Merge fields** | 11 `{{tokens}}`; the preview, the PDF, the e-mail and the signing page each build their own map, and signing fills five of them (A-39, B-13). | 16 chips in five groups, one resolver for every surface (E-25…E-28). | **Built.** **Q-11** the entity's GST number · **Q-12** Smart Text shows what each chip prints. |
| DEF-08 | **The contract's quote** | Eight different rules, one per consumer (C-22); the composed contract's `{{quote_total}}` alone has four (A-41). | The raised-from quote, else the lead's Signed quote, else its latest; replaced without a word when that quote goes (E-27, E-113). | **Partial.** **Q-08** the contract names its quote · **Q-09** the quote names its contract. |
| DEF-09 | **The issuing entity** | Picked for the signing request; the signed quote follows it, the contract document does not — one contract can name four issuers (A-44, A-76, A-77, B-68). | `contracts.issuing_entity` is read by the chips and written by nothing; every contract prints the studio (E-121). | **Partial.** **Q-10**. |
| DEF-10 | **Who signs, and how** | One client, a **drawn** signature, a phone OTP, no ID (B-30; quote-editor C-80). | One **typed** name, an optional NRIC kept masked, a simulated code (E-36, E-52, E-116). | **Partial.** **Q-18** draw or type · **Q-28** the code stays the platform's. |
| DEF-11 | **The signing evidence** | Signer phone, IP, user agent, time zone, the hashes, per-document viewed / accepted times and an audit trail; an in-app certificate and a certificate page leading the packet (B-28…B-32, B-76…B-80, D-02). | The typed name and a masked NRIC (E-53). | **Missing.** **Q-19** a signing record. |
| DEF-12 | **A paper contract** | Upload a signed PDF: the lead's flag + file name; it satisfies the SIGNED gate (A-16…A-20). | *Import from File* (already signed) and *Mark as signed* with an attached copy — names only; the Won step's upload makes no contract (E-44, E-48, E-73). | **Partial.** **Q-14**. |
| DEF-13 | **The studio's signature** | A member's own drawn or uploaded signature in Settings, baked onto the quote, with an auto-apply opt-in; contracts carry none (B-43…B-50). | Signature Settings in the quote editor, printed **live** on every contract's Studio field (E-35). | **Partial.** Frozen with the signed copy (**Q-05**); the Settings card belongs to the Accounts Setup module (**Q-30**). |

## 2. Mismatches — both have it, they disagree

| # | Topic | 1.0 | 2.0 | Question |
|---|---|---|---|---|
| MM-01 | What a contract is | four artefacts, no record | a record per document | Q-01 |
| MM-02 | What the client signs | the quote + documents | the contract; the quote through it | Q-02 · Q-20 |
| MM-03 | Statuses | five on a request, none elsewhere | three + stamps | Q-03 · Q-17 |
| MM-04 | The text at signing | frozen and hashed at send | re-resolved on every render | Q-05 · Q-06 |
| MM-05 | After signing | a signed request is never reopened; a signed quote locks (C-03, C-25) | the meta row still edits; anyone un-signs; the two un-sign paths disagree (E-109, E-110) | Q-04 |
| MM-06 | The link's life | a token, 7 days, dead on archive or cancel (B-73, quote-editor C-73) | the contract's id, forever; signs a Draft, an archived contract, a deleted lead's (E-112) | Q-07 · Q-28 |
| MM-07 | The contract's quote | a rule per consumer | picked on read, silently replaced | Q-08 |
| MM-08 | The issuer | per surface | never written | Q-10 |
| MM-09 | Documents in one signing | quote + library documents, each gated | contracts in a bundle, no gates | Q-15 · Q-16 |
| MM-10 | The signature | drawn | typed | Q-18 |
| MM-11 | Reminders | none (C-72) | two switches stored, never read (E-120) | Q-25 |
| MM-12 | Roles | no contract permission; whoever opens the lead (A-71, C-18) | no gate at all (E-97) | Q-21 |

## 3. Feature matrix

Columns: the 1.0 feature (inventory row) · what 1.0 does · what 2.0 has (inventory row) · status · proposal or question · mark.

### 3.1 The record and its ways in

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| CR-01 | Entry points (A-01…A-05, A-07) | One dialog in the lead drawer; no project, quote editor or Tools entry. | The lead's tab, the Overview's quick link, the Won step, Tools › Contracts, a quote's kebab, the template gallery (E-1…E-6). | Built | 2.0 fuller. | |
| CR-02 | The dialog's states (A-08) | Eight states by precedence; a signed or live request outranks a paper file. | The record's status and the editor (E-10, E-42). | Built | | |
| CR-03 | Only with an approved quote (A-10, A-72) | No contract, paper or composed, without an approved quote. | A contract needs no quote (E-7). | Built | Readiness warns when a contract reads no quote (Q-22). | |
| CR-04 | A record per contract (A-69, C-01) | None; one flag per lead. | `contracts` rows, several per lead, numbered titles (E-7, E-87). | 2.0 only | Q-01. | |
| CR-05 | Drafts (A-37) | The composed body lives in the dialog's memory; lost on reload. | Autosave with a saved stamp (E-14). | Built | | |
| CR-06 | Close and reopen (A-06) | The close button keeps state, an outside click resets it. | Close returns where you came from (E-17). | Built | | |
| CR-07 | Duplicate (—) | — | Duplicate (E-15). | 2.0 only | | |
| CR-08 | Archive (C-10) | Archiving the **lead** refuses while a link is live, then leaves the link to answer 410. | Archive a contract, Undo; its link still signs (E-85). | Partial | Q-07. | |
| CR-09 | Delete (C-11) | No route deletes a request or a signed quote. | Soft delete, Deleted Contracts, Delete forever by anyone, Signed included (E-84, E-86). | Partial | Q-21; §8.2. | |
| CR-10 | The lead goes (C-10, C-11) | An archived lead's links answer 410. | The lead's Delete warns that links die; they do not (E-104, E-112). | Mismatch | Q-07. | |

### 3.2 The document

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| CD-01 | One rich-text body (A-32, A-33) | Headings, lists, marks; no tables, images, page breaks, signature fields, outline or letterhead. | The paper: formatting bar, link, image, outline, signature fields, letterhead (E-21…E-24, E-31). | Built | 2.0 fuller. | |
| CD-02 | From a template or blank (A-22, A-25, A-34) | Tokens copied raw; a different template replaces the body without asking. | The picker, a blank start (E-7, E-71). | Built | | |
| CD-03 | Save as new template (A-30) | Always a new studio-wide row; resets the body after saving. | Save as Template (E-72). | Built | | |
| CD-04 | The live preview (A-53) | Claims to mirror what the client sees; it does not. | Preview draws the signing page's paper, but the studio signature and the NRIC differ (E-32, E-117). | Partial | §8.2. | |
| CD-05 | What survives where (A-55, A-59) | Highlight and colour lost in HTML; nested lists collapse in the PDF. | One renderer for Preview, the signing page and print (E-31). | Built | | |
| CD-06 | The sanitiser (A-54) | An allowlist on every HTML surface. | Scripts, double-quoted handlers and `javascript:` only; a cap that cuts inlined images (E-130). | Partial | §8.2. | |
| CD-07 | Download as PDF (A-56…A-60) | A server-rendered PDF; its filename header likely fails (§8.1). | The browser's print of the paper (E-16). | Platform | Stored PDFs are the platform's. | |
| CD-08 | The PDF's page (A-58) | "Contract", the studio name, a date; no letterhead or signatures. | Letterhead, footer, signature boxes (E-31, E-34). | Built | | |
| CD-09 | Checks before sending (A-36) | Only a blank body. | Only a blank body (E-127). | Partial | Q-22. | |
| CD-10 | Read-only once signed (C-03, C-25) | A signed request never reopens; a signed quote refuses edits. | The paper locks; title, recipient and date still edit (E-19, E-110). | Partial | Q-04. | |
| CD-11 | Outline (—) | — | The Outline pane; nothing shows it at ≤1024 (E-24, E-114). | 2.0 only | §8.2. | |
| CD-12 | An uploaded contract (A-17…A-19) | A PDF / Word file on the lead; replaced files pile up. | Import from File, names only (E-18, E-73). | Platform | File bytes are the platform's. | |

### 3.3 Smart text

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| CM-01 | The fields (A-39) | 11 tokens, four maps. | 16 chips, one resolver (E-25, E-26). | Built | | |
| CM-02 | Client name (A-40) | The form's name in the preview, the lead's in the PDF. | The recipient, else the lead (D-45). | Built | | |
| CM-03 | Quote total (A-41) | Four answers to "which quote". | The contract's quote (E-27). | Partial | Q-08. | |
| CM-04 | Project address (A-42) | Never resolves. | Property address resolves (D-45). | Built | | |
| CM-05 | Dates (A-43) | UTC ISO dates; *start date* = key collection, or today when signed. | Today's date, Contract date (E-26). | Built | No start date: 2.0's key collection is a period, not a date. | |
| CM-06 | The entity's fields (A-44) | Name, registration, GST number, country, address. | Studio name, address, phone, e-mail, UEN — the studio's (E-26, E-121). | Partial | Q-10 · Q-11. | |
| CM-07 | Variables popover (A-45) | Each token with the value it prints. | Smart Text ▾ lists labels (E-25). | Partial | Q-12. | |
| CM-08 | Unknown and empty fields (A-46) | Empty in HTML, literal in the PDF. | `[Label]` wherever a value is missing (E-28). | Built | | |
| CM-09 | Money (A-47) | Two currencies for one lead. | S$ with two decimals (D-45). | Built | | |
| CM-10 | Fixed at send (B-13, B-25) | Substituted once into the request. | Re-resolved on every render (E-111). | Mismatch | Q-05. | |

### 3.4 Templates

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| CT-01 | Where they live (A-21, A-24) | Accounts › Document Templates; the link opens the Quote PDF tab. | Company › Templates › Contracts (E-63). | Built | | |
| CT-02 | The picker (A-22) | Read-only cards, default first. | The picker, last used first (E-71). | Built | | |
| CT-03 | None yet (A-23) | Create in Accounts, or start blank. | The gallery's empty state and New ▾ (E-66). | Built | | |
| CT-04 | The default template (A-27, A-28, D-188) | `is_default`; joins a regenerated link only. | None. | Missing | Q-13. | |
| CT-05 | Per-entity copies (A-26, D-189) | Listed unlabelled; never applied at signing. | None. | Missing | Q-29 (no). | |
| CT-06 | The seeded contract (A-27, D-230) | A three-clause stub. | The Interior Design Service Agreement and the Variation Order (E-29, E-30, E-75). | Built | Invented copy (REG-534). | |
| CT-07 | The template editor (templates C-52) | The shared rich-text editor. | The contract template editor (E-69, E-70). | Built | §8.2 (E-132). | |
| CT-08 | Delete (B-08) | Soft; no restore. | Soft, Deleted Templates, Delete forever with no guard (E-68, E-126). | Partial | Q-24. | |
| CT-09 | Who edits (A-71) | Every role that reaches Accounts. | Anyone (E-97). | Built | Q-21 for Delete forever. | |
| CT-10 | Usage (A-38) | Nothing records which template a contract came from. | Usage counts, last used, the From template chip (E-7, E-63). | Built | 2.0 fuller. | |
| CT-11 | Updated by (—) | — | Shows the creator (E-126). | Partial | §8.2. | |
| CT-12 | Signing flow order (A-29) | `docOrder` seeded, never read. | — | Dead | | |
| CT-13 | T&Cs at signing (A-28, A-31) | The default T&C joins a regenerated link only. | T&Cs print in the quote (templates audit); a T&C template can be sent together. | Built | Q-20 shows the quote with its terms. | |
| CT-14 | Gates on a document (B-02, B-06) | Scroll, accept and the tick's words. | None. | Missing | Q-15. | |

### 3.5 The quote and the issuing entity

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| CQ-01 | Which quote (A-48, C-22) | Eight rules. | Raised-from, else Signed, else latest (E-27). | Partial | Q-08. | |
| CQ-02 | Choosing it (A-11) | Radio list of approved quotes. | None — the editor loads the quotes and shows none (E-123). | Missing | Q-08. | |
| CQ-03 | Shown on the contract (A-09) | The header's quote chip. | Only through the chips' values (E-131). | Missing | Q-08. | |
| CQ-04 | Shown on the quote (—) | — | Invisible from the quote (E-131). | Missing | Q-09. | |
| CQ-05 | Signing signs the quote (quote-editor C-84) | The request's quotes become signed. | A signed contract signs its quote (E-47, REG-626). | Built | | |
| CQ-06 | One signed base quote (C-23) | A later signing demotes the older signed quote. | Several quotes can be Signed. | Built | Not proposed: each contract names its own quote. | |
| CQ-07 | The signed quote's signer (quote-editor C-80) | The name the client typed on the pad. | The lead's name (E-131). | Partial | Q-09. | |
| CQ-08 | The entity in the send (A-76, A-79) | Picked per request; regenerate switches it silently. | None (E-121). | Missing | Q-10. | |
| CQ-09 | The entity on the document (A-44, A-77, B-68) | The quote follows it; the contract does not. | The studio only. | Missing | Q-10 · Q-11. | |

### 3.6 Sending

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| CS-01 | The send form (A-12; quote-editor C-66) | Name, phone, entity, documents; SMS / e-mail. | Send for digital signature → WhatsApp (E-37…E-40). | Built | | |
| CS-02 | E-mail a composed contract (A-61…A-64) | A PDF link by e-mail, 7 days; not signable. | None (E-41). | Missing | Q-27 (no). | |
| CS-03 | The link (A-14; quote-editor C-87…C-90) | Copy, WhatsApp, resend, regenerate, cancel. | The contract's link, copy; no cancel (E-39). | Partial | Q-07 · Q-28. | |
| CS-04 | Checks (A-36, A-72) | Blank body; an approved quote under H7. | Blank body (E-127). | Partial | Q-22. | |
| CS-05 | The studio told (C-68, C-70) | Owners and Admins on every send. | Nothing on send (E-129). | Missing | Q-23. | |
| CS-06 | Who sent it (C-09, A-64) | A raw log line for composed sends only. | Credited to the creator (E-128). | Partial | §8.2. | |
| CS-07 | The phone (D-49, D-216) | E.164. | The first eight digits of whatever arrives. | Partial | §8.2. | |

### 3.7 The signing page

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| CP-01 | Steps (B-54) | Phone → OTP → review → sign. | Review → code → sign (E-49…E-52). | Built | | |
| CP-02 | The code (quote-editor C-75) | A real OTP. | Simulated (E-116). | Platform | Q-28. | |
| CP-03 | The walk (B-57) | One document per screen, progress, Continue. | A bundle shows its documents on one page (E-60). | Partial | Q-16. | |
| CP-04 | A PDF document (B-58) | Drawn inline. | A file card (E-55). | Platform | | |
| CP-05 | Read to the end (B-57, B-59) | Within 40 px of the end, or at once when the text fits. | None. | Missing | Q-15. | |
| CP-06 | Tick to accept (B-61) | The document's own words. | None. | Missing | Q-15. | |
| CP-07 | The agreement sentence (B-63) | Names the quote and every document. | Fine print dated today (E-52). | Partial | Q-16. | |
| CP-08 | The quote in the walk (B-60) | The quote is a walk item. | Not shown (E-49). | Missing | Q-20. | |
| CP-09 | The signature (quote-editor C-80) | Drawn. | Typed (E-36). | Mismatch | Q-18. | |
| CP-10 | An ID number (—) | — | NRIC / FIN, optional, masked (E-52). | 2.0 only | §8.2 (masked in the browser). | |
| CP-11 | Done (B-64) | Download the packet. | The signed card, Download a copy = print (E-54). | Built | Q-19 adds the record. | |
| CP-12 | The issuer on the page (B-68) | The request's entity. | The studio (E-49). | Missing | Q-10. | |
| CP-13 | A dead link (B-73) | Archived lead → "This link is no longer active…". | Signs whatever is not deleted (E-112). | Missing | Q-07. | |
| CP-14 | Viewed (B-55, C-03) | The first open flips the request to *viewed*. | Nothing kept (E-41). | Missing | Q-17. | |
| CP-15 | Changed while reading (B-29) | A hash mismatch refuses the signature. | None. | Missing | Q-06. | |
| CP-16 | A signed link turns *expired* (B-65, C-41) | After 7 days, even when signed. | — | Dead | A 1.0 defect (§8.1); not ported. | |
| CP-17 | CaseTrust step (D-204) | A flagged step. | None. | Later | | |

### 3.8 The library and bundles

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| CL-01 | The library (B-01…B-04) | Reusable documents per entity. | Contract templates (E-63). | Partial | Q-15 · Q-26. | |
| CL-02 | Upload a PDF to it (B-05, B-18) | 5 MB, gates default on. | Import from File, per lead (E-73). | Platform | Q-26 (hold). | |
| CL-03 | Write a document (B-06, B-19) | Rich text with gates. | A contract or a template (E-7, E-69). | Built | | |
| CL-04 | Pick into a signing (B-15…B-21) | Add, reorder, the quote pinned. | Send together ticks the lead's contracts (E-57, E-58). | Built | §8.2: the order as ticked. | |
| CL-05 | The snapshot (B-25) | Frozen per request. | None. | Missing | Q-05. | |
| CL-06 | The hashes (B-26, B-29) | Per document and for the set. | None. | Missing | Q-05 · Q-06. | |
| CL-07 | Acknowledgements (B-28) | Viewed and accepted per document. | None. | Missing | Q-15 · Q-17. | |
| CL-08 | The packet (B-31…B-33) | A certificate page, then every document. | None. | Partial | Q-19 prints the record; the stored packet is the platform's. | |
| CL-09 | One signature over the set (B-30) | One drawn signature. | One typed name signs the bundle (E-61). | Built | | |
| CL-10 | Bundles across screens (—) | — | The screens disagree (E-118). | 2.0 only | §8.2. | |

### 3.9 Signed, and after

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| CA-01 | The certificate (B-76…B-79; quote-editor C-86) | Signer, phone, IP, device, hashes; two versions that disagree. | None. | Missing | Q-19. | |
| CA-02 | The signed copy (B-31, C-30) | The executed PDF and the packet. | A file name (E-46, E-122). | Platform | Q-19: the print carries the kept text and the record. | |
| CA-03 | Paper contracts (A-16…A-20) | Upload; the lead's flag. | Mark as signed; Import already signed (E-44, E-73). | Built | | |
| CA-04 | Un-signing (C-03, C-25) | Never. | Two paths that disagree, open to anyone (E-43, E-45, E-109). | Mismatch | Q-04 · Q-21. | |
| CA-05 | Signing times (C-26) | Three stamps. | The contract's and the quote's (E-47). | Built | | |
| CA-06 | The Won gate (A-20; leads Q-26) | A contract on file, or a signed quote. | The Won step picks a Signed contract or an upload (E-48). | Built | Q-14. | |
| CA-07 | Reminders and notices (C-72) | None. | Two switches, never read (E-20, E-120). | Mismatch | Q-25. | |
| CA-08 | The project's contract (C-28…C-42) | A file on the project. | — | Later | Projects. | |
| CA-09 | The contract value and its freeze (C-43…C-51) | Signed quote + client VOs; the certificate as the record. | — | Later | Finance. | |
| CA-10 | Variation orders (C-52…C-57) | Omissions against the contract; VO signing. | — | Later | Finance. | |
| CA-11 | The portal (C-58…C-67) | Sign in the portal; documents tab. | Portal records, no pages (D-52). | Later | The portal. | |

### 3.10 Lists, roles and follow-through

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| CN-01 | A list of contracts (A-66) | None; lead files. | The lead's tab (E-76…E-82). | 2.0 only | | |
| CN-02 | Studio-wide (C-15) | Finance › Operations › Contracts (Later). | Tools › Contracts; not searchable by lead, Send together inert (E-83, E-125). | 2.0 only | §8.2. | |
| CN-03 | Deleted (—) | — | Deleted Contracts, thinner than Deleted Quotes (E-86, E-124). | 2.0 only | §8.2. | |
| CN-04 | Permissions (A-71, C-18, C-21) | No contract permission. | No gate (E-97). | Mismatch | Q-21. | |
| CN-05 | Lead visibility (A-57, A-71) | Not checked on the routes. | Not applied on a contract's pages or Tools (E-98). | Partial | §8.2. | |
| CN-06 | Activity (C-09, A-64) | Paper and composed sends only, as raw lines. | Derived rows, credited to the creator (E-101, E-128). | Built | §8.2. | |
| CN-07 | Notifications (C-68…C-73) | On send; on signing. | The client's online signature only (E-103, E-129). | Partial | Q-23. | |
| CN-08 | The client's page (A-73; quote-editor C-82) | A bearer token, 7 days. | The contract's id, no expiry (E-100). | Platform | Q-28. | |

### 3.11 Touchpoints (other audits)

| ID | Touchpoint | Where it goes |
|---|---|---|
| CZ-01 | The project's contract, its setup check, the from-signature copy (C-28…C-42) | Projects |
| CZ-02 | The contract value, the freeze, variation orders (C-43…C-57) | Finance |
| CZ-03 | Portal signing, the engagement page, the Documents tab (C-58…C-67) | The portal |
| CZ-04 | *My Signature* and its auto-apply (B-43…B-48) | Accounts Setup (next-but-one module) |
| CZ-05 | Quote X-Ray (none on contracts) | X-Ray (next) |

## 4. Data model — the port plan

The column-level work is inventory **D** (`contracts-1.0-inventory/D-data-model.md`): the table map D-60…D-79, the column diffs D-80…D-139, the status mapping D-140…D-146, the enums, the port plan D-170…D-236. The headline:

| 1.0 | 2.0 | Verdict |
|---|---|---|
| `quote_signature_requests`, signed or live | `contracts` (one row per non-quote document) + `contract_bundles` (two or more under one signature) + the covered quote's Signed stamp | **Split.** A one-document request → one contract; a packet → a bundle; a quote-only signed request → one uploaded contract named after its executed PDF (D-211…D-218). |
| cancelled and expired requests | — | Not ported; logged per lead (D-190). |
| the request's evidence (`signature_data`, signer phone / IP / device / time zone, hashes, acknowledgements, audit trail) | the signing record of Q-19 on `contracts` / `contract_bundles` | Built by round 3 (D-175…D-183); the stored PDFs stay the platform's (D-185, D-202). |
| `studio_document_templates` `contract` | `contract_templates` (+ `is_default`, Q-13) | Tokens rewritten to chips (D-132); per-entity rows not ported (Q-29). |
| `studio_document_templates` `tnc` | `quote_text_templates` `terms` | Settled by the templates audit. |
| `studio_signing_documents` | rich text → `contract_templates` with its gates (Q-15); PDF → held (Q-26) | D-171 is not needed. |
| `leads.contract_uploaded` + `contract_file_name` | an uploaded Signed contract (D-220) | The phantom `client-signed-quote.pdf` is skipped. |
| composed contracts e-mailed (`lead_files` + a log line) | optional uploaded contracts at Sent to Client (D-221) | The HTML was never stored. |
| `member_signatures` | `members.signature_*` | Settled by the quote editor audit (QE D-111). |
| `projects.contract_file_*`, VO signings, the contract value, portal signing | — | Later (D-199…D-201). |

## 5. Logic to carry over verbatim (for the devs, independent of UI)

1. **Classifying a request** — D-211: *signed* = `signed_at` and `signature_data` set, whatever `status` reads (1.0 can flip a signed row to *expired*, B-65); *live* = pending / viewed and unexpired; everything else is dead.
2. **A document's fingerprint** — B-26: SHA-256 over the document's kind, title and resolved body; the whole set's = the documents' fingerprints joined by `|` (B-29). 2.0 keeps the same idea for Q-05 and Q-06, over the resolved HTML.
3. **The gates** — B-57, B-59, B-61: *read to the end* is met within 40 px of the bottom, or at once when the text fits; *tick to accept* is the document's own words; Continue waits for both.
4. **The agreement sentence** — B-63: "I, {name}, agree to … from {issuer} … as set out in the documents above."
5. **Statuses** — D-141…D-146.
6. **Phones** — D-216: a stored phone goes through `phoneDigits` (drops a leading 65 from ten digits), never "the first eight digits".
7. **The entity's letterhead** — map 04 §3: name, logo, UEN and GST number come from the entity; only the address falls back to the studio's; a registration number never inherits.

## 6. Questions before anything is built

The owner delegated every call on 2026-09-24 (§9). Each still carries its recommendation, so it can be overridden in the decisions doc.

| # | Question | Recommendation | Rows |
|---|---|---|---|
| Q-01 | Keep 2.0's contract record — a row per document on the lead — and land 1.0's signed requests, paper contracts and e-mailed PDFs as rows on the port? | Yes. | DEF-01 · CR-04 |
| Q-02 | Keep "the client signs the contract, and the quote is signed through it" (the quote editor's Q-31)? | Yes. | DEF-02 · CQ-05 |
| Q-03 | Keep the three statuses — Draft · Sent to Client · Signed — with *viewed* a stamp, not a status? | Yes. | DEF-05 |
| Q-04 | After signing: lock the title, recipient and contract date with the paper. A contract the client signed online stays Signed (1.0 never reopened a signed request). One the studio marked signed can go back — with a confirm, and the same result from the editor and the lists: every signing stamp cleared. | Yes. | MM-05 · CD-10 · CA-04 |
| Q-05 | Keep the signed text: at signing the contract stores its resolved text (every chip's value), the studio signature it printed and a fingerprint; Preview, the signing page and every print of a Signed contract read that copy. | Yes. | DEF-06 · CM-10 · CL-05 |
| Q-06 | If the studio changes the document while the client is reading, Sign is refused and the page reloads the new text. | Yes — 1.0's hash check, in 2.0's words. | DEF-06 · CP-15 |
| Q-07 | The link signs only a contract at Sent to Client (or in a sent bundle). A Draft's link says it is not ready; an archived or deleted contract's, or a deleted lead's, says it is no longer active. Copying the link of a Draft sends it. | Yes. | MM-06 · CR-08 · CR-10 · CP-13 |
| Q-08 | The contract names its quote: the quote it was raised from, else the lead's Signed or latest quote when the contract is made, stored either way. A **Quote** field in the meta row changes it. When that quote is archived or deleted, the editor says so rather than reading another. | Yes. | DEF-08 · CQ-01…03 · CM-03 |
| Q-09 | The quote names its contract: the quote editor's banner shows the contract raised from it, with a link; a quote signed through a contract prints the contract's signer (and the masked NRIC), not the lead. | Yes. | CQ-04 · CQ-07 |
| Q-10 | The issuing entity: taken from the contract's quote and changeable in the meta row until the contract is signed. The letterhead, the Studio chips and the WhatsApp draft use the entity's own name, logo, UEN and address (the quote's rule, REG-618). | Yes. | DEF-09 · CQ-08 · CQ-09 · CP-12 |
| Q-11 | A *GST reg. no.* chip (the entity's, blank when not registered)? A *Start date* chip? | GST: yes. Start date: no — 2.0's key collection is a period. | CM-05 · CM-06 |
| Q-12 | Smart Text ▾ shows what each chip prints on this contract and flags the empty ones, like the template editor's *Prints as*. | Yes. | CM-07 |
| Q-13 | A default contract template: set from the gallery; a contract raised from a quote or from the Won step starts from it; the picker lists it first. | Yes. | CT-04 |
| Q-14 | The Won step's uploaded contract becomes a Signed contract on the lead, named by its file. | Yes — every visible state backed by a record (REG-343). | DEF-12 · CA-06 |
| Q-15 | Read and accept, per document: "The client reads to the end" and "The client ticks to accept" with the tick's words, set per contract (eSignatures) and per template. New contracts and templates start with both on (1.0's library default); existing ones keep today's behaviour. | Yes. | DEF-03 · CT-14 · CP-05 · CP-06 |
| Q-16 | A bundle is read document by document with those gates, in the order the studio ticked them, then signed once; the agreement sentence names every document. | Yes. | MM-09 · CP-03 · CP-07 |
| Q-17 | Viewed: the client's first open of the link is kept; the lists show "Viewed {date}" under Sent and Activity logs it. | Yes. | CP-14 · CL-07 |
| Q-18 | The client may draw the signature (the member's own Signature pad) as well as type it. | Yes. | DEF-10 · CP-09 |
| Q-19 | A signing record on every signed contract: who signed, the masked NRIC, the phone the code went to (masked), the device and time zone, when it was viewed, accepted and signed, and the fingerprint. Shown on the signed card and in the editor, printed as the last page of *Download a copy*. | Yes. | DEF-11 · CA-01 · CL-08 |
| Q-20 | On the signing page the client can open the quote the contract signs — read-only, as the client view prints it. | Yes. | DEF-02 · CP-08 |
| Q-21 | Who may: delete, delete forever and empty the trash — the contract's creator, an Owner or an Admin (as quotes, REG-625); move a studio-marked Signed contract back — Owners and Admins; delete a template forever — its creator, an Owner or an Admin. | Yes. | MM-12 · CN-04 · CA-04 |
| Q-22 | Send checks, the quote's readiness pattern (REG-626): a composed contract needs a Client signature field; a Studio signature field needs the sender's saved signature; the phone must be valid (on the server too); a contract with no quote and chips that would print `[Label]` are warnings. | Yes. | CD-09 · CS-04 |
| Q-23 | Notifications: *Contract sent for signature* (Owners, Admins and the lead's members, never the sender) and *Contract signed* on every path that signs it, in Settings › Notifications. | Yes. | CS-05 · CN-07 |
| Q-24 | A template that live contracts name cannot be deleted forever (it can still be deleted), as quote templates (REG-502). | Yes. | CT-08 |
| Q-25 | Automation's two switches promise WhatsApp messages 2.0 cannot send by itself. Make them real as tasks: *Remind me to follow up* adds a Follow-up task three days after sending, closed when the contract is signed; *Remind me to thank the client* adds a task on the day it is signed. | Yes. | MM-11 · CA-07 |
| Q-26 | A library of PDF documents (a standard PDF added to every signing)? | Hold — 2.0 keeps no file bytes; written documents are contract templates. | CL-01 · CL-02 |
| Q-27 | E-mail a composed contract as a PDF (1.0's *Send to client*)? | No — 2.0 sends a signing link on WhatsApp; e-mail delivery is the platform's. | CS-02 |
| Q-28 | A token, an expiry, a cancel and a real one-time code on the link? | No — the platform's (as the quote editor's Q-33); 2.0 ends a link by status (Q-07). | CS-03 · CP-02 · CN-08 |
| Q-29 | Contract templates per issuing entity? | No — the contract's entity picks the letterhead (Q-10). | CT-05 |
| Q-30 | *My signature* as its own Settings card, with 1.0's auto-apply? | Later — the Accounts Setup module. | DEF-13 · CZ-04 |
| Q-31 | The project's contract, the contract value, variation-order signing, portal signing? | Later — Projects, Finance, the portal. | CA-08…CA-11 |

## 7. Build rounds

Nothing existing is removed. Each round ends with tsc + eslint, a Playwright probe at 1440 (+ 390 / 768 touch where the round touches them, and the 320 overflow gate), banked screenshots, register rows, repair rules and the baseline when data changes.

| Round | Builds | Questions | Size |
|---|---|---|---|
| **1 · The record holds** | The signed copy kept (text, studio signature, fingerprint); the changed-while-reading refusal; the meta row locks at Signed; one un-sign rule; the link's life by status; Preview = the signing page; the delete dialogs agree; the NRIC masked in the browser and cleared on un-sign; phones; the server's sanitiser and the image cap | Q-01…Q-07 | L |
| **2 · The quote and the entity** | The Quote field and no silent swap; the quote's banner names its contract, and its print the contract's signer; the issuing entity with its letterhead; the GST chip; Smart Text's *Prints as*; the default template; the Won step's upload as a contract | Q-08…Q-14 | M |
| **3 · Signing** | Read and accept per document; the bundle walk in the ticked order with the agreement sentence; Viewed; draw or type; the signing record; the quote from the signing page; the bundle's screens agree | Q-15…Q-20 | L |
| **4 · Lists, roles and follow-through** | Who may; send checks; notifications; the template guard and Updated by; Automation as tasks; Who sees leads on the contract pages; Deleted Contracts like Deleted Quotes; Tools › Contracts search by lead and Send together; Activity names the actor; the Outline drawer; the template editor's flush and Undo; dead code | Q-21…Q-25 | M |
| **5 · Data** | The devs' map for contracts | Q-01 · Q-03 | S |

## 8. Coverage, and what was not verified

**Rows:** 13 definitions · 12 mismatches · 108 matrix rows (+ 5 touchpoints) · 31 questions. Inventories: A 93 rows · B 94 · C 89 · D D-01…D-236 · E 132. The live app on :3001 was not browsed; every 1.0 row rests on the code, and each reader's *Uncertain* list stands.

### 8.1 Found in 1.0 on the way (for the 1.0 developers)

From the code reading; not reproduced on a running 1.0.

1. **A composed contract never reaches signing** — the send always carries a documents list, so the composed body is ignored; the comments on both sides say the opposite (A-67, A-68).
2. **"Download as PDF" probably always fails** — the filename's em dashes in a `Content-Disposition` header make `Response` throw (A-60, not run).
3. **`{{project_address}}` never resolves**, though leads carry `property_address` (A-42).
4. **One contract can name four issuers** across the preview, the download, the e-mail and the signing page (A-44, A-77); the signing page fills 5 of the 11 tokens (B-13).
5. **A signed request turns *expired*** when its link is opened after 7 days, and the studio side then treats the contract as unsigned (B-65, C-41).
6. **The lead's contract flag never clears**, and the phantom `client-signed-quote.pdf` is copied into projects (C-02, C-28).
7. **Document hashes cover a PDF's path, not its bytes**, and the server never re-hashes stored content (B-26, B-29).
8. **The dialog's close button keeps its state**, so a saved upload can be uploaded again (A-06, A-18); drag-and-drop accepts any file type and "Max 10 MB" is only copy (A-17).
9. **Save as new template resets the body** to the original template's while the editor still shows the edit (A-30).
10. **The two contract routes** use the service role with no role or lead-visibility check (A-57, A-73); *Send to client* reports success when no e-mail left (A-63); the drawer's Files list is not refreshed (wrong query key, A-62).
11. **Regenerate switches the entity silently** (A-79); entity-scoped default templates break the default lookup (A-26).
12. **The two certificates disagree** on what they show and to whom (B-79).
13. **A normal signing sends no stage-change notification**; no reminder or expiry notice exists (C-72, C-73).
14. **Eight rules decide "which quote is the contract"** (C-22).
15. **The portal's "View and Sign Contracts" setting is stored, never read** (C-67); the Files tab's contract folder is not the contract folder (C-40).
16. **Accounts opens on Quote PDF** although the dialog's link asks for Contract (A-24).

### 8.2 Found in 2.0 on the way (fixed in the rounds)

1. Un-signing from a list keeps the signing stamps; the editor's pill clears them (E-109) — round 1.
2. A signed contract's title, recipient and date still change (E-110) — round 1.
3. Chips never freeze (E-111) — round 1.
4. The link signs a Draft, an archived contract and a deleted lead's (E-112) — round 1.
5. The two delete confirmations disagree (E-115) — round 1.
6. Preview and the signing page print different studio signatures and NRIC captions (E-117) — round 1.
7. The NRIC travels whole to the server; a stale NRIC survives an un-sign (E-119) — round 1.
8. The server's sanitiser is partial, and the size cap cuts an inlined image mid-tag (E-130) — round 1.
9. A phone keeps its first eight digits — "+65 9123 4567" becomes 65912345 (D-49) — round 1.
10. The raised-from quote is replaced without a word (E-113) — round 2.
11. The issuing entity is read and never written (E-121) — round 2.
12. The quote ↔ contract link is invisible, and the quote prints the lead as its signer (E-131) — round 2.
13. The editor loads the lead's quotes and shows none (E-123) — round 2 (the Quote field).
14. The bundle's screens disagree (E-118) — round 3.
15. Automation is stored and never read (E-120) — round 4.
16. No role gates (E-97); Who sees leads stops at the lead page (E-98) — round 4.
17. Deleted Contracts is thinner than Deleted Quotes (E-124) — round 4.
18. Tools › Contracts cannot be searched by lead; its Send together is inert (E-125) — round 4.
19. A template's Delete forever has no guard; Updated by shows the creator (E-126) — round 4.
20. Sending checks nothing but a blank body (E-127) — round 4.
21. Activity credits the creator with every act (E-128) — round 4.
22. Only the client's online signature notifies anyone (E-129) — round 4.
23. The Outline cannot be shown at ≤1024 (E-114) — round 4.
24. The template editor has no flush on close and no Undo on delete (E-132) — round 4.
25. Dead code: `createContract`, the REG-537 table, `tokensIn` / `signFieldsIn` unused (E-123) — round 4.
26. The one-time code is simulated (E-116) and files are names only (E-122) — the platform's; unchanged.
27. No contracts probe is banked in the repo (E Uncertain) — every round banks its probe.

## 9. The owner's answers

**The owner's instruction, 2026-09-24 (night):** "you take a call, I will go with your recommendations but make sure everything is intact with 2.0 experience … do it step by step and everything audit carefully and build in 2.0 experience only." Every one of the 31 calls is **As recommended**, set on that instruction; the decisions doc shows each with its dropdown so the owner can override any of them.

## 10. Build log

Rounds follow §7. The decisions doc's section H carries each round's status.

- **2026-09-25** — audit written (REG-629); the 31 calls set *As recommended* on the owner's instruction (REG-630); round 1 started.
- **Round 1 · The record holds — built and verified (REG-631).** Q-01…Q-03 kept as 2.0 has them · Q-05 the signed copy kept on every signing path and read by every view · Q-06 the changed-while-reading refusal (single and bundle) · Q-04 the lock at Signed and one move-back rule · Q-07 the link's life by status, copying a Draft's link sends it · §8.2 gaps 1–9. Migration `0042_contract_signed_copy`; repair R50. Found on the way: U-05…U-07 (UI sweep backlog). Probe `verify-ct-r1.cjs` 35/35.
- **Round 2 · The quote and the entity — built and verified (REG-632).** Q-08 the Quote field and no silent swap · Q-09 the quote's *Contract* chip and its print's signer · Q-10 Issued by with the entity's letterhead · Q-11 the GST chip · Q-12 Smart Text's empty records · Q-13 the default template · Q-14 the Won step's upload as a contract · §8.2 gaps 10–13. Migration `0043_contract_template_default`; repair R51. Probe `verify-ct-r2.cjs` 24/24.
- **Round 3 · Signing — built and verified (REG-633).** Q-15 read and accept per document · Q-16 the bundle walk in the ticked order and the agreement sentence · Q-17 Viewed · Q-18 draw or type · Q-19 the signing record · Q-20 the quote from the signing page · §8.2 gap 14 (the bundle's screens agree). Found and fixed on the way: a bundle's documents were hashed in a different order on the server, refusing every bundle signature. Migration `0044_contract_signing_record`; repair R52. Probe `verify-ct-r3.cjs` 28/28.
- **Round 4 · Lists, roles and follow-through — built and verified (REG-634).** Q-21 who may · Q-22 send checks · Q-23 notifications · Q-24 the template guard · Q-25 Automation as tasks · §8.2 gaps 15–25. Migration `0045_contract_actors`; repair R53. The Deleted sheets' selection bar goes to the UI sweep (U-08). Probe `verify-ct-r4.cjs` 27/27.
- **Round 5 · Data — written (REG-635).** `08-contracts-migration-map-2026-09-25.md`. The contracts parity is complete (114 probe checks across four rounds); the UI sweep's backlog carries U-05…U-08 found on the way.

## Appendix — the inventories

`contracts-1.0-inventory/` — **A** the contract flow and the document (A-01…A-93) · **B** the signing library, packets and the signing page (B-01…B-94) · **C** the contract after signing and its reach (C-01…C-89) · **D** the data model and the port plan (D-01…D-236) · **E** 2.0 today (E-1…E-132). The folder's README says who read what.
