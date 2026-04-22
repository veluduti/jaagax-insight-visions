-- Add slug column to properties and projects with auto-generation triggers

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS properties_slug_unique ON public.properties (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_unique ON public.projects (slug) WHERE slug IS NOT NULL;

-- Property slug generator
CREATE OR REPLACE FUNCTION public.generate_unique_property_slug(_title text, _id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter INT := 2;
BEGIN
  base_slug := public.slugify(COALESCE(_title, 'property'));
  candidate := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.properties
    WHERE slug = candidate AND (_id IS NULL OR id <> _id)
  ) LOOP
    candidate := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_property_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR
     (TG_OP = 'UPDATE' AND NEW.title IS DISTINCT FROM OLD.title AND
      (NEW.slug IS NULL OR NEW.slug = OLD.slug))
  THEN
    NEW.slug := public.generate_unique_property_slug(NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_property_slug ON public.properties;
CREATE TRIGGER trg_set_property_slug
BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.set_property_slug();

-- Project slug generator
CREATE OR REPLACE FUNCTION public.generate_unique_project_slug(_name text, _id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter INT := 2;
BEGIN
  base_slug := public.slugify(COALESCE(_name, 'project'));
  candidate := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.projects
    WHERE slug = candidate AND (_id IS NULL OR id <> _id)
  ) LOOP
    candidate := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_project_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR
     (TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name AND
      (NEW.slug IS NULL OR NEW.slug = OLD.slug))
  THEN
    NEW.slug := public.generate_unique_project_slug(NEW.name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_project_slug ON public.projects;
CREATE TRIGGER trg_set_project_slug
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_project_slug();

-- Backfill existing rows
UPDATE public.properties SET slug = public.generate_unique_property_slug(title, id) WHERE slug IS NULL OR slug = '';
UPDATE public.projects SET slug = public.generate_unique_project_slug(name, id) WHERE slug IS NULL OR slug = '';
