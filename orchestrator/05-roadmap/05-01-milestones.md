---
type: topic
status: active
section: roadmap
created: 2026-06-20
updated: 2026-06-20
tags: [roadmap, milestones, phases, goals]
---

# Milestones & Roadmap

> MOC: [[00-meta/MOC - Roadmap]]

## Source of Truth

The day-by-day build plan is in `ROADMAP.md` at the repo root. This file tracks strategic milestones only.

## Current Phase: Security & Foundation (Days 1-26)

Status from `ROADMAP.md` (as of 2026-06-20):

| Day | Task | Status |
|-----|------|--------|
| 1-3 | Free-tier unlocks (GitHub Student Pack, MongoDB, Cursor, WhatsApp sandbox) | Partial |
| 4 | Protect leads + bookings | ✅ Done |
| 5 | Protect listings/properties/audit/whatsapp | ✅ Done |
| 6 | Kill fallback secrets | ✅ Done |
| 7 | CORS + helmet + rate limits | ✅ Done |
| 8 | WhatsApp webhook signature | ✅ Done |
| 9 | Mapbox token restriction | ✅ Done |
| 10 | Purge node_modules from git | ✅ Done |
| 11 | WhatsApp API domain fix | ❌ Pending (needs Day 3) |
| 12 | Lead email validation | ❌ Pending (needs Day 11) |
| 13 | One email module | ✅ Done |
| 14-26 | *(refer to ROADMAP.md)* | Mixed |
| 26 | Perf — preconnect, lazy-load, cache-control | ✅ Done |

## Upcoming Strategic Milestones

### Milestone 1: Platform Hardening (Complete Days 11-42)
- Finish all remaining ROADMAP tasks
- Achieve zero known security issues
- Stabilize core flows (enquiry → booking)

### Milestone 2: Differentiation Experiment (TBD)
- Pick ONE pivot direction from [[01-company/01-02-strategy]]
- Build a 90-day MVP of the chosen differentiator
- Measure: retention, NPS, booking conversion

### Milestone 3: First Hire (TBD)
- Hire 1x Student Placement Coordinator or Support Agent
- Document and delegate one core process

### Milestone 4: Revenue Target (6mo)
- RM 10k/month consistent revenue
- 200 active properties
- 50 active landlords

### Milestone 5: Regional Expansion (12mo)
- Replicate model in 2nd Malaysian city
- Or: expand to Singapore / Indonesia student markets

## Decision Gates

Before moving to the next milestone, confirm:
1. Current milestone metrics are met
2. Cash runway supports the next phase
3. Team (or you) has capacity

## AI Note

When updating this file after completing a ROADMAP day, cross-reference `ROADMAP.md` and update both files. AI should propose updates to milestones after each monthly review.

---

## Context Links

- [[01-company/01-02-strategy]] — Strategy determines roadmap
- [[04-team/04-01-org-chart]] — Team capacity affects timeline
- [[01-company/01-03-metrics]] — Milestones measured by metrics
- [[05-roadmap/05-02-backlog]] — Ideas that may become milestones

#tags #roadmap #milestones #phases #goals #tracking
