import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover,PopoverContent,PopoverTrigger } from '@/components/ui/popover';
import { Plus,Trash2,CalendarIcon,IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import { Pricing,Plan,Method,methodLabels,newPlan,priceTotal,planTotal,pricingSchema,emi,inr } from './model';
interface Props {initial:Pricing;onSubmit:(p:Pricing)=>Promise<void>;submitLabel?:string;busy?:boolean}
export default function PricingForm({initial,onSubmit,submitLabel='Submit for Global Admin approval',busy}:Props) {
 const [value,setValue]=useState<Pricing>(()=>structuredClone(initial));const [error,setError]=useState('');
 const change=(patch:Partial<Pricing>)=>setValue(v=>({...v,...patch}));
 const planChange=(i:number,patch:Partial<Plan>)=>change({plans:value.plans.map((p,j)=>j===i?{...p,...patch}:p)});
 const total=priceTotal(value);
 const num=(label:string,n:number,fn:(v:number)=>void)=><label className="grid gap-1 text-sm"><span className="text-muted-foreground">{label}</span><Input aria-label={label} type="number" min="0" step="any" value={n||''} onChange={e=>fn(Number(e.target.value))}/></label>;
 return <form className="space-y-6" onSubmit={async e=>{e.preventDefault();const result=pricingSchema.safeParse(value);if(!result.success){setError(result.error.issues.map(i=>i.message).join(' '));return;}setError('');try{await onSubmit(result.data);}catch(e){setError(e instanceof Error?e.message:'Unable to save pricing');}}}>
  <div className="grid sm:grid-cols-3 gap-3">{num('Total base price (₹)',value.base_price,n=>change({base_price:n}))}{num('Booking amount (₹)',value.booking_amount,n=>change({booking_amount:n}))}{num('Full-payment upfront discount (₹)',value.upfront_discount,n=>change({upfront_discount:n}))}</div>
  <section className="space-y-3"><h3 className="font-semibold">Additional charges</h3>
   {value.charges.map((c,i)=><div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end"><label className="text-sm grid gap-1">Charge<Input aria-label={`Charge ${i+1}`} placeholder="GST, registration, stamp duty, maintenance, parking…" value={c.label} onChange={e=>change({charges:value.charges.map((x,j)=>i===j?{...x,label:e.target.value}:x)})}/></label>{num(`Charge ${i+1} amount (₹)`,c.amount,n=>change({charges:value.charges.map((x,j)=>i===j?{...x,amount:n}:x)}))}<Button type="button" variant="ghost" size="icon" aria-label={`Remove charge ${i+1}`} onClick={()=>change({charges:value.charges.filter((_,j)=>i!==j)})}><Trash2 className="h-4 w-4"/></Button></div>)}
   <Button type="button" variant="outline" size="sm" disabled={value.charges.length>=30} onClick={()=>change({charges:[...value.charges,{label:'',amount:0}]})}><Plus className="h-4 w-4 mr-2"/>Add charge</Button>
   <div className="flex justify-between border-y py-3 font-semibold"><span>Total before plan adjustments</span><span>{inr(total)}</span></div>
  </section>
  <section className="space-y-3"><h3 className="font-semibold">Available payment methods</h3><div className="flex flex-wrap gap-4">{(Object.keys(methodLabels) as Method[]).map(kind=><label key={kind} className="flex items-center gap-2 text-sm"><Checkbox checked={value.plans.some(p=>p.kind===kind)} onCheckedChange={checked=>change({plans:checked?[...value.plans,newPlan(kind,total)]:value.plans.filter(p=>p.kind!==kind)})}/>{methodLabels[kind]}</label>)}</div></section>
  {value.plans.map((p,i)=><section key={p.kind} className="border-t pt-5 space-y-4"><h3 className="font-semibold flex gap-2 items-center"><IndianRupee className="h-4 w-4 text-primary"/>{methodLabels[p.kind]} <span className="ml-auto text-primary text-sm">{inr(planTotal(value,p))}</span></h3>
   <label className="grid gap-1 text-sm">Plan name<Input value={p.name} maxLength={100} onChange={e=>planChange(i,{name:e.target.value})}/></label>
   <div className="grid sm:grid-cols-2 gap-3">{num(`${methodLabels[p.kind]} additional charges (₹)`,p.extra_charge,n=>planChange(i,{extra_charge:n}))}{num(`${methodLabels[p.kind]} interest rate (% p.a.)`,p.interest_rate,n=>planChange(i,{interest_rate:n}))}</div>
   {p.kind==='loan'&&<><div className="grid sm:grid-cols-3 gap-3">{num('Loan amount (₹)',p.loan_amount,n=>planChange(i,{loan_amount:n}))}{num('Down payment (₹)',p.down_payment,n=>planChange(i,{down_payment:n}))}{num('Tenure (months)',p.tenure_months,n=>planChange(i,{tenure_months:n}))}</div><p className="font-semibold">Estimated monthly EMI: {inr(emi(p.loan_amount,p.interest_rate,p.tenure_months))}</p><p className="text-xs text-muted-foreground">Actual loan approval, interest rate and terms depend on the lender.</p></>}
   {['construction','installment','custom'].includes(p.kind)&&<div className="space-y-3"><p className="text-sm text-muted-foreground">Payment schedule, including the booking amount: {inr(p.milestones.reduce((s,m)=>s+m.amount,0))} / {inr(planTotal(value,p))}</p>{p.milestones.map((m,j)=><div key={j} className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end"><label className="grid gap-1 text-sm">Milestone<Input aria-label={`Milestone ${j+1}`} value={m.label} maxLength={100} onChange={e=>planChange(i,{milestones:p.milestones.map((x,k)=>k===j?{...x,label:e.target.value}:x)})}/></label>{num(`Milestone ${j+1} amount (₹)`,m.amount,n=>planChange(i,{milestones:p.milestones.map((x,k)=>k===j?{...x,amount:n}:x)}))}<Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="gap-2"><CalendarIcon className="h-4 w-4"/>{m.due_date||'Due date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 pointer-events-auto"><Calendar mode="single" selected={m.due_date?new Date(m.due_date+'T12:00:00'):undefined} onSelect={date=>planChange(i,{milestones:p.milestones.map((x,k)=>k===j?{...x,due_date:date?format(date,'yyyy-MM-dd'):''}:x)})} className="pointer-events-auto"/></PopoverContent></Popover><Button type="button" variant="ghost" size="icon" aria-label={`Remove milestone ${j+1}`} onClick={()=>planChange(i,{milestones:p.milestones.filter((_,k)=>k!==j)})}><Trash2 className="h-4 w-4"/></Button></div>)}<Button type="button" variant="outline" size="sm" disabled={p.milestones.length>=120} onClick={()=>planChange(i,{milestones:[...p.milestones,{label:'',amount:0,due_date:''}]})}><Plus className="h-4 w-4 mr-2"/>Add milestone / installment</Button></div>}
   <label className="grid gap-1 text-sm">Payment terms and interest / other charge details<Textarea value={p.terms} maxLength={5000} onChange={e=>planChange(i,{terms:e.target.value})}/></label>
  </section>)}
  {error&&<p role="alert" className="text-destructive text-sm">{error}</p>}
  <p className="text-xs text-muted-foreground">Booking amount is part of the price, not an additional charge. This is an enquiry offer, not a purchase confirmation.</p>
  <Button type="submit" disabled={busy} className="w-full sm:w-auto">{busy?'Saving…':submitLabel}</Button>
 </form>;
}
