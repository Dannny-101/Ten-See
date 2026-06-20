---
type: hub
status: active
created: 2026-06-20
tags:
  - overview
  - tenandsee
  - ai-orchestrator
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

| Section | Purpose |
|---------|---------|
| [[01-company/01-01-overview\|Company Overview]] | Mission, vision, business model |
| [[02-product/02-01-architecture\|Architecture]] | Tech stack, system design |
| [[02-product/02-02-codebase-map\|Codebase Map]] | File-by-file code map |
| [[03-operations/03-01-service-model\|Service Model]] | What we sell, how we deliver |
| [[04-team/04-01-org-chart\|Team / Org Chart]] | Roles, responsibilities, gaps |
| [[05-roadmap/05-01-milestones\|Milestones]] | Current phase, upcoming milestones |
| [[06-brand/06-01-voice\|Brand Voice]] | Tone, messaging, visual identity |
| [[07-competitive/07-01-landscape\|Competitive Landscape]] | Competitors, positioning |
| [[08-sops/08-01-runbooks\|Runbooks]] | Standard operating procedures |
| [[99-index\|Index]] | Full keyword index |

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

## AI Integration Rules

- AI reads the full vault before any task to build context.
- AI writes to `daily/` for session summaries, or updates relevant sections.
- AI never deletes `00-start-here.md` or the root structure.
- All AI edits are committed with descriptive messages.
- Use `[[wikilinks]]` for cross-referencing between notes.

---

