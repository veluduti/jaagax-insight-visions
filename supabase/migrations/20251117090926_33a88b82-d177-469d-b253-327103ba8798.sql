
-- Fix search_path for create_test_notification function
CREATE OR REPLACE FUNCTION create_test_notification(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    metadata,
    read
  ) VALUES (
    p_user_id,
    'test',
    '🔔 Test Notification',
    'This is a test notification to verify your notification system is working!',
    '{"test": true}'::jsonb,
    false
  );
END;
$$;
