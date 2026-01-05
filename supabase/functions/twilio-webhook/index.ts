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

    // Parse the form data from Twilio webhook
    const formData = await req.formData();
    
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const to = formData.get('To') as string;
    const errorCode = formData.get('ErrorCode') as string | null;
    const errorMessage = formData.get('ErrorMessage') as string | null;

    console.log('Twilio webhook received:', {
      messageSid,
      messageStatus,
      to,
      errorCode,
      errorMessage
    });

    if (!messageSid) {
      return new Response(
        JSON.stringify({ error: 'Missing MessageSid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      'queued': 'pending',
      'sent': 'sent',
      'delivered': 'delivered',
      'read': 'read',
      'failed': 'failed',
      'undelivered': 'failed'
    };

    const mappedStatus = statusMap[messageStatus] || messageStatus;
    const now = new Date().toISOString();

    // Update the whatsapp_logs record
    const updateData: Record<string, any> = {
      delivery_status: mappedStatus
    };

    if (messageStatus === 'delivered') {
      updateData.delivered_at = now;
    } else if (messageStatus === 'read') {
      updateData.delivered_at = updateData.delivered_at || now;
      updateData.read_at = now;
    } else if (messageStatus === 'failed' || messageStatus === 'undelivered') {
      updateData.status = 'failed';
      if (errorCode) updateData.error_code = errorCode;
      if (errorMessage) updateData.error_message = errorMessage;
    }

    const { data, error } = await supabase
      .from('whatsapp_logs')
      .update(updateData)
      .eq('twilio_sid', messageSid)
      .select()
      .single();

    if (error) {
      console.error('Error updating whatsapp_logs:', error);
      // Don't throw - Twilio expects a 200 response
    } else {
      console.log('Updated whatsapp_logs:', data?.id);
    }

    // If message failed, check if we should retry
    if ((messageStatus === 'failed' || messageStatus === 'undelivered') && data) {
      const retryCount = (data.retry_count || 0) + 1;
      
      if (retryCount <= 3) {
        console.log(`Message ${messageSid} failed, scheduling retry ${retryCount}/3`);
        
        // Update retry count
        await supabase
          .from('whatsapp_logs')
          .update({ retry_count: retryCount })
          .eq('id', data.id);

        // Queue for retry (could trigger another function or use pg_cron)
        await supabase.from('visit_notifications').insert({
          booking_id: data.booking_id,
          notification_type: 'whatsapp_retry',
          recipient: data.recipient,
          message: data.message,
          status: 'pending',
          metadata: {
            original_log_id: data.id,
            retry_count: retryCount,
            error_code: errorCode,
            scheduled_for: new Date(Date.now() + retryCount * 5 * 60 * 1000).toISOString() // Exponential backoff
          }
        });
      } else {
        console.log(`Message ${messageSid} failed after 3 retries, marking as permanently failed`);
      }
    }

    // Twilio expects a 200 response
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in twilio-webhook:', error);
    // Still return 200 to Twilio to prevent retries
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
