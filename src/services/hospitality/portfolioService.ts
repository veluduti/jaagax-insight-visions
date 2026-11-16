import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { listManagedHotels, type ManagedHotel } from "./partnerDashboardService";
import { getOrCreatePartnerAccount, listBusinesses, type PartnerAccount, type PartnerBusiness } from "./partnerService";

const sb = supabase as any;
export type PortfolioHotel = ManagedHotel & { business_id: string | null; created_at: string; updated_at: string };
export type PortfolioRoom = { id:string; hotel_id:string; total_units:number|null; is_active:boolean|null };
export type PortfolioBooking = { id:string; hotel_id:string; status:string; currency:string|null; total_amount:number|null; num_rooms:number|null; check_in:string; check_out:string; created_at:string; updated_at:string; booking_reference:string|null };
export type PortfolioReview = { id:string;hotel_id:string;rating:number;created_at:string;title:string|null };
export type PortfolioTask = { id:string;hotel_id:string;title:string;status:string;priority:string;created_at:string;updated_at:string };
export type PortfolioRequest = { id:string;hotel_id:string;request_type:string;status:string;created_at:string;updated_at:string };
export type PortfolioBlock = { hotel_id:string;units:number;start_date:string;end_date:string;booking_id:string|null;long_stay_id:string|null;smart_stay_reservation_id:string|null };
export type PortfolioData = { account:PartnerAccount; businesses:PartnerBusiness[]; hotels:PortfolioHotel[]; rooms:PortfolioRoom[]; bookings:PortfolioBooking[]; reviews:PortfolioReview[]; tasks:PortfolioTask[]; requests:PortfolioRequest[]; blocks:PortfolioBlock[] };

