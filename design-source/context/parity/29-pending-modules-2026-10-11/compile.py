import json, os, re
M = os.path.dirname(os.path.abspath(__file__))
src = {}
for f in ['studio', 'onboarding', 'api', 'public', 'held']:
    for m in json.load(open(f'{M}/{f}.json'))['modules']: src[f'{f}:{m["key"]}'] = m
REC = {'build': 'build', 'build with a stand-in': 'stand', "developers' lane": 'dev', 'needs his mocks / decision': 'mocks', 'skip': 'skip'}
def card(key, name, sources, rec, effort, why, group, extra_q=None, status=None, in2=None, drop_pending=False, held=None):
    ss = [src[s] for s in sources]
    p = ss[0]
    pend, qs, seen = [], [], set()
    if not drop_pending:
        for s in ss:
            for x in s.get('pending', []):
                k = x.lower()[:70]
                if k not in seen: seen.add(k); pend.append(x)
    for s in ss:
        for q in s.get('questions', []):
            if q not in qs: qs.append(q)
    for q in (extra_q or []):
        if q not in qs: qs.append(q)
    return {'key': key, 'name': name, 'group': group, 'what': p.get('what', ''), 'who': p.get('who', ''), 'where_in_1': p.get('where_in_1', ''),
            'v1_code': '; '.join(dict.fromkeys(s.get('v1_code', '') for s in ss if s.get('v1_code'))),
            'in_2': in2 if in2 is not None else p.get('in_2', ''), 'status': status or p.get('status_in_2', 'none'), 'pending': pend,
            'depends_on': '; '.join(dict.fromkeys(s.get('depends_on', '') for s in ss if s.get('depends_on'))),
            'held_by': held if held is not None else '; '.join(dict.fromkeys(s.get('held_by', '') for s in ss if s.get('held_by'))),
            'real': p.get('real_or_sandbox', ''), 'rec': rec, 'effort': effort, 'why': why, 'questions': qs}
C = []
G1, G2, G3, G4, G5 = 'new', 'start', 'inside', 'dev', 'skip'
# ── 1 · modules 1.0 has that 2.0 doesn't
C.append(card('dashboard', 'Dashboard (the home page)', ['studio:dashboard', 'held:dashboard', 'api:industry-news', 'public:industry-news-feed'], 'mocks', 'M',
  'It is the rail’s first item and the first thing a demo client presses, and today it says Soon. Your call stands (“we will build it later”). When you lift it, I’d build a first cut on house pieces from what already exists: Needs you across projects, Reports’ numbers, today’s tasks. 1.0’s Classic mode showed mostly hard-coded sample figures, so nothing real is lost by waiting.', G1,
  extra_q=['Lift the hold now for a first cut from Needs you and Reports, or keep waiting for your frames?']))
C.append(card('maison-assistant', 'mAIson assistant (the full AI chat)', ['studio:maison-assistant', 'api:maison-bot-assistant', 'held:maison-ai'], 'stand', 'L',
  '1.0’s assistant answers anything with a language model and changes records without asking. 2.0 has the Ask box that answers from the records by rule. I’d build the rest honestly: turn every words-only suggestion into one that acts, fill the eight empty editor sheets, and add a chat home where any change is shown and confirmed before it happens. The real model is the developers’ to wire, priced through AI credits.', G1,
  extra_q=['May the assistant change records (with a confirm step), or only answer and draft?']))
C.append(card('meetings', 'Meetings and the Meeting Co-Pilot', ['studio:meetings-copilot', 'held:meetings', 'api:copilot-objections-competitors'], 'mocks', 'XL',
  'The biggest module still out: about 23,000 lines in 1.0. It records a meeting with consent, writes the brief and feeds quotes, X-Ray, credits and Calendar. Your call holds it for mocks (REG-552). Projects was built without mocks on house pieces; Meetings could go the same way if you prefer.', G1,
  extra_q=['Draw Meetings first, or build a first cut on house pieces as Projects was?']))
C.append(card('marketplace', 'Marketplace (brands and deals)', ['studio:marketplace'], 'mocks', 'M',
  'A supplier brand directory with deals. The rail item says Coming soon. 1.0’s copy loads nothing: its data feed isn’t in the 1.0 code, so there is nothing to port until someone decides where brands and deals come from.', G1,
  extra_q=['Is the Marketplace part of 2.0, and who supplies its brands and deals?']))
C.append(card('market-insights', 'Market Insights (articles)', ['studio:market-insights'], 'mocks', 'S',
  'Articles OpenMaison publishes (reports, case studies, news). It is empty until someone writes them, so it is a content decision more than a build.', G1,
  extra_q=['Keep Market Insights as a Tools tile with OpenMaison’s articles, or drop the tile?']))
