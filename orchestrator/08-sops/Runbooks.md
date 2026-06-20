---
type: topic
radius: 2
status: active
created: 2026-06-20
tags:
  - sop
  - runbook
  - procedures
  - operations
---

# Runbooks

A runbook is a step-by-step procedure for a specific operational task. Anyone on the team should be able to follow it without prior knowledge.

## Responding to a New Lead

When a notification comes in via the admin dashboard or WhatsApp, open the admin dashboard and navigate to the Leads tab. Review the lead details including name, phone, property interest, and source. If the source is WhatsApp, check existing chat history first. Within fifteen minutes, contact the student via their preferred channel and ask qualifying questions: what is your budget range, when do you need to move in, and do you have any preferences such as single room, shared, or air conditioning. Update the lead status in the dashboard from new to contacted. If the lead is qualified, add notes and set a follow-up reminder. If not qualified, mark it as lost with a reason. If the student asks a complex question, escalate to the founder.

## Scheduling a Viewing

When a qualified lead wants to see a property, first confirm the property is still available by checking with the landlord if needed. Propose two to three time slots within the next three days. Send confirmation via WhatsApp including the property name and address, date and time, your contact number, and what the student should bring such as their IC and student ID. Add the viewing to the shared calendar and task list. The day before, send a reminder. On the day of the viewing, confirm the student is coming. After the viewing, update the lead status and log feedback.

## Processing a Booking

When a student confirms they want to book after a viewing, open the admin dashboard, go to Bookings, and create a New Booking. Select the student (lead) and property. Enter the booking details: move-in date, lease duration, rent amount, and deposit amount. Generate a tenancy agreement using the template. Send the agreement to the student for e-signature. Collect the deposit and first month rent. Mark the booking status as confirmed. Send confirmation to the student and landlord. Create a move-in checklist task.

## Handling a Live Chat Session

When a student opens the chat widget, the chat session enters the queue managed by chatQueue.js. If you are assigned, join immediately. Greet the student by name if available, then ask what you can help with today. For property questions, check the dashboard. For booking questions, check the Bookings tab. For complaints, escalate to the founder. For general questions, answer directly or offer to follow up via WhatsApp. Before closing, ask if there is anything else you can help with. Close the session and mark the status as closed.

## Sending a WhatsApp Broadcast

When a new featured property is available or a campaign is running, compose a message using a template and keep it under one hundred sixty characters. Select the recipient segment, for example all leads interested in Subang. Review in test mode by sending to yourself first. Then schedule or send immediately. Monitor replies in the WhatsApp inbox and log responses to the relevant lead records.

## Deploying Code

When a feature is ready or a bug fix is complete, ensure all changes are committed locally. Run tests if available, or perform a manual smoke test. Commit with a descriptive message in the format day-N: task name. Push to the Dannny-101/Ten-See main branch using `git push tenandsee HEAD:main`. Verify the deployment by checking the live site and testing critical flows. Update the ROADMAP.md checkbox from empty to checked.

## Parent

[[08-sops/SOPs Hub|← Back to hub]]
