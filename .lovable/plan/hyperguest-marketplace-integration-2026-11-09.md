# HyperGuest Marketplace integration

## What will change
- Import the 17 requested hotels from HyperGuest's catalog and full property content, retaining supplier hotel and room IDs.
- Reuse existing hotel records when already mapped; never replace partner-managed inventory or create duplicate supplier inventory.
- Add a HyperGuest tab to Hospitality Admin for import, refresh, publishing status, failures and synchronization history.
- Include imported hotels in the current Hotels results, filters and map using real content and live supplier prices/availability.
- Open supplier room selection and checkout through the existing certified HyperGuest flow, preserving supplier references, confirmation, payment and cancellation handling.
- Keep certification-only booking restrictions separate from normal marketplace bookings.

## Technical approach
- Extend existing `partner_hotels` / `hotel_rooms` mapping fields with unique indexes and supplier-content synchronization metadata; no second inventory store or booking engine.
- Extend the existing `hyperguest` function with authenticated admin catalog synchronization and public mapped-inventory availability actions. Keep credentials server-side and reuse audited API calls.
- Preserve raw supplier content and synchronize room metadata without inventing local stock or prices. Availability remains authoritative in HyperGuest.
- Reuse the current Hotels presentation and existing supplier checkout, carrying selected dates and guests across navigation.
- Validate inputs, enforce admin authorization, handle partial import failures independently, and test mapping, certification separation and supplier availability calculations.

## Verification and limits
- Import and check actual responses for all 17 IDs; display supplier failures rather than fabricated hotels.
- Verify customer search/detail/room selection and authenticated admin synchronization in the browser.
- Do not create a chargeable reservation during development. Report any unavailable inventory, contract restrictions or payment configuration that prevents booking verification.