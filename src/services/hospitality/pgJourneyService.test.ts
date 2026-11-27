import {describe,it,expect,vi} from 'vitest';
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
vi.mock('@/lib/hotelImage',()=>({resolveHotelImages:vi.fn()}));
vi.mock('./markupService',()=>({loadPublicMarkupRates:vi.fn(),markRoom:vi.fn()}));
import {validatePgRequest} from './pgJourneyService';
const valid={name:'QA Resident',phone:'9000000000',email:'qa@example.com',occupation:'Student',age:24,emergency_name:'Emergency Contact',emergency_phone:'9000000001',move_in:'2099-12-01',duration:6,occupants:2,plan:'monthly',room_id:'0ca199e3-fb09-41e1-9692-64ec0b23077c',consent:true};
describe('PG customer rules',()=>{
 it('requires contact consent',()=>expect(()=>validatePgRequest('enquiry',{...valid,consent:false})).toThrow());
 it('requires identity of a selected room for an application',()=>expect(()=>validatePgRequest('application',{...valid,room_id:''})).toThrow());
 it('requires an emergency contact for resident applications',()=>expect(()=>validatePgRequest('application',{...valid,emergency_phone:''})).toThrow());
 it('allows a visit enquiry without selecting a bed or move-in date',()=>expect(validatePgRequest('visit',{...valid,room_id:'',move_in:''}).room_id).toBe(''));
 it('rejects move-in dates in the past',()=>expect(()=>validatePgRequest('application',{...valid,move_in:'2000-01-01'})).toThrow());
 it('keeps requested duration and residents unchanged',()=>{const p=validatePgRequest('application',valid);expect(p.duration).toBe(6);expect(p.occupants).toBe(2)});
});
