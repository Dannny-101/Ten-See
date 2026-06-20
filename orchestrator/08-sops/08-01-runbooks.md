---
type: topic
status: active
created: 2026-06-20
tags:
  - sop
  - runbook
  - procedures
  - operations
---

# Runbooks

## What is a Runbook?

A step-by-step procedure for a specific operational task. Anyone on the team should be able to follow it without prior knowledge.

## 1. Responding to a New Lead

**Trigger:** Notification in admin dashboard or WhatsApp.

**Steps:**
1. Open admin dashboard → Leads tab
2. Review lead details (name, phone, property interest, source)
3. If source is WhatsApp, check existing chat history
4. Within 15 minutes, contact student via their preferred channel
5. Ask qualifying questions:
   - "What's your budget range?"
   - "When do you need to move in?"
   - "Any preferences (single room, shared, AC, etc.)?"
6. Update lead status in dashboard: `new` → `contacted`
7. If qualified, add notes and set follow-up reminder
8. If not qualified, mark `lost` with reason

**Escalation:** If student asks complex question → assign to founder.

## 2. Scheduling a Viewing

**Trigger:** Qualified lead wants to see a property.

**Steps:**
1. Confirm property is still available (check with landlord if needed)
2. Propose 2-3 time slots within next 3 days
3. Send confirmation via WhatsApp:
   - Property name and address
   - Date and time
   - Your contact number
   - What to bring (IC, student ID)
4. Add to shared calendar / task list
5. Day before: send reminder
6. Day of: confirm student is coming
7. After viewing: update lead status, log feedback

## 3. Processing a Booking

**Trigger:** Student confirms they want to book after viewing.

**Steps:**
1. Open admin dashboard → Bookings → New Booking
2. Select student (lead) and property
3. Enter booking details:
   - Move-in date
   - Lease duration
   - Rent amount
   - Deposit amount
4. Generate tenancy agreement (use template)
5. Send agreement to student for e-signature
6. Collect deposit + first month rent
7. Mark booking status `confirmed`
8. Send confirmation to student and landlord
9. Create move-in checklist task

## 4. Handling a Live Chat Session

**Trigger:** Student opens chat widget.

**Steps:**
1. Chat session enters queue (`chatQueue.js`)
2. If you are assigned, join immediately
3. Greet student by name (if available)
4. Ask: "What can I help you with today?"
5. Answer or route:
   - Property questions → check dashboard
   - Booking questions → check Bookings tab
   - Complaint → escalate to founder
   - General → answer or offer to WhatsApp follow-up
6. Before closing: "Anything else I can help with?"
7. Close session, status → `closed`

## 5. Sending a WhatsApp Broadcast

**Trigger:** New featured property or campaign.

**Steps:**
1. Compose message (use template, keep under 160 chars)
2. Select recipient segment (e.g., all leads interested in Subang)
3. Review in test mode (send to yourself first)
4. Schedule or send immediately
5. Monitor replies in WhatsApp inbox
6. Log responses to relevant lead records

## 6. Deploying Code (Developer)

**Trigger:** Feature ready or bug fix complete.

**Steps:**
1. Ensure all changes are committed locally
2. Run tests (if available) or manual smoke test
3. Commit with descriptive message: `day-N: <task name>`
4. Push to `Dannny-101/Ten-See` main branch:
   ```bash
   git push tenandsee HEAD:main
   ```
5. Verify deployment (check live site, test critical flows)
6. Update `ROADMAP.md` checkbox `[ ]` → `[x]`

---

