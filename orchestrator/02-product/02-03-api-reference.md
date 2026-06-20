---
type: topic
status: active
section: product
created: 2026-06-20
updated: 2026-06-20
tags: [api, reference, endpoints, rest, socketio]
---

# API Reference

> MOC: [[00-meta/MOC - Product]]

## Response Format

All API responses follow:

```json
{
  "success": true,
  "data": { ... }
}
```

Or on error:

```json
{
  "success": false,
  "error": "message"
}
```

## Public Endpoints (No Auth)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/listings` | List all listings |
| GET | `/api/listings/:id` | Single listing |
| GET | `/api/properties` | List all properties |
| GET | `/api/properties/:id` | Single property |
| POST | `/api/leads` | Submit a lead enquiry |
| POST | `/api/bookings` | Submit a booking request |
| POST | `/api/chat` | Start a chat session |
| POST | `/api/whatsapp/webhook` | Meta WhatsApp webhook |

## Protected Endpoints (authMiddleware)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/leads` | List all leads |
| GET | `/api/leads/:id` | Single lead |
| PUT | `/api/leads/:id` | Update lead |
| DELETE | `/api/leads/:id` | Delete lead |
| GET | `/api/bookings` | List all bookings |
| GET | `/api/bookings/:id` | Single booking |
| PUT | `/api/bookings/:id` | Update booking |
| DELETE | `/api/bookings/:id` | Delete booking |
| POST | `/api/listings` | Create listing |
| PUT | `/api/listings/:id` | Update listing |
| DELETE | `/api/listings/:id` | Delete listing |
| POST | `/api/properties` | Create property |
| PUT | `/api/properties/:id` | Update property |
| DELETE | `/api/properties/:id` | Delete property |
| POST | `/api/whatsapp/send` | Send WhatsApp message |
| GET | `/api/audit` | View audit log |

## Auth Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/admin/login` | Admin login (returns JWT) |
| GET | `/api/admin/me` | Current admin profile |

## Socket.io Events

| Event | Payload | Direction |
|-------|---------|-----------|
| `join-room` | `{ sessionId }` | C → S |
| `send-message` | `{ sessionId, content }` | C → S |
| `new-message` | `{ sessionId, message }` | S → C |
| `typing` | `{ sessionId, isTyping }` | C ↔ S |
| `agent-join` | `{ sessionId, agentId }` | S → C |

## Data Models (Key Fields)

### Lead
- `name` (String, required)
- `email` (String, required UNLESS `source === 'whatsapp'`)
- `phone` (String)
- `source` (String: 'web', 'whatsapp', 'chat')
- `status` (String: 'new', 'contacted', 'viewing', 'booked', 'lost')
- `property` (ObjectId → Property)

### Booking
- `student` (ObjectId → Lead)
- `property` (ObjectId → Property)
- `moveInDate` (Date)
- `duration` (Number, months)
- `status` (String: 'pending', 'confirmed', 'cancelled', 'completed')
- `totalAmount` (Number)
- `paymentStatus` (String)

### ChatSession
- `userId` (String, anonymous or logged-in)
- `agentId` (ObjectId → Admin, nullable)
- `status` (String: 'waiting', 'active', 'closed')
- `queuePosition` (Number)
- `createdAt` / `updatedAt`

---

## Context Links

- [[02-product/02-02-codebase-map]] — Where these endpoints are implemented
- [[08-sops/08-01-runbooks]] — Operational procedures for API changes

#tags #api #reference #endpoints #rest #socketio #models
