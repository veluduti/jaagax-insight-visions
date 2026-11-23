// Inventory & Supplies categories, configured per dashboard mode. Add a category or
// a mode here and the Inventory page, filters and charts pick it up automatically.
import type { DashboardMode } from "@/config/dashboardModes";

export type SupplyCategory = { key: string; label: string; color: string; modes: DashboardMode[] | "all" };

export const SUPPLY_CATEGORIES: SupplyCategory[] = [
  { key: "cleaning", label: "Cleaning & Housekeeping", color: "hsl(142 70% 45%)", modes: "all" },
  { key: "kitchen", label: "Mess & Kitchen", color: "hsl(210 85% 55%)", modes: ["pg", "hostel", "coliving"] },
  { key: "fnb", label: "Food & Beverage", color: "hsl(210 85% 55%)", modes: ["hotel", "resort"] },
  { key: "laundry", label: "Laundry & Linen", color: "hsl(32 95% 55%)", modes: "all" },
  { key: "maintenance", label: "Maintenance & Repair", color: "hsl(45 95% 50%)", modes: "all" },
  { key: "guest_amenities", label: "Guest Amenities", color: "hsl(265 80% 60%)", modes: ["hotel", "resort", "serviced_apartment", "pg", "hostel", "coliving"] },
  { key: "minibar", label: "Minibar", color: "hsl(330 75% 55%)", modes: ["hotel", "resort"] },
  { key: "recreation", label: "Pool & Recreation", color: "hsl(190 80% 45%)", modes: ["resort"] },
  { key: "kitchenette", label: "Unit Kitchenette", color: "hsl(190 80% 45%)", modes: ["serviced_apartment"] },
  { key: "office", label: "Office & Others", color: "hsl(0 75% 55%)", modes: "all" },
];

/** Categories for one or more modes (hybrid properties get the union). */
export function categoriesForModes(modes: DashboardMode[]): SupplyCategory[] {
  return SUPPLY_CATEGORIES.filter(c => c.modes === "all" || c.modes.some(m => modes.includes(m)));
}
export const categoryLabel = (key: string) => SUPPLY_CATEGORIES.find(c => c.key === key)?.label ?? key;

export type StockStatus = "healthy" | "low" | "out";
export function stockStatus(i: { current_stock: number; reorder_level: number; min_level: number }): StockStatus {
  if (Number(i.current_stock) <= 0) return "out";
  if (Number(i.current_stock) <= Math.max(Number(i.reorder_level), Number(i.min_level))) return "low";
  return "healthy";
}
