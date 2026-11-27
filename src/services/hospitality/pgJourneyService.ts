import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { resolveHotelImages } from "@/lib/hotelImage";
import { loadPublicMarkupRates, markRoom } from "./markupService";
const db = supabase as any;
const unwrap = (r: any) => { if (r.error) throw new Error(r.error.message); return r.data; };
export const pgRequestSchema = z.object({
  name: z.string().trim().min(2).max(100), phone: z.string().trim().regex(/^\+?[0-9 -]{7,20}$/), email: z.string().trim().email().max(255),
  occupation: z.string().trim().max(100).default(""), company: z.string().trim().max(200).default(""),
  move_in: z.string().default(""), duration: z.coerce.number().int().min(1).max(60), occupants: z.coerce.number().int().min(1).max(10),
  plan: z.enum(["monthly", "weekly"]), room_id: z.string().default(""), age: z.coerce.number().default(0),
  emergency_name: z.string().trim().max(100).default(""), emergency_phone: z.string().trim().max(20).default(""),
  notes: z.string().trim().max(1000).default(""), consent: z.literal(true), inspect: z.array(z.string().max(100)).max(20).default([]),
});
export function validatePgRequest(kind: string, value: unknown) {
  const p = pgRequestSchema.parse(value);
  if (kind !== "visit") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.move_in) || p.move_in < new Date().toISOString().slice(0,10)) throw new Error("Choose a move-in date from today");
    if (!z.string().uuid().safeParse(p.room_id).success) throw new Error("Choose a room type");
  }
  if (kind === "application" && (p.age < 18 || p.age > 120 || !p.occupation || p.emergency_name.length < 2 || !/^\+?[0-9 -]{7,20}$/.test(p.emergency_phone))) throw new Error("Complete resident and emergency contact details");
  return p;
}
export async function loadPgProperty(id: string) {
  const [hotel, rooms, details, reviews, rates] = await Promise.all([
    db.from("partner_hotels").select("*").eq("id",id).eq("is_active",true).maybeSingle(),
    db.from("hotel_rooms").select("*").eq("hotel_id",id).eq("is_active",true).order("monthly_price"),
    db.rpc("pg_public_details",{ _hotel_id:id }),
    db.from("hotel_reviews").select("id,rating,title,body,response,created_at").eq("hotel_id",id).order("created_at",{ascending:false}).limit(100),
    loadPublicMarkupRates(),
  ]);
  const h = unwrap(hotel); if (!h) throw new Error("This property is not available");
  const content = unwrap(details);
  return { hotel:{...h,images:await resolveHotelImages(h.images)}, rooms:(unwrap(rooms)??[]).map((r:any)=>markRoom(r,rates)), slots:content.slots??[], menus:content.menus??[], reviews:reviews.error?[]:reviews.data??[] };
}
export async function submitPgRequest(hotelId:string,kind:string,details:unknown,slotId?:string) {
  const parsed=validatePgRequest(kind,details);
  const {data,error}=await supabase.functions.invoke('pg-request',{body:{hotel_id:hotelId,kind,details:parsed,slot_id:slotId||null}});
  if(error){const body=error instanceof FunctionsHttpError?await error.context.text():error.message;try{throw new Error(JSON.parse(body).error||'Could not submit request')}catch(e){if(e instanceof SyntaxError)throw new Error('Could not submit request. Please retry.');throw e;}}
  if(!data?.id)throw new Error(data?.error||'Could not submit request');
  return loadPgRequest(data.id);
}
export async function loadPgRequest(id:string) { return unwrap(await db.from("hotel_leads").select("*").eq("id",id).single()); }
export async function loadMyPgRequests() {
  const {data:{user}}=await supabase.auth.getUser(); if(!user) return [];
  return unwrap(await db.from("hotel_leads").select("*,partner_hotels(name,city)").eq("customer_id",user.id).order("created_at",{ascending:false}));
}
export async function changePgVisit(id:string,action:string,slotId?:string) { unwrap(await db.rpc("pg_change_visit",{_lead_id:id,_action:action,_slot_id:slotId||null})); }
export async function loadOwnerVisitSlots(hotelId:string) { return unwrap(await db.from("hotel_visit_slots").select("*").eq("hotel_id",hotelId).order("starts_at")); }
export async function saveOwnerVisitSlot(hotelId:string,start:string,end:string,type:string,url:string) {
  const p=z.object({start:z.string().datetime(),end:z.string().datetime(),type:z.enum(["in_person","video"]),url:z.union([z.literal(""),z.string().url().startsWith("https://")])}).parse({start,end,type,url});
  if(p.start<=new Date().toISOString()||p.end<=p.start) throw new Error("Choose a future date and an end after the start");
  unwrap(await db.from("hotel_visit_slots").insert({hotel_id:hotelId,starts_at:p.start,ends_at:p.end,visit_type:p.type,video_url:p.url||null}));
}
export async function deleteOwnerVisitSlot(id:string) { unwrap(await db.from("hotel_visit_slots").delete().eq("id",id).is("lead_id",null)); }
export async function loadPgApplicationStay(id:string) { return unwrap(await db.from('hotel_long_stays').select('*').eq('application_id',id).eq('payment_status','paid').eq('status','active').maybeSingle()); }
export async function activatePgResident(id:string,unit:string) {unwrap(await db.rpc('pg_activate_resident',{_stay_id:id,_unit_label:unit}));}
export async function loadPgPaymentPolicy(id:string){return unwrap(await db.from('partner_hotels').select('pg_booking_deposit').eq('id',id).single())?.pg_booking_deposit??null;}
export async function savePgPaymentPolicy(id:string,deposit:number|null){if(deposit!=null&&(!Number.isFinite(deposit)||deposit<1||deposit>10000000||Number(deposit.toFixed(2))!==deposit))throw new Error('Enter a valid booking deposit with at most two decimal places');unwrap(await db.rpc('pg_save_payment_policy',{_hotel_id:id,_deposit:deposit}));}
export async function reservePgPayment(id:string,choice:'full'|'deposit'){const result=unwrap(await db.rpc('pg_reserve_payment',{_application_id:id,_choice:choice}));if(!result?.ok)throw new Error(result?.error||'Bed unavailable');return result as {stay_id:string;pay_now:number;balance:number};}
export async function collectPgBalance(id:string,receipt:string){if(receipt.trim().length<3||receipt.length>200)throw new Error('Enter the collection receipt or payment reference');unwrap(await db.rpc('pg_collect_move_in_balance',{_stay_id:id,_receipt:receipt.trim()}));}
