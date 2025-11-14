import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateQR(bookingId: string): string {
  return `JAAGAX-VISIT-${bookingId}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bookingData = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate OTP and QR code
    const otp = generateOTP();
    const qrCode = generateQR(bookingData.bookingId || 'temp');

    // Assign vehicle if travel mode is not 'self'
    let vehicleId = null;
    if (bookingData.travelMode !== 'self') {
      const { data: vehicle } = await supabase
        .from('fleet_vehicles')
        .select('*')
        .eq('vehicle_type', bookingData.travelMode)
        .eq('status', 'available')
        .limit(1)
        .single();

      if (vehicle) {
        vehicleId = vehicle.id;
        // Update vehicle status
        await supabase
          .from('fleet_vehicles')
          .update({ status: 'assigned' })
          .eq('id', vehicleId);
      }
    }

    // Create visit booking
    const { data: booking, error: bookingError } = await supabase
      .from('visit_bookings')
      .insert({
        user_id: bookingData.userId,
        property_id: bookingData.propertyId,
        agent_id: bookingData.agentId,
        visit_date: bookingData.visitDate,
        visit_time: bookingData.visitTime,
        travel_mode: bookingData.travelMode,
        pickup_location: bookingData.pickupLocation,
        vehicle_id: vehicleId,
        qr_code: qrCode,
        otp: otp,
        user_name: bookingData.userName,
        user_email: bookingData.userEmail,
        user_phone: bookingData.userPhone,
        special_requests: bookingData.specialRequests,
        properties: bookingData.properties,
        optimized_route: bookingData.optimizedRoute,
        status: 'confirmed',
      })
      .select()
      .single();

    if (bookingError) {
      throw bookingError;
    }

    // Update QR code with actual booking ID
    const finalQR = generateQR(booking.id);
    await supabase
      .from('visit_bookings')
      .update({ qr_code: finalQR })
      .eq('id', booking.id);

    // Create notifications
    const notifications = [
      {
        booking_id: booking.id,
        notification_type: 'email',
        recipient: bookingData.userEmail,
        message: `Your visit to property is confirmed for ${bookingData.visitDate} at ${bookingData.visitTime}. OTP: ${otp}`,
      },
      {
        booking_id: booking.id,
        notification_type: 'sms',
        recipient: bookingData.userPhone || bookingData.userEmail,
        message: `JaagaX Visit Confirmed! Date: ${bookingData.visitDate}, Time: ${bookingData.visitTime}, OTP: ${otp}`,
      },
    ];

    await supabase.from('visit_notifications').insert(notifications);

    // Invoke notification sender (fire and forget)
    supabase.functions.invoke('send-visit-notification', {
      body: { bookingId: booking.id }
    }).catch(console.error);

    return new Response(
      JSON.stringify({
        success: true,
        booking: { ...booking, qr_code: finalQR },
        otp,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in schedule-visit:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});