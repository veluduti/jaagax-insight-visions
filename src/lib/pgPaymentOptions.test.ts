import {describe,it,expect} from 'vitest';
import {pgPaymentSplit} from './pgPaymentOptions';
describe('both PG payment choices',()=>{
 it('full online payment leaves no move-in balance',()=>expect(pgPaymentSplit(37000,1000,'full')).toEqual({total:37000,payNow:37000,balance:0}));
 it('owner deposit leaves the exact remaining balance',()=>expect(pgPaymentSplit(37000,1000,'deposit')).toEqual({total:37000,payNow:1000,balance:36000}));
 it('does not offer an unconfigured deposit',()=>expect(()=>pgPaymentSplit(37000,null,'deposit')).toThrow());
 it('does not charge more than the total',()=>expect(pgPaymentSplit(5100,6000,'deposit').payNow).toBe(5100));
 it('preserves paise',()=>expect(pgPaymentSplit(5100.25,1000.1,'deposit').balance).toBe(4100.15));
});
