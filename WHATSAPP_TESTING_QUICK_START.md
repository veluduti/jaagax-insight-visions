# WhatsApp Notifications - Quick Testing Guide

## Prerequisites ✅
Ensure you have these Twilio secrets configured:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN` 
- `TWILIO_WHATSAPP_NUMBER`

## Quick Test Steps

### 1. Navigate to Builder Dashboard (No Login Required)
Go to: `/dashboard/builder/visits`

### 2. Find a Pending Visit Request
Look for visits with status "builder_pending"

### 3. Approve or Decline
Click the "Approve" or "Decline" button on any visit

### 4. Check WhatsApp
The user should receive a WhatsApp message at their registered phone number

## What Happens Behind the Scenes

```
User Action (Approve/Decline)
    ↓
approve-visit edge function
    ↓
send-visit-update edge function
    ↓
send-whatsapp edge function → WhatsApp message sent
    ↓
create-notification edge function → In-app notification
```

## Testing Different Scenarios

### Test 1: Approve Visit
1. Click "Approve" on a pending visit
2. Add optional notes
3. Click "Confirm Approval"
4. **Expected WhatsApp**: "✅ Visit Approved - JaagaX"

### Test 2: Decline Visit
1. Click "Decline" on a pending visit
2. Enter rejection reason
3. Click "Confirm Decline"
4. **Expected WhatsApp**: "❌ Visit Declined - JaagaX"

## Verify WhatsApp Message Content

### Approval Message Template:
```
🏡 Visit Confirmed! - JaagaX

Great news [User Name]!

Your visit request has been approved by the builder.

📅 Date: [Visit Date]
⏰ Time: [Visit Time]
📍 Property: [Property Title]

[Builder Notes if any]

See you there!
```

### Decline Message Template:
```
🏡 Visit Update - JaagaX

Hello [User Name],

Unfortunately, your visit request has been declined.

📅 Date: [Visit Date]
⏰ Time: [Visit Time]
📍 Property: [Property Title]

Reason: [Rejection Reason]

Please contact us to reschedule.
```

## Debug Checklist

### If WhatsApp Not Sending:

1. **Check Edge Function Logs**
   - View logs at: https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc/functions/send-whatsapp/logs
   - Look for errors or "Message sent successfully"

2. **Verify Twilio Secrets**
   - Go to: https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc/settings/functions
   - Ensure all 3 Twilio secrets are set

3. **Check Twilio Console**
   - Login to Twilio: https://console.twilio.com/
   - Check message logs for delivery status

4. **Verify Phone Number Format**
   - Must be in E.164 format: `+[country code][number]`
   - Example: `+919876543210` (India)
   - Example: `+14155552671` (USA)

5. **Check WhatsApp Sandbox (Development)**
   - If using Twilio sandbox, user must have joined the sandbox
   - Send "join [sandbox-keyword]" to Twilio WhatsApp number first

### If In-App Notification Not Showing:

1. **Check Notification Bell**
   - Look for red dot indicator
   - Click bell icon to see notification list

2. **Check Database**
   - Table: `notifications`
   - Verify entry was created with correct `user_id`

3. **Check Browser Console**
   - Look for WebSocket connection errors
   - Verify real-time subscription is active

## Quick Database Query

To see pending visits:
```sql
SELECT 
  id,
  user_name,
  user_phone,
  visit_date,
  visit_time,
  status,
  property_id
FROM visit_bookings
WHERE status = 'builder_pending'
ORDER BY created_at DESC;
```

To see WhatsApp logs:
```sql
SELECT 
  recipient,
  message,
  status,
  error_message,
  created_at
FROM whatsapp_logs
ORDER BY created_at DESC
LIMIT 10;
```

## Production Considerations ⚠️

**IMPORTANT**: This testing setup has authentication disabled. Before going to production:

1. Re-enable authentication in `approve-visit` function
2. Add proper role verification (builder/admin only)
3. Add rate limiting to prevent spam
4. Move from Twilio sandbox to production WhatsApp Business API

## Next Steps

1. Test approval flow → Check WhatsApp + notification
2. Test decline flow → Check WhatsApp + notification
3. Review logs to ensure messages are being sent
4. Verify message format and content
5. Re-enable authentication once testing is complete

## Support

- Edge Function Logs: [View Logs](https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc/functions)
- Twilio Console: [View Messages](https://console.twilio.com/)
- Database: [View Tables](https://supabase.com/dashboard/project/smyypmthspsrvwydzsxc/editor)
