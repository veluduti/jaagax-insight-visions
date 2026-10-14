import { z } from 'zod';
export const methodLabels = { full: 'Full Payment', loan: 'Home Loan + EMI', construction: 'Construction-Linked', installment: 'Fixed Installments', custom: 'Flexible / Custom' } as const;
export type Method = keyof typeof methodLabels;
/** Methods creators can offer now; construction/custom remain only so older saved plans still display. */
export const selectableMethods = ['full','loan','installment'] as const;
const offerSchema = z.object({ title: z.string().trim().min(1).max(100), type: z.enum(['flat','percent']), value: z.number().finite().positive().max(1_000_000_000_000), valid_until: z.string().refine(s=>s===''||(/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))), 'Invalid offer date') });
export type Offer = z.infer<typeof offerSchema>;
const money = z.number().finite().min(0).max(1_000_000_000_000);
export const pricingSchema = z.object({
 base_price: money.positive(), booking_amount: money, upfront_discount: money,
 charges: z.array(z.object({ label: z.string().trim().min(1).max(100), amount: money })).max(30),
 plans: z.array(z.object({ kind: z.enum(selectableMethods), offers: z.array(offerSchema).max(10).default([]), name: z.string().trim().min(1).max(100), terms: z.string().max(5000), extra_charge: money, interest_rate: z.number().min(0).max(100), loan_amount: money, down_payment: money, tenure_months: z.number().int().min(1).max(480), milestones: z.array(z.object({label:z.string().trim().min(1).max(100),amount:money.positive(),due_date:z.string().refine(s=>s===''||(/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s), 'Invalid due date')})).max(120) })).min(1).max(5)
}).superRefine((v,ctx)=>{
 const total = priceTotal(v);
 const error=(message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,message});
 if(v.booking_amount>total) error('Booking amount must not exceed the total price.');
 if(v.upfront_discount>=total) error('Upfront discount must be less than the total price.');
 if(new Set(v.plans.map(p=>p.kind)).size!==v.plans.length) error('Select each payment method only once.');
 v.plans.forEach(p=>{
  if(p.kind!=='full'&&p.offers.length) error('Offers and discounts apply only to Full Payment.');
  if(p.offers.some(o=>o.type==='percent'&&o.value>50)) error('A percentage offer cannot exceed 50%.');
  if(p.kind==='full'&&expected<=0) error('Full Payment discounts and offers must leave a price above ₹0.');
  const expected=planTotal(v,p);
  if(p.kind==='loan' && (p.loan_amount<=0 || Math.abs(p.loan_amount+p.down_payment-expected)>1)) error('Loan amount and down payment must equal the plan total.');
  if(p.kind==='installment' && (!p.milestones.length||Math.abs(p.milestones.reduce((s,m)=>s+m.amount,0)-expected)>1)) error(`${p.name}: schedule must total ${inr(expected)}, including the booking amount.`);
  if(p.kind==='installment'&&p.milestones.some(m=>!m.due_date)) error('Every fixed installment requires a due date.');
 });
});
export type Pricing = z.infer<typeof pricingSchema>;
export type Plan = Pricing['plans'][number];
export function priceTotal(p: Pick<Pricing,'base_price'|'charges'>) { return p.base_price+p.charges.reduce((s,c)=>s+c.amount,0); }
const today=()=>new Date().toISOString().slice(0,10);
export const offerActive=(o:Offer,on=today())=>!o.valid_until||o.valid_until>=on;
/** Rupee value of one offer; percentages apply to the total base price only (not taxes/charges). */
export const offerAmount=(o:Offer,base:number)=>o.type==='percent'?Math.round(base*o.value/100):o.value;
export function fullPaymentSavings(p:Pick<Pricing,'base_price'|'upfront_discount'>,plan:{kind:string;offers?:Offer[]},on=today()){ if(plan.kind!=='full') return 0; return p.upfront_discount+(plan.offers??[]).filter(o=>offerActive(o,on)).reduce((s,o)=>s+offerAmount(o,p.base_price),0); }
export function planTotal(p: Pick<Pricing,'base_price'|'charges'|'upfront_discount'>,plan:{kind:string;extra_charge:number;offers?:Offer[]},on=today()) {return priceTotal(p)+plan.extra_charge-fullPaymentSavings(p,plan,on);}
export function emi(amount:number,rate:number,months:number) { if(!Number.isFinite(amount)||amount<=0||months<=0) return 0; const r=rate/1200;return r===0?amount/months:amount*r/(1-Math.pow(1+r,-months)); }
export const inr=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
export function newPlan(kind:(typeof selectableMethods)[number],total:number):Plan {return {kind,offers:[],name:methodLabels[kind],terms:'',extra_charge:0,interest_rate:0,loan_amount:kind==='loan'?Math.round(total*.8):0,down_payment:kind==='loan'?total-Math.round(total*.8):0,tenure_months:240,milestones:[]};}
export function emptyPricing(base=0):Pricing {return {base_price:base,booking_amount:0,upfront_discount:0,charges:[],plans:[newPlan('full',base)]};}
export const contactSchema=z.object({name:z.string().trim().min(1).max(100),email:z.string().trim().email().max(254),phone:z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/,'Enter a valid phone number'),message:z.string().max(3000)});
