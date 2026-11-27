import {createClient} from 'npm:@supabase/supabase-js@2';
import {corsHeaders} from 'npm:@supabase/supabase-js@2/cors';
import {z} from 'npm:zod@3.25.76';
import {sendTemplateEmail} from '../_shared/transactional-email-templates/send-email.ts';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
const schema=z.object({hotel_id:z.string().uuid(),kind:z.enum(['enquiry','visit','application']),slot_id:z.string().uuid().nullable().optional(),details:z.object({name:z.string().trim().min(2).max(100),phone:z.string().trim().regex(/^\+?[0-9 -]{7,20}$/),email:z.string().trim().email().max(255),occupation:z.string().max(100),company:z.string().max(200),age:z.number().min(0).max(120),emergency_name:z.string().max(100),emergency_phone:z.string().max(20),move_in:z.string().max(10),duration:z.number().int().min(1).max(60),occupants:z.number().int().min(1).max(10),plan:z.enum(['monthly','weekly']),room_id:z.string().max(36),notes:z.string().max(1000),consent:z.literal(true),inspect:z.array(z.string().max(100)).max(20)})});
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});if(req.method!=='POST')return json({error:'Use POST'},405);
 try{
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!anon||!key)return json({error:'Service unavailable'},503);
 const auth=createClient(url,anon,{global:{headers:{Authorization:req.headers.get('Authorization')||''}}});const {data:{user}}=await auth.auth.getUser();if(!user)return json({error:'Please sign in'},401);
 const parsed=schema.safeParse(await req.json());if(!parsed.success)return json({error:'Check the required fields'},400);
 const p=parsed.data;const {data:id,error}=await auth.rpc('pg_submit_request',{_hotel_id:p.hotel_id,_kind:p.kind,_details:p.details,_slot_id:p.slot_id||null});if(error)return json({error:error.message},400);
 const admin=createClient(url,key);const {data:hotel}=await admin.from('partner_hotels').select('name,manager_id').eq('id',p.hotel_id).single();const {data:lead}=await admin.from('hotel_leads').select('application_code').eq('id',id).single();
 let ownerEmail=false;
 if(hotel?.manager_id){const {data:{user:owner}}=await admin.auth.admin.getUserById(hotel.manager_id);if(owner?.email){try{const result=await sendTemplateEmail('pg-owner-request',owner.email,{idempotencyKey:`pg-owner-request-${id}`,templateData:{property:hotel.name,name:p.details.name,kind:p.kind,reference:lead?.application_code}});ownerEmail=result.sent;}catch(e){console.error('PG notification email unavailable',e instanceof Error?e.message:'Unknown send error');}}}
 return json({id,owner_email_sent:ownerEmail});
 }catch(e){console.error('PG request failed',e instanceof Error?e.message:'Unknown request error');return json({error:'Could not submit request. Please retry.'},500);}});
