import { supabase } from '@/integrations/supabase/client';
import { publicMarketplaceProperty, type MarketplaceProperty } from '@/lib/propertyMarketplace';
// Only approved public content; never select seller/agent draft buckets or contacts.
const columns = 'id,slug,title,description,city,locality,address,latitude,longitude,price,area_sqft,area_value,area_unit,type,listing_type,bhk,bedrooms,bathrooms,images,amenities,verified,is_live,is_draft,is_featured,trust_score,verification_status,completion_stage,furnishing,listed_by,assigned_agent_id,created_at,lifecycle_status,expiry_date,rera_id,final_data,total_parking';
export async function getMarketplaceProperties(): Promise<MarketplaceProperty[]> {
  const rows: MarketplaceProperty[] = [];
  for (let offset = 0;;offset += 500) {
    const {data,error} = await supabase.from('properties').select(columns).eq('is_live',true).in('lifecycle_status',['live','live_verified']).or('is_draft.is.null,is_draft.eq.false').order('id').range(offset,offset+499);
    if (error) throw error;
    const batch = (data ?? []) as unknown as MarketplaceProperty[];
    rows.push(...batch.map(publicMarketplaceProperty));
    if (batch.length < 500) return rows;
  }
}
export async function getMarketplaceAgents(ids: string[]) {
  if (!ids.length) return [];
  const {data,error} = await supabase.from('agents').select('id,agent_code,agency_name,photo_url').in('id',ids);
  if (error) throw error;
  return data ?? [];
}
