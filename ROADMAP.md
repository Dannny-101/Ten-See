# Ten&See Master Roadmap — one task per day

Source of truth for the day-runner skill. Mark days done by changing `[ ]` to `[x]`.
Deps: a day lists "needs day N" when it cannot start before N is done.

## Phase 0 — Free-tier unlocks (accounts, no code)

- [ ] Day 1 — GitHub Student Developer Pack: apply at education.github.com with Taylor's
  email + student ID photo. While pending: enable 2FA on GitHub. Verify: approval email.
- [ ] Day 2 — Claim the stack: Copilot at github.com/settings/copilot; Cursor Pro by signing
  into cursor.com with GitHub (Pack auto-verifies); MongoDB Atlas $50 at mongodb.com/students;
  note Azure $100 + Namecheap domain for later. Verify: Cursor dashboard shows Pro.
- [ ] Day 3 — Meta WhatsApp Cloud API sandbox: developers.facebook.com → create app →
  WhatsApp → copy Phone ID, temp token, set verify token. Send the hello_world template to
  your own phone. Verify: message arrives. Store creds in backend/.env (never commit).

## Phase 1 — Security lockdown (site is NOT launchable until Day 10)

- [x] Day 4 — Protect leads + bookings: in routes/leads.js and routes/bookings.js import
  { authMiddleware } from './admin'; apply to every GET/PUT/DELETE. Keep POST / public.
  Verify: curl /api/leads → 401; login token → 200.
- [x] Day 5 — Protect listings/properties/audit/whatsapp-send: authMiddleware on
  POST/PUT/DELETE in listings.js + properties.js (GETs stay public), all of audit.js,
  and POST /api/whatsapp/send. Verify: curl each without token → 401.
- [x] Day 6 — Kill fallback secrets: remove || 'tenandsee_secret' (admin.js ×2); throw at
  boot if !process.env.JWT_SECRET. Generate: openssl rand -base64 48 → backend/.env.
  docker-compose: replace hardcoded JWT_SECRET with env_file. Verify: boot without
  JWT_SECRET crashes; with it, login works.
- [x] Day 7 — CORS + helmet + rate limits: npm i helmet express-rate-limit. cors origin
  allowlist ['https://tensee.my','http://localhost:5000'] on Express AND Socket.io.
  Limit /api/admin/login 10/15min, /api 300/15min. Verify: 11th login attempt → 429.
- [x] Day 8 — WhatsApp webhook signature: capture raw body via express.json({verify});
  HMAC-SHA256 with Meta App Secret; compare X-Hub-Signature-256; 403 on mismatch.
  Verify: unsigned POST → 403; Meta test event → 200.
- [x] Day 9 — Mapbox token: in Mapbox dashboard add URL restriction (tensee.my) or rotate +
  restrict. Serve from one place (e.g. /api/config), remove the split-string copies in
  property.html + listing.html. Verify: maps still load.
- [x] Day 10 — Purge node_modules from git: git rm -r --cached backend/node_modules; commit.
  Verify: git ls-files | grep node_modules → empty.

## Phase 2 — Bug fixes

- [ ] Day 11 — WhatsApp API domain: services/whatsapp.js default →
  https://graph.facebook.com/v21.0. Verify: test send with sandbox creds succeeds. (needs day 3)
- [ ] Day 12 — Lead email validation: models/Lead.js make email required only when
  source !== 'whatsapp'. Verify: send WhatsApp sandbox message → lead appears in dashboard.
  (needs day 11)
- [ ] Day 13 — One email module: keep backend/services/email.js; fold in anything unique from
  utils/email.js + root email.js; update bookings.js import; delete the two dupes.
  Verify: booking creation still sends both emails.
- [ ] Day 14 — staffGroups + cron: move staffGroups Map outside io.on('connection') in
  server.js (currently per-socket = groups invisible). Replace setInterval lead-checker with
  node-cron '*/15 * * * *'. Verify: two browser tabs share a created group.
- [ ] Day 15 — Multi-room overlap: add units:Number (default 1) to Listing; overlap check
  counts overlapping bookings and rejects only when count >= units. Verify: 2 bookings OK
  on units=2 listing, 3rd rejected.

## Phase 3 — Real AI agent

- [ ] Day 16 — LLM key + prompt: Groq (free) or Google AI Studio key → .env. Write
  backend/prompts/leasing.txt: qualify budget/university/move-in; hand viewings to humans.
  Verify: curl the LLM API directly once.
- [ ] Day 17 — Swap regex for LLM: new services/ai.js; in server.js send_message replace the
  if/else block with ai.reply(sessionId, message); keep regex as catch-fallback.
  Verify: chat widget answers an unscripted question sensibly. (needs day 16)
- [ ] Day 18 — Conversation memory: ai.js loads last 20 ChatMessages for the session before
  each call. Verify: tell it your budget, ask "what was my budget?" — it answers.
