# Projects & Finance — the 1.0 → 2.0 parity map (2026-10-10)

The owner: "I want to create a visual report where I want to see the exact mapping of the 1.0 and 2.0 projects and finance to make
sure no features or functionalities are ignored."

- **The page:** https://claude.ai/artifact/J1zvjyePHCQsg5xuNYvfLr. It holds 1,094 rows across nine areas, with Needs a decision first. Each row
  has Right / Flag marks, kept in the page's database, collection `marks`, one document per row id: `{ state: ok|flag, note, by, at }`.
- **How it was made:** nine readers, one per area, worked from one brief (`brief.md`). Each read 1.0's code (`qanvast-id-tool`) with
  the inventories `projects-1.0-inventory/A…M` as an index, then opened today's 2.0 code for every row. `rows/<area>.json` is each reader's
  output.
- **How the page is built:** `build.py` merges the rows and links gaps two readers found (`SAME`). It injects them into
  `template.html`, which becomes the published page. To rebuild, copy these files to a scratch folder, run `python3 build.py`, and publish
  the HTML to the same URL.
- **Statuses:** kept · changed · moved · merged · partial · simulated (a stand-in the developers wire) · held · dropped · missing (no
  decision found).
