# Lead Details › Contracts — build plan (contract for the implementation)

Mocks: section `931-38609` — **two frames only**: 111 empty `931:38610` · 112 listing `931:38666`. Spec measured from Figma: `01-listing-empty.txt` — **every number comes from that file; nothing is guessed**. Everything the mock does not show (New Contract menu, status menu, hover actions, row / header kebabs, filters, delete dialog) is **copied from the Quotes tab** (`components/leads/quotes/*`, specs `../lead-quotes/`) with "contract" copy, and logged (REG-177…179).

## Route & data (done)
- `app/leads/[id]/[tab]/page.tsx` → `tab === 'contracts'` renders `LeadOverview` (frame, `wide`) with body = `LeadContracts` (client). Loader `lib/leads/contracts.ts` → `fetchLeadContracts(leadId)`: `{ contracts: Contract[]; now }`.
- Schema `contracts` (migration 0007): `title` · `status` Draft | Sent to Client | Signed · `createdAt` · `sentAt?` · `signedAt?` · `signedCopy?` (file name → "Signed Copy") · `updatedAt?` (null → createdAt) · `archivedAt?` · `deletedAt?`. Seed `scripts/seed-contracts.ts` (Olivia: "General Contract Agreement", Draft).
- Model `lib/leads/contract-filters.ts`: `CONTRACT_STATUSES`, `ContractFilters` (sort · date + from/to · status[]), `EMPTY_CONTRACT_FILTERS`, `activeContractGroups`, `activeContractFilterCount`, `applyContractFilters`, `searchContracts`.
- Actions `app/leads/contracts-actions.ts`: `createContract(leadId)` · `setContractStatus(id, status)` (Sent to Client / Signed stamp Sent; Signed stamps the signed date + `signedCopy` "<title>.pdf") · `archiveContract(id, restore?)` · `deleteContracts(ids)`.

## Components (all under `components/leads/contracts/`, each a copy of its Quotes twin)

| Component | File | Copy of | Props |
|---|---|---|---|
| `ContractsTable` | `contracts-table.tsx` + `.module.css` | `quotes-table` | `{ contracts: Contract[]; now: number; onStatus(c, status: ContractStatus); onView(c); onRowMenu(c, action: 'share'\|'copy'\|'pdf'\|'print'\|'archive'\|'delete') }` — **no selection column**, no Due, no Total |
| `ContractsToolbar` | `contracts-toolbar.tsx` + `.module.css` | `quotes-toolbar` | `{ query; onQuery; onNew(kind: 'blank'\|'template'\|'import'\|'ai'); onFilter(); filterCount; onMenu(action: 'templates'\|'settings'\|'deleted') }` |
| `ContractsEmpty` | `contracts-empty.tsx` + `.module.css` | `quotes-empty` | `{ onFromScratch(); onFromTemplate() }` |
| `ContractsFiltersModal` | `contracts-filters-modal.tsx` + `.module.css` | `quotes-filters-modal` | `{ open; value: ContractFilters; onApply(v); onClose; now?: number }` — rail **Sort · Date · Status** (no Due) |
| `DeleteContractsDialog` | `delete-dialog.tsx` | `quotes/delete-dialog` | `{ open; count; onNo; onYes }` — "Delete Contract" / "…delete this contract from this project? …" |
| `LeadContracts` | `lead-contracts.tsx` + `.module.css` | `lead-quotes` | `{ leadId; data: LeadContractsData }` — no selection / bulk bar, no due picker; `om:contracts:new` event kept for parity |

## Rules (spec 01)
- Table: fill #fff, inset 1px surface-variant, r8; **head 48 · rows 68**; columns **557 (fluid) · 128 · 120 · 142 · 140 · 157** (= 1244). Head cells p16/24/16/16; one-line cells p12/24/12/16; the Title cell p24/24/24/16 with ONE line: title **14/500** (`--om-type-subtitle-m`) — not the quotes' bold, no secondary line. **No right rule on the Title column** (spec: top stroke only), no selection column, no bottom bar.
- Head labels exactly "Title", "Status", "Created", "Signed Copy", "Sent", "Updated" (12/Medium secondary + unfold_more 16; sort inert → coming soon).
- Status cell = "Draft" 14/Regular + keyboard_arrow_down 20 (H g4) → Dropdown of `CONTRACT_STATUSES` (current marked, the quotes pattern; the column grows to its content like quotes). Created = displayDate; Signed Copy = `signedCopy` name or "-"; Sent = sentAt ? displayDate : "-"; Updated = displayDate(updatedAt ?? createdAt).
- Row hover: fill surface-bg + View + kebab at right 24, vertically centred in the 68 row (top 16) — the quotes `.actions/.float` copied. Row kebab: Preview and Share · Copy Link · Download as PDF · Print · Archive · Delete(red). Toolbar menus: New Contract ▾ From Blank · From Template · Import from File · Create with AI; kebab Manage Templates · Contracts Settings · Deleted Contracts.
- Toolbar "All Contracts"; New Contract button 150×36 (the DS button hugs its text).
- Empty state: identical to quotes with "Create your first contract" / "Create contracts and share it with your clients"; `data-testid="contracts-empty"`.
- Menus toggle on their own trigger (REG-153); every icon-only control has a Tooltip (REG-75); inert affordances → "Coming soon in OpenMaison 2.0".
