import { describe, it, expect } from "vitest";
import { permissionsForRoles, can } from "./staffRoles";
describe("staff roles", () => {
  it("housekeeping staff cannot see payroll", () => { expect(can(permissionsForRoles(["housekeeping_staff"]), "payroll", "view")).toBe(false); });
  it("payroll manager can approve payroll", () => { expect(can(permissionsForRoles(["payroll_manager"]), "payroll", "approve")).toBe(true); });
  it("multiple roles combine their permissions", () => {
    const p = permissionsForRoles(["security_staff", "chef"]);
    expect(can(p, "visitors", "create")).toBe(true); expect(can(p, "mess", "edit")).toBe(true); expect(can(p, "mess", "delete")).toBe(false);
  });
  it("custom roles are included", () => { expect(can(permissionsForRoles(["night_audit"], [{ key: "night_audit", permissions: { reports: ["view"] } }]), "reports", "view")).toBe(true); });
  it("manage implies every action", () => { expect(can({ staff: ["manage"] }, "staff", "delete")).toBe(true); });
});
