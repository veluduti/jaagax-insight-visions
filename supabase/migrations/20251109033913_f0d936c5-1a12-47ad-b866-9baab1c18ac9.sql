-- Enable RLS on tables that are missing it
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE builders ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for public read access (Bayut-style public listings)
-- Properties: Anyone can view, but only authenticated can modify
CREATE POLICY "Anyone can view properties"
  ON properties FOR SELECT
  USING (true);

-- Agents: Anyone can view agent profiles
CREATE POLICY "Anyone can view agents"
  ON agents FOR SELECT
  USING (true);

-- Builders: Anyone can view builder information
CREATE POLICY "Anyone can view builders"
  ON builders FOR SELECT
  USING (true);

-- Projects: Anyone can view projects
CREATE POLICY "Anyone can view projects"
  ON projects FOR SELECT
  USING (true);