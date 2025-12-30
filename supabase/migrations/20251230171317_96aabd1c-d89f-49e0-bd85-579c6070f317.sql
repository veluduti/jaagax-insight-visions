-- Add new fields to builders table for Trust Program
ALTER TABLE public.builders
ADD COLUMN IF NOT EXISTS construction_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_confidence_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_flexibility_notes TEXT,
ADD COLUMN IF NOT EXISTS trust_partner BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trust_partner_since TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS projects_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS projects_ongoing INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS on_time_delivery_rate INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_satisfaction_score INTEGER DEFAULT 0;

-- Update existing builders with sample data
UPDATE public.builders 
SET 
  construction_progress = FLOOR(RANDOM() * 40 + 60),
  delivery_confidence_score = FLOOR(RANDOM() * 30 + 70),
  payment_flexibility_notes = CASE 
    WHEN RANDOM() > 0.5 THEN 'Flexible payment plans available with EMI options'
    ELSE 'Standard payment schedule with milestone-based payments'
  END,
  trust_partner = CASE WHEN trust_score > 75 THEN true ELSE false END,
  trust_partner_since = CASE WHEN trust_score > 75 THEN now() - (RANDOM() * INTERVAL '365 days') ELSE NULL END,
  projects_completed = FLOOR(RANDOM() * 20 + 5),
  projects_ongoing = FLOOR(RANDOM() * 5 + 1),
  on_time_delivery_rate = FLOOR(RANDOM() * 20 + 80),
  customer_satisfaction_score = FLOOR(RANDOM() * 15 + 85)
WHERE id IS NOT NULL;