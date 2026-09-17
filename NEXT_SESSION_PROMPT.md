# Kickoff prompt for Claude Code

Paste this in as-is to start the next session on this repo.

---

Read `CLAUDE.md`, then `BUILD_GUIDE.md`, then `traveler-wiki-build-plan.md`, in that
order, before doing anything else. `BUILD_GUIDE.md` has the current state and an ordered
"Next up" list — follow it in order, don't skip ahead to Phase 3 UI work.

Today's session goals, in order:

1. Initialize git in this repo and make a first commit of the current scaffold. There is
   no git history yet.
2. Run `npm run build` and fix anything broken, especially peer-dependency conflicts on
   `react-calendar-timeline` or `i-storyline-js` against React 19.
3. I'll provide `DATABASE_URL` (existing Neon project) and `AI_GATEWAY_API_KEY` (I still
   need to generate this one — Vercel dashboard -> AI Gateway -> API Keys) — help me get
   both into `.env` and confirm the app can read them.
4. Run `npm run db:generate` then `npm run db:migrate` against the real database and
   confirm the Phase 1 schema applies with no errors.
5. Before writing the ingestion parser: diff `source-docs/canonical/` against
   `source-docs/ideas/` per entity/event. I want to merge both into ingestion, not use
   canonical/ alone — ideas/ may have entities or field detail that never made it into
   canonical/. Flag anything where the two folders contradict each other so I can decide,
   don't silently pick one.
6. Write and run the Phase 2 ingestion parser against the merged source. Test it against
   the real files already sitting in `source-docs/` — no need to touch Drive again.
7. Show me the ingested data (DB query output or `npm run db:studio`) against the source
   markdown so I can confirm it's right before any UI gets built on top of it.

Do not start on entity pages, the timeline, or any other Phase 3 UI work until step 7 is
confirmed correct — getting the data right matters more than having something on screen
this session.

Follow the hard rules in `CLAUDE.md` throughout (especially: no AI-generated prose
insertion anywhere, `event_links` is required not optional, `sort_order` and
`year_label` stay independent, ingestion re-runs must upsert not duplicate). Update
`BUILD_GUIDE.md`'s "Current state" and "Next up" sections at the end of the session.
