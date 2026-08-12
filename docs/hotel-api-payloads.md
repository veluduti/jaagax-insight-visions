# Hotel APIs — Request & Response Payloads

Base URL for edge functions: `https://<project>.supabase.co/functions/v1`
Headers for every edge call:

```
Content-Type: application/json
apikey: <publishable key>
Authorization: Bearer <publishable key or user JWT>
```

Search and detail are **direct database (PostgREST) reads** from the browser client, not custom endpoints. Quote and confirm are **edge functions** and are the price authority.

---

## 1. Search — `partner_hotels` + `hotel_rooms`

Called in `src/pages/Hotels.tsx`.

Request (supabase-js):

```ts
supabase.from("partner_hotels").select("*").eq("is_active", true)
  .order("star_rating", { ascending: false });

supabase.from("hotel_rooms")
  .select("id, hotel_id, room_type, base_price, max_occupancy, max_adults, max_children, total_units, is_active")
  .eq("is_active", true);
```

REST equivalent:

```
GET /rest/v1/partner_hotels?select=*&is_active=eq.true&order=star_rating.desc
GET /rest/v1/hotel_rooms?select=id,hotel_id,room_type,base_price,max_occupancy,max_adults,max_children,total_units,is_active&is_active=eq.true
```

Response — array of hotels:

```json
[{
  "id": "uuid",
  "name": "string",
  "city": "string",
  "locality": "string|null",
  "address": "string|null",
  "star_rating": 4,
  "total_rooms": 42,
  "check_in_time": "14:00",
  "check_out_time": "11:00",
  "amenities": ["Wifi", "Pool"],
  "images": ["https://..."],
  "description": "string|null",
  "gst_rate": 12,
  "is_active": true
}]
```

Response — array of rooms:

```json
[{
  "id": "uuid",
  "hotel_id": "uuid",
  "room_type": "Deluxe",
  "base_price": 3500,
  "max_occupancy": 3,
  "max_adults": 2,
  "max_children": 2,
  "total_units": 6,
  "is_active": true
}]
```

Filtering (city, price, guests, occupancy combinations) happens client-side; `src/lib/roomOccupancy.ts` decides whether a hotel can host the party in one room or as a multi-room combination.

---

## 2. Hotel detail — `partner_hotels` by id

Called in `src/pages/HotelDetail.tsx`.

```
GET /rest/v1/partner_hotels?select=*&id=eq.<hotel_id>
```

Returns a single hotel object with the same shape as above (`images` are post-processed through `resolveHotelImages`). Rooms for the detail page are read from `hotel_rooms` filtered by `hotel_id=eq.<id>&is_active=eq.true`.

Live availability per room:

```
POST /rest/v1/rpc/check_room_availability
{ "_room_id": "uuid", "_check_in": "2026-08-20", "_check_out": "2026-08-22" }
→ 4            // integer units still bookable
```

---

## 3. Quote — `POST /functions/v1/booking-engine-quote`

Server-authoritative price. Never trust a client-computed total.

### 3a. Single room type

Request:

