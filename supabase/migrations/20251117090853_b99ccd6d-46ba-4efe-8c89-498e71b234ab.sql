
-- Enable realtime for notifications table (if not already)
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Add helpful indexes for notifications queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Add a helper function to create test notifications
CREATE OR REPLACE FUNCTION create_test_notification(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
