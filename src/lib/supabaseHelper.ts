// Utility to bypass strict Supabase type checking for tables
// that exist in the database but aren't in the auto-generated types yet.
// This provides a typed escape hatch while keeping the codebase functional.

import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a Supabase query builder for any table name, bypassing
 * the auto-generated type restrictions. Use when querying tables
 * like 'properties', 'projects', 'agents', etc. that exist in the
 * database but haven't been added to the generated types file.
 */
export const fromTable = (tableName: string) => {
  return (supabase.from as any)(tableName);
};
