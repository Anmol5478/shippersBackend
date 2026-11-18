# Ridezey backend patch — Phase 1: ride publishing

This patch updates the existing backend from `Archive 4(4).zip`. It changes only:
- `src/models/rides/rideRepository.js`
- `src/models/rides/rideService.js`
- `src/models/rides/rideRoutes.js` (Swagger request documentation)

## What changed

1. Keeps old clients backward-compatible: omitted `service_type` defaults to `PARCEL`.
2. Supports `service_type`: `PARCEL`, `PASSENGER`, or `BOTH`.
3. For `PARCEL`/`BOTH`, requires `available_weight` and `price_per_kg`.
4. For `PASSENGER`/`BOTH`, requires `available_seats` and `price_per_seat`.
5. Creates START and END stops automatically for every newly published ride.
6. Accepts optional `intermediate_stops` JSON array and creates ordered INTERMEDIATE stops.
7. Creates one `ride_segments` row between every pair of adjacent stops.
8. Segment capacities are initialized from the ride's parcel weight / passenger seat capacity.
9. Parcel ride search excludes passenger-only rides and continues using the existing parcel booking calculation.

All stop and segment inserts occur inside the existing ride-publishing DB transaction. Existing R2 proof upload and cleanup behavior is retained.

## Applying

1. Back up the backend project.
2. Replace the three files at the same paths in your backend.
3. Do not replace `.env`, `node_modules`, or any credentials.
4. Run `node --check` on the three changed files (already passed for this patch).
5. Start the backend in a development/staging environment and test publishing before production.

## Existing parcel request compatibility

No new fields are required. Existing requests that omit `service_type` continue to publish as `PARCEL` using `available_weight` and `price_per_kg`.

## Passenger-only multipart request fields

Because the existing ride endpoint uses `multipart/form-data` for proof files, send:
- `service_type=PASSENGER`
- `available_seats=3`
- `price_per_seat=150`
- omit `available_weight` and `price_per_kg`

## BOTH request fields

Send:
- `service_type=BOTH`
- `available_weight=20`
- `price_per_kg=10`
- `available_seats=3`
- `price_per_seat=150`

## Optional intermediate stops

Send `intermediate_stops` as a JSON string, for example:

```json
[
  {
    "city": "Noida",
    "state": "Uttar Pradesh",
    "latitude": 28.5355,
    "longitude": 77.3910,
    "address": "Sector 18, Noida"
  },
  {
    "city": "Faridabad",
    "state": "Haryana",
    "latitude": 28.4089,
    "longitude": 77.3178
  }
]
```

Each intermediate stop requires a city. Latitude and longitude must either both be supplied or both omitted. Maximum 20 intermediate stops.

## Important scope boundary

This phase implements ride publishing and creates stop/segment capacity rows. It does **not yet** change parcel booking creation/cancellation to allocate/release capacity per selected segment, and it does **not yet** implement passenger booking endpoints. Those are the next backend phases. Do not launch passenger booking until those phases are implemented and tested.


---

## Integrated update supersedes this phase note

The complete segment-aware parcel and passenger implementation is documented in `INTEGRATED_RIDE_BOOKING_BACKEND.md`. The earlier scope boundary above described the original Phase 1 patch only; it is superseded by the integrated update in this ZIP.
