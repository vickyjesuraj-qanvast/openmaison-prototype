# Package H — the short read: tickets, chat, automatic client messages, About / Team (gaps build, Phase B, 2026-10-08)

Sources read: inventory I (I-10, I-37, I-38, I-93, I-184, I-199…I-203, I-326…I-338, I-385, I-393), inventory M (M-143…M-157, M-189…M-213,
M-265), the reviewers' `6-portal.md` (rows 49–52, "Things the inventory missed": 1.0's client emails) and `7-coverage.md` (the 12 uncited
ticket / chat files). 1.0 code opened: `src/app/(main)/escalations/page.tsx` · `[ticketId]/page.tsx`, `src/app/api/escalations/route.ts` ·
`[id]/status` · `[id]/comments`, `accounts/page.tsx:1821-1847` (Escalation Categories), `src/app/api/chats/records/route.ts`,
`src/components/inbox/*` (names only). 2.0 read: the portal (`lib/portal/*`, `components/portal/*`, `app/my/[slug]/*`), E's delivery layer,
D's and G's portal pieces, Company › Profile and Members, Settings › Notifications and › Projects, the project frame and tabs.

## 1. What 1.0 does

**Tickets ("escalations").** The client's Support tab: *Raise a Support Ticket*, three count tiles (Total · Open · Resolved), a card per ticket
(id `T-{year}-{6 digits}`, category, status pill open / in progress / resolved / closed, subject, excerpt, Reported / Resolved dates); the card
opens its thread in place (description, 56 px photos, replies "You" / "{name} (Studio)", a reply box with a Photo button, Close ticket on the
client's own tickets, a native confirm "Close this ticket? The studio will be notified."). *Report an Issue*: Category (8 words), Subject (120),
Describe what happened, up to 5 photos (1920 px, 5 MB each, uploaded on submit). New → priority medium, status open, the studio hears
`escalation.created`; replies `escalation.replied`; closing `escalation.closed_by_homeowner`; a bell link `?issue=` opens the thread.
The studio's *Escalations* page: Open / In progress / Resolved counts, filters by status / priority / member, a table (ticket id, subject, project,
priority, status, assignee, raised by); *New Ticket*; the ticket page: the thread, a reply ("Type a reply or internal note…"), Re-open /
In progress / Resolve, re-assign, priority, AI analysis. `resolved_at` is stamped going into resolved / closed and cleared on reopen. The
resolve sends the client an email (`escalation.resolved`). Accounts › Escalation Categories edits the category list (slugs kept on rename).

**Chat.** One "Project Chat" card on the client's project (off by default): the client's messages right in the brand colour, others left with
the sender's name, a time each; "No messages yet / Send a message to your design team below."; polls every 5 s; Enter sends; no attachments, no
read state. The first invite creates the conversation ("{name} – {project}"); *Show chat history* on the invite hides messages from before the
link. The studio's side is the Inbox (`/inbox`): conversations with participants, attachments and a project link.

**Client messages.** `dispatchNotification` emails the client on invoice sent, signature requested, contract sent, timeline published,
escalation resolved (6-portal "Things the inventory missed"); Settings › Notifications › *Customer Notifications* has one switch per
informational client event (M-265).

**About / Team.** Portal › About: the studio's rich text ("About {studio}", images, YouTube) and a profile card — cover photo with name and
tagline, "Est. {year}", *Awards & Recognition*, *Get in touch* (Phone, WhatsApp, Email, Office → Maps), *Follow us* (seven networks). Portal ›
Team: "Our Team", cards with a square photo, name, role, a bio clamped to three lines. Set up in the portal hub: Profile (year, awards with a logo
well, socials, contact, footer links), Team (hand-typed people: name, role, bio, photo, visible; Published switch), About Us (a rich-text editor
with Published switch). The About item shows when published or any profile fact exists; Team when published and someone is visible.

## 2. What 1.0 got wrong or never finished (not ported)

- Ticket categories: the screen offers eight, the server keeps four slugs — four of them are stored as "Other" (I-335). One word for the thing
  on each screen ("Support Ticket", "Issue" and "ticket" side by side). Priority fixed at medium for the client; a native browser confirm.
- The studio's "Proactive Alerts" tab is a constant empty list (dead UI); the ticket page's "AI analysis" is not backed.
- Chat returns the **oldest** 200 messages (a long conversation stops showing new ones), merges a project's conversations under one name,
  and the studio is never told of a client's message (I-338).
