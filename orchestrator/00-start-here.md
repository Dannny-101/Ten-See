---
type: moc
status: active
created: 2026-06-20
updated: 2026-06-20
tags: [overview, tenandsee, ai-orchestrator]
---

# Ten&See — AI Context Orchestrator

> **Purpose:** This is the single source of truth for Ten&See. Any AI assistant, new hire, or stakeholder should read this first.
> **Last updated:** 2026-06-20
> **How to open:** In Obsidian, File → Open folder as vault → select the `orchestrator/` folder.

---

## What is Ten&See?

Ten&See is a **student housing platform** (Malaysia-focused) where students discover, enquire about, and book their preferred accommodation. We differentiate through **high-touch service** and a curated property network.

---

## Quick Navigation

| Section | Purpose | MOC |
|---------|---------|-----|
| [[01-company/01-01-overview\|Company Overview]] | Mission, vision, business model | [[00-meta/MOC - Company\|→]] |
| [[02-product/02-01-architecture\|Architecture]] | Tech stack, system design | [[00-meta/MOC - Product\|→]] |
| [[02-product/02-02-codebase-map\|Codebase Map]] | File-by-file code map | [[00-meta/MOC - Product\|→]] |
| [[03-operations/03-01-service-model\|Service Model]] | What we sell, how we deliver | [[00-meta/MOC - Operations\|→]] |
| [[04-team/04-01-org-chart\|Team / Org Chart]] | Roles, responsibilities, gaps | [[00-meta/MOC - Team\|→]] |
| [[05-roadmap/05-01-milestones\|Milestones]] | Current phase, upcoming milestones | [[00-meta/MOC - Roadmap\|→]] |
| [[06-brand/06-01-voice\|Brand Voice]] | Tone, messaging, visual identity | — |
| [[07-competitive/07-01-landscape\|Competitive Landscape]] | Competitors, positioning | — |
| [[08-sops/08-01-runbooks\|Runbooks]] | Standard operating procedures | [[00-meta/MOC - Operations\|→]] |
| [[99-index\|Index]] | Full keyword index | — |
| [[00-meta/dashboard\|Dashboard]] | Live Dataview overview | [[00-meta/graph-database\|Graph DB]] |

---

## How to Use This Vault

1. **AI assistants:** Read `00-start-here.md`, then the relevant section for your task.
2. **New team members:** Read `01-company/` first, then `04-team/` and `08-sops/`.
3. **Developers:** Jump to `02-product/` for architecture and codebase maps.
4. **Before any major decision:** Check `05-roadmap/` to avoid duplicate or conflicting work.

---

## Current Status Snapshot

- **Phase:** Build → Prepare for operational scale
- **Primary repo:** `https://github.com/Dannny-101/Ten-See` (main branch)
- **Dev repo:** `Dannny-101/Backup` (beta-1.4 branch) — do NOT push changes here; all work goes to Ten-See/main
- **Stack:** Express monolith, MongoDB/Mongoose, Socket.io, vanilla HTML/JS frontend
- **Team size:** Solo founder (you) + contractors/as-needed
- **Next strategic priority:** Differentiation from competitors; potential pivot to high-touch service model

---

## Graph Features

- **Dashboard:** [[00-meta/dashboard]] — live Dataview queries
- **Graph View:** Press `Ctrl/Cmd+G` — colored by section, decisions in red
- **MOCs:** Hub notes for each section ([[00-meta/MOC - Company]], [[00-meta/MOC - Product]], etc.)
- **Decisions:** Open decisions tracked as first-class nodes ([[DEC - Differentiation Strategy]], [[DEC - First Hire]])
- **Relationship Map:** [[00-meta/relationship-map]] — entity relationship diagram

## AI Integration Rules

- AI reads the full vault before any task to build context.
- AI writes to `daily/` for session summaries, or updates relevant sections.
- AI never deletes `00-start-here.md` or the root structure.
- All AI edits are committed with descriptive messages.
- Use `[[wikilinks]]` for cross-referencing between notes.

---

> For the graph database architecture, see [[00-meta/graph-database]].

#tags #overview #tenandsee #student-housing #malaysia #platform #context #ai-orchestrator
