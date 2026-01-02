-- Fix 1: Set search_path for delete_expired_stories
CREATE OR REPLACE FUNCTION public.delete_expired_stories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.visit_story_updates
  WHERE expires_at < NOW();
END;
$function$;

-- Fix 2: Set search_path for update_agent_xp
CREATE OR REPLACE FUNCTION public.update_agent_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE agents
    SET 
      xp_points = xp_points + 10,
      completed_visits = completed_visits + 1,
      level = FLOOR((xp_points + 10) / 100) + 1
    WHERE id = NEW.agent_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix 3: Set search_path for update_event_attendee_count
CREATE OR REPLACE FUNCTION public.update_event_attendee_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE community_events 
    SET current_attendees = current_attendees + NEW.tickets_count
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
    UPDATE community_events 
    SET current_attendees = current_attendees + NEW.tickets_count
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
    UPDATE community_events 
    SET current_attendees = current_attendees - OLD.tickets_count
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    UPDATE community_events 
    SET current_attendees = current_attendees - OLD.tickets_count
    WHERE id = OLD.event_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;