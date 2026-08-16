ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS area_value numeric,
  ADD COLUMN IF NOT EXISTS area_unit text;

UPDATE public.properties
SET area_value = NULLIF(regexp_replace(COALESCE(document_urls->>'area', ''), '[^0-9.]', '', 'g'), '')::numeric
WHERE area_value IS NULL
  AND NULLIF(regexp_replace(COALESCE(document_urls->>'area', ''), '[^0-9.]', '', 'g'), '') IS NOT NULL;

UPDATE public.properties
SET area_unit = NULLIF(trim(document_urls->>'area_unit'), '')
WHERE area_unit IS NULL
  AND NULLIF(trim(document_urls->>'area_unit'), '') IS NOT NULL;

UPDATE public.properties
SET area_value = area_sqft, area_unit = COALESCE(area_unit, 'sq ft')
WHERE area_value IS NULL AND area_sqft IS NOT NULL;

UPDATE public.properties
SET type = COALESCE(
  NULLIF(trim(document_urls->>'property_type'), ''),
  NULLIF(trim(document_urls->>'sub_type'), ''),
  NULLIF(trim(document_urls->>'residential_type'), '')
)
WHERE (type IS NULL OR trim(type) = '')
  AND COALESCE(
    NULLIF(trim(document_urls->>'property_type'), ''),
    NULLIF(trim(document_urls->>'sub_type'), ''),
    NULLIF(trim(document_urls->>'residential_type'), '')
  ) IS NOT NULL;