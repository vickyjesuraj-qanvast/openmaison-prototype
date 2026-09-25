# Contracts — the 1.0 inventories (read 2026-09-25)

Five readers read `qanvast-id-tool` at `67f42e469` (and, for D and E, `openmaison-prototype` on `main` with the quote templates and quote editor rounds) whole. These files are their output, cited by row id (A-12, B-38, C-22, D-40, E-85 …) from `../07-contracts-1.0-to-2.0-audit-2026-09-25.md`. They record features, logic and data — not UI. Each ends with an "Uncertain / not verified" list. Rows the earlier audits already covered are cited as "quote-editor C-nn" (`../quote-editor-1.0-inventory/`) and "templates A-nn … E-nn" (`../quote-templates-1.0-inventory/`).

- `A-contract-flow-and-document.md` — the Contract & Signing dialog: entry points, its states, paper contracts, templates in the flow, composing, merge fields, preview and PDF, sending by e-mail, statuses, permissions, the issuing entity
- `B-signing-library-and-page.md` — the signing library, picking documents into a request, snapshots, hashes and acknowledgements, the packet and its certificate, overlay and member signatures, the signing page's walk and gates, entity-aware signing, archival guards
- `C-contract-after-signing.md` — the contract's life after signing and its reach: the lead flag, the request as the record, deleting, the lead's indicators, permissions, which quote is the contract, projects, the contract value and its freeze, variation orders, the portal, notifications
- `D-data-model.md` — both schemas for every contract table and store, the JSON shapes, the table map, the column diffs, the status mapping and the port plan (D-170…D-236)
- `E-2.0-today.md` — what 2.0 has today for contracts, their templates, the signing pages and bundles, with register ids; gaps E-109…E-132
