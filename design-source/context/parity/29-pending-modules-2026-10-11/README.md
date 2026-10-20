# Pending 1.0 modules (2026-10-11)

The owner asked: "check the pending modules from 1.0 to 2.0 … go through all the modules in 1.0 … report it to me first on all the pending
modules". He also said "you can ignore admin", so the platform admin is out.

- **The report:** https://claude.ai/artifact/7n3K1CGpos9YKSZJuPycwy. It has 41 cards in five groups:
  - Modules 1.0 has that 2.0 doesn't
  - Getting a studio in
  - Left inside the modules already built
  - For the developers
  - I'd skip
  
  Each card ends in his pick, kept in the page's database: collection `picks`, one document per card key, `{ pick: build|later|skip|null, note, by, at }`.
  Read them with ArtifactData `list` before building anything.
- **How it was made:** six readers, one per group (`brief.md`), wrote `surveys/{studio,onboarding,api,public,held}.json`. The admin reader was
  stopped on his word. `compile.py` merges the duplicates into cards, sets the recommendation on each and fills `template.html`. To rebuild,
  copy them to a scratch folder and run `python3 compile.py`.
