CREATE OR REPLACE FUNCTION public.generate_unique_property_slug(_title text, _id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter INT := 2;
BEGIN
  base_slug := public.slugify(COALESCE(NULLIF(btrim(_title), ''), 'property'));
  base_slug := left(base_slug, 120);
  candidate := base_slug;
  WHILE counter <= 20 AND EXISTS (
    SELECT 1 FROM public.properties
    WHERE slug = candidate AND (_id IS NULL OR id <> _id)
  ) LOOP
    candidate := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;

  -- Final guarantee: append a stable token so concurrent inserts can never collide
  IF EXISTS (
    SELECT 1 FROM public.properties
    WHERE slug = candidate AND (_id IS NULL OR id <> _id)
  ) THEN
    candidate := base_slug || '-' || substr(replace(COALESCE(_id, gen_random_uuid())::text, '-', ''), 1, 8);
  END IF;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_property_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' OR
     (TG_OP = 'UPDATE' AND NEW.title IS DISTINCT FROM OLD.title AND NEW.slug = OLD.slug)
  THEN
    NEW.slug := public.generate_unique_property_slug(NEW.title, NEW.id);
  ELSIF EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.slug = NEW.slug AND p.id <> NEW.id
  ) THEN
    -- Caller supplied a slug that is already taken: make it unique instead of failing
    NEW.slug := public.generate_unique_property_slug(NEW.slug, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;