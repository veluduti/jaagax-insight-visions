-- Add user_id to agents table to link agents to auth users
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add unique constraint to ensure one agent profile per user
ALTER TABLE public.agents ADD CONSTRAINT agents_user_id_unique UNIQUE (user_id);

-- Create function to automatically create agent profile when user signs up with agent role
CREATE OR REPLACE FUNCTION public.handle_new_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_data RECORD;
BEGIN
  -- Get user details from auth.users
  SELECT 
    email,
    raw_user_meta_data->>'name' as name,
    raw_user_meta_data->>'city' as city
  INTO user_data
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Create agent profile with default values
  INSERT INTO public.agents (
    user_id,
    name,
    email,
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
    user_data.email,
    'Independent Agent', -- Default agency name
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
$$;

-- Create trigger to call the function when a new agent role is created
DROP TRIGGER IF EXISTS on_agent_role_created ON public.user_roles;
CREATE TRIGGER on_agent_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  WHEN (NEW.role = 'agent')
  EXECUTE FUNCTION public.handle_new_agent();

-- Update existing agents to have default values if needed
UPDATE public.agents 
SET 
  sales_count = COALESCE(sales_count, 0),
  rent_count = COALESCE(rent_count, 0),
  trust_score = COALESCE(trust_score, 75),
  verified = COALESCE(verified, false)
WHERE sales_count IS NULL OR rent_count IS NULL OR trust_score IS NULL;