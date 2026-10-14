import { supabase } from '@/integrations/supabase/client';
import { fromTable } from '@/lib/supabaseHelper';
import type { Pricing } from './model';
export interface PricingProperty {id:string;title:string;type:string|null;area_sqft:number|null;price:number;city:string|null;creator_user_id:string|null}
export interface Revision {id:string;property_id:string;creator_user_id:string;submitted_by:string;content:Pricing;status:string;rejection_reason:string|null;created_at:string;reviewed_at:string|null}
export interface Enquiry {id:string;property_id:string;revision_id:string;creator_user_id:string;customer_name:string;customer_phone:string;customer_email:string;selected_plan:string;plan_snapshot:{pricing:Pricing;selected:Pricing['plans'][number]};message:string;status:string;notes:string;created_at:string}
async function rpc<T>(name:string,args:Record<string,unknown>={}) {const {data,error}=await (supabase.rpc as any)(name,args);if(error)throw new Error(error.message);return data as T;}
export const listProperties=()=>rpc<PricingProperty[]>('list_pricing_properties');
export async function revisions(propertyId?:string) {let q=fromTable('property_pricing_revisions').select('*').order('created_at',{ascending:false});if(propertyId)q=q.eq('property_id',propertyId);const {data,error}=await q;if(error)throw new Error(error.message);return (data||[]) as Revision[];}
export async function approvedPricing(propertyId:string) {const {data,error}=await fromTable('property_pricing_revisions').select('*').eq('property_id',propertyId).eq('status','approved').maybeSingle();if(error)throw new Error(error.message);return data as Revision|null;}
export const submit=(propertyId:string,content:Pricing)=>rpc<string>('submit_property_pricing',{_property:propertyId,_content:content});
export const review=(revisionId:string,decision:string,reason:string,content:Pricing)=>rpc<void>('review_property_pricing',{_revision:revisionId,_decision:decision,_reason:reason,_content:content});
export const enquire=(revision:string,plan:string,c:{name:string;email:string;phone:string;message:string})=>rpc<string>('create_property_pricing_enquiry',{_revision:revision,_plan:plan,_name:c.name,_email:c.email,_phone:c.phone,_message:c.message});
export async function enquiries(propertyId:string) {const {data,error}=await fromTable('property_pricing_enquiries').select('*').eq('property_id',propertyId).order('created_at',{ascending:false});if(error)throw new Error(error.message);return (data||[]) as Enquiry[];}
export const updateEnquiry=(id:string,status:string,notes:string)=>rpc<void>('update_property_pricing_enquiry',{_enquiry:id,_status:status,_notes:notes});
export async function history(propertyId:string) {const {data,error}=await fromTable('property_pricing_history').select('id,action,created_at,details').eq('property_id',propertyId).order('created_at',{ascending:false}).limit(100);if(error)throw new Error(error.message);return (data||[]) as {id:string;action:string;created_at:string;details:any}[];}