C.append(card('studio-chats', 'Team and group chats beyond a project', ['studio:team-chats', 'api:messages-free-chats'], 'mocks', 'M',
  '2.0 now has each project’s client conversation and its Team chat. 1.0 also had chats between any two members, hand-picked groups, studio-wide team rooms and a Docs · Media · Links view. An earlier call (H-Q11) chose one conversation per project on purpose; studios already use WhatsApp for the rest.', G1,
  extra_q=['Add studio-wide chats between members, or keep conversations tied to a project?']))
C.append(card('hangouts', 'Hangouts (meet-the-designer events)', ['public:hangouts'], 'mocks', 'L',
  'Qanvast-run events where homeowners meet studios. In 1.0 only the homeowner’s event page and the staff console are live; the studio’s side is dead code. In 2.0 there is the Hangout lead source and a demo lead.', G1,
  extra_q=['Do studios take part in Hangouts inside 2.0 (invites, RSVPs, leads from an event)?']))
C.append(card('floor-plan-ai-picture', 'Floor-plan photo to a 3D picture', ['studio:floorplan-isometric-ai'], 'dev', 'M',
  'The Tools tile now opens the planner’s true isometric view (REG-1656), which does the job by measurement. 1.0’s AI picture made from an uploaded photo needs an image model, so it waits for the developers.', G1))
C.append(card('ai-writing-help', 'AI writing help on quote text', ['api:ai-writing-help-quotes'], 'dev', 'S',
  'Regenerate · Improve · Shorten · Expand · Translate on a quote’s text sections. Without a model the result would be a fake, so I’d build it with the model: the buttons and their credit price are small, the writing is the developers’ to wire.', G1))
# ── 2 · getting a studio in
C.append(card('sign-in', 'Signing in and staying signed in', ['onboarding:studio-sign-in'], 'dev', 'M',
  'The developers’ lane: 2.0 stands in with View as. The screen itself needs your design. The bigger question: 20 of 1.0’s 22 deployments sign in through Qanvast, which creates the studio and its owner on first sign-in.', G2,
  extra_q=['Do studios sign in with Qanvast’s login, OpenMaison’s own phone + code, or both?']))
C.append(card('sign-up', 'A new studio joins', ['onboarding:studio-sign-up'], 'mocks', 'L',
  '1.0 has no real self sign-up: “Book a demo” leads to a call, and OpenMaison staff create the studio by hand. 2.0 has no way to start an empty studio at all.', G2,
  extra_q=['Self-serve sign-up, or studios made by OpenMaison staff as in 1.0?']))
C.append(card('studio-setup', 'Setting up a new studio', ['onboarding:studio-setup-wizard', 'onboarding:welcome-and-tips'], 'build', 'M',
  '1.0 forces owners through a 7-step wizard. 2.0 already has every page those steps fill (Profile, Brand kit, Document numbers, Members, Integrations). I’d build a “Set up your studio” checklist that opens those pages, plus a first-visit welcome — the same pages, no second copy of them.', G2))
C.append(card('team-invitations', 'Inviting your team', ['onboarding:team-invitations'], 'stand', 'M',
  'In 1.0 Invite Member only records a request for staff. I’d make it real in 2.0’s shape: Add member sends the invitation through the house outbox, the member shows as Invited until they first sign in, and that first visit gets its welcome. The real email is the developers’.', G2))
C.append(card('my-profile', 'Your own profile', ['onboarding:my-profile', 'api:my-account-profile'], 'build', 'S',
  'Today nobody can change a member’s name, email or phone once added, and those print on quotes. I’d add Your profile (name, email, phone, photo, your signature) from the rail’s studio block and the phone’s avatar, which now answers Coming soon.', G2))
C.append(card('appearance', 'Dark mode, guided tours and theme skins', ['studio:personal-settings'], 'mocks', 'M',
  '1.0’s personal preferences: dark mode, theme skins, a home screen choice and guided tours. A design call before any build: dark mode needs a dark set of tokens in the design system.', G2,
  extra_q=['Is dark mode on the 2.0 roadmap? Guided tours or the current first-run empty states?']))
C.append(card('regions', 'Countries beyond Singapore', ['onboarding:regions-beyond-singapore'], 'mocks', 'XL', 
  'Held by your call (DEF-30). 1.0 itself is thin here: it still has “S$” written into about 430 places, and Malaysia mostly differs in sign-in and phone numbers. It holds back other countries’ timelines, compliance lists, currencies, DuitNow and the FX job.', G2, drop_pending=False,
  extra_q=['Which country comes after Singapore, if any, and when?']))
