import { describe, expect, it } from "vitest";
import { hasHotelMapCoordinates } from "../hotelMapCoordinates";
describe("Hotel map uses real saved coordinates", () => {
  it("excludes missing pins rather than inventing locations", () => {
    expect(hasHotelMapCoordinates({ latitude: null, longitude: 78.4 })).toBe(false);
    expect(hasHotelMapCoordinates({ latitude: 17.4 })).toBe(false);
  });
  it("accepts valid saved pins including zero, but rejects invalid coordinates", () => {
    expect(hasHotelMapCoordinates({ latitude: 0, longitude: 0 })).toBe(true);
    expect(hasHotelMapCoordinates({ latitude: 17.385, longitude: 78.4867 })).toBe(true);
    expect(hasHotelMapCoordinates({ latitude: 91, longitude: 78 })).toBe(false);
    expect(hasHotelMapCoordinates({ latitude: NaN, longitude: 78 })).toBe(false);
  });
});