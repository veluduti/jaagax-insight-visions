import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, templateType } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('visit_bookings')
      .select(`
        *,
        properties (id, title, locality, city),
        agents (id, name, user_id)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking fetch error:', bookingError);
      throw new Error('Booking not found');
    }

    // Get user details from users table
    const { data: userData } = await supabase
      .from('users')
      .select('name, email, phone')
      .eq('id', booking.user_id)
      .single();

    // Get agent phone if available
    const agentPhone = booking.agents?.user_id 
      ? (await supabase.from('users').select('phone').eq('id', booking.agents.user_id).single()).data?.phone
      : null;

    // Generate message based on template type
    let message = '';
    let recipients: { phone: string, role: string }[] = [];

    const propertyName = booking.properties?.title || 'Property';
    const locality = booking.properties?.locality || '';
    const city = booking.properties?.city || '';
    const visitDate = new Date(booking.visit_date).toLocaleDateString('en-IN', { 
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    });
    const visitTime = booking.visit_time;
    const userName = userData?.name || booking.user_name || 'Guest';
    const agentName = booking.agents?.name || 'Agent';

    switch (templateType) {
      case 'user_requested':
        message = `🏡 *Visit Request Received* - JaagaX\n\nHi ${userName}!\n\nYour visit request for *${propertyName}* in ${locality}, ${city} has been received.\n\n📅 Date: ${visitDate}\n⏰ Time: ${visitTime}\n🚗 Travel: ${booking.travel_mode || 'Self'}\n\nStatus: Pending builder approval\nOTP: ${booking.otp_code}\n\nYou'll receive updates via WhatsApp & app. Track live: https://jaagax.com/visit/live/${bookingId}`;
        if (userData?.phone) recipients.push({ phone: userData.phone, role: 'user' });
        break;

      case 'builder_approved':
        message = `✅ *Visit Approved!* - JaagaX\n\nHi ${userName}!\n\nGreat news! Your visit to *${propertyName}* has been approved.\n\n📅 ${visitDate} at ${visitTime}\n👤 Agent: ${agentName}\n📍 ${locality}, ${city}\n🔐 OTP: ${booking.otp_code}\n\nYour agent will contact you shortly. Track live: https://jaagax.com/visit/live/${bookingId}`;
        if (userData?.phone) recipients.push({ phone: userData.phone, role: 'user' });
        if (agentPhone) {
          recipients.push({ phone: agentPhone, role: 'agent' });
        }
        break;

      case 'builder_rejected':
        message = `❌ *Visit Request Declined* - JaagaX\n\nHi ${userName},\n\nWe're sorry, but your visit request for *${propertyName}* has been declined by the builder.\n\n${booking.rejection_reason ? `Reason: ${booking.rejection_reason}\n\n` : ''}Please try booking another slot or contact us for assistance: +91-XXXXXXXXXX`;
        if (userData?.phone) recipients.push({ phone: userData.phone, role: 'user' });
        break;

      case 'agent_assigned':
        message = `👋 *Agent Assigned* - JaagaX\n\nHi ${userName}!\n\nYour visit agent for *${propertyName}* is:\n\n👤 ${agentName}\n📅 ${visitDate} at ${visitTime}\n📍 ${locality}, ${city}\n\nYour agent will reach out to you soon. Have a great visit!`;
        if (userData?.phone) recipients.push({ phone: userData.phone, role: 'user' });
        break;

      case 'visit_reminder':
        message = `⏰ *Visit Reminder* - JaagaX\n\nHi ${userName}!\n\nReminder: Your visit to *${propertyName}* is tomorrow!\n\n📅 ${visitDate} at ${visitTime}\n👤 Agent: ${agentName}\n🔐 OTP: ${booking.otp_code}\n\nTrack live: https://jaagax.com/visit/live/${bookingId}`;
        if (userData?.phone) recipients.push({ phone: userData.phone, role: 'user' });
        break;

      case 'visit_started':
        message = `🚀 *Visit Started* - JaagaX\n\nHi ${userName}!\n\nYour visit to *${propertyName}* has started!\n\nAgent ${agentName} is with you. Enjoy exploring the property. You can provide feedback after the visit.`;
        if (userData?.phone) recipients.push({ phone: userData.phone, role: 'user' });
        break;

      case 'visit_completed':
        message = `✅ *Visit Completed* - JaagaX\n\nHi ${userName}!\n\nThank you for visiting *${propertyName}*!\n\nWe hope you had a great experience. Please share your feedback: https://jaagax.com/visit/feedback/${bookingId}\n\nNeed help? Contact us anytime!`;
        if (userData?.phone) recipients.push({ phone: userData.phone, role: 'user' });
        break;

      case 'visit_cancelled':
        message = `🚫 *Visit Cancelled* - JaagaX\n\nHi ${userName},\n\nYour visit to *${propertyName}* scheduled for ${visitDate} has been cancelled.\n\nYou can schedule a new visit anytime from the JaagaX app.`;
        if (userData?.phone) recipients.push({ phone: userData.phone, role: 'user' });
        if (agentPhone) recipients.push({ phone: agentPhone, role: 'agent' });
        break;
    }

    // Send WhatsApp to all recipients
    const results = [];
    for (const recipient of recipients) {
      try {
        const { data: whatsappResult, error: whatsappError } = await supabase.functions.invoke('send-whatsapp', {
          body: { 
            to: recipient.phone, 
            message,
            bookingId 
          }
        });

        // Log WhatsApp send
        await supabase.from('whatsapp_logs').insert({
          booking_id: bookingId,
          recipient: recipient.phone,
          message,
          template_type: templateType,
          status: whatsappError ? 'failed' : 'sent',
          error_message: whatsappError?.message,
          twilio_sid: whatsappResult?.sid
        });

        results.push({ 
          recipient: recipient.phone, 
          role: recipient.role,
          success: !whatsappError,
          error: whatsappError?.message 
        });

      } catch (err: any) {
        console.error(`Failed to send WhatsApp to ${recipient.phone}:`, err);
        results.push({ 
          recipient: recipient.phone, 
          role: recipient.role,
          success: false,
          error: err.message || 'Unknown error'
        });
      }
    }

    // Create in-app notification for user
    await supabase.functions.invoke('create-notification', {
      body: {
        userId: booking.user_id,
        type: 'visit_update',
        title: `Visit ${templateType.replace(/_/g, ' ')}`,
        message: message.replace(/\*/g, '').split('\n')[0], // Clean message
        metadata: { bookingId, templateType }
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Notifications sent',
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-visit-update function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
