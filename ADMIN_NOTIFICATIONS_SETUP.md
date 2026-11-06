# Admin notification campaigns

## New admin APIs
All are protected by the existing `authenticate` and `requireAdmin` middleware under `/api/admin`.

- `GET /api/admin/notifications/audience-counts`
- `GET /api/admin/notifications/campaigns?page=1&limit=10`
- `POST /api/admin/notifications/send`

Send body:
```json
{
  "title": "New feature available",
  "message": "Try the latest Ridezey experience.",
  "audience": "enterprise",
  "notification_type": "announcement"
}
```

Supported audiences: `all`, `drivers`, `customers`, `enterprise`.
Enterprise recipients are selected by joining `users.user_id` to `enterprise_profiles.user_id`.
Blocked users are excluded.
Supported types: `announcement`, `promotion`.
Promotional pushes respect `promotional_notifications`; all push sends respect `push_enabled`.
Every selected recipient gets an in-app notification row. Push messages are sent only to active device tokens that have enabled the relevant preference.

## Migration
Run `admin_notification_campaigns.sql` once against the same MySQL database as `notifications`.
No changes to the three notification tables are required.

## Mounting
The new routes are appended to the existing `src/models/admin/adminRoutes.js`, which is already mounted at `/api/admin` and already protected by `authenticate` + `requireAdmin`.

## Admin frontend
New page: `/notifications`
- Add campaign composer
- Audience selection and live counts
- Enterprise audience
- Preview
- Campaign history
- Uses the existing admin session JWT

## Delivery semantics
`push_accepted_count` means Expo returned a ticket with status `ok`; it is not proof the device displayed the notification. `IN_APP_ONLY` means the in-app notification was stored but no push was accepted (including when there were no eligible device tokens).
