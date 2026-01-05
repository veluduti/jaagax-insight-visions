import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Format phone number to include country code
function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
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
    const { bookingId, templateType } = await req.json();
    console.log('Processing notification:', { bookingId, templateType });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch booking details with all related info
    const { data: booking, error: bookingError } = await supabase
      .from('visit_bookings')
      .select(`
        *,
        properties (id, title, locality, city, builder_id),
        agents (id, name, user_id, phone, email)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking fetch error:', bookingError);
      throw new Error('Booking not found');
    }

    console.log('Booking details:', { 
      id: booking.id, 
      status: booking.status, 
      builderId: booking.builder_id,
      agentId: booking.agent_id
    });

    // Get user details from users table (if user_id exists)
    let userData = null;
    if (booking.user_id) {
      const { data } = await supabase
        .from('users')
        .select('name, email, phone')
        .eq('id', booking.user_id)
        .single();
      userData = data;
    }
    
    // Use booking data as fallback
    const userPhone = booking.user_phone || userData?.phone;
    const userEmail = userData?.email || booking.user_email;
    const userName = userData?.name || booking.user_name || 'Guest';

    // Get agent contact info (try user_id first, then direct phone field)
    let agentPhone = booking.agents?.phone;
    if (!agentPhone && booking.agents?.user_id) {
      const { data } = await supabase.from('users').select('phone').eq('id', booking.agents.user_id).single();
      agentPhone = data?.phone;
    }

    // Get builder contact info
    let builderPhone = null;
    let builderName = 'Builder';
    if (booking.builder_id || booking.properties?.builder_id) {
      const builderId = booking.builder_id || booking.properties?.builder_id;
      const { data: builder } = await supabase
        .from('builders')
        .select('name, id')
        .eq('id', builderId)
        .single();
      
      builderName = builder?.name || 'Builder';
      
      // Try to get builder user's phone from users table
      // Builders might have a user account - check if there's a user with this builder linked
      const { data: builderUser } = await supabase
        .from('users')
        .select('phone')
        .eq('builder_id', builderId)
        .single();
      
      builderPhone = builderUser?.phone;
    }

    // Generate message based on template type
    let message = '';
    let recipients: { phone: string, role: string, userId?: string }[] = [];

    const propertyName = booking.properties?.title || 'Property';
    const locality = booking.properties?.locality || '';
    const city = booking.properties?.city || '';
    const visitDate = new Date(booking.visit_date).toLocaleDateString('en-IN', { 
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    });
    const visitTime = booking.visit_time;
    const agentName = booking.agents?.name || 'Agent';

    switch (templateType) {
      case 'user_requested':
        message = `🏡 *Visit Request Received* - JaagaX\n\nHi ${userName}!\n\nYour visit request for *${propertyName}* in ${locality}, ${city} has been received.\n\n📅 Date: ${visitDate}\n⏰ Time: ${visitTime}\n🚗 Travel: ${booking.travel_mode || 'Self'}\n\n⏳ Status: Pending builder approval\n🔐 OTP: ${booking.otp_code}\n\nYou'll receive updates via WhatsApp & app.\n\nTrack live: https://jaagax.com/visit/live/${bookingId}`;
        if (userPhone) recipients.push({ phone: formatPhoneNumber(userPhone), role: 'user', userId: booking.user_id });
        break;

      case 'builder_pending':
        // Notification to builder about new visit request
        message = `🔔 *New Visit Request* - JaagaX\n\nHi ${builderName}!\n\nA new visit request has been submitted:\n\n🏠 Property: *${propertyName}*\n📍 Location: ${locality}, ${city}\n👤 Visitor: ${userName}\n📅 Date: ${visitDate}\n⏰ Time: ${visitTime}\n\n📱 Please approve or decline this request from your dashboard.\n\n👉 Approve now: https://jaagax.com/builder-visits`;
        if (builderPhone) {
          recipients.push({ phone: formatPhoneNumber(builderPhone), role: 'builder' });
        }
        // Also create in-app notification for builder
        break;

      case 'visit_confirmed':
        // Auto-confirmed visit (no builder approval needed)
        message = `✅ *Visit Confirmed!* - JaagaX\n\nHi ${userName}!\n\nYour visit to *${propertyName}* is confirmed.\n\n📅 ${visitDate} at ${visitTime}\n👤 Agent: ${agentName}\n📍 ${locality}, ${city}\n🔐 OTP: ${booking.otp_code}\n\nYour agent will contact you shortly.\n\nTrack live: https://jaagax.com/visit/live/${bookingId}`;
        if (userPhone) recipients.push({ phone: formatPhoneNumber(userPhone), role: 'user', userId: booking.user_id });
        break;

      case 'builder_approved':
        message = `✅ *Visit Approved!* - JaagaX\n\nHi ${userName}!\n\nGreat news! Your visit to *${propertyName}* has been approved by the builder.\n\n📅 ${visitDate} at ${visitTime}\n👤 Agent: ${agentName}\n📍 ${locality}, ${city}\n🔐 OTP: ${booking.otp_code}\n\nYour agent will contact you shortly.\n\nTrack live: https://jaagax.com/visit/live/${bookingId}`;
        if (userPhone) recipients.push({ phone: formatPhoneNumber(userPhone), role: 'user', userId: booking.user_id });
        // Also notify agent
        if (agentPhone) {
          recipients.push({ phone: formatPhoneNumber(agentPhone), role: 'agent' });
        }
        break;

      case 'agent_new_assignment':
        // Notification to agent about new visit assignment
        message = `🎯 *New Visit Assigned* - JaagaX\n\nHi ${agentName}!\n\nYou have been assigned a new property visit:\n\n🏠 Property: *${propertyName}*\n📍 Location: ${locality}, ${city}\n👤 Client: ${userName}\n📞 Phone: ${userPhone || 'N/A'}\n📅 Date: ${visitDate}\n⏰ Time: ${visitTime}\n🚗 Travel Mode: ${booking.travel_mode || 'Self'}\n\n${booking.special_requests ? `📝 Special Requests: ${booking.special_requests}\n\n` : ''}View details: https://jaagax.com/dashboard/agent/visits`;
        if (agentPhone) {
          recipients.push({ phone: formatPhoneNumber(agentPhone), role: 'agent' });
        }
        break;

      case 'builder_rejected':
        message = `❌ *Visit Request Declined* - JaagaX\n\nHi ${userName},\n\nWe're sorry, but your visit request for *${propertyName}* has been declined by the builder.\n\n${booking.rejection_reason ? `📋 Reason: ${booking.rejection_reason}\n\n` : ''}Please try booking another slot or explore similar properties.\n\nNeed help? Contact us: +91-XXXXXXXXXX`;
        if (userPhone) recipients.push({ phone: formatPhoneNumber(userPhone), role: 'user', userId: booking.user_id });
        break;

      case 'agent_assigned':
        message = `👋 *Agent Assigned* - JaagaX\n\nHi ${userName}!\n\nYour visit agent for *${propertyName}* is:\n\n👤 ${agentName}\n📅 ${visitDate} at ${visitTime}\n📍 ${locality}, ${city}\n\nYour agent will reach out to you soon. Have a great visit!`;
        if (userPhone) recipients.push({ phone: formatPhoneNumber(userPhone), role: 'user', userId: booking.user_id });
        break;

      case 'visit_reminder':
        message = `⏰ *Visit Reminder* - JaagaX\n\nHi ${userName}!\n\nReminder: Your visit to *${propertyName}* is tomorrow!\n\n📅 ${visitDate} at ${visitTime}\n👤 Agent: ${agentName}\n🔐 OTP: ${booking.otp_code}\n\nTrack live: https://jaagax.com/visit/live/${bookingId}`;
        if (userPhone) recipients.push({ phone: formatPhoneNumber(userPhone), role: 'user', userId: booking.user_id });
        // Remind agent too
        if (agentPhone) {
          recipients.push({ phone: formatPhoneNumber(agentPhone), role: 'agent' });
        }
        break;

      case 'visit_started':
        message = `🚀 *Visit Started* - JaagaX\n\nHi ${userName}!\n\nYour visit to *${propertyName}* has started!\n\nAgent ${agentName} is with you. Enjoy exploring the property. You can provide feedback after the visit.`;
        if (userPhone) recipients.push({ phone: formatPhoneNumber(userPhone), role: 'user', userId: booking.user_id });
        break;

      case 'visit_completed':
        message = `✅ *Visit Completed* - JaagaX\n\nHi ${userName}!\n\nThank you for visiting *${propertyName}*!\n\nWe hope you had a great experience. Please share your feedback:\n\n👉 https://jaagax.com/visit/feedback/${bookingId}\n\nNeed help deciding? Talk to our AI advisor!`;
        if (userPhone) recipients.push({ phone: formatPhoneNumber(userPhone), role: 'user', userId: booking.user_id });
        break;

      case 'visit_cancelled':
        message = `🚫 *Visit Cancelled* - JaagaX\n\nHi ${userName},\n\nYour visit to *${propertyName}* scheduled for ${visitDate} has been cancelled.\n\nYou can schedule a new visit anytime from the JaagaX app.`;
        if (userPhone) recipients.push({ phone: formatPhoneNumber(userPhone), role: 'user', userId: booking.user_id });
        if (agentPhone) recipients.push({ phone: formatPhoneNumber(agentPhone), role: 'agent' });
        break;

      default:
        console.log('Unknown template type:', templateType);
        message = `📬 *JaagaX Update*\n\nYour visit status for ${propertyName} has been updated. Check the app for details.`;
        if (userPhone) recipients.push({ phone: formatPhoneNumber(userPhone), role: 'user', userId: booking.user_id });
    }

    console.log('Recipients:', recipients);

    // Send WhatsApp to all recipients
    const results = [];
    for (const recipient of recipients) {
      if (!recipient.phone) {
        console.log(`Skipping ${recipient.role} - no phone number`);
        continue;
      }

      try {
        console.log(`Sending WhatsApp to ${recipient.role}:`, recipient.phone);
        
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

        console.log(`WhatsApp result for ${recipient.role}:`, whatsappResult);

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

    // Create in-app notifications
    // For user
    if (booking.user_id) {
      await supabase.functions.invoke('create-notification', {
        body: {
          userId: booking.user_id,
          type: 'visit_update',
          title: `Visit ${templateType.replace(/_/g, ' ')}`,
          message: message.replace(/\*/g, '').split('\n')[0],
          metadata: { bookingId, templateType }
        }
      }).catch(err => console.error('User notification error:', err));
    }

    // For builder (if builder_pending template)
    if (templateType === 'builder_pending' && booking.builder_id) {
      // Find builder's user account
      const { data: builderUserData } = await supabase
        .from('users')
        .select('id')
        .eq('builder_id', booking.builder_id)
        .single();

      if (builderUserData) {
        await supabase.functions.invoke('create-notification', {
          body: {
            userId: builderUserData.id,
            type: 'visit_request',
            title: 'New Visit Request',
            message: `New visit request for ${propertyName} on ${visitDate}`,
            metadata: { bookingId, templateType, propertyId: booking.property_id }
          }
        }).catch(err => console.error('Builder notification error:', err));
      }
    }

    // For agent (if assigned)
    if ((templateType === 'agent_new_assignment' || templateType === 'builder_approved') && booking.agents?.user_id) {
      await supabase.functions.invoke('create-notification', {
        body: {
          userId: booking.agents.user_id,
          type: 'visit_assignment',
          title: 'Visit Assigned',
          message: `You have been assigned a visit to ${propertyName} on ${visitDate}`,
          metadata: { bookingId, templateType, propertyId: booking.property_id }
        }
      }).catch(err => console.error('Agent notification error:', err));
    }

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
