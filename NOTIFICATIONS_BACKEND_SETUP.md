# Ridezey notification backend changes

## Critical database correction
The authentication JWT and booking code use `req.user.user_id`, whose values are custom strings such as `D0001` and `USR0001`. If the three notification tables were created with BIGINT user_id, run `notifications_user_id_migration.sql` first. It assumes the existing users table has a `user_id` column.

## Added files
- `src/models/notifications/notificationRepository.js`
- `src/models/notifications/notificationService.js`
- `src/models/notifications/notificationController.js`
- `src/models/notifications/notificationRoutes.js`

## Modified files
- `src/index.js`: mounts `/api/notifications`.
- `src/models/bookings/bookingService.js`: after a booking commits, creates an inbox notification and attempts to push it to the assigned driver.

## Authenticated endpoints
All endpoints require `Authorization: Bearer <accessToken>`.

| Method | Endpoint | Body / query |
|---|---|---|
| POST | `/api/notifications/devices/register` | `{ "expo_push_token":"ExponentPushToken[...]", "device_type":"android", "device_name":"Android" }` |
| DELETE | `/api/notifications/devices/:deviceId` | none |
| POST | `/api/notifications/devices/unregister-token` | `{ "expo_push_token":"ExponentPushToken[...]" }` |
| GET | `/api/notifications?page=1&limit=20` | query |
| GET | `/api/notifications/unread-count` | none |
| PATCH | `/api/notifications/:notificationId/read` | none |
| PATCH | `/api/notifications/read-all` | none |
| GET | `/api/notifications/preferences` | none |
| PUT | `/api/notifications/preferences` | partial preference object |

Preference keys: `push_enabled`, `ride_notifications`, `booking_notifications`, `parcel_notifications`, `payment_notifications`, `chat_notifications`, `promotional_notifications`. Values should be booleans or 0/1.

## Behavior
- In-app notification is inserted before attempting Expo push delivery.
- Expo delivery failure is logged and does not fail booking creation.
- No client API allows arbitrary users to send notifications to other users.
- This first backend pass wires the new-booking event to notify the driver. Other events should be added at the exact successful status-transition points in their respective services.

## Expo push notes
This uses the existing `axios` dependency and Expo's push endpoint. The app still needs to obtain a real Expo push token and register it through `/devices/register`. Android/iOS native push credentials and app-side notification listeners are separate setup steps.
