---
type: topic
status: active
created: 2026-06-20
tags:
  - metrics
  - kpi
  - dashboard
---

# Metrics & KPIs

## North Star Metric

**Successful student placements per month** — a student who enquired, viewed, and booked through Ten&See.

## Dashboard Metrics

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

| Indicator | Why It Matters |
|-----------|--------------|
| Website traffic | Top of funnel |
| Bounce rate on property pages | Content/UX quality |
| Chat response time | Service level |
| WhatsApp message volume | Engagement channel preference |
| Admin dashboard login frequency | Team activity |

## Data Collection

- Booking data: `backend/models/Booking.js`
- Lead data: `backend/models/Lead.js`
- Chat data: `backend/models/ChatMessage.js`, `ChatSession.js`
- Audit trail: `backend/models/auditlog.js`

## Reporting

- **Weekly:** Enquiries, bookings, active chats, admin activity
- **Monthly:** Conversion rates, revenue, NPS, landlord satisfaction
- **Quarterly:** Strategic review — pivot or persevere?

---

