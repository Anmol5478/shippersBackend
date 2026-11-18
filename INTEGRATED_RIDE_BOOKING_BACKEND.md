# Ridezey integrated ride, parcel and passenger backend

This update is based on the uploaded `Ridezey_backend_phase1_updated` project and the database migration already applied to MySQL 8.4.

## Included backend behavior

### Ride publishing
- Supports `PARCEL`, `PASSENGER`, and `BOTH`.
- Creates START, optional INTERMEDIATE, and END stops.
- Creates one `ride_segments` row between every adjacent stop.
- Segment capacities are initialized from the ride's published weight and/or seat capacity.
- The publishing transaction includes the ride, stops, segments and travel-proof record.

### Parcel bookings
- Existing `/api/bookings/create-booking` endpoint is retained.
- Optional `pickup_stop_id` and `drop_stop_id` select a partial route; omission defaults to START and END for old clients.
- Capacity is checked on every segment in the selected route.
- Each segment is reserved inside the same DB transaction as the booking.
- `parcel_booking_segments` stores the per-booking segment allocation.
- Sender cancellation and driver rejection release the allocated weight transactionally.
- Existing proof, OTP, enterprise purchase-bill and notification flows remain in place.

### Passenger bookings
- New authenticated endpoints under `/api/passenger-bookings`.
- Seat capacity is checked on every segment between the selected stops.
- `passenger_booking_segments` stores seat allocation per segment.
- Passenger cancellation and ride-owner rejection release seats transactionally.
- Passenger and driver lists are scoped to the authenticated user.

### Search
- Existing `/api/rides/search-available` now matches any ordered pickup/drop stop pair on a parcel-capable ride and reports the minimum remaining parcel capacity across that route.
- New `/api/rides/search-passenger-available` searches passenger-capable rides and reports the minimum remaining seats across the requested route.

## API request examples

### Search parcel rides
`POST /api/rides/search-available`
```json
{
  "from": "Noida",
  "to": "Delhi",
  "weight": "1-5",
  "date": "2026-12-01"
}
```

### Search passenger rides
`POST /api/rides/search-passenger-available`
```json
{
  "from": "Noida",
  "to": "Delhi",
  "seats": 2,
  "date": "2026-12-01"
}
```
Use returned `pickup_stop_id` and `drop_stop_id` for the booking.

### Create passenger booking
`POST /api/passenger-bookings`
Authorization: Bearer token
```json
{
  "ride_id": 25,
  "pickup_stop_id": 101,
  "drop_stop_id": 103,
  "seat_count": 2,
  "passenger_name": "Passenger Name",
  "passenger_phone": "9876543210",
  "payment_method": "CASH"
}
```

### Passenger booking endpoints
- `GET /api/passenger-bookings/mine`
- `GET /api/passenger-bookings/received`
- `PATCH /api/passenger-bookings/:bookingId/cancel`
- `PATCH /api/passenger-bookings/:bookingId/status` with `{ "status": "CONFIRMED" }` or `{ "status": "REJECTED" }`

### Create parcel booking
`POST /api/bookings/create-booking`
Existing fields remain supported. To book a partial route, additionally send:
```json
{
  "pickup_stop_id": 101,
  "drop_stop_id": 103
}
```
If omitted, the booking uses the ride's START and END stops.

## Capacity and concurrency design

- Parcel and passenger booking creation lock the parent `rides` row with `SELECT ... FOR UPDATE`.
- The selected `ride_segments` rows are also selected `FOR UPDATE`.
- Each reservation update includes a capacity predicate (`reserved + requested <= capacity`).
- Booking rows and segment allocation rows are committed in one transaction.
- Cancellation/rejection locks the booking, releases each allocation, and changes status in one transaction.
- A pending booking consumes capacity until it is confirmed, cancelled, or rejected.

This serializes reservations for a given ride and prevents concurrent overbooking through these APIs.

## Apply and test

1. Keep a backup of the current backend and `.env`.
2. Replace backend source with this ZIP in staging; preserve `.env` and do not copy `node_modules`.
3. Run `npm install` if dependencies are not already installed.
4. Run `npm run dev`.
5. Test:
   - publish a PARCEL ride with at least one intermediate stop;
   - search between START→END and intermediate→END;
   - create parcel bookings on overlapping and non-overlapping segments;
   - cancel and reject bookings and verify `reserved_weight_kg`;
   - publish PASSENGER and BOTH rides;
   - create concurrent passenger bookings and verify `reserved_seats`;
   - cancel/reject passenger bookings and verify seats are released;
   - run existing KYC, proof upload, OTP, enterprise, wallet and notification regression tests.

## Important boundaries

- This update does not add online payment capture/refund integration for passenger fares. `payment_status` remains `PENDING` until your payment flow updates it.
- It does not introduce passenger pickup/drop OTP or trip-tracking lifecycle; the new passenger lifecycle currently supports PENDING, CONFIRMED, CANCELLED, REJECTED, COMPLETED and NO_SHOW at schema level, with create/confirm/reject/cancel endpoints implemented.
- Existing parcel pickup/delivery proof and OTP lifecycle is preserved.
- Run staging integration tests before production deployment. Static syntax checks are not a substitute for testing against your actual MySQL database, R2 bucket and push-notification credentials.
