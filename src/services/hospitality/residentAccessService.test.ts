import {describe,it,expect,vi} from 'vitest';
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
import {residentRequestSchema,residentVisitorSchema} from './residentAccessService';
describe('resident request input',()=>{
 it('does not accept a client supplied booking or payment operation',()=>expect(residentRequestSchema.safeParse({kind:'confirm_payment',title:'Confirm me',notes:''}).success).toBe(false));
 it('requires a visitor phone',()=>expect(residentVisitorSchema.safeParse({name:'Visitor',phone:'',expected_at:'2099-01-01T10:00:00Z',purpose:''}).success).toBe(false));
});
