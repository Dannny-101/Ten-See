---
type: topic
status: active
created: 2026-06-20
tags:
  - codebase
  - map
  - backend
  - frontend
---

# Codebase Map

> Auto-generated snapshot. Last updated: 2026-06-20.

## Entry Point

`backend/server.js` — Socket.io handlers, chat queue init, lead-alert cron.

## Routes (14 routers)

All live in `backend/routes/`. Auth lives in `routes/admin.js` (`authMiddleware`).

| File | Purpose | Auth Required |
|------|---------|---------------|
| `admin.js` | Admin login, auth middleware | Varies |
| `leads.js` | Lead CRUD | GET/PUT/DELETE: yes; POST: public |
| `bookings.js` | Booking CRUD | GET/PUT/DELETE: yes; POST: public |
| `listings.js` | Property listings | POST/PUT/DELETE: yes; GET: public |
| `properties.js` | Property details | POST/PUT/DELETE: yes; GET: public |
| `chat.js` | Chat sessions & messages | Varies |
| `whatsapp.js` | WhatsApp webhook & send | Webhook: public; send: auth |
| `audit.js` | Audit log | All: auth |
| *(remaining 6)* | TBD — verify with `ls backend/routes/` | |

## Models (11 schemas)

All live in `backend/models/`.

| File | Schema | Key Fields |
|------|--------|-----------|
| `Lead.js` | Lead | name, email (conditionally required), phone, source, status |
| `Booking.js` | Booking | student, property, dates, status, payment |
| `Listing.js` | Listing | property, rent, availability, images |
| `Property.js` | Property | landlord, address, coordinates, amenities |
| `ChatMessage.js` | Chat message | session, sender, content, timestamp |
| `ChatSession.js` | Chat session | user, agent, status, queue position |
| `Admin.js` | Admin user | username, password (hashed), role |
| `Task.js` | Task | title, assignee, status, due |
| `Notification.js` | Notification | user, type, message, read |
| `auditlog.js` | Audit log | action, actor, resource, timestamp |
| *(remaining 1)* | TBD | |

## Services

| File | Purpose |
|------|---------|
| `chatQueue.js` | Agent queue: assigns agents to waiting chat sessions |
| `chatPager.js` | Alerts agents when sessions need attention |
| `whatsapp.js` | WhatsApp Cloud API client (base: `https://graph.facebook.com/<version>`) |
| `email.js` | Canonical email module (ONLY email module) |

## Frontend

| File | Purpose |
|------|---------|
| `frontend/index.html` | Main landing / student-facing page |
| `frontend/property.html` | Individual property detail page |
| `frontend/listing.html` | Search / browse listings |
| `frontend/admin/index.html` | Admin dashboard (~6k lines) |
| `frontend/styles.css` | Global styles |
| `frontend/theme.css` / `theme.js` | Theme system |
| `frontend/map-feature.js` / `map-feature.css` | Mapbox integration |

## Key Rules

- **Never read or modify `node_modules/`, `package-lock.json`, `frontend/assets/`.**
- **Never remove or weaken `authMiddleware`** on protected routes.
- **`Lead.email` is conditionally required** — WhatsApp-source leads have no email.
- **Get `io` / `emitToAdmins`** via `req.app.get(...)`.
- **Admin actions get an audit entry** via `createAuditLog`.

---

