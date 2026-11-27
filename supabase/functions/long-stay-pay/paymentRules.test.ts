import {describe,it,expect} from 'vitest';
import {isVerifiedLongStayPayment} from './paymentRules';
describe('long-stay verified payment',()=>{
 const payment={status:'captured',currency:'INR',order_id:'order_qa',amount:510000};
 it('does not confirm an authorized but uncaptured payment',()=>expect(isVerifiedLongStayPayment({...payment,status:'authorized'},'order_qa',5100)).toBe(false));
 it('rejects an amount mismatch',()=>expect(isVerifiedLongStayPayment({...payment,amount:509999},'order_qa',5100)).toBe(false));
 it('rejects a different currency',()=>expect(isVerifiedLongStayPayment({...payment,currency:'USD'},'order_qa',5100)).toBe(false));
 it('requires the booking order',()=>expect(isVerifiedLongStayPayment(payment,'order_other',5100)).toBe(false));
 it('accepts the matching captured payment',()=>expect(isVerifiedLongStayPayment(payment,'order_qa',5100)).toBe(true));
});
