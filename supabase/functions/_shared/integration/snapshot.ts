export async function integrationSnapshot(sb: any, connection: any) {
  const [{ data: hotel }, { data: mappings }, { data: rates }] = await Promise.all([
    sb.from("partner_hotels").select("id,name,city,locality,country,default_currency").eq("id", connection.hotel_id).single(),
    sb.from("hotel_room_channel_mappings").select("room_id,external_room_id,hotel_rooms(id,room_type,room_name,total_units,max_occupancy,max_adults,max_children,base_price)").eq("connection_id", connection.id).eq("sync_enabled", true),
    sb.from("hotel_rate_channel_mappings").select("room_id,rate_plan_id,external_rate_plan_id,hotel_rate_plans(id,name,rate_plan_code,currency,board,is_refundable)").eq("connection_id", connection.id).eq("sync_enabled", true),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const rooms = [];
  for (const mapping of mappings ?? []) {
    const { data: calendar } = await sb.from("hotel_rate_calendar").select("date,price,currency,available_units,stop_sell,min_stay,max_stay,closed_to_arrival,closed_to_departure").eq("room_id", mapping.room_id).gte("date", today).order("date").limit(62);
    rooms.push({ ...mapping, calendar: calendar ?? [] });
  }
  return { generated_at: new Date().toISOString(), connection: { client_id: connection.client_id, channel: connection.channel, external_property_id: connection.channel_property_id }, hotel, rooms, rate_plans: rates ?? [] };
}
