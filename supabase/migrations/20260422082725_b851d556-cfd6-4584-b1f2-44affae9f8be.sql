-- 1. Add slug column
ALTER TABLE public.builder_profiles
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Helper: slugify text
CREATE OR REPLACE FUNCTION public.slugify(_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s TEXT;
BEGIN
  IF _input IS NULL THEN
    RETURN NULL;
  END IF;
  s := lower(_input);
  s := regexp_replace(s, '[^a-z0-9\s-]', '', 'g');
  s := regexp_replace(s, '\s+', '-', 'g');
  s := regexp_replace(s, '-+', '-', 'g');
  s := trim(both '-' from s);
  IF s = '' THEN
    s := 'builder';
  END IF;
  RETURN s;
END;
$$;

-- 3. Helper: generate unique slug for builder_profiles
CREATE OR REPLACE FUNCTION public.generate_unique_builder_slug(_name TEXT, _id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter INT := 2;
BEGIN
  base_slug := public.slugify(_name);
  candidate := base_slug;

  WHILE EXISTS (
    SELECT 1 FROM public.builder_profiles
    WHERE slug = candidate
      AND (_id IS NULL OR id <> _id)
  ) LOOP
    candidate := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

-- 4. Trigger to auto-set slug on insert/update
CREATE OR REPLACE FUNCTION public.set_builder_profile_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- On INSERT, or when name changes / slug is empty, regenerate
  IF NEW.slug IS NULL OR NEW.slug = '' OR
     (TG_OP = 'UPDATE' AND NEW.builder_name IS DISTINCT FROM OLD.builder_name AND
      (NEW.slug IS NULL OR NEW.slug = OLD.slug))
  THEN
    NEW.slug := public.generate_unique_builder_slug(NEW.builder_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_builder_profile_slug ON public.builder_profiles;
CREATE TRIGGER trg_set_builder_profile_slug
BEFORE INSERT OR UPDATE ON public.builder_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_builder_profile_slug();

-- 5. Backfill existing rows
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, builder_name FROM public.builder_profiles WHERE slug IS NULL OR slug = '' LOOP
    UPDATE public.builder_profiles
    SET slug = public.generate_unique_builder_slug(r.builder_name, r.id)
    WHERE id = r.id;
  END LOOP;
END $$;

-- 6. Enforce uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS builder_profiles_slug_unique ON public.builder_profiles(slug);