- [ ] Day 19 — Lead extraction: after each AI reply, second LLM call extracts
  {name,budget,university,moveIn} JSON → upsert onto the Lead. Verify: dashboard lead
  fills in after a chat.
- [ ] Day 20 — Property→agent matrix: new model PropertyAgent {propertyId, agentName,
  agentPhone, priority}; seed with the real list via script/mongosh. Verify: query returns
  the right agent for a known property.
- [ ] Day 21 — Booking → agent WhatsApp: in routes/bookings.js after Booking.create, look up
  PropertyAgent, sendWhatsAppMessage(agentPhone, template w/ student+property+dates); log on
  booking. Verify: sandbox message received. (needs days 11, 20)
- [ ] Day 22 — Agent reply closes the loop: webhook detects sender == PropertyAgent phone;
  LLM-extract confirmed time/notes; update booking; email student the status.
  Verify: full role-play — book, reply as agent, student email arrives. (needs day 21)

## Phase 4 — Frontend & SEO

- [ ] Day 23 — Split monster files: extract inline JS/CSS from admin/index.html (5.9k lines)
  → admin/app.js + admin/styles.css; same for index.html. No behavior change.
  Verify: dashboard + landing fully work.
- [ ] Day 24 — SEO meta: per-page title, description, OpenGraph, canonical on the 4 public
  pages; sitemap.xml + robots.txt; submit to Search Console. Verify: Search Console fetch OK.
- [ ] Day 25 — Structured data: JSON-LD (schema.org Accommodation/Offer) on listing.html with
  price/location/availability. Verify: Google Rich Results test passes.
- [ ] Day 26 — Performance: Lighthouse run; lazy-load images, compress listing photos,
  preconnect Mapbox, Cloudflare cache static assets. Verify: Lighthouse perf ≥ 85 mobile.
- [ ] Day 27 — PDPA + consent: privacy policy page (Malaysia PDPA); footer + cookie-banner
  links; explicit WhatsApp opt-in wording on chat + booking forms. Verify: pages live.

## Phase 5 — Ship & monitor

- [ ] Day 28 — Smoke tests: npm i -D vitest supertest mongodb-memory-server; ~10 tests:
  login, 401s on protected routes, lead create, booking + overlap, webhook signature
  accept/reject. Verify: npx vitest green. (needs days 4–8)
- [ ] Day 29 — CI: GitHub Actions workflow — npm ci, tests, docker build on push. Badge in
  README. Verify: green check on a test commit. (needs day 28)
- [ ] Day 30 — Deploy: Oracle OCI Always Free VM (or Render free to start); docker compose up
  with real .env; Cloudflare DNS + SSL + Tunnel (port 5000 never public).
  Verify: https://tensee.my serves the site. (needs day 6)
- [ ] Day 31 — Monitoring: Sentry free tier in server.js; UptimeRobot on /api/listings;
  alerts → your email. Verify: throw a test error, see it in Sentry.
- [ ] Day 32 — Daily founder report: node-cron 8am — yesterday's leads by source, bookings,
  unanswered chats → email via services/email.js. Verify: trigger manually, email reads well.
- [ ] Day 33 — Live drill: end-to-end as fake student (WhatsApp → AI chat → booking → agent
  notified → student emailed). File every rough edge as GitHub Issues. Verify: issue list.

## Phase 6 — Ecosystem & growth (the 1st-prompt stack)

- [ ] Day 34 — n8n on OCI: docker compose n8n + Postgres on the OCI VM; expose via Cloudflare
  Tunnel subdomain. Verify: n8n editor loads over https. (needs day 30)
- [ ] Day 35 — Route WhatsApp through n8n: webhook → n8n workflow → forwards to the API;
  add a Slack/email branch for "human needed" intents. Verify: sandbox message flows
  end-to-end. (needs day 34)
- [ ] Day 36 — Langfuse self-hosted on OCI: wrap services/ai.js calls; trace cost/latency per
  session. Verify: a chat shows up as a trace.
- [ ] Day 37 — PostHog funnel: snippet on public pages; events lead_created, booking_created
  from backend. Funnel: visit → chat → lead → booking. Verify: events arrive.
- [ ] Day 38 — Founder dashboard CRM view: leads-by-stage board (new → contacted → viewing →
  converted) in admin using existing Lead.status. Verify: drag/update stage persists.
- [ ] Day 39 — Content kit: 3 listing promos — Higgsfield free credits for video, Canva
  Education statics, CapCut edit. Verify: 3 posts scheduled.
- [ ] Day 40 — Click-to-WhatsApp entry points: wa.me links + QR on listings pages and socials
  (free entry point = service-conversation window). Verify: scan → chat opens with prefill.
- [ ] Day 41 — OpenClaw founder assistant (optional): Docker on your machine; connect YOUR
  WhatsApp; skills for "today's report" + "deploy status". Audit skills before install.
  Verify: it answers "how many leads today?"
- [ ] Day 42 — Quarter review: close done Issues, score funnel numbers, write next-30-day
  list from data. Verify: written plan committed as ROADMAP-Q2.md.