```json
{
  "hotel_id": "uuid",
  "room_id": "uuid",
  "check_in": "2026-08-20",
  "check_out": "2026-08-22",
  "adults": 2,
  "children": 1,
  "child_ages": [7],
  "num_rooms": 1,
  "extra_beds": 1,
  "meals": ["breakfast", "dinner"],
  "addons": [{ "addon_id": "uuid", "quantity": 1 }],
  "promo_code": "SUMMER10"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| hotel_id, room_id | uuid | yes | must belong together, both active |
| check_in, check_out | `YYYY-MM-DD` | yes | check_out > check_in |
| adults | int | no (default 1) | `guests` accepted as alias |
| children / child_ages | int / int[] | no | ages drive free-child rules |
| num_rooms | int | no (default 1) | units of this room type |
| extra_beds | int | no | validated against room limits |
| meals | `("breakfast"\|"lunch"\|"dinner")[]` | no | room-level meal config overrides hotel-level |
| addons | `{addon_id, quantity}[]` | no | priced per unit / per night / per guest |
| promo_code | string | no | validated server-side |

Response 200:

```json
{
  "nights": 2,
  "nightly": [{ "date": "2026-08-20", "price": 3500 }, { "date": "2026-08-21", "price": 3800 }],
  "per_night": 3650,
  "perNight": 3650,
  "room_total": 7300,
  "room_charges": 7300,
  "meal_total": 1600,
  "meals": [{ "meal_type": "breakfast", "label": "Breakfast", "included": true, "total": 0 }],
  "extra_bed_total": 1000,
  "addon_total": 500,
  "discount": 730,
  "promo": { "code": "SUMMER10", "discount": 730 },
  "taxable_subtotal": 9670,
  "gst_rate": 12,
  "tax_amount": 1160.4,
  "grand_total": 10830.4,
  "total": 10830.4,
  "line_items": [{
    "item_type": "room",
    "item_name": "Deluxe",
    "quantity": 1,
    "unit_price": 3650,
    "units": 2,
    "adult_count": 2,
    "child_count": 1,
    "subtotal": 7300,
    "price_snapshot": {}
  }],
  "available": 4
}
```

`item_type` is one of `room | breakfast | lunch | dinner | extra_bed | addon | discount`.

### 3b. Multi-room combination

Send `groups` instead of `room_id` (a room type may appear only once):

```json
{
  "hotel_id": "uuid",
  "check_in": "2026-08-20",
  "check_out": "2026-08-22",
  "groups": [
    { "room_id": "uuid-deluxe", "quantity": 1, "adults": 3, "children": 0, "extra_beds": 1, "meals": ["breakfast"] },
    { "room_id": "uuid-premium", "quantity": 1, "adults": 2, "children": 1, "meals": [] }
  ]
}
```

Response 200:

```json
{
  "multi_room": true,
  "nights": 2,
  "room_total": 15400,
  "meal_total": 1200,
  "extra_bed_total": 1000,
  "discount": 0,
  "taxable_subtotal": 17600,
  "gst_rate": 12,
  "tax_amount": 2112,
  "grand_total": 19712,
  "total": 19712,
  "groups": [{
    "room_id": "uuid-deluxe",
    "room_type": "Deluxe",
    "quantity": 1,
    "adults": 3,
    "children": 0,
    "per_night": 3650,
    "total": 9000,
    "line_items": [ /* same LineItem shape */ ]
  }]
}
```

### Quote errors

```json
{ "error": "message" }
```

| Status | When |
|---|---|
| 400 | missing fields, inactive hotel/room, invalid dates, occupancy/extra-bed validation failure, duplicate room in `groups` |
| 404 | hotel or room not found |
| 409 | stop-sell date, rate-calendar unit shortage, or `"Not enough rooms available for the selected dates"` (may include `"available": n`) |
| 500 | unexpected — `error` carries the exception string |

---

## 4. Confirm — `POST /functions/v1/booking-engine-confirm`

Re-prices the stay server-side (ignores any client total), re-validates availability, writes the booking with line-item snapshots, issues the guest portal token and triggers the confirmation email.

Request:

```json
{
  "hotel_id": "uuid",
  "room_id": "uuid",
  "check_in": "2026-08-20",
  "check_out": "2026-08-22",
  "adults": 2,
  "children": 1,
  "child_ages": [7],
  "num_rooms": 1,
  "extra_beds": 1,
  "meals": ["breakfast"],
  "addons": [{ "addon_id": "uuid", "quantity": 1 }],
  "promo_code": "SUMMER10",
  "guest_name": "Venkatesh V",
  "guest_email": "guest@example.com",
  "guest_phone": "+919876543210",
  "special_requests": "High floor",
  "source": "direct",
  "user_id": "uuid|null",
  "idempotency_key": "unique-string"
}
```

Required: `hotel_id`, `room_id`, `check_in`, `check_out`, `guest_name`, `guest_email`. All pricing inputs are the same as the quote so the recalculated total matches what the guest saw.

Response 200:

```json
{
  "booking": {
    "id": "uuid",
    "booking_reference": "string",
    "hotel_id": "uuid",
    "room_id": "uuid",
    "hotel_name": "string",
    "hotel_address": "address, locality, city",
    "room_type": "Deluxe",
    "check_in": "2026-08-20",
    "check_out": "2026-08-22",
    "num_guests": 3,
    "adults": 2,
    "children": 1,
    "num_rooms": 1,
    "extra_beds": 1,
    "guest_name": "Venkatesh V",
    "guest_email": "guest@example.com",
    "guest_phone": "+919876543210",
    "currency": "INR",
    "status": "confirmed",
    "payment_status": "pending",
    "guest_portal_token": "hex-token",
    "total_amount": 10830.4
  },
  "portal_url": "https://<app-origin>/stay/<guest_portal_token>",
  "quote": { /* same PricingResult as the quote response */ }
}
```

Idempotency: if `idempotency_key` matches an existing `booking_reference`, the call returns the stored booking with `"duplicate": true` and creates nothing new.

Errors: `400` missing fields / quote validation, `404` hotel or room not found, `409` availability conflict, `500` unexpected — all as `{ "error": "message" }`.

---

## 5. Payment (after confirm)

| Step | Endpoint | Body |
|---|---|---|
| Create order | `POST /functions/v1/razorpay-create-order` | `{ booking_id, amount }` (amount recomputed server-side) |
| Verify | `POST /functions/v1/razorpay-verify-payment` | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id }` |
| Cancel | `POST /functions/v1/hotel-booking-cancel` | `{ booking_id, reason }` |

---

## Recommended client sequence

1. Search: read `partner_hotels` + `hotel_rooms`, filter occupancy locally.
2. Detail: read hotel by id + its rooms; call `check_room_availability` per room for the chosen dates.
3. Quote: `booking-engine-quote` on every change of dates, rooms, meals, beds, add-ons or promo — display only the returned `grand_total`.
4. Confirm: `booking-engine-confirm` with the same inputs plus guest details and an `idempotency_key`.
5. Pay: Razorpay create → verify.
