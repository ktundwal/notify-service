# notify-service

Teams-style notification service with webhook ingestion, subscription management, priority filtering, and quiet hours.

## Architecture

```
src/
├── server.ts              ← Express app, route mounting, startup
├── types/index.ts         ← Shared interfaces (Notification, Subscription, AdaptiveCard)
├── routes/
│   ├── webhooks.ts        ← POST /webhooks/notify, GET /webhooks/history
│   └── subscriptions.ts   ← CRUD for user notification preferences
├── services/
│   ├── dispatcher.ts      ← Routes notifications to subscribers, applies filters
│   ├── templates.ts       ← Builds Teams-style adaptive cards from notifications
│   └── dedup.ts           ← Content-hash deduplication within a time window
└── storage/
    └── sqlite.ts          ← SQLite persistence (notifications + subscriptions tables)
```

## Quick Start

```bash
npm install
npm run dev          # starts with hot reload on :3000
npm run seed         # populate with sample data
```

## API

```
POST   /webhooks/notify        — send a notification (body: WebhookPayload)
GET    /webhooks/history        — recent notifications (?limit=50)
POST   /subscriptions           — create subscription (body: userId, channel, ...)
GET    /subscriptions/:userId   — list user's subscriptions
DELETE /subscriptions/:id       — remove a subscription
GET    /health                  — health check
```

## Verify

```bash
npm run verify       # tsc --noEmit && vitest run
```

tests/acceptance.test.ts contains pre-written acceptance tests that validate expected behavior for new features. These tests are the spec — do not modify them. Make them pass.

## Key Concepts

- **Priority levels**: P0 (critical) through P3 (low). P0 always breaks through quiet hours.
- **Quiet hours**: Per-subscription DND windows. Non-P0 notifications are filtered during quiet hours.
- **Deduplication**: Same sourceId + content hash within 5 minutes = suppressed.
- **Adaptive cards**: Notifications rendered as Teams-style adaptive card JSON.
- **Min priority**: Each subscription sets a minimum priority threshold. Notifications below it are filtered.

## Conventions

- TypeScript strict mode, no `any`
- Express routes return proper HTTP status codes with structured JSON
- Business logic in `services/`, data access in `storage/`, route handlers thin
- Tests in `tests/` using vitest
- Run `npm run verify` before committing
