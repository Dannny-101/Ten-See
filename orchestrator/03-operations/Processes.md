---
type: topic
radius: 2
status: active
created: 2026-06-20
tags:
  - process
  - workflow
  - enquiry
  - booking
  - chat
---

# Core Processes

## Enquiry to Lead

A student submits a lead form, sends a WhatsApp message, or starts a chat. The platform captures contact information and property interest, then creates a Lead record with the source tagged as web, WhatsApp, or chat. If the source is WhatsApp, email is optional. The system triggers a notification to the admin dashboard and sends an auto-reply with next steps via WhatsApp or email template. The platform handles this automatically, and an admin follows up.

## Lead Qualification

When a new lead is created, the admin reviews it in the dashboard and calls or WhatsApps the student to confirm their budget, move-in timeline, room type preference, and any special requirements. The admin updates the lead status from new to contacted to qualified. If the lead is qualified, they assign it to the property and viewing pipeline. This is owned by the Sales and Operations Admin.

## Viewing Scheduling

Once a lead is qualified and matched to a property, the operations team checks landlord and property availability, proposes two to three time slots to the student, and confirms the viewing via WhatsApp or email. The viewing is added to the admin calendar and task list. After the viewing, the lead status is updated and feedback is captured. This is owned by the Operations Admin.

## Booking

When a student confirms they want to book after a viewing, the admin initiates the booking in the dashboard, collects student documents like IC or passport and student ID (plus guarantor if needed), generates a tenancy agreement from a template, collects the deposit and first month rent, marks the booking as confirmed, sends confirmation to the student and landlord, and creates a move-in checklist task. This is owned by the Operations Admin.

## Live Chat Support

When a student opens the chat widget, a chat session is created with status waiting. The chatQueue assigns the next available agent. The agent joins, the status changes to active, and real-time messaging happens via Socket.io. When the chat closes, the status changes to closed and a summary is logged. This is owned by the Support Agent.

## WhatsApp Outreach

Outreach can be automated (triggered by a new listing match) or manual (a follow-up). The team composes a message from a template or freeform text, sends it via the whatsapp service to the Meta WhatsApp Cloud API, logs the message to the chat and lead history, and handles incoming replies via the webhook. This is owned by the platform when automated, or by the admin when manual.

## Parent

[[03-operations/Operations Hub|← Back to hub]]
