# JAAGA X integration platform

## Build

- Replace the current simulated PMS setup with the supplied purple integration workspace: OTA, PMS and Channel Manager connections, six-step setup, property/room/rate mapping, sync rules, real tests, activation status, logs and reconciliation.
- Extend the existing channel connection and mapping records rather than creating another hotel, inventory or booking system. Preserve existing bookings, payments, HyperGuest inventory and hotel dashboards.
- Store outbound credentials only through server code with encryption; never return secrets to browser queries. Use expiring, revocable access tokens and hashed client secrets for inbound API clients.
- Provide JAAGA X API documentation and standardized authenticated endpoints for properties, rooms, rate plans, availability/rates, reservations, modifications and cancellations. All reservation writes use central pricing and inventory safeguards with idempotency keys.
- Add signed webhook ingestion, deduplication, outbound delivery records, bounded retries, scheduled worker processing, error monitoring and reconciliation issues for administrator/partner review.
- Add Global Admin review, test, approve, reject, suspend and reactivate controls. Activation requires approved ownership, successful checks and valid mappings; unreviewed connections cannot sync or accept API writes.
- Connect the existing HyperGuest adapter first. Booking.com, MakeMyTrip, Agoda, Expedia, Hotelogix, eZee, OPERA, Cloudbeds, SiteMinder, RateGain and other providers remain clearly unavailable for live sync until their approved API documentation, commercial access and credentials are configured; no simulated provider success.
- Add responsive navigation and loading, empty, validation and failure states. Remove the old heuristic “connection successful” behavior.

## Verification

- Add focused tests for permissions, activation gates, token expiry/scope checks, encrypted credential handling, idempotency, retries and reconciliation.
- Run the relevant test files, type checks and preview build; exercise partner setup and Global Admin review in the browser with authorized test accounts.
- Verify existing hotel availability and booking records remain intact. Do not make live external bookings, payments, cancellations or provider activation claims without real provider responses.

## Technical approach

- Database: additive integration fields and service-only credential/token/webhook/job records, with owner/admin RLS and explicit grants.
- Backend: separate management, public API and webhook/worker Edge Functions sharing validated integration helpers and existing reservation services.
- Frontend: hospitality services plus new partner and admin screens inside the existing workspace/navigation.
