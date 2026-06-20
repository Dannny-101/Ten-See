---
type: center
radius: 0
created: 2026-06-20
tags:
  - overview
  - tenandsee
  - ai-orchestrator
---

# Ten&See — AI Context Orchestrator

> This is the single source of truth for Ten&See. Any AI assistant, new hire, or stakeholder should read this first. Last updated: 2026-06-20.

Ten&See is a **student housing platform** (Malaysia-focused) where students discover, enquire about, and book their preferred accommodation. We differentiate through **high-touch service** and a curated property network.

## Graph Topology

This vault uses a **hub-and-spoke** architecture with concentric importance.

| Radius | Node Type | Importance | Examples |
|--------|-----------|------------|----------|
| 0 | Center | Highest | This note |
| 1 | Section Hub | High | e.g., Company Hub, Product Hub |
| 2 | Topic | Medium | Individual notes |
| 3 | Detail | Lower | Daily notes, sub-topics |

**Rules.** The center only links to hubs. Hubs link to the center, their topics, and related hubs. Topics link to their hub. Cross-links between topics are sparse. When adding a new node, you only touch its hub and the node itself.

## Section Hubs

| Hub | Purpose |
|-----|---------|
| [[01-company/Company Hub\|Company]] | Mission, model, strategy, metrics |
| [[02-product/Product Hub\|Product]] | Architecture, codebase, API |
| [[03-operations/Operations Hub\|Operations]] | Service model, processes, vendors |
| [[04-team/Team Hub\|Team]] | Org chart, meetings, onboarding |
| [[05-roadmap/Roadmap Hub\|Roadmap]] | Milestones, backlog |
| [[06-brand/Brand Hub\|Brand]] | Voice, identity, messaging |
| [[07-competitive/Competitive Hub\|Competitive]] | Landscape, positioning |
| [[08-sops/SOPs Hub\|SOPs]] | Runbooks, playbooks |

## Current Status

- **Phase:** Build → Prepare for operational scale
- **Primary repo:** `Dannny-101/Ten-See` (main branch)
- **Dev repo:** `Dannny-101/Backup` (beta-1.4) — do not push here
- **Stack:** Express, MongoDB/Mongoose, Socket.io, vanilla JS
- **Team:** Solo founder + contractors
- **Next priority:** Differentiation strategy

## AI Rules

AI reads the full vault before any task. AI writes to `daily/` for session summaries. AI never deletes this file or the root structure. All AI edits are committed with descriptive messages.
