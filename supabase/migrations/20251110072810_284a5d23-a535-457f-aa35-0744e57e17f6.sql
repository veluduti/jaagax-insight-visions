-- Create AI sessions table for storing conversation history
CREATE TABLE IF NOT EXISTS public.ai_sessions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  response jsonb NOT NULL,
  filters jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on ai_sessions
ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view their own AI sessions" 
ON public.ai_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert their own AI sessions" 
ON public.ai_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_id ON public.ai_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_created_at ON public.ai_sessions(created_at DESC);