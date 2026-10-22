import { describe, expect, it } from "vitest";
import { HYDERABAD_PROPERTY_AREA, withinHyderabadPropertyRadius } from "../hyderabadPropertyRadius";

describe("Hyderabad featured property area", () => {
  it("uses exactly a 100 km radius", () => {
    expect(HYDERABAD_PROPERTY_AREA.radiusKm).toBe(100);
    const latAtDistance = (km: number) => HYDERABAD_PROPERTY_AREA.latitude + km / 6371 * 180 / Math.PI;
    expect(withinHyderabadPropertyRadius({ latitude: latAtDistance(99.9), longitude: 78.4867 })).toBe(true);
    expect(withinHyderabadPropertyRadius({ latitude: latAtDistance(100.1), longitude: 78.4867 })).toBe(false);
  });
  it("includes nearby cities for legacy properties with no saved pin", () => {
    expect(withinHyderabadPropertyRadius({ city: "Medchal" })).toBe(true);
    expect(withinHyderabadPropertyRadius({ city: "Sangareddy" })).toBe(true);
    expect(withinHyderabadPropertyRadius({ city: "Hyderabad" })).toBe(true);
    expect(withinHyderabadPropertyRadius({ city: "Vijayawada" })).toBe(false);
  });
  it("uses actual coordinates ahead of city labels", () => {
    expect(withinHyderabadPropertyRadius({ city: "Hyderabad", latitude: 16.5062, longitude: 80.648 })).toBe(false);
    expect(withinHyderabadPropertyRadius({ city: "Other town", latitude: 17.5, longitude: 78.5 })).toBe(true);
  });
});