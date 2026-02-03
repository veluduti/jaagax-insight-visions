import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASSIGNMENT_TIMEOUT_SECONDS = 120; // 2 minutes

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { visitBookingId, action, agentId, rejectionReason } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle agent accept/reject actions
    if (action === 'accept' && agentId) {
      return await handleAccept(supabase, visitBookingId, agentId);
    }

    if (action === 'reject' && agentId) {
      return await handleReject(supabase, visitBookingId, agentId, rejectionReason);
    }

    // Check for timed out assignments and cascade
    if (action === 'check_timeouts') {
      return await checkTimeouts(supabase);
    }

    // Start new cascade assignment
    if (action === 'start_cascade') {
      return await startCascade(supabase, visitBookingId);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cascade assignment error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleAccept(supabase: any, visitBookingId: string, agentId: string) {
  // Update the assignment request
  const { error: requestError } = await supabase
    .from('agent_assignment_requests')
    .update({
      status: 'accepted',
      responded_at: new Date().toISOString(),
    })
    .eq('visit_booking_id', visitBookingId)
    .eq('agent_id', agentId)
    .eq('status', 'pending');

  if (requestError) throw requestError;

  // Update the visit booking with the agent
  const { error: bookingError } = await supabase
    .from('visit_bookings')
    .update({
      agent_id: agentId,
      status: 'confirmed',
    })
    .eq('id', visitBookingId);

  if (bookingError) throw bookingError;

  // Cancel other pending requests for this booking
  await supabase
    .from('agent_assignment_requests')
    .update({ status: 'cancelled' })
    .eq('visit_booking_id', visitBookingId)
    .neq('agent_id', agentId)
    .eq('status', 'pending');

  // Update agent's acceptance stats
  await updateAgentStats(supabase, agentId, true);

  // Log activity
  await supabase.from('agent_activity_log').insert({
    agent_id: agentId,
    activity_type: 'assignment_accepted',
    metadata: { visit_booking_id: visitBookingId },
  });

  return new Response(
    JSON.stringify({ success: true, message: 'Assignment accepted' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleReject(supabase: any, visitBookingId: string, agentId: string, reason?: string) {
  // Update the assignment request
  const { data: currentRequest } = await supabase
    .from('agent_assignment_requests')
    .select('cascade_order')
    .eq('visit_booking_id', visitBookingId)
    .eq('agent_id', agentId)
    .single();

  const { error: requestError } = await supabase
    .from('agent_assignment_requests')
    .update({
      status: 'rejected',
      responded_at: new Date().toISOString(),
      rejection_reason: reason || null,
    })
    .eq('visit_booking_id', visitBookingId)
    .eq('agent_id', agentId);

  if (requestError) throw requestError;

  // Update agent's rejection stats
  await updateAgentStats(supabase, agentId, false);

  // Log activity
  await supabase.from('agent_activity_log').insert({
    agent_id: agentId,
    activity_type: 'assignment_rejected',
    metadata: { visit_booking_id: visitBookingId, reason },
  });

  // Cascade to next agent
  return await cascadeToNextAgent(supabase, visitBookingId, currentRequest?.cascade_order || 1);
}

async function cascadeToNextAgent(supabase: any, visitBookingId: string, currentOrder: number) {
  // Get the booking details
  const { data: booking } = await supabase
    .from('visit_bookings')
    .select(`
      *,
      properties (city, locality, latitude, longitude)
    `)
    .eq('id', visitBookingId)
    .single();

  if (!booking) {
    return new Response(
      JSON.stringify({ error: 'Booking not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Find next available agents
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('is_online', true)
    .eq('verified', true)
    .contains('cities_served', [booking.properties?.city])
    .order('trust_score', { ascending: false })
    .order('acceptance_rate', { ascending: false });

  if (!agents || agents.length === 0) {
    // No more agents available
    await supabase
      .from('visit_bookings')
      .update({ status: 'no_agent_available' })
      .eq('id', visitBookingId);

    return new Response(
      JSON.stringify({ success: false, message: 'No agents available' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get agents who already received requests
  const { data: existingRequests } = await supabase
    .from('agent_assignment_requests')
    .select('agent_id')
    .eq('visit_booking_id', visitBookingId);

  const requestedAgentIds = new Set(existingRequests?.map((r: { agent_id: string }) => r.agent_id) || []);

  // Find next agent who hasn't been requested
  const nextAgent = agents.find((agent: any) => !requestedAgentIds.has(agent.id));

  if (!nextAgent) {
    // All agents have been tried
    await supabase
      .from('visit_bookings')
      .update({ status: 'no_agent_available' })
      .eq('id', visitBookingId);

    return new Response(
      JSON.stringify({ success: false, message: 'All agents exhausted' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create new assignment request
  const { error: createError } = await supabase
    .from('agent_assignment_requests')
    .insert({
      visit_booking_id: visitBookingId,
      agent_id: nextAgent.id,
      status: 'pending',
      cascade_order: currentOrder + 1,
    });

  if (createError) throw createError;

  // TODO: Send WhatsApp/Push notification to the agent

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Cascaded to next agent',
      agentId: nextAgent.id,
      cascadeOrder: currentOrder + 1,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkTimeouts(supabase: any) {
  const timeoutThreshold = new Date(Date.now() - ASSIGNMENT_TIMEOUT_SECONDS * 1000).toISOString();

  // Find timed out requests
  const { data: timedOutRequests } = await supabase
    .from('agent_assignment_requests')
    .select('*')
    .eq('status', 'pending')
    .lt('requested_at', timeoutThreshold);

  if (!timedOutRequests || timedOutRequests.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: 'No timeouts found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const results = [];
  for (const request of timedOutRequests) {
    // Mark as timeout
    await supabase
      .from('agent_assignment_requests')
      .update({
        status: 'timeout',
        responded_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    // Update agent stats
    await updateAgentStats(supabase, request.agent_id, false);

    // Cascade to next agent
    const result = await cascadeToNextAgent(supabase, request.visit_booking_id, request.cascade_order);
    results.push({ requestId: request.id, cascadeResult: await result.json() });
  }

  return new Response(
    JSON.stringify({ success: true, processed: results.length, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function startCascade(supabase: any, visitBookingId: string) {
  // Get the booking details
  const { data: booking } = await supabase
    .from('visit_bookings')
    .select(`
      *,
      properties (city, locality, latitude, longitude)
    `)
    .eq('id', visitBookingId)
    .single();

  if (!booking) {
    return new Response(
      JSON.stringify({ error: 'Booking not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Find best agents
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('is_online', true)
    .eq('verified', true)
    .contains('cities_served', [booking.properties?.city])
    .order('trust_score', { ascending: false })
    .limit(1);

  if (!agents || agents.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No agents available' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const firstAgent = agents[0];

  // Create first assignment request
  const { error } = await supabase
    .from('agent_assignment_requests')
    .insert({
      visit_booking_id: visitBookingId,
      agent_id: firstAgent.id,
      status: 'pending',
      cascade_order: 1,
    });

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true, 
      agentId: firstAgent.id,
      message: 'Cascade started' 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateAgentStats(supabase: any, agentId: string, accepted: boolean) {
  const { data: agent } = await supabase
    .from('agents')
    .select('total_assignments, acceptance_rate')
    .eq('id', agentId)
    .single();

  if (!agent) return;

  const totalAssignments = (agent.total_assignments || 0) + 1;
  const currentAccepted = Math.round((agent.acceptance_rate || 100) * (agent.total_assignments || 0) / 100);
  const newAccepted = accepted ? currentAccepted + 1 : currentAccepted;
  const newAcceptanceRate = Math.round((newAccepted / totalAssignments) * 100);

  await supabase
    .from('agents')
    .update({
      total_assignments: totalAssignments,
      acceptance_rate: newAcceptanceRate,
    })
    .eq('id', agentId);
}