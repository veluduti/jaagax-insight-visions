import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { event_id, notification_type, recipients } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('community_events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError) throw eventError;

    // Log notification
    await supabase.from('event_logs').insert({
      event_id,
      action: `notification_sent_${notification_type}`,
      metadata: { 
        recipients: recipients?.length || 0,
        notification_type 
      }
    });

    // TODO: Integrate with SendGrid for emails
    // const sendgridKey = Deno.env.get('SENDGRID_API_KEY');
    // TODO: Integrate with Twilio for SMS
    // const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    
    console.log(`Notification sent for event: ${event.title}, type: ${notification_type}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${notification_type} notification queued`,
        event_title: event.title
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