- Team members are typed by hand — not the studio's members, not the project's team (M-195); drafts are not private (M-197, M-211); the
  profile duplicates Company facts kept elsewhere (M-156); no field is checked (M-154); Reset can resurrect a deleted member (M-199).
- About's embeds accept any https frame (M-212). Footer links (Privacy · Terms · Contact) belong to a legal set-up 2.0 doesn't have.

## 3. The calls — each as recommended, set on the owner's instruction of 2026-10-07 ("build everything")

**Tickets**
- **H-Q1 One word per side.** The client reads **"issue"** everywhere (tab *Issues*, *Report an issue*, "your issue T-2026-004"); the studio
  reads **"ticket"** everywhere (tab *Tickets*, the Tickets page, Settings › Projects › *Ticket categories*). The number `T-{YYYY}-{nnn}` is
  the same on both sides. (1.0 mixed three words on one screen.)
- **H-Q2 Where.** Per project: a **Tickets** tab (after Floor plan). Studio-wide: **/projects/tickets**, opened by a *Tickets* button in the
  Projects header (Leads' *Insights* button's pattern), the bell, ⌘K. On the portal: an **Issues** tab (section switch `issues`).
- **H-Q3 States.** Four, as 1.0: **Open** (nobody from the studio has answered) → **In progress** (the studio's first reply, or Assign) →
  **Resolved** (the studio fixed it, with a closing line the client reads) → **Closed** (the client closed it). The client replying on a
  Resolved issue reopens it (In progress); the studio may Reopen a Resolved or Closed one. `resolved_at` cleared on reopen (1.0's rule).
- **H-Q4 Priority and escalate.** Two levels only — *Normal* and *Urgent* (simplicity rule; 1.0's four were fixed at medium for the client).
  **Escalate** = mark Urgent with a note, which tells Owners and Admins (bell `ticket_escalated`) and puts the project in Needs attention until
  the ticket is resolved.
- **H-Q5 Who.** The studio side: whoever sees the project (Who sees leads, `canOpenLead`) reads; the project's team, their Managers, Owners and
  Admins (`mayChangeProject`) reply, assign, resolve, reopen; Escalate is anyone who can reply. Assign picks from the project's reach
  (`pickable` members). The client: their own homes only (`portalActor({ section: 'issues' })`); they close their own issues; a household
  member sees the home's issues and may reply (the household shares the home), but only the person who reported closes it.
- **H-Q6 Internal notes.** A studio reply is *To the client* or an *Internal note* (the house Chips); a note never reaches the portal, its bell
  or its messages. Status lines (resolved, reopened, closed, escalated, assigned) sit in the thread as small lines; the escalation and the
  assignment lines are studio-only.
- **H-Q7 Photos.** Up to 5 per report or reply (1.0's), shrunk in the browser (as G's photos), kept with their bytes as files of the project in
  **Files › Tickets** (made on first use, E's storage); the portal opens them through its file route (a `PORTAL_FILE_RULES` rule: a photo on
  one of the home's issues, not on an internal note).
- **H-Q8 Categories.** Settings › Projects › **Ticket categories**: the house list (chips with counts, Add, rename / reorder in the
  `ListEntryDialog`, remove with Undo when unused, retire when used). Default list = 1.0's eight words fixed (*Quality of work · Timeline ·
  Communication · Safety · Damage or breakage · Site cleanliness · Vendor or supplier · Other*). The ticket keeps the category's name; a rename
  carries the tickets (2.0's rename rule, REG-647).
- **H-Q9 The studio raises one too** — *New ticket* (a call, a site visit): the same form, raised by the studio, shown on the client's portal.
- **H-Q10 The bell.** Studio: `ticket_raised` (the project's team, else Owners and Admins), `ticket_client` (the client replies, reopens or
  closes — the assignee, else the team), `ticket_assigned`, `ticket_escalated`. Client: `issue_reply` (a reply or a resolve from the studio).

**Chat**
- **H-Q11 One conversation per project**, the client and their household with the team — the project's **Messages** tab (after Tickets), the
  portal's **Messages** tab (section switch `messages`), and the rail's **Chat** item (in the mock's rail, inert until now) opening **/chat**:
  every conversation the viewer sees, newest first, unread first, the open one beside the list (a sheet-less list → thread on a phone). The
  rail's Chat wears the viewer's unread count.
- **H-Q12 The house thread, not chat bubbles.** Each message is the comment thread's row (avatar · name · time · words), "You" for one's own,
  the client's name and *Client* on theirs — the house's one way to show a conversation (task comments, the floor plan's marks). A *New* rule
  marks where the reader's unread start. Enter sends, Shift+Enter breaks the line; up to 3 photos per message (kept in Files › Messages).
  Newest at the bottom; the **latest** 200 load (1.0 kept the oldest), *Show earlier* loads more.
- **H-Q13 Read state.** Per reader (member or client), per project — the unread count, the *New* rule, the rail badge. A member's own message
  marks the conversation read for them.
- **H-Q14 Remove.** Each side removes only their own message, with Undo; it reads "Message removed" to the other side. No edit.
- **H-Q15 The bell.** Studio: `chat_message` to the project's team — at most one row per conversation per 15 minutes while unread (G's quiet
  window). Client: one row per unread run, "{name} sent you a message" with its first words, read when they open Messages.
- **H-Q16 Show chat history (I-10, I-38): not built.** The conversation is the home's; someone from the household sees all of it, as they see
  the home's schedule and files. The column stays as 1.0's data port needs it.

**Automatic messages to the client (Q-41 now)**
- **H-Q17 Seven events**, sent through E's delivery layer (`deliver`, the outbox, Sent messages): an invoice sent · a payment confirmed (the
  receipt) · something to sign or approve (an agreement or a bundle sent for signature, a variation order or a quote sent for the client's
  answer) · the schedule shared (first share and Share changes) · an update published · the studio answering an issue (a reply or a resolve) ·
  a message from the team in Messages (at most one per conversation per hour, while unread).
- **H-Q18 Switches.** Settings › Notifications › **Messages to clients** — the event table (Email · WhatsApp per event, DS sm switches) and
  each message's words, edited like the studio's own (subject, message, Insert a field, preview). Defaults: **Email on** for the first six,
  **WhatsApp off** for all (the studio's own WhatsApp drafts already go on Send — two WhatsApps for one send would be noise); the message
  event off on both. Owners and Admins change it.
- **H-Q19 To whom.** Everyone the home's portal is open to (the client and their household: invited, not withdrawn) — on the address they
  have (the profile's email or mobile; a missing one is logged as *No email address* / *No mobile number*, E's way). Nothing goes while the
  portal is paused, to a client never invited (the studio's own WhatsApp covers them — REG-1056), or for a section the studio switched off.
  The link opens the thing on their portal. Never the actor's own words beyond the studio's template; never OpenMaison's name (the house drafts'
  rule).

**About / Team (Q-47 now)**
- **H-Q20 One page, one switch.** The portal's **About** tab holds the studio's story, the facts and *Our team* (1.0's two pages as two parts
  of one) behind the eighth section switch **About us** (`about`). The tab shows only when the switch is on and something is there to show.
- **H-Q21 From Company, once.** Company › Profile keeps the facts the studio already enters (name, tagline, address, phone, email, website,
  socials — M-156 fixed) and gains a card **About the studio, for clients**: the year founded, the story (the in-house rich editor: bold,
  italic, lists, links — no embeds, M-212), up to 6 photos (the first is the cover), awards (name and year; the brand kit's badges print
  beside them). Owners and Admins change it.
- **H-Q22 Team = the studio's members** (M-195 fixed): Company › Members' row menu gains **On the About page…** — shown or not, a job title
  (defaults to the role), a photo, two lines about them. Only active members shown; a deactivated member leaves the page.
- **H-Q23 Private until shown.** Nothing of About reaches a client while its switch is off or its parts are empty (M-197 / M-211 fixed) — the
  server sends nothing, not the browser hiding it.

**Records and the house's rules**
- **H-Q24 Activity.** A project's Activity gets Ticket lines (raised, resolved, reopened, closed, escalated, assigned) under a *Tickets*
  chip and one line per day of messages ("{n} messages with {client}") under a *Messages* chip.
- **H-Q25 Needs attention.** A project is raised when a ticket is escalated and not resolved, or an open ticket has waited on the studio
  more than 2 days (invented threshold).
- **H-Q26 Search.** ⌘K finds tickets by number, subject and words (scope *Projects*' kind `ticket`). Messages are not searched (private
  conversation, a later call).
- **H-Q27 Not built.** 1.0's AI analysis and Proactive Alerts (dead or unbacked), its footer links (Privacy · Terms · Contact — a legal set-up
  2.0 has not got), YouTube embeds on About, typing indicators, Show chat history (H-Q16).
