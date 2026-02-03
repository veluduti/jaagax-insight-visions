-- Function to aggregate daily agent performance
CREATE OR REPLACE FUNCTION public.aggregate_agent_performance_daily(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agent_record RECORD;
BEGIN
  -- Loop through all agents
  FOR agent_record IN SELECT id FROM agents LOOP
    INSERT INTO agent_performance_daily (
      agent_id,
      date,
      total_visits,
      completed_visits,
      cancelled_visits,
      avg_rating,
      total_earnings,
      acceptance_rate,
      avg_response_time_seconds,
      online_hours,
      distance_traveled_km
    )
    SELECT 
      agent_record.id,
      target_date,
      COALESCE((
        SELECT COUNT(*) FROM visit_bookings 
        WHERE agent_id = agent_record.id 
        AND visit_date = target_date
      ), 0),
      COALESCE((
        SELECT COUNT(*) FROM visit_bookings 
        WHERE agent_id = agent_record.id 
        AND visit_date = target_date 
        AND status = 'completed'
      ), 0),
      COALESCE((
        SELECT COUNT(*) FROM visit_bookings 
        WHERE agent_id = agent_record.id 
        AND visit_date = target_date 
        AND status = 'cancelled'
      ), 0),
      COALESCE((
        SELECT AVG(rating) FROM visits v
        JOIN agents a ON a.id = v.agent_id
        WHERE a.id = agent_record.id 
        AND DATE(v.scheduled_at) = target_date
        AND v.rating IS NOT NULL
      ), 0),
      COALESCE((
        SELECT SUM(amount) FROM agent_earnings 
        WHERE agent_id = agent_record.id 
        AND DATE(created_at) = target_date
      ), 0),
      COALESCE((
        SELECT a.acceptance_rate FROM agents a WHERE a.id = agent_record.id
      ), 100),
      COALESCE((
        SELECT a.avg_response_time_seconds FROM agents a WHERE a.id = agent_record.id
      ), 0),
      0, -- online_hours - would need activity log processing
      0  -- distance_traveled_km - would need location history processing
    ON CONFLICT (agent_id, date) 
    DO UPDATE SET
      total_visits = EXCLUDED.total_visits,
      completed_visits = EXCLUDED.completed_visits,
      cancelled_visits = EXCLUDED.cancelled_visits,
      avg_rating = EXCLUDED.avg_rating,
      total_earnings = EXCLUDED.total_earnings,
      acceptance_rate = EXCLUDED.acceptance_rate,
      avg_response_time_seconds = EXCLUDED.avg_response_time_seconds;
  END LOOP;
END;
$$;

-- Add unique constraint for upsert
ALTER TABLE agent_performance_daily 
ADD CONSTRAINT agent_performance_daily_agent_date_unique 
UNIQUE (agent_id, date);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.aggregate_agent_performance_daily TO authenticated;
GRANT EXECUTE ON FUNCTION public.aggregate_agent_performance_daily TO service_role;