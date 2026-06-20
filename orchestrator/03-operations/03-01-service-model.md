---
type: topic
status: active
section: operations
created: 2026-06-20
updated: 2026-06-20
tags: [operations, service-model, pricing]
---

# Service Model

> MOC: [[00-meta/MOC - Operations]]
> Tracked in [[DEC - Differentiation Strategy]] — service-first is the current lean.

## What We Sell

| Service | Description | Pricing Model |
|---------|-------------|---------------|
| **Student Placement** | Match student to property, coordinate viewing, handle booking | Commission per booking |
| **Listing Exposure** | Feature property prominently on platform | Subscription or fee |
| **Property Management Support** | Assist landlord with tenant communication, documentation | Service fee |
| **Premium Student Support** | Concierge: airport pickup, furnishing, local orientation | Premium package fee |

## Current State

Right now we are primarily a **listing platform** with enquiry capture. The "service" layer is thin: students browse, enquire, and (ideally) book. The human touch happens via:

- WhatsApp chat (manual or automated)
- Live chat (agent queue)
- Email follow-ups

## Desired Future State

Students should feel like they have a **housing concierge**, not a classifieds site.

### Student Journey (Target)

```
Discovery → Enquiry → Consultation → Viewing → Application → Booking → Move-in → Post-move
    ↑           ↑           ↑           ↑           ↑          ↑         ↑         ↑
  Platform   Lead form   AI/Agent    We arrange   We help    We process  Checklist  NPS
            or WhatsApp   brief       viewing      docs       payment    & support  survey
```

### Landlord Journey (Target)

```
Onboarding → Listing → Enquiries → Viewings → Booking → Tenant handover → Ongoing support
    ↑          ↑          ↑          ↑          ↑            ↑               ↑
  Signup    We shoot   Qualified   We        We collect    Docs & keys    Maintenance
  & docs    photos     leads       schedule   payment       handover      requests
```

## Process Maturity

| Process | Status | Owner |
|---------|--------|-------|
| Lead capture | Automated | Platform |
| Lead qualification | Manual (partial) | Admin/Agent |
| Viewing scheduling | Manual | Admin |
| Booking processing | Semi-automated | Platform + Admin |
| Payment collection | TBD | — |
| Move-in support | Not yet built | — |
| Post-move follow-up | Not yet built | — |

## Pricing (Tentative)

| Tier | Student Fee | Landlord Fee | Included |
|------|-------------|--------------|----------|
| **Basic** | Free | RM 100/property/month | Listing + enquiries |
| **Premium** | Free | RM 300/property/month | Featured + viewings managed |
| **Concierge** | RM 200 one-time | 10% monthly rent | Full placement service |

> **Note:** Pricing is unvalidated. Test with landlords before locking in.

---

## Context Links

- [[01-company/01-01-overview]] — Business model this service delivers
- [[03-operations/03-02-processes]] — How this service is delivered
- [[04-team/04-01-org-chart]] — Who delivers this service
- [[07-competitive/07-01-landscape]] — Why this service differentiates us

#tags #operations #service-model #pricing #student-journey #landlord-journey
