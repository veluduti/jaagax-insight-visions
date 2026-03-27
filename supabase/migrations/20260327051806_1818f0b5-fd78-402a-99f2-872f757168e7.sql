ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_floors integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_parking integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_area_sqft numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS elevators integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS retail_centres integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_name text;