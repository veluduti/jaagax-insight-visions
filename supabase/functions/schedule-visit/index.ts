import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateQRCodeURL(bookingId: string, otpCode: string): string {
  const qrData = JSON.stringify({
    bookingId,
    otp: otpCode,
    timestamp: Date.now()
  });
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bookingData = await req.json();
    console.log('Received booking data:', JSON.stringify(bookingData));
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate OTP and temporary QR code
    const otp = generateOTP();
    const tempQR = generateQRCodeURL('temp', otp);

    // Get property details including builder_id and project info
    const { data: property } = await supabase
      .from('properties')
      .select('builder_id, project_id, city, locality')
      .eq('id', bookingData.propertyId)
      .single();

    // If property is part of a project, get builder_id from project
    let builderId = property?.builder_id || null;
    if (!builderId && property?.project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('builder_id')
        .eq('id', property.project_id)
        .single();
      builderId = project?.builder_id || null;
    }

    console.log('Property details:', { property, builderId });

    // Auto-assign agent if not provided
    let agentId = bookingData.agentId;
    if (bookingData.autoAssign && !agentId) {
      const propertyDetails = property;

      let agent = null;

      // Strategy 1: Try to match by city first (highest priority, includes independent agents)
      if (propertyDetails?.city && !agent) {
        const { data } = await supabase
          .from('agents')
          .select('id')
          .ilike('cities_served', `%${propertyDetails.city}%`)
          .order('trust_score', { ascending: false })
          .limit(1)
          .single();
        agent = data;
      }

      // Strategy 2: Try locality if no city match (includes independent agents)
      if (propertyDetails?.locality && !agent) {
        const { data } = await supabase
          .from('agents')
          .select('id')
          .ilike('cities_served', `%${propertyDetails.locality}%`)
          .order('trust_score', { ascending: false })
          .limit(1)
          .single();
        agent = data;
      }

      // Strategy 3: Fallback to any agent with highest trust score (includes independent agents)
      if (!agent) {
        const { data } = await supabase
          .from('agents')
          .select('id')
          .order('trust_score', { ascending: false })
          .limit(1)
          .single();
        agent = data;
      }

      agentId = agent?.id || null;
      console.log('Auto-assigned agent:', agentId);
    }

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

    // Determine initial status based on builder presence
    const initialStatus = builderId ? 'pending_approval' : 'confirmed';
    console.log('Initial status:', initialStatus, 'builderId:', builderId);

    // Create visit booking
    const { data: booking, error: bookingError } = await supabase
      .from('visit_bookings')
      .insert({
        user_id: bookingData.userId,
        property_id: bookingData.propertyId,
        agent_id: agentId,
        visit_date: bookingData.visitDate,
        visit_time: bookingData.visitTime,
        travel_mode: bookingData.travelMode,
        pickup_location: bookingData.pickupLocation,
        vehicle_id: vehicleId,
        otp_code: otp,
        qr_code_url: tempQR,
        builder_id: builderId,
        user_name: bookingData.userName,
        user_email: bookingData.userEmail,
        user_phone: bookingData.userPhone,
        special_requests: bookingData.specialRequests,
        properties: bookingData.properties,
        optimized_route: bookingData.optimizedRoute,
        status: initialStatus,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Booking insert error:', bookingError);
      throw bookingError;
    }

    console.log('Booking created:', booking.id);

    // Update QR code with actual booking ID
    const finalQR = generateQRCodeURL(booking.id, otp);
    await supabase
      .from('visit_bookings')
      .update({ qr_code_url: finalQR })
      .eq('id', booking.id);

    // Send notifications based on status
    if (initialStatus === 'pending_approval') {
      // Notify the user that request is pending
      await supabase.functions.invoke('send-visit-update', {
        body: {
          bookingId: booking.id,
          templateType: 'user_requested'
        }
      }).catch(err => console.error('User notification error:', err));

      // Notify the builder about the new visit request
      await supabase.functions.invoke('send-visit-update', {
        body: {
          bookingId: booking.id,
          templateType: 'builder_pending'
        }
      }).catch(err => console.error('Builder notification error:', err));

      console.log('Sent pending notifications to user and builder');
    } else {
      // Visit is auto-confirmed, notify user and agent
      await supabase.functions.invoke('send-visit-update', {
        body: {
          bookingId: booking.id,
          templateType: 'visit_confirmed'
        }
      }).catch(err => console.error('Confirmation notification error:', err));

      // Notify agent about assignment
      if (agentId) {
        await supabase.functions.invoke('send-visit-update', {
          body: {
            bookingId: booking.id,
            templateType: 'agent_new_assignment'
          }
        }).catch(err => console.error('Agent notification error:', err));
      }

      console.log('Sent confirmed notifications to user and agent');
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking: { ...booking, qr_code_url: finalQR },
        otp,
        status: booking.status
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