async function allRows(table:string, fields:string, ids:string[]) {
  const rows:any[]=[];
  for(let offset=0;;offset+=500){
    const {data,error}=await sb.from(table).select(fields).in("hotel_id",ids).order("id").range(offset,offset+499);
    if(error)throw error;rows.push(...(data??[]));if(!data||data.length<500)break;
  }
  return rows;
}
export async function loadPortfolio(userId:string):Promise<PortfolioData> {
  const hotels=await listManagedHotels(userId) as PortfolioHotel[];
  const account=await getOrCreatePartnerAccount(userId,"My hospitality group");
  const businesses=await listBusinesses(account.id);
  const ids=hotels.map(h=>h.id);
  if(!ids.length)return {account,businesses,hotels,rooms:[],bookings:[],reviews:[],tasks:[],requests:[],blocks:[]};
  const [rooms,bookings,reviews,tasks,requests,blocks]=await Promise.all([
    allRows("hotel_rooms","id,hotel_id,total_units,is_active",ids),
    allRows("hotel_bookings","id,hotel_id,status,currency,total_amount,num_rooms,check_in,check_out,created_at,updated_at,booking_reference",ids),
    allRows("hotel_reviews","id,hotel_id,rating,created_at,title",ids),
    allRows("hotel_ops_tasks","id,hotel_id,title,status,priority,created_at,updated_at",ids),
    allRows("guest_portal_requests","id,hotel_id,request_type,status,created_at,updated_at",ids),
    allRows("hotel_availability_blocks","hotel_id,units,start_date,end_date,booking_id,long_stay_id,smart_stay_reservation_id",ids),
  ]);
  return {account,businesses,hotels,rooms,bookings,reviews,tasks,requests,blocks};
}
const day=(s:string)=>s.slice(0,10);
export function periodDates(days:number,now=new Date()) {
  const end=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
  return Array.from({length:days},(_,i)=>new Date(+end-(days-1-i)*86400000).toISOString().slice(0,10));
}
const countedStatus=new Set(["confirmed","checked_in","checked_out"]);
export function propertyState(h:PortfolioHotel) {
  if(h.type_details?.portfolio_archived===true)return "archived";
  if(h.onboarding_status==="pending_review")return "review";
  if(h.is_active)return "active";
  return "draft";
}
export function portfolioMetrics(data:PortfolioData,days:number,now=new Date()) {
  const dates=periodDates(days,now),start=dates[0],end=dates[dates.length-1];
  return data.hotels.map(h=>{
    const rooms=data.rooms.filter(r=>r.hotel_id===h.id&&r.is_active!==false);
    const capacity=rooms.reduce((sum,r)=>sum+Math.max(0,Number(r.total_units)||0),0);
    const bookings=data.bookings.filter(b=>b.hotel_id===h.id&&countedStatus.has(b.status));
    const currencies=new Set(bookings.filter(b=>day(b.created_at)>=start&&day(b.created_at)<=end).map(b=>b.currency||h.default_currency||"INR"));
    const currency=currencies.size>1?null:[...currencies][0]||h.default_currency||"INR";
    const inPeriod=bookings.filter(b=>day(b.created_at)>=start&&day(b.created_at)<=end);
    const revenue=currency?inPeriod.reduce((s,b)=>s+(Number(b.total_amount)||0),0):null;
    const occupancy=dates.map(date=>{
      const blocks=data.blocks.filter(b=>b.hotel_id===h.id&&b.start_date<=date&&b.end_date>date);
      // Calendar blocks are authoritative; only legacy bookings lacking a block use their saved room count.
      const occupied=blocks.filter(b=>b.booking_id||b.long_stay_id||b.smart_stay_reservation_id).reduce((s,b)=>s+Math.max(0,b.units||0),0)
        +bookings.filter(b=>b.check_in<=date&&b.check_out>date&&!data.blocks.some(x=>x.booking_id===b.id)).reduce((s,b)=>s+Math.max(0,b.num_rooms??1),0);
      return {date,occupied:Math.min(capacity,occupied),value:capacity?Math.min(100,occupied/capacity*100):null};
    });
    const roomNights=occupancy.reduce((s,o)=>s+o.occupied,0);
    const reviews=data.reviews.filter(r=>r.hotel_id===h.id&&Number.isFinite(Number(r.rating)));
    return {hotel:h,capacity,roomTypes:rooms.length,todayBookings:bookings.filter(b=>day(b.created_at)===end).length,bookings:inPeriod.length,revenue,currency,occupancy,roomNights,availableNights:capacity*days,averageOccupancy:capacity?roomNights/(capacity*days)*100:null,rating:reviews.length?reviews.reduce((s,r)=>s+Number(r.rating),0)/reviews.length:null,reviewCount:reviews.length};
  });
}
export const draftPropertySchema=z.object({name:z.string().trim().min(2).max(160),city:z.string().trim().min(1).max(120),business_id:z.string().uuid().nullable()});
export async function createDraftProperty(userId:string,input:unknown) {
  const values=draftPropertySchema.parse(input);
  const {data,error}=await sb.from("partner_hotels").insert({...values,manager_id:userId,is_active:false,onboarding_status:"draft",business_types:["hotel"],type_details:{},images:[],amenities:[]}).select("id").single();
  if(error)throw error;return data.id as string;
}
export const groupSchema=z.object({legal_name:z.string().trim().min(2).max(160),gstin:z.string().trim().max(15)});
export async function savePortfolioGroup(partnerId:string,id:string|null,input:unknown) {
  const values=groupSchema.parse(input),patch={...values,gstin:values.gstin||null};
  const result=id?await sb.from("partner_businesses").update(patch).eq("id",id).eq("partner_id",partnerId).select("id").single():await sb.from("partner_businesses").insert({...patch,partner_id:partnerId}).select("id").single();
  if(result.error)throw result.error;
}
export async function deletePortfolioGroup(partnerId:string,id:string) {
  const {count,error}=await sb.from("partner_hotels").select("id",{count:"exact",head:true}).eq("business_id",id);
  if(error)throw error;if(count)throw new Error("Move the group's properties to another group first.");
  const result=await sb.from("partner_businesses").delete().eq("id",id).eq("partner_id",partnerId).select("id").single();if(result.error)throw result.error;
}
export async function savePortfolioBrand(userId:string,hotelId:string,brand:string,chain:string,businessId:string|null) {
  const values=z.object({brand:z.string().trim().max(160),chain:z.string().trim().max(160),businessId:z.string().uuid().nullable()}).parse({brand,chain,businessId});
  const {data,error}=await sb.from("partner_hotels").select("type_details").eq("id",hotelId).eq("manager_id",userId).single();if(error)throw error;
  const result=await sb.from("partner_hotels").update({business_id:values.businessId,type_details:{...data.type_details,brand_name:values.brand,chain_name:values.chain},updated_at:new Date().toISOString()}).eq("id",hotelId).eq("manager_id",userId).select("id").single();if(result.error)throw result.error;
}
export async function archivePortfolioProperty(userId:string,hotel:PortfolioHotel,archived:boolean) {
  const {data,error}=await sb.from("partner_hotels").select("type_details").eq("id",hotel.id).eq("manager_id",userId).single();if(error)throw error;
  const result=await sb.from("partner_hotels").update({is_active:false,onboarding_status:"unpublished",type_details:{...data.type_details,portfolio_archived:archived},updated_at:new Date().toISOString()}).eq("id",hotel.id).eq("manager_id",userId).select("id").single();if(result.error)throw result.error;
}
export async function deleteEmptyDraft(userId:string,hotel:PortfolioHotel) {
  const {data,error}=await sb.from("partner_hotels").select("is_active,onboarding_status").eq("id",hotel.id).eq("manager_id",userId).single();if(error)throw error;
  if(data.is_active||data.onboarding_status!=="draft")throw new Error("Only empty draft properties can be deleted. Archive other properties to retain their history.");
  for(const table of ["hotel_bookings","hotel_rooms"]){const result=await sb.from(table).select("id",{count:"exact",head:true}).eq("hotel_id",hotel.id);if(result.error)throw result.error;if(result.count)throw new Error("This property has room or booking records. Archive it instead.");}
  const result=await sb.from("partner_hotels").delete().eq("id",hotel.id).eq("manager_id",userId).eq("is_active",false).eq("onboarding_status","draft").select("id").single();if(result.error)throw result.error;
}