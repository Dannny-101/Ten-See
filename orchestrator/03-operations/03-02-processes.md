---
type: topic
status: active
section: operations
created: 2026-06-20
updated: 2026-06-20
tags: [process, workflow, enquiry, booking, chat]
---

# Core Processes

> MOC: [[00-meta/MOC - Operations]]

## 1. Enquiry → Lead

**Trigger:** Student submits lead form, sends WhatsApp, or starts chat.

**Flow:**
1. Capture contact info + property interest
2. Create `Lead` record (source tagged: web/whatsapp/chat)
3. If `source === 'whatsapp'`, email is optional
4. Trigger notification to admin dashboard
5. Auto-reply with next steps (WhatsApp/email template)

**Owner:** Platform (automated) + Admin (follow-up)

## 2. Lead Qualification

**Trigger:** New lead created.

**Flow:**
1. Admin reviews lead in dashboard
2. Call/WhatsApp student to confirm:
   - Budget
   - Move-in timeline
   - Room type preference
   - Any special requirements
3. Update lead status: `new` → `contacted` → `qualified`
4. If qualified, assign to property/viewing pipeline

**Owner:** Sales/Operations Admin

## 3. Viewing Scheduling

**Trigger:** Qualified lead + property match.

**Flow:**
1. Check landlord/property availability
2. Propose 2-3 time slots to student
3. Confirm viewing (WhatsApp/email)
4. Add to admin calendar/task list
5. Post-viewing: update lead status, capture feedback

**Owner:** Operations Admin

## 4. Booking

**Trigger:** Student confirms they want to book after viewing.

**Flow:**
1. Admin initiates booking in dashboard
2. Collect student documents (IC/passport, student ID, guarantor if needed)
3. Generate tenancy agreement (template)
4. Collect deposit + first month rent
5. Mark booking as `confirmed`
6. Send confirmation to student + landlord
7. Create move-in checklist task

**Owner:** Operations Admin

## 5. Live Chat Support

**Trigger:** Student opens chat widget.

**Flow:**
1. Chat session created, status `waiting`
2. `chatQueue.js` assigns next available agent
3. Agent joins, status → `active`
4. Real-time messaging via Socket.io
5. On close: status → `closed`, summary logged

**Owner:** Support Agent (via `chatQueue.js`)

## 6. WhatsApp Outreach

**Trigger:** Automated (new listing match) or manual (follow-up).

**Flow:**
1. Compose message (template or freeform)
2. Send via `services/whatsapp.js` → Meta WhatsApp Cloud API
3. Log message to chat/lead history
4. Handle incoming replies via webhook

**Owner:** Platform (automated) or Admin (manual)

---

## Context Links

- [[03-operations/03-01-service-model]] — The service these processes deliver
- [[04-team/04-01-org-chart]] — Who executes these processes
- [[08-sops/08-01-runbooks]] — Step-by-step procedures for these processes

#tags #process #workflow #enquiry #booking #chat #whatsapp
