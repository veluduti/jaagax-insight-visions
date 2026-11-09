import { describe, expect, it } from 'vitest';
import { emptyMarketplaceFilters as base, matchesMarketplaceProperty as matches, hasPropertyPin, publicMarketplaceProperty, sortMarketplaceProperties } from '../propertyMarketplace';
const p = { id:'one', title:'Apartment', type:'Apartment', city:'Hyderabad', locality:'Hitec City', listing_type:'sale', price:7200000, bedrooms:2, is_live:true, lifecycle_status:'live_verified', verified:true, amenities:['Gym'] };
describe('property marketplace', () => {
  it('excludes pending owner/agent records even if visible to their role', () => expect(matches({...p,is_live:false,lifecycle_status:'pending_admin_review'},base)).toBe(false));
  it('excludes expired live listings', () => expect(matches({...p,expiry_date:'2020-01-01'},base)).toBe(false));
  it('requires every selected amenity', () => expect(matches(p,{...base,amenities:['Gym','Pool']})).toBe(false));
  it('matches selected city, type, bedroom count and budget together', () => { expect(matches(p,{...base,city:'Hyderabad',types:['residential'],beds:['2'],max:7500000})).toBe(true); expect(matches(p,{...base,city:'Medchal'})).toBe(false); });
  it('does not show sale inventory for rent', () => expect(matches(p,{...base,intent:'rent'})).toBe(false));
  it('uses approved final values rather than edits', () => { const v=publicMarketplaceProperty({...p,final_data:{title:'Approved',price:5000000},agent_data:{title:'Draft'}}); expect(v.title).toBe('Approved'); expect(v.price).toBe(5000000); });
  it('normalizes approved amenities list objects for exact filters', () => { const v=publicMarketplaceProperty({...p,final_data:{amenities:{list:'Lift, Parking'}}}); expect(v.amenities).toEqual(['Lift','Parking']); expect(matches(v,{...base,amenities:['Parking']})).toBe(true); });
  it('does not match a different city from a long postal address', () => expect(matches({...p,city:'Medchal',locality:'Moosapet',address:'Hyderabad metro area'},{...base,city:'Hyderabad'})).toBe(false));
  it('never invents pins for missing coordinates', () => { expect(hasPropertyPin(p)).toBe(false); expect(hasPropertyPin({...p,latitude:17.45,longitude:78.36})).toBe(true); expect(hasPropertyPin({...p,latitude:0,longitude:0})).toBe(false); });
  it('sorts prices without treating missing prices as cheapest', () => expect(sortMarketplaceProperties([p,{...p,id:'two',price:1000000},{...p,id:'three',price:null}],'price-asc').map(r=>r.id)).toEqual(['two','one','three']));
});
