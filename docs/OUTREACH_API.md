# Outreach provider API contract

Verified against the user-supplied official OpenAPI document **API Documentation V2**, version **2.2.2**, dated 2026-09-04.

- Server: `https://api.manyreach.com`
- Authentication: `X-API-Key` request header. Query-string authentication is unsupported in V2.
- Campaign read: `GET /api/v2/campaigns`, paginated; current sync requests up to 1,000 non-archived records.
- Sender read: `GET /api/v2/senders`, paginated; current sync requests up to 1,000 records.
- Campaign time series: `GET /api/v2/campaigns/{id}/stats` is documented but not yet used.
- Replies: `GET /api/v2/messages?type=Reply` is documented but not yet persisted because reply records require a verified prospect association and inbound messages may include automated or delivery-system mail.
- Responses may include 401/406 authentication errors, 403 plan restrictions, 422 validation errors, 429 throttling, and 500 upstream errors. Client-facing messages are provider-neutral.

External IDs are encrypted and never returned to client-facing routes. Dashboard requests read the local database rather than calling the provider.
