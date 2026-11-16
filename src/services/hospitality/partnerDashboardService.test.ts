import { describe,expect,it,vi } from "vitest";
vi.mock("@/integrations/supabase/client",()=>({supabase:{}}));
import { propertyReadiness, propertySetupSchema, validatePropertyPhoto, faqSchema, nearbySchema, contactSchema, type OverviewData } from "./partnerDashboardService";
describe("partner property setup",()=>{
  it("does not claim unsaved coordinates and unpriced rooms are publish-ready",()=>{
    const data={hotel:{name:"Jaaga",city:"Hyderabad",latitude:null,longitude:null,images:[],amenities:[],policies:{}},rooms:[{is_active:true,base_price:0,total_units:1}]} as unknown as OverviewData;
    expect(propertyReadiness(data)["Location & Nearby"]).toBe(false);
    expect(propertyReadiness(data)["Rooms & Rates"]).toBe(false);
    data.hotel.latitude=17.4;data.hotel.longitude=78.4;data.rooms[0].base_price=1000;
    expect(propertyReadiness(data)["Location & Nearby"]).toBe(true);
    expect(propertyReadiness(data)["Rooms & Rates"]).toBe(true);
  });
  it("rejects invalid photos",()=>{expect(validatePropertyPhoto({type:"application/pdf",size:10})).toBeTruthy();expect(validatePropertyPhoto({type:"image/jpeg",size:10*1024*1024+1})).toBeTruthy();expect(validatePropertyPhoto({type:"image/jpeg",size:100})).toBeNull();});
  it("requires actual answers for FAQs",()=>{expect(faqSchema.safeParse([{question:"Check-in?",answer:""}]).success).toBe(false);expect(faqSchema.safeParse([{question:"Check-in?",answer:"14:00"}]).success).toBe(true);});
  it("rejects negative nearby distances",()=>{expect(nearbySchema.safeParse([{name:"Airport",distance_km:-1}]).success).toBe(false);});
  it("validates department email",()=>{expect(contactSchema.safeParse([{name:"Reception",phone:"",email:"bad"}]).success).toBe(false);});
  it("accepts existing hotel photo object paths without allowing arbitrary paths",()=>{
    const images=propertySetupSchema.shape.images;
    expect(images.safeParse(["cef629dd-e73a-4fa1-bd93-bcf776efcb8b/photo-1792654721006.jpg"]).success).toBe(true);
    expect(images.safeParse(["https://example.com/hotel.jpg"]).success).toBe(true);
    expect(images.safeParse(["../../private.jpg"]).success).toBe(false);
  });
});