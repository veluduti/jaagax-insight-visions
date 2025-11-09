-- Add missing bhk and description columns to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS bhk integer,
ADD COLUMN IF NOT EXISTS description text;