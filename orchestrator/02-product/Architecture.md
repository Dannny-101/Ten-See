---
type: topic
radius: 2
status: active
created: 2026-06-20
tags:
  - architecture
  - system-design
  - tech-stack
---

# System Architecture

## Overview

```
┌─────────────────┐      ┌──────────────────┐      ┌──────────────┐
│   Frontend      │─────▶│   Express API    │─────▶│   MongoDB    │
│  (vanilla JS)   │      │  (Monolith)      │      │  (Mongoose)  │
└─────────────────┘      └──────────────────┘      └──────────────┘
        │                         │
        │                         ▼
        │                ┌──────────────────┐
        │                │   Socket.io      │
        │                │  (Live Chat)     │
        │                └──────────────────┘
        │                         │
        ▼                         ▼
┌─────────────────┐      ┌──────────────────┐
│  WhatsApp Cloud │      │   SMTP Email     │
│     API         │      │   (Nodemailer)   │
└─────────────────┘      └──────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (via Mongoose) |
| Real-time | Socket.io |
| Frontend | Vanilla HTML/CSS/JS |
| Maps | Mapbox GL JS |
| Messaging | WhatsApp Cloud API (Meta) |
| Email | SMTP (Nodemailer) |
| Auth | JWT (custom middleware) |
| Hosting | TBD |

## Services

Four services form the core backend layer. `chatQueue.js` manages the agent queue for live chat sessions. `chatPager.js` sends alerts to agents when sessions need attention. `whatsapp.js` handles all WhatsApp Cloud API integration. `email.js` is the single canonical email module — the only source of truth for email in the application.

## Security

The `authMiddleware` in `routes/admin.js` protects all non-public endpoints. Public endpoints are limited to: GET listings and properties, POST leads, POST bookings, POST chat, and the WhatsApp webhook. CORS uses an allowlist, Helmet headers are enabled, and rate limiting is applied on both Express and Socket.io. The WhatsApp webhook verifies HMAC-SHA256 signatures using the Meta App Secret. The `JWT_SECRET` comes exclusively from `.env` — there are no fallback secrets.

## Socket.io Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join-room` | Client → Server | Join a chat session room |
| `send-message` | Client → Server | Send a chat message |
| `new-message` | Server → Client | Broadcast new message |
| `typing` | Bidirectional | Typing indicators |
| `agent-join` | Server → Client | Agent assigned to session |

## Environment Variables

| Key | Purpose |
|-----|---------|
| `JWT_SECRET` | JWT signing |
| `MONGODB_URI` | Database connection |
| `WHATSAPP_PHONE_ID` | WhatsApp Cloud API |
| `WHATSAPP_TOKEN` | WhatsApp API access |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification |
| `META_APP_SECRET` | Webhook signature HMAC |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Email delivery |
| `MAPBOX_TOKEN` | Maps (should be served via API, not hardcoded) |

---

## Parent

[[02-product/Product Hub|← Back to hub]]
