import {z} from 'zod';
import {supabase} from '@/integrations/supabase/client';
const rpc=async(name:string,args:Record<string,unknown>)=>{const {data,error}=await (supabase as any).rpc(name,args);if(error)throw new Error(error.message);return data};
export const residentRequestSchema=z.object({kind:z.enum(['maintenance','housekeeping','support','dispute','safety','refund']),title:z.string().trim().min(3).max(150),notes:z.string().trim().max(1000)});
export const residentVisitorSchema=z.object({name:z.string().trim().min(2).max(100),phone:z.string().trim().regex(/^\+?[0-9 -]{7,20}$/),expected_at:z.string().datetime(),purpose:z.string().trim().max(500)});
export const loadResidentWorkspace=(id:string)=>rpc('pg_resident_workspace',{_stay_id:id});
export async function sendResidentRequest(id:string,value:unknown){const p=residentRequestSchema.parse(value);return rpc('pg_resident_request',{_stay_id:id,_kind:p.kind,_title:p.title,_notes:p.notes});}
export async function sendResidentVisitor(id:string,value:unknown){const p=residentVisitorSchema.parse(value);if(p.expected_at<=new Date().toISOString())throw new Error('Choose a future arrival');return rpc('pg_resident_visitor',{_stay_id:id,_name:p.name,_phone:p.phone,_expected_at:p.expected_at,_purpose:p.purpose});}
