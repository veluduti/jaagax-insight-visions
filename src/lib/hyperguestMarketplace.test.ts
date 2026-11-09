import { describe, it, expect } from "vitest";
import { MARKETPLACE_IDS, propertyFields, availabilitySummary, certificationRulesApply } from "../../supabase/functions/_shared/channel/marketplace";
describe("HyperGuest marketplace rules", () => {
  it("imports exactly the requested supplier IDs without duplicates", () => {
    expect(MARKETPLACE_IDS).toEqual([111139,120655,117810,119668,102148,127194,100621,100622,125400,126856,101610,125492,101230,32571,29212,100388,55617]);
    expect(new Set(MARKETPLACE_IDS).size).toBe(17);
  });
  it("retains supplier identity and actual coordinates", () => {
    const row = propertyFields({id:111139,name:"Supplier hotel",location:{city:{name:"Hyderabad"}},coordinates:{latitude:17.46867,longitude:78.36604},settings:{currency:"INR"}});
    expect(row.hyperguest_property_id).toBe("111139"); expect(row.latitude).toBe(17.46867); expect(row.longitude).toBe(78.36604);
  });
  it("does not import test inventory", () => expect(() => propertyFields({id:19912,name:"Test",isTest:1})).toThrow());
  it("does not fabricate a star rating for unrated supplier hotels", () => expect(propertyFields({id:111139,name:"Supplier",rating:0,location:{city:{name:"Hyderabad"}}}).star_rating).toBeNull());
  it("uses live sell prices per night and never invents availability", () => {
    expect(availabilitySummary([{propertyId:111139,rooms:[{numberOfAvailableRooms:2,ratePlans:[{prices:{sell:{searchCurrency:6000}}}]}]},{propertyId:120655,rooms:[]}],2)).toEqual([{propertyId:111139,available:true,price:3000},{propertyId:120655,available:false,price:null}]);
  });
  it("keeps certification restrictions off mapped marketplace bookings", () => { expect(certificationRulesApply(true,true)).toBe(false); expect(certificationRulesApply(true,false)).toBe(true); });
});