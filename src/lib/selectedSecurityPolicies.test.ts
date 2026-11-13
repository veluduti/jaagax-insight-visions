import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("drizzle/migrations/0056_restrict_inventory_units_and_journey_members.sql", "utf8");

describe("selected inventory and journey exposure repairs", () => {
  it("removes both unrestricted read policies without touching other tables", () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "units public read"');
    expect(sql).toContain('DROP POLICY IF EXISTS "Member counts visible"');
    expect(sql).not.toMatch(/USING\s*\(true\)/i);
    expect(sql).not.toContain("agent_faqs");
  });

  it("denies anonymous reads while retaining staff and member access", () => {
    for (const table of ["hotel_inventory_units", "travel_journey_members"]) {
      expect(sql).toContain(`REVOKE SELECT ON public.${table} FROM anon`);
      expect(sql).toContain(`GRANT ALL ON public.${table} TO service_role`);
    }
    expect(sql).toContain("FOR SELECT TO authenticated");
    expect(sql).toContain("user_id = auth.uid()");
    expect(sql).toContain("j.host_id = auth.uid()");
    expect(sql).toContain("public.is_admin(auth.uid())");
  });

  it("keeps capacity counting private and independent of membership read RLS", () => {
    expect(sql).toContain("RETURNS boolean");
    expect(sql).toContain("SECURITY DEFINER\nSET search_path = public");
    expect(sql).toContain("auth.uid() IS NOT NULL");
    expect(sql).toContain("WHERE m.journey_id = j.id) < j.seats - 1");
    expect(sql).toContain("FROM PUBLIC, anon");
    expect(sql).toContain("WITH CHECK (user_id = auth.uid() AND public.travel_journey_has_capacity(journey_id))");
  });
});