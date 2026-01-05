import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting visit reminder job...');

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Find all confirmed visits scheduled for tomorrow that haven't received a reminder
    const { data: visits, error: visitsError } = await supabase
      .from('visit_bookings')
      .select(`
        id,
        user_name,
        user_phone,
        user_email,
        visit_date,
        visit_time,
        status,
        property_id,
        properties (title, locality, city)
      `)
      .eq('visit_date', tomorrowStr)
      .eq('status', 'confirmed')
      .is('reminder_sent_at', null);

    if (visitsError) {
      console.error('Error fetching visits:', visitsError);
      throw visitsError;
    }

    console.log(`Found ${visits?.length || 0} visits needing reminders`);

    const results = {
      total: visits?.length || 0,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const visit of visits || []) {
      if (!visit.user_phone) {
        console.log(`Skipping visit ${visit.id} - no phone number`);
        continue;
      }

      try {
        // Construct reminder message
        const property = visit.properties as any;
        const propertyName = property?.title || 'your property';
        const location = property?.locality && property?.city 
          ? `${property.locality}, ${property.city}` 
          : 'the property location';

        const message = `🔔 *Visit Reminder - JaagaX*

Hi ${visit.user_name || 'there'}! 

This is a friendly reminder about your property visit scheduled for *tomorrow*.

📍 *Property*: ${propertyName}
📌 *Location*: ${location}
📅 *Date*: ${new Date(visit.visit_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
⏰ *Time*: ${visit.visit_time}

Please ensure you arrive 10 minutes early. If you need to reschedule, please contact us as soon as possible.

See you tomorrow! 🏠`;

        // Call the send-visit-update function to send WhatsApp
        const { error: sendError } = await supabase.functions.invoke('send-whatsapp', {
          body: {
            to: visit.user_phone,
            message,
            bookingId: visit.id
          }
        });

        if (sendError) {
          throw sendError;
        }

        // Log to whatsapp_logs
        await supabase.from('whatsapp_logs').insert({
          booking_id: visit.id,
          recipient: visit.user_phone,
          message,
          template_type: 'visit_reminder',
          status: 'sent'
        });

        // Update visit with reminder sent timestamp
        await supabase
          .from('visit_bookings')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', visit.id);

        results.sent++;
        console.log(`Reminder sent for visit ${visit.id}`);

      } catch (error: any) {
        console.error(`Failed to send reminder for visit ${visit.id}:`, error);
        results.failed++;
        results.errors.push(`Visit ${visit.id}: ${error.message}`);

        // Log failed attempt
        await supabase.from('whatsapp_logs').insert({
          booking_id: visit.id,
          recipient: visit.user_phone,
          message: 'Reminder message',
          template_type: 'visit_reminder',
          status: 'failed',
          error_message: error.message
        });
      }
    }

    console.log('Reminder job completed:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${results.sent} reminders, ${results.failed} failed`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-visit-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
