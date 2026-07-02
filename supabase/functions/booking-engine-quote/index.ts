// Public quote endpoint for direct booking engine.
// Applies base room price + pricing rules + promo codes + add-ons.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { hotel_id, room_id, check_in, check_out, guests = 1, addons = [], promo_code } = body;
    if (!hotel_id || !room_id || !check_in || !check_out) {
      return json({ error: "Missing fields" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nights = Math.max(1, Math.round((+new Date(check_out) - +new Date(check_in)) / 86400000));
    const dow = new Date(check_in).getDay();
    const leadDays = Math.max(0, Math.round((+new Date(check_in) - Date.now()) / 86400000));

    const { data: room } = await supabase.from("hotel_rooms").select("*").eq("id", room_id).maybeSingle();
    if (!room) return json({ error: "Room not found" }, 404);

    // Base price per night
    let perNight = Number(room.base_price) || 0;

    // Pricing rules
    const { data: rules } = await supabase
      .from("hotel_pricing_rules")
      .select("*")
      .eq("hotel_id", hotel_id)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    (rules || []).forEach((r: any) => {
      if (r.room_id && r.room_id !== room_id) return;
      let applies = false;
      const c = r.conditions || {};
      switch (r.rule_type) {
        case "day_of_week":
          applies = Array.isArray(c.days) ? c.days.includes(dow) : true;
          break;
        case "lead_time":
          applies = (c.min == null || leadDays >= c.min) && (c.max == null || leadDays <= c.max);
          break;
        case "min_stay":
          applies = nights >= (c.nights || 3);
          break;
        case "date_range":
          applies = (!r.starts_on || check_in >= r.starts_on) && (!r.ends_on || check_out <= r.ends_on);
          break;
        case "occupancy":
          applies = guests >= (c.min_guests || 1);
          break;
      }
      if (!applies) return;
      if (r.adjustment_type === "percent") perNight = perNight * (1 + Number(r.adjustment_value) / 100);
      else perNight = perNight + Number(r.adjustment_value);
    });
    perNight = Math.max(0, Math.round(perNight));
    const roomTotal = perNight * nights;

    // Add-ons
    let addonTotal = 0;
    const addonDetails: any[] = [];
    if (addons.length) {
      const ids = addons.map((a: any) => a.addon_id);
      const { data: addonRows } = await supabase.from("hotel_addons").select("*").in("id", ids);
      for (const sel of addons) {
        const row = (addonRows || []).find((x: any) => x.id === sel.addon_id);
        if (!row) continue;
        const qty = Math.max(0, Number(sel.quantity) || 0);
        const multiplier = row.unit === "per_night" ? nights : row.unit === "per_guest" ? guests : 1;
        const total = Number(row.price) * qty * multiplier;
        addonTotal += total;
        addonDetails.push({ addon_id: row.id, title: row.title, quantity: qty, unit_price: row.price, total_price: total });
      }
    }

    // Promo
    let discount = 0;
    let promo: any = null;
    if (promo_code) {
      const { data: p } = await supabase
        .from("hotel_promo_codes")
        .select("*")
        .eq("hotel_id", hotel_id).eq("code", String(promo_code).toUpperCase())
        .eq("is_active", true).maybeSingle();
      if (p && nights >= (p.min_nights || 1) && (!p.max_uses || p.uses_count < p.max_uses)
        && (!p.valid_from || check_in >= p.valid_from) && (!p.valid_until || check_in <= p.valid_until)) {
        discount = p.discount_type === "percent"
          ? Math.round(roomTotal * Number(p.discount_value) / 100)
          : Number(p.discount_value);
        promo = { code: p.code, discount };
      }
    }

    const total = Math.max(0, roomTotal + addonTotal - discount);

    return json({
      per_night: perNight, nights, room_total: roomTotal,
      addon_total: addonTotal, addons: addonDetails,
      discount, promo, total,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
