# Outreach provider API contract

Verified against the user-supplied official OpenAPI document **API Documentation V2**, version **2.2.2**, dated 2026-09-04.

- Server: `https://api.manyreach.com`
- Authentication: `X-API-Key` request header. Query-string authentication is unsupported in V2.
- Campaign read: `GET /api/v2/campaigns`, paginated; current sync requests up to 1,000 non-archived records.
- Campaign read responses also supply daily limits, timezone, send delay, enabled weekdays, and daily sending windows. These fields are cached as provider-neutral campaign settings and shown on the selected campaign dashboard.
- Sender read: `GET /api/v2/senders`, paginated; current sync requests up to 1,000 records.
- Sender daily limits, pacing, ramp-up, and warm-up settings are cached internally for the Email Accounts experience. Credentials and connection internals are never returned.
- Campaign time series: `GET /api/v2/campaigns/{id}/stats` is documented but not yet used.
- Prospect read: `GET /api/v2/prospects`, cursor-paginated; sync stores up to 5,000 records per run and associates messages by normalized email.
- Messages: `GET /api/v2/messages` requires a message type. Sync requests `Reply`, `Sent`, and `SentManual`, cursor-paginates each type, and stores up to 3,000 records per type per run.
- Replies are mirrored into the local reply center only when their normalized sender email matches a synchronized prospect. Manual classification remains separate from the provider status and is never overwritten by synchronization.
- Responses may include 401/406 authentication errors, 403 plan restrictions, 422 validation errors, 429 throttling, and 500 upstream errors. Client-facing messages are provider-neutral.

External IDs are encrypted and never returned to client-facing routes. Dashboard requests read the local database rather than calling the provider.