# ── 3 · left inside the modules already built
for k, name, rec, eff, why in [
  ('leads', 'Left in Leads', 'build', 'M', 'Mostly Coming soon presses whose target now exists (the Overview’s Files card, the From System quote View, the Attach files dialog) and three of your testers’ asks held since 23 Sep. I’d wire the presses to their homes and bring the testers’ company/UEN and co-owner onto the lead.'),
  ('quotes', 'Left in Quotes and the quote editor', 'build', 'M', 'A “Viewed” on the quote link (contracts have it), a token on the client’s link, an honest Upload chip (only spreadsheets are read), rule-based margin hints in the empty AI sheet, and the dead SKU / Add column / Upload logo presses removed or defined.'),
  ('quote-templates', 'Left in Quote templates', 'build', 'S', 'An entity’s tagline, colour and contacts reach its invoices but not its quotes; the template editors open an empty AI sheet. Small, and both inconsistent today.'),
  ('contracts', 'Left in Contracts and signing', 'build', 'M', 'The reason the signing PDF library was held (no file bytes) ended with the files build, so it can come back; imported and signed contracts should keep their PDF; the signing link should get a token like every newer client link.'),
  ('price-book', 'Left in the Price book', 'build', 'S', '1.0’s quote-line matcher is plain code, not a model, so filling costs after an upload can be built now; the vendor fields should pick from Finance › Vendors.'),
  ('projects', 'Left in Projects', 'build', 'S', 'An overpayment can become a credit note now that credit notes exist; a 3-D layout started on a lead should follow it to the project; Download on invoice and receipt entries in Files.'),
  ('finance', 'Left in Finance', 'build', 'M', 'Recurring expenses and editable expense categories (both dropped by a package, both everyday studio needs), the PO acceptance block’s default, and the Accounting role’s open questions.'),
  ('client-portal', 'Left in the client portal', 'build', 'S', 'Privacy and Terms links (a portal that signs people in by phone needs a privacy notice); the rest is the developers’ (real SMS codes, several studios on one platform, real sending).'),
  ('space-planner', 'Left in the 3-D Space Planner', 'build', 'S', 'Elevation reference lines for carpenters and the editor’s dead Maison AI suggestions; the rest stays a stand-in or later content work.'),
  ('settings-company', 'Left in Settings and Company', 'build', 'S', 'A Review Link for “Ask for a review”, My signature as its own card, and two naming calls; the roles editor stays held by your call.'),
  ('notifications', 'Left in Notifications', 'mocks', 'S', 'The daily digest and “who hears each notice” were held only because the questions were left blank (Q-42, Q-43). I’d build the digest and a personal mute now if you agree.'),
  ('ai-credits', 'Left in AI credits and plans', 'mocks', 'M', 'The in-app Plans table promises locks nothing enforces (Free lacks X-Ray, the template editor, approvals; “Custom stage definitions” doesn’t exist). Lock or soften it before demos. Auto top-up was held although your mark said build. And the demo’s credits month rolls on every Reset since 10 Oct.'),
  ('ai-visualizer', 'Left in the AI Visualizer', 'dev', 'L', 'The real image model is the developers’. Two things are yours: Replace was changed to recolour during the build without asking you again (Q-21), and HEIC photos (the iPhone default) need a small converter.'),
  ('quote-x-ray', 'Left in Quote X-Ray', 'dev', 'S', 'Reading any PDF or photo of the other studio’s quote needs a model; spreadsheets already work. Everything else was declined as recommended.'),
  ('shell', 'Rail, Tools and the phone bar', 'build', 'S', 'The phone’s avatar should open View as like the rail’s studio block; Log out has no place yet (it comes with sign-in); Marketplace, Market Insights and Meeting Copilot keep their Soon until those cards are decided.'),
  ('consistency-leftovers', 'Consistency leftovers (2.0 only)', 'build', 'S', 'Side-panel widths on one scale, the twin custom-fields / question-bank components made one, and one spelling of 3-D. The kind of drift the consistency programme exists to remove.'),
  ]:
    C.append(card(k, name, [f'held:{k}'], rec, eff, why, G3))
C.append(card('client-links', 'Client links: previews, old links, a read-only quote', ['public:client-links-no-login', 'api:link-previews', 'api:portal-loose-ends'], 'build', 'S',
  'Most links paste into WhatsApp as a bare title (only the design link shows a card), there is no read-only quote link like 1.0’s, a render file has no “Show to homeowner” switch, and 1.0’s old client links need a redirect — that last one is your call (D-11).', G3,
  extra_q=['Redirect 1.0’s saved client links to their new pages (D-11)?']))
