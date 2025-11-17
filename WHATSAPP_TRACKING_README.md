# Visit Tracking & WhatsApp Integration

## Required Secrets

Add these secrets in Lovable's Secrets UI:

1. **TWILIO_ACCOUNT_SID** - Your Twilio Account SID
2. **TWILIO_AUTH_TOKEN** - Your Twilio Auth Token  
3. **TWILIO_WHATSAPP_NUMBER** - Your Twilio WhatsApp number (format: +14155238886)
4. **GOOGLE_MAPS_API_KEY** - Google Maps JavaScript API key

## Getting API Keys

### Twilio WhatsApp
1. Sign up at https://www.twilio.com/
2. Get a WhatsApp-enabled phone number
3. Find credentials in Console Dashboard

### Google Maps
1. Go to https://console.cloud.google.com/
2. Enable Maps JavaScript API
3. Create API key with proper restrictions

## Features

- **Builder Approval**: `/dashboard/builder/visits`
- **Live Tracking**: `/visit/live/[bookingId]`
- **Visit Verification**: `/visit/verify`
- **WhatsApp Notifications**: Auto-sent at each status change
- **Real-time Updates**: Map updates via Supabase Realtime
- **QR/OTP Verification**: Secure visit start process

## Visit Status Flow

1. `builder_pending` → User requests visit
2. `confirmed` → Builder approves
3. `in_progress` → OTP verified at property
4. `completed` → Agent marks complete
5. `cancelled` / `builder_rejected` → Declined states

All status changes trigger WhatsApp + in-app notifications.
