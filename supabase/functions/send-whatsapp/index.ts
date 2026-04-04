import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Format phone number to include country code
function formatPhoneNumber(phone: string): string {
  // Remove all whitespace and special characters except +
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Remove whatsapp: prefix if present
  cleaned = cleaned.replace('whatsapp:', '');
  
  // If already has + prefix, assume it's complete
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If starts with 91 and is 12 digits, add +
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return '+' + cleaned;
  }
  
  // If 10 digits, assume Indian number and add +91
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    return '+91' + cleaned;
  }
  
  // Otherwise return as-is with + prefix
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate authorization via JWT
    const authHeader = req.headers.get('Authorization');
    let isAuthorized = false;
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        isAuthorized = true;
        userId = user.id;
        console.log(`Authenticated user sending WhatsApp`);
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isAuthorized) {
      console.error('Unauthorized request - no valid auth');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { to, message, bookingId } = await req.json();

    // Validate required fields
    if (!to || !message) {
      console.error('Missing required fields:', { to: !!to, message: !!message });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to and message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate message length (WhatsApp limit is 4096, but we limit to 1600 for safety)
    if (message.length > 1600) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 1600 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const whatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!accountSid || !authToken || !whatsappNumber) {
      console.error('Twilio credentials not configured');
      throw new Error('Twilio credentials not configured');
    }

    // Format phone number for WhatsApp
    const formattedPhone = formatPhoneNumber(to);
    const formattedTo = `whatsapp:${formattedPhone}`;
    const formattedFrom = whatsappNumber.startsWith('whatsapp:') ? whatsappNumber : `whatsapp:${whatsappNumber}`;

    console.log(`Sending WhatsApp to ${formattedTo} from ${formattedFrom}`);
    console.log(`Original phone: ${to}, Formatted: ${formattedPhone}`);

    // Send WhatsApp message via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = btoa(`${accountSid}:${authToken}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedTo,
        From: formattedFrom,
        Body: message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Twilio error:', data);
      throw new Error(data.message || 'Failed to send WhatsApp message');
    }

    console.log('WhatsApp sent successfully:', data.sid);

    // Update whatsapp_logs if bookingId is provided
    if (bookingId) {
      await supabase
        .from('whatsapp_logs')
        .update({ 
          status: 'sent', 
          twilio_sid: data.sid,
          delivery_status: 'sent'
        })
        .eq('booking_id', bookingId)
        .eq('recipient', to)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sid: data.sid,
        status: data.status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-whatsapp function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
