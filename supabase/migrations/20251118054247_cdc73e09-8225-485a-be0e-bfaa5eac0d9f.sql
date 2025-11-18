-- Fix the handle_new_agent function to remove the email column
CREATE OR REPLACE FUNCTION public.handle_new_agent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_data RECORD;
BEGIN
  -- Get user details from auth.users
  SELECT 
    raw_user_meta_data->>'name' as name,
    raw_user_meta_data->>'city' as city
  INTO user_data
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Create agent profile with default values (removed email column)
  INSERT INTO public.agents (
    user_id,
    name,
    agency_name,
    cities_served,
    languages,
    photo_url,
    sales_count,
    rent_count,
    trust_score,
    verified
  )
  VALUES (
    NEW.user_id,
    COALESCE(user_data.name, 'Agent'),
    'Independent Agent',
    COALESCE(user_data.city, 'India'),
    'English, Hindi',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
    0,
    0,
    75,
    false
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;