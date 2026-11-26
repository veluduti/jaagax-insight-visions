import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;
export const propertySetupSchema = z.object({
  name: z.string().trim().min(2).max(160), description: z.string().max(5000),
  city: z.string().trim().min(1).max(120), locality: z.string().max(160), address: z.string().max(500),
  state: z.string().max(120), country: z.string().max(120),
  star_rating: z.number().int().min(0).max(5).nullable(),
  contact_phone: z.string().max(30), contact_email: z.union([z.string().email().max(254), z.literal("")]),
  check_in_time: z.union([z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), z.literal("")]),
  check_out_time: z.union([z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), z.literal("")]),
  latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(),
  amenities: z.array(z.string().trim().min(1).max(100)).max(100),
  images: z.array(z.union([z.string().url().startsWith("https://"),z.string().regex(/^[a-f0-9-]{36}\/[\w.-]+$/i)])).max(100),
});
export type SetupFields = z.infer<typeof propertySetupSchema>;
export type ManagedHotel = SetupFields & { id: string; property_reference?: string; manager_id: string; is_active: boolean; onboarding_status: string; business_types: string[]; type_details: Record<string, any> | null; policies: Record<string, any> | null; default_currency: string | null };
export type OverviewData = { hotel: ManagedHotel; rooms: any[]; rates: any[]; services: any[]; reviews: any[]; bookings: any[]; requests: any[] };

export async function listManagedHotels(userId: string): Promise<ManagedHotel[]> {
  const { data, error } = await sb.from("partner_hotels").select("*").eq("manager_id", userId).order("created_at");
  if (error) throw error;
  return data ?? [];
}
export async function loadPartnerOverview(hotelId: string): Promise<OverviewData> {
  const results = await Promise.all([
    sb.from("partner_hotels").select("*").eq("id", hotelId).single(),
    sb.from("hotel_rooms").select("*").eq("hotel_id", hotelId).order("created_at").limit(500),
    sb.from("hotel_rate_plans").select("id,room_id,name,is_active").eq("hotel_id", hotelId).limit(500),
    sb.from("hotel_extra_services").select("*").eq("hotel_id", hotelId).order("created_at").limit(500),
    sb.from("hotel_reviews").select("id,rating,title,body,guest_name,response").eq("hotel_id", hotelId).order("created_at", { ascending:false }).limit(500),
    sb.from("hotel_bookings").select("id,total_amount,status,num_rooms,check_in,check_out,created_at").eq("hotel_id", hotelId).order("created_at", {ascending:false}).limit(1000),
    sb.from("guest_portal_requests").select("id,status,request_type").eq("hotel_id", hotelId).limit(500),
  ]);
  for (const result of results) if (result.error) throw result.error;
  return { hotel: results[0].data, rooms:results[1].data ?? [], rates:results[2].data ?? [], services:results[3].data ?? [], reviews:results[4].data ?? [], bookings:results[5].data ?? [], requests:results[6].data ?? [] };
}
export async function savePropertySetup(hotelId: string, fields: Partial<SetupFields>) {
  const values = propertySetupSchema.partial().parse(fields);
  const { error } = await sb.from("partner_hotels").update({...values, updated_at:new Date().toISOString()}).eq("id",hotelId).select("id").single();
  if (error) throw error;
}
export const faqSchema = z.array(z.object({ question:z.string().trim().min(1).max(300), answer:z.string().trim().min(1).max(2000) })).max(50);
export const contactSchema = z.array(z.object({ name:z.string().trim().min(1).max(100), phone:z.string().max(30), email:z.union([z.string().email().max(254),z.literal("")]) })).max(50);
export const nearbySchema = z.array(z.object({ name:z.string().trim().min(1).max(160), distance_km:z.number().min(0).max(10000) })).max(50);
export async function savePropertyDetails(hotelId:string, field:"faqs"|"departments"|"nearby", values:unknown) {
  const parsed = (field === "faqs" ? faqSchema : field === "departments" ? contactSchema : nearbySchema).parse(values);
  const { data,error } = await sb.from("partner_hotels").select("type_details").eq("id",hotelId).single();
  if(error) throw error;
  const result = await sb.from("partner_hotels").update({type_details:{...data.type_details,[field]:parsed},updated_at:new Date().toISOString()}).eq("id",hotelId).select("id").single();
  if(result.error) throw result.error;
}
export async function saveHotelPolicies(hotelId:string, policies:Record<string,string>) {
  const values = z.record(z.string().min(1).max(100),z.string().max(3000)).parse(policies);
  const {data,error:readError}=await sb.from("partner_hotels").select("policies").eq("id",hotelId).single();
  if(readError)throw readError;
  const retained=Object.fromEntries(Object.entries(data.policies ?? {}).filter(([,v])=>typeof v!=="string"));
  const {error} = await sb.from("partner_hotels").update({policies:{...retained,...values},updated_at:new Date().toISOString()}).eq("id",hotelId).select("id").single();
  if(error) throw error;
}
export function validatePropertyPhoto(file:{type:string;size:number}) {
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)) return "Choose a JPG, PNG or WebP image";
  if(file.size>10*1024*1024) return "Images must be 10 MB or smaller";
  return null;
}
export async function uploadPropertyPhoto(userId:string,file:File) {
  const invalid=validatePropertyPhoto(file); if(invalid) throw new Error(invalid);
  const extension=file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const path=`${userId}/${crypto.randomUUID()}.${extension}`;
  const {error}=await supabase.storage.from("hotel-photos").upload(path,file,{contentType:file.type});
  if(error) throw error;
  return supabase.storage.from("hotel-photos").getPublicUrl(path).data.publicUrl;
}
export async function propertyPhotoUrl(value:string):Promise<string|null> {
  if(/^https:\/\//.test(value))return value;
  const {data,error}=await supabase.storage.from("hotel-documents").createSignedUrl(value,3600);
  return error ? null : data?.signedUrl ?? null;
}
export async function loadServiceRequests(hotelId:string) {
  const {data,error}=await sb.from("guest_portal_requests").select("id,request_type,status,payload,created_at").eq("hotel_id",hotelId).order("created_at",{ascending:false}).limit(500);
  if(error)throw error;return data ?? [];
}
export async function updateServiceRequest(hotelId:string,id:string,status:"pending"|"in_progress"|"done") {
  const {error}=await sb.from("guest_portal_requests").update({status,updated_at:new Date().toISOString()}).eq("id",id).eq("hotel_id",hotelId).select("id").single();
  if(error)throw error;
}
export function propertyReadiness(data:OverviewData) {
  return {
    "Property Information":Boolean(data.hotel.name?.trim() && data.hotel.city?.trim()),
    "Rooms & Rates":data.rooms.some(r=>r.is_active && Number(r.base_price)>0 && Number(r.total_units)>0),
    "Photos & Media":Boolean(data.hotel.images?.length),
    "Amenities & Facilities":Boolean(data.hotel.amenities?.length),
    "Location & Nearby":Number.isFinite(data.hotel.latitude) && Number.isFinite(data.hotel.longitude),
    "Policies & FAQs":Boolean(Object.keys(data.hotel.policies ?? {}).length),
  };
}