# shell: fold the studio navigation card's pending in
_sh = next(c for c in C if c['key'] == 'shell'); _sh['pending'] += [x for x in src['studio:studio-navigation']['pending'] if x not in _sh['pending']]
# ── 4 · the developers
C.append(card('real-services', 'Real services behind the stand-ins', ['api:message-delivery-providers'], 'dev', 'XL',
  'Everything the prototype simulates honestly and the developers must wire: email and WhatsApp sending (with receipts and the client’s replies), SMS sign-in codes, file storage, Xero, the payment gateway for plans, the scheduled sweeps, and the AI models behind the Visualizer, X-Ray, uploads and the assistant.', G4,
  in2='The outbox, Sent messages, Integrations › Xero (simulated), View as, the curated engines', status='partial'))
# ── 5 · I'd skip
C.append(card('marketing-site', 'The marketing website and Book a demo', ['public:marketing-website', 'onboarding:book-a-demo'], 'skip', 'L',
  'A separate website, not the studio product. Its copy still uses 1.0’s module names, so it needs rewriting when 2.0 ships — but in its own repo.', G5))
C.append(card('try-it', 'Try the AI Visualizer without an account', ['public:try-it-visualizer', 'onboarding:try-visualizer-public'], 'skip', 'M',
  'You already left these out in the Visualizer audit (Q-27). In 1.0 they show “not found” in production unless a flag is set.', G5))
C.append(card('verify-listing', 'Verify for a Qanvast listing', ['studio:verify-listing', 'onboarding:qanvast-listing-verification'], 'skip', 'S',
  'A mock form with nothing behind it, linked from no menu.', G5))
C.append(card('languages', 'Languages (Arabic)', ['onboarding:languages'], 'skip', 'XL',
  'Wired but unused in 1.0: 23 strings of the Book a demo form are translated and nothing switches to them.', G5))
C.append(card('studio-health', 'Studio Health (app usage for the owner)', ['studio:studio-health'], 'skip', 'M',
  'You answered No to this (Accounts Setup Q-16): it is the platform’s telemetry, not a studio page.', G5))
C.append(card('portfolio-profiles', 'Designer portfolio profiles', ['api:designer-portfolio-profiles'], 'skip', 'M',
  'Only the public Hangouts page shows them, and 1.0’s editor is dead code. They come back with Hangouts if you build it.', G5))
C.append(card('sandboxes', 'AI model sandboxes (7 pages)', ['studio:ai-sandboxes'], 'skip', 'S',
  'Internal test pages linked from no menu.', G5))

groups = [
  ('new', 'Modules 1.0 has that 2.0 doesn’t', 'Whole screens or tools with no home in 2.0 yet.'),
  ('start', 'Getting a studio in', 'Everything before a studio’s first lead: signing in, joining, setting up, inviting the team, your own profile, regions.'),
  ('inside', 'Left inside the modules already built', 'What the earlier audits held, deferred, left as a stand-in or as a Coming soon press — with who decided each and whether the reason still holds. Lines that say “keep” are listed so nothing is hidden; only the “revisit” ones are work.'),
  ('dev', 'For the developers', 'Real services the prototype stands in for. Nothing for you to decide except order.'),
  ('skip', 'I’d skip', 'Not part of the studio product, already declined by you, or dead code in 1.0.'),
]
out = {'groups': [{'key': g, 'name': n, 'note': note, 'modules': [c for c in C if c['group'] == g]} for g, n, note in groups]}
order = [('my-profile', 'Small, and a real gap today: nobody can fix a mistyped email that prints on quotes.'),
  ('client-links', 'Small: link cards in WhatsApp, a read-only quote link, the render file switch.'),
  ('contracts', 'Its hold’s reason has ended; signed copies are the files a studio most needs back.'),
  ('quotes', 'Viewed, a token on the link, an honest Upload chip, margin hints by rule.'),
  ('leads', 'Coming soon presses that now have a home, and your testers’ company / co-owner asks.'),
  ('finance', 'Recurring expenses and editable categories — everyday studio needs.'),
  ('projects', 'Overpayments to credit notes, layouts that follow a lead to its project.'),
  ('studio-setup', 'A checklist over the pages that already exist, plus a first-visit welcome.'),
  ('team-invitations', 'A real Invited state through the house outbox.'),
  ('maison-assistant', 'Every dead suggestion made to act, the empty sheets filled, a chat home that confirms before it changes anything.'),
  ('quote-templates', 'Entity details on quotes, as on invoices.'), ('price-book', 'The quote-line matcher (plain code in 1.0).'),
  ('client-portal', 'Privacy and Terms links.'), ('settings-company', 'Review Link, My signature, two names.'),
  ('space-planner', 'Elevation reference lines.'), ('shell', 'The phone avatar, Log out’s place.'), ('consistency-leftovers', 'One panel scale, one component where there are twins.')]
