import { z } from 'zod';
export const methodLabels = { full: 'Full Payment', loan: 'Home Loan + EMI', construction: 'Construction-Linked', installment: 'Fixed Installments', custom: 'Flexible / Custom' } as const;
export type Method = keyof typeof methodLabels;
const money = z.number().finite().min(0).max(1_000_000_000_000);
export const pricingSchema = z.object({
 base_price: money.positive(), booking_amount: money, upfront_discount: money,
 charges: z.array(z.object({ label: z.string().trim().min(1).max(100), amount: money })).max(30),
 plans: z.array(z.object({ kind: z.enum(['full','loan','construction','installment','custom']), name: z.string().trim().min(1).max(100), terms: z.string().max(5000), extra_charge: money, interest_rate: z.number().min(0).max(100), loan_amount: money, down_payment: money, tenure_months: z.number().int().min(1).max(480), milestones: z.array(z.object({label:z.string().trim().min(1).max(100),amount:money.positive(),due_date:z.string().refine(s=>s===''||(/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))), 'Invalid due date')})).max(120) })).min(1).max(5)
}).superRefine((v,ctx)=>{
 const total = priceTotal(v);
 const error=(message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,message});
 if(v.booking_amount>total) error('Booking amount must not exceed the total price.');
 if(v.upfront_discount>=total) error('Upfront discount must be less than the total price.');
 if(new Set(v.plans.map(p=>p.kind)).size!==v.plans.length) error('Select each payment method only once.');
 v.plans.forEach(p=>{
  const expected=planTotal(v,p);
  if(p.kind==='loan' && (p.loan_amount<=0 || Math.abs(p.loan_amount+p.down_payment-expected)>1)) error('Loan amount and down payment must equal the plan total.');
  if(['construction','installment','custom'].includes(p.kind) && (!p.milestones.length||Math.abs(p.milestones.reduce((s,m)=>s+m.amount,0)-expected)>1)) error(`${p.name}: schedule must total ${inr(expected)}, including the booking amount.`);
  if(p.kind==='installment'&&p.milestones.some(m=>!m.due_date)) error('Every fixed installment requires a due date.');
 });
});
export type Pricing = z.infer<typeof pricingSchema>;
export type Plan = Pricing['plans'][number];
export function priceTotal(p: Pick<Pricing,'base_price'|'charges'>) { return p.base_price+p.charges.reduce((s,c)=>s+c.amount,0); }
export function planTotal(p: Pick<Pricing,'base_price'|'charges'|'upfront_discount'>,plan:Pick<Plan,'kind'|'extra_charge'>) {return priceTotal(p)+plan.extra_charge-(plan.kind==='full'?p.upfront_discount:0);}
export function emi(amount:number,rate:number,months:number) { if(!Number.isFinite(amount)||amount<=0||months<=0) return 0; const r=rate/1200;return r===0?amount/months:amount*r/(1-Math.pow(1+r,-months)); }
export const inr=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
export function newPlan(kind:Method,total:number):Plan {return {kind,name:methodLabels[kind],terms:'',extra_charge:0,interest_rate:0,loan_amount:kind==='loan'?Math.round(total*.8):0,down_payment:kind==='loan'?total-Math.round(total*.8):0,tenure_months:240,milestones:[]};}
export function emptyPricing(base=0):Pricing {return {base_price:base,booking_amount:0,upfront_discount:0,charges:[],plans:[newPlan('full',base)]};}
export const contactSchema=z.object({name:z.string().trim().min(1).max(100),email:z.string().trim().email().max(254),phone:z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/,'Enter a valid phone number'),message:z.string().max(3000)});
