import { describe, expect, it } from "vitest";
import { amenityNames, hasRoomDetails, hyperguestRoomDetails, nativeRoomDetails } from "./roomDetails";

describe("room details popup data", () => {
  it("reads native room amenities from arrays and object maps, dropping blanks", () => {
    expect(amenityNames(["Wifi", " ", { name: "AC" }])).toEqual(["Wifi", "AC"]);
    expect(amenityNames({ wifi: "Free Wifi", ac: true, smoking: false })).toEqual(["Free Wifi", "ac"]);
    expect(amenityNames(null)).toEqual([]);
  });

  it("keeps only the native room fields the partner actually saved", () => {
    const d = nativeRoomDetails(
      {
        room_type: "Deluxe Room",
        photos: ["https://img/1.jpg", "", null],
        size_sqft: 215,
        bed_type: "King",
        max_occupancy: 2,
        view_type: null,
        category: "Deluxe",
        description: "City view room",
        amenities: ["Wifi", "AC"],
        min_nights: 1,
        cancellation_policy: "Free cancellation",
        extra_bed_allowed: true,
        extra_bed_price: 800,
      },
      [{ meal_type: "breakfast", pricing_mode: "included", adult_price: 0 }],
    );
    expect(d.name).toBe("Deluxe Room");
    expect(d.photos).toEqual(["https://img/1.jpg"]);
    expect(d.specs).toEqual([
      { label: "Size", value: "215 sq ft" },
      { label: "Bed", value: "King" },
      { label: "Sleeps", value: "2 guests" },
      { label: "Category", value: "Deluxe" },
    ]);
    expect(d.amenities).toEqual(["Wifi", "AC"]);
    expect(d.meals).toEqual([{ label: "Breakfast", value: "Included" }]);
    expect(d.policies).toEqual(["Cancellation: Free cancellation", "Extra bed allowed · ₹800 per night"]);
    expect(hasRoomDetails(d)).toBe(true);
  });

  it("shows an empty popup state when a native room has nothing saved", () => {
    const d = nativeRoomDetails({ room_type: "Standard", amenities: null, photos: null }, []);
    expect(d.specs).toEqual([]);
    expect(d.amenities).toEqual([]);
    expect(hasRoomDetails(d)).toBe(false);
  });

  it("merges HyperGuest static content with live room availability", () => {
    const d = hyperguestRoomDetails(
      {
        name: "Executive Room",
        images: [{ uri: "https://img/r1.jpg" }, { uri: "" }],
        descriptions: [{ language: "en_US", type: "general", description: "Quiet room" }],
        facilities: [{ name: "Fitness Center" }, { name: "Restaurant" }],
        beds: [{ quantity: 1, type: "Double" }],
        settings: { roomSize: 26, maxOccupancy: 2, adultsNumber: 2 },
      },
      { roomName: "Executive Room", numberOfAvailableRooms: 9, settings: { childrenNumber: 1 } },
    );
    expect(d.name).toBe("Executive Room");
    expect(d.photos).toEqual(["https://img/r1.jpg"]);
    expect(d.description).toBe("Quiet room");
    expect(d.amenities).toEqual(["Fitness Center", "Restaurant"]);
    expect(d.specs).toEqual([
      { label: "Size", value: "26 m²" },
      { label: "Bed", value: "1 × Double" },
      { label: "Rooms left", value: "9" },
      { label: "Max guests", value: "2" },
      { label: "Adults", value: "2" },
      { label: "Children", value: "1" },
    ]);
    expect(hasRoomDetails(d)).toBe(true);
  });

  it("drops supplier occupancy limits that are zero or missing", () => {
    const d = hyperguestRoomDetails({ settings: { maxOccupancy: 0 } }, { roomName: "Twin" });
    expect(d.specs).toEqual([]);
    expect(d.description).toBeNull();
    expect(d.amenities).toEqual([]);
  });
});
