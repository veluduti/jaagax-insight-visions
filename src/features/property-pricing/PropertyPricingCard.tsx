import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Badge} from '@/components/ui/badge';
import {IndianRupee,CheckCircle2} from 'lucide-react';
import {toast} from 'sonner';
import {useAuth} from '@/hooks/useAuth';
import {requireSignIn} from '@/lib/requireSignIn';
import {approvedPricing,enquire,Revision} from './service';
import {inr,priceTotal,planTotal,emi,contactSchema} from './model';
export default function PropertyPricingCard({propertyId}:{propertyId:string}) {
 const {user}=useAuth();const navigate=useNavigate();const [revision,setRevision]=useState<Revision|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [selected,setSelected]=useState('');const [open,setOpen]=useState(false);const [busy,setBusy]=useState(false);const [sent,setSent]=useState(false);
 const [contact,setContact]=useState({name:'',email:'',phone:'',message:''});
 useEffect(()=>{if(user)setContact(c=>({...c,name:user.user_metadata?.full_name||user.user_metadata?.name||'',email:user.email||'',phone:user.phone||user.user_metadata?.phone||''}));},[user]);
 useEffect(()=>{let active=true;setLoading(true);setError('');if(!user){setLoading(false);return;}approvedPricing(propertyId).then(r=>{if(active){setRevision(r);setSelected(r?.content.plans[0]?.kind||'');}}).catch(e=>active&&setError(e.message)).finally(()=>active&&setLoading(false));return()=>{active=false;};},[propertyId,user?.id]);
 const pricing=revision?.content;const plan=pricing?.plans.find(p=>p.kind===selected);
 return <section className="rounded-lg border border-primary/30 bg-card text-card-foreground p-5 space-y-4 shadow-sm">
  <h2 className="text-xl font-semibold flex items-center gap-2"><IndianRupee className="h-5 w-5 text-primary"/>Pricing & Payment Plans</h2>
  {!user?<Button variant="outline" className="w-full" onClick={()=>requireSignIn(navigate,()=>{})}>Sign in to view pricing</Button>:loading?<p className="text-sm text-muted-foreground">Loading pricing…</p>:error?<p role="alert" className="text-sm text-destructive">Pricing is temporarily unavailable.</p>:!pricing?<p className="text-sm text-muted-foreground">Approved payment plans are not available yet.</p>:<>
   <Badge variant="outline" className="gap-1 text-primary"><CheckCircle2 className="h-3 w-3"/>Admin-approved pricing</Badge>
   <dl className="space-y-2 text-sm"><div className="flex justify-between gap-2"><dt>Base price</dt><dd>{inr(pricing.base_price)}</dd></div>{pricing.charges.map((c,i)=><div key={i} className="flex justify-between gap-2"><dt className="text-muted-foreground">{c.label}</dt><dd>{inr(c.amount)}</dd></div>)}<div className="border-t pt-2 flex justify-between font-semibold"><dt>Total price</dt><dd>{inr(priceTotal(pricing))}</dd></div><div className="flex justify-between gap-2"><dt>Booking amount (included)</dt><dd>{inr(pricing.booking_amount)}</dd></div></dl>
   <RadioGroup value={selected} onValueChange={setSelected} className="space-y-0">{pricing.plans.map(p=><label key={p.kind} className="flex items-start gap-3 border-b py-3 cursor-pointer"><RadioGroupItem value={p.kind} className="mt-1"/><span className="flex-1 text-sm"><span className="block font-medium">{p.name}</span><span className="text-primary">{inr(planTotal(pricing,p))}</span></span></label>)}</RadioGroup>
   {plan&&<div className="space-y-2 text-sm">{plan.kind==='full'&&pricing.upfront_discount>0&&<p>Upfront discount: {inr(pricing.upfront_discount)}</p>}{plan.extra_charge>0&&<p>Plan charges: {inr(plan.extra_charge)}</p>}{plan.interest_rate>0&&<p>Interest: {plan.interest_rate}% p.a.</p>}{plan.kind==='loan'&&<><p>Down payment: {inr(plan.down_payment)} · Loan: {inr(plan.loan_amount)}</p><p className="font-semibold">Estimated EMI {inr(emi(plan.loan_amount,plan.interest_rate,plan.tenure_months))}/month</p><p>{plan.tenure_months} months at {plan.interest_rate}% p.a.</p><p className="text-xs text-muted-foreground">Actual approval and terms depend on the lender.</p></>}{plan.milestones.map((m,i)=><div key={i} className="flex justify-between gap-2"><span>{m.label}{m.due_date&&<small className="block text-muted-foreground">{m.due_date}</small>}</span><span>{inr(m.amount)}</span></div>)}{plan.terms&&<p className="whitespace-pre-wrap text-muted-foreground break-words">{plan.terms}</p>}</div>}
   <Button className="w-full" onClick={()=>requireSignIn(navigate,()=>{setSent(false);setOpen(true);})}>Enquire Now</Button><p className="text-xs text-muted-foreground">No payment is collected. An enquiry does not confirm a property purchase.</p>
  </>}
  <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{sent?'Enquiry received':'Enquire about '+(plan?.name||'payment plan')}</DialogTitle><DialogDescription>{sent?'The property creator will contact you to discuss payment terms.':'Your contact details will be sent to the original property creator.'}</DialogDescription></DialogHeader>{sent?<Button onClick={()=>setOpen(false)}>Done</Button>:<form className="space-y-3" onSubmit={async e=>{e.preventDefault();const parsed=contactSchema.safeParse(contact);if(!parsed.success){toast.error(parsed.error.issues[0]?.message);return;}if(!revision)return;setBusy(true);try{await enquire(revision.id,selected,parsed.data);setSent(true);}catch(e){toast.error(e instanceof Error?e.message:'Unable to send enquiry');}finally{setBusy(false);}}}>{(['name','email','phone'] as const).map(key=><label key={key} className="grid gap-1 text-sm capitalize">{key}<Input aria-label={'Customer '+key} type={key==='email'?'email':key==='phone'?'tel':'text'} value={contact[key]} required maxLength={key==='name'?100:key==='phone'?20:254} onChange={e=>setContact(c=>({...c,[key]:e.target.value}))}/></label>)}<label className="grid gap-1 text-sm">Message<Textarea value={contact.message} maxLength={3000} onChange={e=>setContact(c=>({...c,message:e.target.value}))}/></label><Button disabled={busy} className="w-full">{busy?'Sending…':'Submit enquiry'}</Button></form>}</DialogContent></Dialog>
 </section>;
}