out['order'] = [{'key': k, 'why': w} for k, w in order]
out['orderNote'] = 'These need no mocks and no new decision from you, smallest and most-felt first. Everything marked “Needs your mocks or call” waits for your pick; “For the developers” waits for them.'
out['recHelp'] = {'build': 'I can build it now, on the house pieces.', 'stand': 'I can build it now; one piece is an honest stand-in the developers wire later.', 'dev': 'Needs a real service (a model, a provider, sign-in). The developers’ lane.', 'mocks': 'Waits on your mocks or a product call.', 'skip': 'Not the studio product, already declined, or dead code.'}
already = []
for f in ['studio', 'onboarding', 'api', 'public', 'held']:
    for a in json.load(open(f'{M}/{f}.json')).get('already_in_2', []):
        if re.search(r'\badmin\b|Admin ›|platform admin', a, re.I): continue
        if a not in already: already.append(a)
out['already'] = already
n = sum(len(g['modules']) for g in out['groups'])
out['meta'] = [('Surveyed on', '11 Oct 2026'), ('1.0 read from', 'qanvast-id-tool (code, not run)'), ('2.0 read from', 'openmaison-prototype working tree'), ('Left out', 'the platform admin, as you asked'), ('Cards', str(n))]
out['method'] = [('Who read it', 'Six readers, each one group of 1.0: the studio app, getting a studio in, public pages, features behind the API, and every earlier audit’s held items. The platform admin was left out, as you asked.'),
  ('What a card is', 'One module or capability a person would name, merged where two readers found the same thing. 1.0 sandboxes and dead code are called out, not counted as losses.'),
  ('Who decided what', 'Each held line says whether it was your call, taken “as recommended” under one of your build-everything instructions, or a build package’s own call — so you can see which holds are really yours.'),
  ('Already settled', 'Your standing holds (Dashboard, Meetings, roles editor, regions) are shown, not argued; where a hold’s reason has since ended, the card says so.')]
YOU = [("his call", "your call"), ("his mocks", "your mocks"), ("his answer", "your answer"), ("his pick", "your pick"), ("his mark", "your mark"),
       ("his decision", "your decision"), ("his design", "your design"), ("his 'not now'", "your 'not now'"), ("his sign-off", "your sign-off"),
       ("his rule", "your rule"), ("flagged for him", "flagged for you"), ("tell him", "tell you"), ("back to him", "back to you"), ("his data call", "your data call"),
       ("his open call", "your open call"), ("his to switch on", "yours to switch on"), ("waits on him", "waits on you"), ("needs his ", "needs your "),
       ("his Dashboard call", "your Dashboard call"), ("his 'go ahead", "your 'go ahead"), ("his 'build", "your 'build"), ("his 'hold", "your 'hold"),
       ("his 'actually", "your 'actually"), ("his 'the list", "your 'the list"), ("waiting on him", "waiting on you"), ("on him.", "on you."), ("asked him", "asked you"),
       ("ask him", "ask you"), ("His ", "Your "), ("his ", "your ")]
def you(x):
    if not isinstance(x, str): return x
    # whole words only, so "this" and "neither" stay as they are
    for a, b in YOU: x = re.sub(r'(?<![A-Za-z])' + re.escape(a), b, x)
    return x
def frag(x):
    seen, keep = set(), []
    for f in [p.strip() for p in x.split(';') if p.strip()]:
        k = f.lower()
        if any(k in s or s in k for s in seen): continue
        seen.add(k); keep.append(f)
    return '; '.join(keep)
for g in out['groups']:
    for c in g['modules']:
        for k in ('what', 'in_2', 'depends_on', 'held_by', 'why'): c[k] = you(c.get(k, ''))
        c['pending'] = [you(p) for p in c['pending']]; c['questions'] = [you(q) for q in c['questions']]
        c['depends_on'] = frag(c['depends_on']); c['held_by'] = frag(c['held_by'])
out['already'] = [you(a) for a in out['already']]
open(f'{M}/data.json', 'w').write(json.dumps(out, ensure_ascii=False))
t = open(f'{M}/template.html').read()
open(f'{M}/pending-modules.html', 'w').write(t.replace('/*__DATA__*/', json.dumps(out, ensure_ascii=False).replace('</', '<\\/')))
from collections import Counter
print(n, 'cards', Counter(c['rec'] for c in C), 'already', len(already))
