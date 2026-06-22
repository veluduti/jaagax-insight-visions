UPDATE public.properties
SET price = COALESCE(
  NULLIF((document_urls->>'monthly_rent'),'')::numeric,
  NULLIF((document_urls->>'rent_amount'),'')::numeric,
  NULLIF((document_urls->>'rental_price'),'')::numeric,
  NULLIF((document_urls->>'rent'),'')::numeric,
  NULLIF((document_urls->>'total_price'),'')::numeric,
  NULLIF((document_urls->>'property_price'),'')::numeric,
  NULLIF((document_urls->>'price'),'')::numeric,
  NULLIF((document_urls->>'amount'),'')::numeric,
  NULLIF((document_urls->>'price_per_seat'),'')::numeric
)
WHERE (price IS NULL OR price = 0)
  AND document_urls IS NOT NULL;