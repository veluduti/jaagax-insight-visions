import {createClient} from 'npm:@supabase/supabase-js@2';
import {corsHeaders} from 'npm:@supabase/supabase-js@2/cors';
import {z} from 'npm:zod@3.25.76';
import {sendTemplateEmail} from '../_shared/transactional-email-templates/send-email.ts';
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...corsHeaders,'Content-Type':'application/json'}});
const schema=z.object({employee_id:z.string().uuid(),origin:z.string().url().max(200)});
const allowedOrigin=(o:string)=>{try{const u=new URL(o);return (u.protocol==='https:'&&(/(^|\.)jaagax\.com$/.test(u.hostname)||u.hostname.endsWith('.lovable.app')))||u.hostname==='localhost'||u.hostname==='127.0.0.1';}catch{return false}};
const genPassword=()=>{const c='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';const b=crypto.getRandomValues(new Uint8Array(10));return 'Jx'+Array.from(b,x=>c[x%c.length]).join('')+'@'+(b[0]%90+10);};
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});if(req.method!=='POST')return json({error:'Use POST'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth=createClient(url,anon,{global:{headers:{Authorization:req.headers.get('Authorization')||''}}});
  const {data:{user}}=await auth.auth.getUser();if(!user)return json({error:'Please sign in'},401);
  const parsed=schema.safeParse(await req.json());if(!parsed.success)return json({error:'Invalid request'},400);
  const {employee_id,origin}=parsed.data;const base=allowedOrigin(origin)?new URL(origin).origin:'https://jaagax.com';
  const admin=createClient(url,key);
  const {data:emp}=await admin.from('hotel_employees').select('*').eq('id',employee_id).maybeSingle();
  if(!emp)return json({error:'Employee not found'},404);
  const {data:allowed}=await auth.rpc('has_hotel_permission',{_hotel:emp.hotel_id,_module:'staff',_action:'create'});
  if(!allowed)return json({error:'You are not allowed to invite staff for this property'},403);
  if(['exited','suspended'].includes(emp.status))return json({error:'Reactivate this employee before sending an invite'},400);
  const {data:hotel}=await admin.from('partner_hotels').select('id,name,property_reference,manager_id').eq('id',emp.hotel_id).single();
  const slug=String(hotel.property_reference||hotel.id).toLowerCase();
  const loginUrl=`${base}/property/${slug}/login`;
  let userId:string|null=emp.user_id;let newAccount=false;let tempPassword:string|null=null;
  if(!userId){
    const {data:found}=await admin.rpc('find_user_id_by_email',{_email:emp.email});
    if(found){userId=found as string;}
    else{tempPassword=genPassword();
      const cr=await admin.auth.admin.createUser({email:emp.email,password:tempPassword,email_confirm:true,user_metadata:{full_name:emp.full_name}});
      if(cr.error||!cr.data?.user)return json({error:'Could not create the staff account for this email'},400);
      userId=cr.data.user.id;newAccount=true;}
  }
  if(userId===hotel.manager_id)return json({error:'The property owner cannot be added as an employee'},400);
  const {error:upErr}=await admin.from('hotel_employees').update({user_id:userId,invited_at:new Date().toISOString(),...(newAccount?{must_change_password:true}:{})}).eq('id',emp.id);
  if(upErr)return json({error:upErr.code==='23505'?'This person is already linked to another employee record':'Could not link the employee account'},400);
  let sent=false;
  try{const r=await sendTemplateEmail('staff-welcome',emp.email,{idempotencyKey:`staff-welcome-${emp.id}-${Date.now()}`,templateData:{property:hotel.name,name:emp.full_name,employeeCode:emp.employee_code,designation:emp.designation,role:(emp.roles||[]).join(', '),loginUrl,email:emp.email,newAccount,password:tempPassword}});sent=r.sent;}
  catch(e){console.error('staff welcome email failed',e instanceof Error?e.message:'unknown');}
  return json({sent,new_account:newAccount,login_url:loginUrl});
 }catch(e){console.error('staff-invite failed',e instanceof Error?e.message:'unknown');return json({error:'Could not send the invitation. Please retry.'},500);}
});
