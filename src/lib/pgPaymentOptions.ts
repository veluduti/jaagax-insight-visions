export type PgPaymentChoice='full'|'deposit';
export function pgPaymentSplit(total:number,deposit:number|null|undefined,choice:PgPaymentChoice){
 if(!Number.isFinite(total)||total<1)throw new Error('Invalid booking total');
 if(choice==='deposit'&&(deposit==null||!Number.isFinite(deposit)||deposit<1))throw new Error('The property has not configured a booking deposit');
 const cents=Math.round(total*100);const pay=choice==='deposit'?Math.min(Math.round(Number(deposit)*100),cents):cents;
 return {total:cents/100,payNow:pay/100,balance:(cents-pay)/100};
}
