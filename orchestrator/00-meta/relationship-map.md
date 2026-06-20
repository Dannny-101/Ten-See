# Relationship Map

> Visual guide to how concepts in this vault connect.

## Entity Relationships

```
Company (Mission/Model)
    │
    ├── decides → Strategy (Pivot options)
    │       │
    │       ├── informs → Product (Architecture, features)
    │       │       │
    │       │       └── needs → Team (Engineers, designers)
    │       │
    │       └── sets → Metrics (KPIs, targets)
    │               │
    │               └── tracked in → Operations (Processes)
    │
    ├── defines → Service Model (What we sell)
    │       │
    │       └── delivered by → Processes (Runbooks)
    │               │
    │               └── executed by → Team (Coordinators, agents)
    │
    ├── builds → Brand (Voice, identity)
    │       │
    │       └── expressed in → Marketing (Playbooks)
    │
    └── competes in → Landscape (Competitors)
            │
            └── requires → Differentiation (Moat)

Product (Codebase)
    │
    ├── serves → Students (Users)
    │       │
    │       └── generates → Leads (Enquiries)
    │               │
    │               └── converted by → Operations (Booking process)
    │
    ├── serves → Landlords (Partners)
    │       │
    │       └── generates → Listings (Inventory)
    │
    └── integrates with → Vendors (WhatsApp, MongoDB, Mapbox)

Team (People)
    │
    ├── Founder (You) → Strategy, fundraising, culture
    ├── AI (Me) → Knowledge, drafting, analysis
    ├── Ops → Student placement, support
    ├── Dev → Product, tech
    └── Growth → Marketing, landlord acquisition
```

## Link Density by Section

| Section | Notes | Outbound Links | Avg Links/Note |
|---------|-------|---------------|--------------|
| 01-company | 3 | ~12 | 4 |
| 02-product | 3 | ~15 | 5 |
| 03-operations | 3 | ~10 | 3 |
| 04-team | 3 | ~8 | 3 |
| 05-roadmap | 2 | ~6 | 3 |
| 06-brand | 1 | ~4 | 4 |
| 07-competitive | 1 | ~5 | 5 |
| 08-sops | 2 | ~8 | 4 |

## Orphan Notes (No Links)

```dataview
LIST
FROM ""
WHERE length(file.inlinks) = 0 AND length(file.outlinks) = 0
AND file.path != "00-meta/graph-database"
```

> Goal: Zero orphan notes. Every note should connect to at least one other.

## Dense Clusters

1. **Company-Strategy-Metrics** — Business direction
2. **Product-Architecture-Codebase-API** — Technical truth
3. **Service-Model-Processes-Runbooks** — Operations manual
4. **Org-Chart-Onboarding-Meetings** — People system

## Weak Bridges (Need Strengthening)

- Brand ↔ Product (how does voice affect UX?)
- Competitive ↔ Team (do we hire for moat-building?)
- Metrics ↔ Daily Notes (are daily actions tied to KPIs?)

---

#tags #meta #relationships #map #graph-analysis
