import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASSIGNMENT_TIMEOUT_SECONDS = 120;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { visitBookingId, action, agentId, rejectionReason } = await req.json();

    if (action === 'accept' && agentId) {
      return await handleAccept(supabase, visitBookingId, agentId);
    }

    if (action === 'reject' && agentId) {
      return await handleReject(supabase, visitBookingId, agentId, rejectionReason);
    }

    if (action === 'check_timeouts') {
      return await checkTimeouts(supabase);
    }

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
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleAccept(supabase: ReturnType<typeof createClient>, visitBookingId: string, agentId: string) {
  const { error: requestError } = await supabase
    .from('agent_assignment_requests')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('visit_booking_id', visitBookingId)
    .eq('agent_id', agentId)
    .eq('status', 'pending');

  if (requestError) {
    console.error('Accept error:', requestError);
    return new Response(JSON.stringify({ error: 'Failed to accept assignment' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { error: bookingError } = await supabase
    .from('visit_bookings')
    .update({ agent_id: agentId, status: 'confirmed' })
    .eq('id', visitBookingId);

  if (bookingError) {
    console.error('Booking update error:', bookingError);
    return new Response(JSON.stringify({ error: 'Failed to update booking' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  await supabase
    .from('agent_assignment_requests')
    .update({ status: 'cancelled' })
    .eq('visit_booking_id', visitBookingId)
    .neq('agent_id', agentId)
    .eq('status', 'pending');

  await updateAgentStats(supabase, agentId, true);

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

async function handleReject(supabase: ReturnType<typeof createClient>, visitBookingId: string, agentId: string, reason?: string) {
  const { data: currentRequest } = await supabase
    .from('agent_assignment_requests')
    .select('cascade_order')
    .eq('visit_booking_id', visitBookingId)
    .eq('agent_id', agentId)
    .single();

  const { error: requestError } = await supabase
    .from('agent_assignment_requests')
    .update({ status: 'rejected', responded_at: new Date().toISOString(), rejection_reason: reason || null })
    .eq('visit_booking_id', visitBookingId)
    .eq('agent_id', agentId);

  if (requestError) {
    console.error('Reject error:', requestError);
    return new Response(JSON.stringify({ error: 'Failed to reject assignment' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  await updateAgentStats(supabase, agentId, false);

  await supabase.from('agent_activity_log').insert({
    agent_id: agentId,
    activity_type: 'assignment_rejected',
    metadata: { visit_booking_id: visitBookingId, reason },
  });

  return await cascadeToNextAgent(supabase, visitBookingId, currentRequest?.cascade_order || 1);
}

async function cascadeToNextAgent(supabase: ReturnType<typeof createClient>, visitBookingId: string, currentOrder: number) {
  const { data: booking } = await supabase
    .from('visit_bookings')
    .select('*, properties (city, locality, latitude, longitude)')
    .eq('id', visitBookingId)
    .single();

  if (!booking) {
    return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { data: agents } = await supabase
    .from('agents')
    .select('id, trust_score, acceptance_rate, cities_served')
    .eq('is_online', true)
    .eq('verified', true)
    .contains('cities_served', [booking.properties?.city])
    .order('trust_score', { ascending: false })
    .order('acceptance_rate', { ascending: false });

  if (!agents || agents.length === 0) {
    await supabase.from('visit_bookings').update({ status: 'no_agent_available' }).eq('id', visitBookingId);
    return new Response(JSON.stringify({ success: false, message: 'No agents available' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { data: existingRequests } = await supabase
    .from('agent_assignment_requests')
    .select('agent_id')
    .eq('visit_booking_id', visitBookingId);

  const requestedAgentIds = new Set(existingRequests?.map((r: { agent_id: string }) => r.agent_id) || []);
  const nextAgent = agents.find((agent: { id: string }) => !requestedAgentIds.has(agent.id));

  if (!nextAgent) {
    await supabase.from('visit_bookings').update({ status: 'no_agent_available' }).eq('id', visitBookingId);
    return new Response(JSON.stringify({ success: false, message: 'All agents exhausted' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { error: createError } = await supabase
    .from('agent_assignment_requests')
    .insert({ visit_booking_id: visitBookingId, agent_id: nextAgent.id, status: 'pending', cascade_order: currentOrder + 1 });

  if (createError) {
    console.error('Cascade create error:', createError);
    return new Response(JSON.stringify({ error: 'Failed to cascade assignment' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Cascaded to next agent', agentId: nextAgent.id, cascadeOrder: currentOrder + 1 }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkTimeouts(supabase: ReturnType<typeof createClient>) {
  const timeoutThreshold = new Date(Date.now() - ASSIGNMENT_TIMEOUT_SECONDS * 1000).toISOString();

  const { data: timedOutRequests } = await supabase
    .from('agent_assignment_requests')
    .select('*')
    .eq('status', 'pending')
    .lt('requested_at', timeoutThreshold);

  if (!timedOutRequests || timedOutRequests.length === 0) {
    return new Response(JSON.stringify({ success: true, message: 'No timeouts found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const results = [];
  for (const request of timedOutRequests) {
    await supabase
      .from('agent_assignment_requests')
      .update({ status: 'timeout', responded_at: new Date().toISOString() })
      .eq('id', request.id);

    await updateAgentStats(supabase, request.agent_id, false);
    const result = await cascadeToNextAgent(supabase, request.visit_booking_id, request.cascade_order);
    results.push({ requestId: request.id, cascadeResult: await result.json() });
  }

  return new Response(
    JSON.stringify({ success: true, processed: results.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function startCascade(supabase: ReturnType<typeof createClient>, visitBookingId: string) {
  const { data: booking } = await supabase
    .from('visit_bookings')
    .select('*, properties (city, locality, latitude, longitude)')
    .eq('id', visitBookingId)
    .single();

  if (!booking) {
    return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { data: agents } = await supabase
    .from('agents')
    .select('id, trust_score')
    .eq('is_online', true)
    .eq('verified', true)
    .contains('cities_served', [booking.properties?.city])
    .order('trust_score', { ascending: false })
    .limit(1);

  if (!agents || agents.length === 0) {
    return new Response(JSON.stringify({ error: 'No agents available' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const firstAgent = agents[0];

  const { error } = await supabase
    .from('agent_assignment_requests')
    .insert({ visit_booking_id: visitBookingId, agent_id: firstAgent.id, status: 'pending', cascade_order: 1 });

  if (error) {
    console.error('Start cascade error:', error);
    return new Response(JSON.stringify({ error: 'Failed to start cascade' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(
    JSON.stringify({ success: true, agentId: firstAgent.id, message: 'Cascade started' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateAgentStats(supabase: ReturnType<typeof createClient>, agentId: string, accepted: boolean) {
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
    .update({ total_assignments: totalAssignments, acceptance_rate: newAcceptanceRate })
    .eq('id', agentId);
}
