---
type: topic
radius: 2
status: active
created: 2026-06-20
tags:
  - metrics
  - kpi
  - dashboard
---

# Metrics & KPIs

Our north star metric is **successful student placements per month** — a student who enquired, viewed, and booked through Ten&See.

## Core Dashboard

| Metric | Definition | Current | Target (6mo) | Target (12mo) |
|--------|-----------|---------|--------------|---------------|
| Monthly enquiries | Total lead forms + WhatsApp + chat submissions | TBD | 500 | 1,500 |
| Enquiry-to-viewing rate | % of enquiries that result in a scheduled viewing | TBD | 30% | 40% |
| Viewing-to-booking rate | % of viewings that convert to a booking | TBD | 15% | 20% |
| Booking conversion (overall) | % of enquiries that convert to a booking | TBD | 5% | 8% |
| Listed properties | Total active properties on platform | TBD | 200 | 500 |
| Active landlords | Landlords with at least one active property | TBD | 50 | 120 |
| Average time to book | Days from first enquiry to confirmed booking | TBD | <7 | <5 |
| Student NPS | Net Promoter Score from post-booking survey | TBD | 50 | 70 |
| Landlord NPS | Net Promoter Score from landlord satisfaction survey | TBD | 40 | 60 |
| Revenue per booking | Average commission or fee per successful booking | TBD | RM 200 | RM 250 |
| Monthly revenue | Total platform revenue | TBD | RM 10k | RM 50k |

## Leading Indicators

These metrics predict future outcomes. Website traffic is the top of funnel. Bounce rate on property pages measures content and UX quality. Chat response time indicates service level. WhatsApp message volume shows engagement channel preference. Admin dashboard login frequency tracks team activity.

## Data Sources

All data comes from the application itself. Booking data lives in `backend/models/Booking.js`. Lead data is in `backend/models/Lead.js`. Chat data spans `backend/models/ChatMessage.js` and `ChatSession.js`. The audit trail is maintained in `backend/models/auditlog.js`.

## Reporting Cadence

Weekly reports cover enquiries, bookings, active chats, and admin activity. Monthly reports review conversion rates, revenue, NPS, and landlord satisfaction. Quarterly reports are strategic reviews that answer one question: pivot or persevere?

---

## Parent

[[01-company/Company Hub|← Back to hub]]
