import * as React from 'npm:react@18.3.1';
import {Body,Button,Container,Head,Heading,Html,Preview,Section,Text} from 'npm:@react-email/components@0.0.22';
import type {TemplateEntry} from './registry.ts';
interface Props{property?:string;name?:string;employeeCode?:string;designation?:string;role?:string;loginUrl?:string;email?:string;newAccount?:boolean}
const row={margin:'4px 0',fontSize:'14px',color:'#1f1b3a'};
const Email=({property='your property',name,employeeCode,designation,role,loginUrl,email,newAccount}:Props)=><Html lang="en"><Head/><Preview>Welcome to the {property} team on JAAGA X</Preview><Body style={{backgroundColor:'#ffffff',fontFamily:'Arial, sans-serif'}}><Container style={{padding:'24px',maxWidth:'600px'}}>
<Heading style={{color:'#6d28d9',fontSize:'22px'}}>Welcome to {property}</Heading>
<Text>{name?`Hi ${name},`:'Hi,'} you have been added to the {property} team on JAAGA X.</Text>
<Section style={{background:'#f5f3ff',borderRadius:'10px',padding:'14px 18px'}}>
<Text style={row}><b>Employee ID:</b> {employeeCode??'—'}</Text>
<Text style={row}><b>Designation:</b> {designation||'—'}</Text>
<Text style={row}><b>Role:</b> {role||'—'}</Text>
<Text style={row}><b>Sign-in email:</b> {email??'—'}</Text>
<Text style={row}><b>Your property login:</b> {loginUrl??''}</Text>
</Section>
<Text>{newAccount?'We have sent you a separate secure invitation email. Open it to set your password (the link expires and works once), then sign in at your property login.':'Sign in at your property login with your existing JAAGA X password, or use “Forgot password” on that page.'}</Text>
<Button href={loginUrl} style={{backgroundColor:'#6d28d9',color:'#ffffff',padding:'12px 20px',borderRadius:'8px'}}>Open property login</Button>
<Text style={{fontSize:'12px',color:'#6b7280',marginTop:'20px'}}>Access is restricted to authorised staff. If you were not expecting this, ignore this email.</Text>
</Container></Body></Html>;
export const template={component:Email,subject:(d:Record<string,any>)=>`Welcome to ${d.property??'your property'} — JAAGA X staff access`,displayName:'Staff welcome',previewData:{property:'Sunrise PG for Men',name:'Rahul Sharma',employeeCode:'EMP-001',designation:'Front Desk',role:'Receptionist',loginUrl:'https://jaagax.com/property/jgx-pg-00012/login',email:'rahul@example.com',newAccount:true}} satisfies TemplateEntry;
