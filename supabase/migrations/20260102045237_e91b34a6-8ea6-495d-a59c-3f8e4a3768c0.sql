-- Fix 1: Drop and recreate daily_market_stats view with SECURITY INVOKER
DROP VIEW IF EXISTS daily_market_stats;

CREATE VIEW daily_market_stats
WITH (security_invoker = true)
AS
SELECT 
    city,
    locality,
    count(*) AS total_properties,
    avg(price) AS avg_price,
    avg(trust_score) AS avg_trust_score,
    count(CASE WHEN verified = true THEN 1 ELSE NULL::integer END) AS verified_count,
    date(submitted_at) AS date
FROM properties
WHERE submitted_at >= (now() - '30 days'::interval)
GROUP BY city, locality, date(submitted_at);

-- Fix 2: Replace increment_ad_stat function with rate limiting and authorization checks
CREATE OR REPLACE FUNCTION public.increment_ad_stat(p_ad_id uuid, p_stat_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_interaction TIMESTAMPTZ;
  ad_exists BOOLEAN;
  is_own_ad BOOLEAN;
BEGIN
  -- Validate stat type
  IF p_stat_type NOT IN ('impressions', 'clicks', 'saves', 'contacts') THEN
    RAISE EXCEPTION 'Invalid stat type';
  END IF;
  
  -- Check if ad exists
  SELECT EXISTS(SELECT 1 FROM advertisements WHERE id = p_ad_id) INTO ad_exists;
  IF NOT ad_exists THEN
    RAISE EXCEPTION 'Advertisement not found';
  END IF;
  
  -- Check if user is the ad owner (prevent self-inflation)
  SELECT EXISTS(
    SELECT 1 FROM advertisements WHERE id = p_ad_id AND builder_id = auth.uid()
  ) INTO is_own_ad;
  
  IF is_own_ad THEN
    RAISE EXCEPTION 'Cannot interact with own advertisements';
  END IF;
  
  -- Check for recent duplicate from same user (rate limiting - 1 minute cooldown)
  SELECT created_at INTO recent_interaction
  FROM ad_interactions
  WHERE advertisement_id = p_ad_id
    AND user_id = auth.uid()
    AND interaction_type = p_stat_type
    AND created_at > NOW() - INTERVAL '1 minute'
  LIMIT 1;
  
  IF recent_interaction IS NOT NULL THEN
    -- Silently ignore duplicate interactions instead of raising error
    RETURN;
  END IF;
  
  -- Increment the appropriate stat
  IF p_stat_type = 'impressions' THEN
    UPDATE advertisements SET impressions = impressions + 1 WHERE id = p_ad_id;
  ELSIF p_stat_type = 'clicks' THEN
    UPDATE advertisements SET clicks = clicks + 1 WHERE id = p_ad_id;
  ELSIF p_stat_type = 'saves' THEN
    UPDATE advertisements SET saves = saves + 1 WHERE id = p_ad_id;
  ELSIF p_stat_type = 'contacts' THEN
    UPDATE advertisements SET contacts = contacts + 1 WHERE id = p_ad_id;
  END IF;
  
  -- Log the interaction
  INSERT INTO ad_interactions (advertisement_id, user_id, interaction_type)
  VALUES (p_ad_id, auth.uid(), p_stat_type);
END;
$$;