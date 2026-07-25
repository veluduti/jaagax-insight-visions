import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ============================================================
   Property Decision Tree
   ============================================================ */
const DECISION_TREE = {
  LAND: ["Plot", "Farm Land", "Agricultural Land", "Industrial Land"],
  RESIDENTIAL: ["Apartment", "Flat", "Villa", "Independent House", "Row House", "Penthouse"],
  COMMERCIAL: ["Shop", "Showroom", "Office Space", "Warehouse", "Godown", "Commercial Land"],
};

/* ============================================================
   Lightweight regex/heuristic fallback extractor
   ============================================================ */
function heuristicExtract(text: string) {
  const t = text.toLowerCase();
  const out: Record<string, any> = {};

  const bhk = t.match(/(\d+)\s*(bhk|bedroom|bed)/);
  if (bhk) out.bhk = Number(bhk[1]);

  const bath = t.match(/(\d+)\s*(bath|bathroom|toilet)/);
  if (bath) out.bathrooms = Number(bath[1]);

  const balc = t.match(/(\d+)\s*balcon(?:y|ies)/);
  if (balc) out.balconies = Number(balc[1]);

  const area = t.match(/(\d{3,6})\s*(sq\s*ft|sqft|sft|square\s*feet)/);
  if (area) {
    out.built_up_area = Number(area[1]);
    out.area_unit = "sq ft";
  } else {
    const sqyd = t.match(/(\d{2,6}(?:,\d{2,3})*(?:\.\d+)?)\s*(sq\s*yd|sqyd|square\s*yard|square\s*yards)/);
    if (sqyd) {
      out.built_up_area = Number(String(sqyd[1]).replace(/,/g, ""));
      out.area_unit = "sq yd";
    }
    const acre = t.match(/(\d+(?:\.\d+)?)\s*(acre|acres)/);
    if (acre) { out.built_up_area = Number(acre[1]); out.area_unit = "acre"; }
    const gunta = t.match(/(\d+(?:\.\d+)?)\s*(gunta|guntas)/);
    if (gunta) { out.built_up_area = Number(gunta[1]); out.area_unit = "gunta"; }
    const cent = t.match(/(\d+(?:\.\d+)?)\s*(cent|cents)/);
    if (cent) { out.built_up_area = Number(cent[1]); out.area_unit = "cent"; }
  }

  const carpet = t.match(/carpet\s*(?:area)?\s*[:\-]?\s*(\d{3,6})\s*(?:sq\s*ft|sqft|sft)?/);
  if (carpet) out.carpet_area = Number(carpet[1]);
  const superba = t.match(/super\s*built[\s-]*up\s*(?:area)?\s*[:\-]?\s*(\d{3,6})\s*(?:sq\s*ft|sqft|sft)?/);
  if (superba) out.super_builtup_area = Number(superba[1]);

  const pricePerUnit = t.match(/(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(?:\/|per)\s*(sq\s*yd|sq\s*ft|sqft|sft|square\s*yard|square\s*feet)/);
  if (pricePerUnit) out.price_per_unit = Number(String(pricePerUnit[1]).replace(/,/g, ""));

  const totalPrice = t.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(cr|crore|crores|lakh|lakhs)/);
  if (totalPrice) {
    const value = Number(totalPrice[1]);
    const unit = totalPrice[2];
    if (unit.startsWith("cr")) out.price = Math.round(value * 10000000);
    else out.price = Math.round(value * 100000);
  }

  const rera = text.match(/\b(?:RERA(?:\s*(?:No|Number|ID|Reg))?\.?\s*[:\-]?\s*)([A-Z0-9\/\-]{8,})/i);
  if (rera) out.rera_number = rera[1].trim();

  const pincode = text.match(/\b(\d{6})\b/);
  if (pincode) out.pincode = pincode[1];

  const subtypeMap: Array<[RegExp, string, string]> = [
    [/\b(flat|apartment)\b/, "RESIDENTIAL", "Flat"],
    [/\bvilla\b/, "RESIDENTIAL", "Villa"],
    [/\bpenthouse\b/, "RESIDENTIAL", "Penthouse"],
    [/\brow\s*house\b/, "RESIDENTIAL", "Row House"],
    [/\b(independent|individual)\s*house\b/, "RESIDENTIAL", "Independent House"],
    [/\bplot\b/, "LAND", "Plot"],
    [/\bfarm\s*land\b/, "LAND", "Farm Land"],
    [/\bagricultural\b/, "LAND", "Agricultural Land"],
    [/\bindustrial\b/, "LAND", "Industrial Land"],
    [/\b(shop|showroom)\b/, "COMMERCIAL", "Shop"],
    [/\boffice\b/, "COMMERCIAL", "Office Space"],
    [/\b(warehouse|godown)\b/, "COMMERCIAL", "Warehouse"],
    [/\bcommercial\s*land\b/, "COMMERCIAL", "Commercial Land"],
  ];
  for (const [re, type, sub] of subtypeMap) {
    if (re.test(t)) { out.type = type; out.sub_type = sub; break; }
  }

  if (/\bfor\s*rent\b|\brental\b/.test(t)) out.purpose = "Rent";
  else if (/\bfor\s*lease\b|\blease\b/.test(t)) out.purpose = "Lease";
  else if (/\bfor\s*sale\b|\bsell\b|\bselling\b/.test(t)) out.purpose = "Sale";

  if (/\bfully\s*furnished\b/.test(t)) out.furnishing = "Fully Furnished";
  else if (/\bsemi[\s-]*furnished\b/.test(t)) out.furnishing = "Semi-Furnished";
  else if (/\bunfurnished\b/.test(t)) out.furnishing = "Unfurnished";

  if (/\bready\s*to\s*move\b|\bready\s*for\s*possession\b/.test(t)) out.possession_status = "Ready to Move";
  else if (/\bunder\s*construction\b/.test(t)) out.possession_status = "Under Construction";

  const loc = text.match(/\bin\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
  if (loc) out.location = loc[1].trim();

  const approval = text.match(/\b(DTCP|HMDA|RERA|TS\s*RERA)\b/i);
  if (approval) out.approval = approval[1].toUpperCase().replace(/\s+/g, " ");

  return out;
}

/* ============================================================
   AI extraction via tool calling
   ============================================================ */
async function aiExtract(text: string, imageUrl?: string) {
  if (!LOVABLE_API_KEY) return null;

  const systemPrompt = `You are an expert AI Property Document Analyst for Indian real-estate. You receive property brochures, floor plans, marketing flyers, sale deeds, mobile screenshots, scanned documents, or free-form text. Your job: extract MAXIMUM structured property data with a confidence score for each field.

Sources you understand: builder brochures, floor plans (count bedrooms/bathrooms/balconies from labelled rooms), sale deed extracts, RERA registration certificates, MLS-style listings, WhatsApp shared posters, mobile screenshots.

PROPERTY DECISION TREE:
- LAND: Plot, Farm Land, Agricultural Land, Industrial Land
- RESIDENTIAL: Apartment, Flat, Villa, Independent House, Row House, Penthouse
- COMMERCIAL: Shop, Showroom, Office Space, Warehouse, Godown, Commercial Land

Extraction rules:
- Read EVERY visible piece of text carefully. Prefer exact numbers/words from the source.
- Never guess. If a field is not visibly present, OMIT it (do not include with low confidence — omit).
- For every included field, add a matching numeric confidence in "confidences" (0.0-1.0). 0.95+ = printed clearly; 0.75-0.94 = inferred from context; 0.50-0.74 = uncertain / partial. Never include a field below 0.50.
- FLOOR PLANS: count rooms visually. "Master Bedroom + 2 Bedroom" = 3 BHK, bedrooms=3. Count toilets/bathrooms/balconies. Sum room dimensions to estimate carpet area if a total isn't printed.
- "type" ∈ LAND | RESIDENTIAL | COMMERCIAL. "sub_type" must match its branch.
- Location: "location"/"locality" = area as written, "landmark" = notable nearby marker, "city", "district", "state", "country", "pincode" (6-digit), "address" = full address if present.
- "bhk", "bedrooms", "bathrooms", "balconies" = integers.
- "property_age" = "New" | "0-1 years" | "1-5 years" | "5-10 years" | "10+ years" | "Under Construction".
- "possession_status" ∈ Ready to Move | Under Construction | New Launch.
- "ownership" ∈ Freehold | Leasehold | Co-operative Society | Power of Attorney.
- Areas in numbers: "built_up_area", "carpet_area", "super_builtup_area" with "area_unit" (sq ft | sq yd | sq m | acre | gunta | cent).
- "price" in INR ("85 lakhs"→8500000, "1.2 cr"→12000000). "price_per_unit" if shown.
- "rera_number" exact string as printed (with slashes/hyphens).
- "approval" = array of DTCP, HMDA, RERA, TS RERA, CRDA, Municipal, Panchayat.
- "facing" = array of East/West/North/South/North-East/North-West/South-East/South-West.
- "amenities" = array (Clubhouse, Swimming Pool, Park, Gym, Security, Power Backup, Kids Play Area, Lift, etc.)
- "contact_name" / "contact_phone" if visible.
- "project_name" = project/layout/community name. "builder_name" = developer/builder. "title" = concise headline.
- "description" = 1-3 sentence summary of the property in your own words based on what you saw.

Return the tool call. Do not answer in prose.`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: imageUrl
              ? [
                  { type: "text", text: text || "Extract every property detail visible in this document, brochure, floor plan or image." },
                  { type: "image_url", image_url: { url: imageUrl } },
                ]
              : text,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_property",
              description: "Return structured property fields with per-field confidence from text, brochure, floor plan or poster image.",
              parameters: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["LAND", "RESIDENTIAL", "COMMERCIAL"] },
                  sub_type: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  builder_name: { type: "string" },
                  project_name: { type: "string" },
                  location: { type: "string" },
                  locality: { type: "string" },
                  landmark: { type: "string" },
                  address: { type: "string" },
                  city: { type: "string" },
                  district: { type: "string" },
                  state: { type: "string" },
                  country: { type: "string" },
                  pincode: { type: "string" },
                  latitude: { type: "number" },
                  longitude: { type: "number" },
                  bhk: { type: "number" },
                  bedrooms: { type: "number" },
                  bathrooms: { type: "number" },
                  balconies: { type: "number" },
                  property_age: { type: "string" },
                  possession_status: { type: "string", enum: ["Ready to Move", "Under Construction", "New Launch"] },
                  possession_date: { type: "string" },
                  ownership: { type: "string", enum: ["Freehold", "Leasehold", "Co-operative Society", "Power of Attorney"] },
                  built_up_area: { type: "number" },
                  carpet_area: { type: "number" },
                  super_builtup_area: { type: "number" },
                  area_unit: { type: "string", enum: ["sq ft", "sq yd", "sq m", "acre", "gunta", "cent"] },
                  purpose: { type: "string", enum: ["Sale", "Rent", "Lease"] },
                  furnishing: { type: "string", enum: ["Unfurnished", "Semi-Furnished", "Fully Furnished"] },
                  price: { type: "number" },
                  price_per_unit: { type: "number" },
                  rera_number: { type: "string" },
                  approval: { type: "array", items: { type: "string" } },
                  facing: { type: "array", items: { type: "string", enum: ["East","West","North","South","North-East","North-West","South-East","South-West"] } },
                  road_width: { type: "number" },
                  corner_plot: { type: "boolean" },
                  water_connection: { type: "boolean" },
                  electricity: { type: "boolean" },
                  amenities: { type: "array", items: { type: "string" } },
                  car_parking: { type: "number" },
                  contact_name: { type: "string" },
                  contact_phone: { type: "string" },
                  confidences: {
                    type: "object",
                    description: "Per-field confidence 0.0-1.0. Keys must match field names above. Never include a field here that isn't extracted.",
                    additionalProperties: { type: "number" },
                  },
                },
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_property" } },
      }),
    });

    if (!r.ok) {
      console.error("AI extract gateway error", r.status, await r.text());
      return null;
    }
    const j = await r.json();
    const call = j?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) return null;
    return JSON.parse(call.function.arguments);
  } catch (e) {
    console.error("AI extract failed", e);
    return null;
  }
}

/* ============================================================
   Merge AI + heuristic; AI wins when present
   ============================================================ */
function merge(base: Record<string, any>, ai: Record<string, any> | null) {
  if (!ai) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(ai)) {
    if (k === "confidences") continue;
    if (v !== null && v !== undefined && v !== "") out[k] = v;
  }
  return out;
}

/* ============================================================
   Map extraction → SellProperty chat state shape
   ============================================================ */
function toListingState(ext: Record<string, any>) {
  const s: Record<string, any> = {};

  const subToOption: Record<string, string> = {
    "Flat": "Apartment / Flat",
    "Apartment": "Apartment / Flat",
    "Villa": "Villa",
    "Independent House": "Villa",
    "Row House": "Villa",
    "Penthouse": "Apartment / Flat",
    "Plot": "Plot / Land",
    "Farm Land": "Farm Land",
    "Agricultural Land": "Farm Land",
    "Industrial Land": "Plot / Land",
    "Office Space": "Commercial Office",
    "Shop": "Commercial Shop / Showroom",
    "Showroom": "Commercial Shop / Showroom",
    "Warehouse": "Warehouse / Godown",
    "Godown": "Warehouse / Godown",
    "Commercial Land": "Plot / Land",
  };
  if (ext.sub_type && subToOption[ext.sub_type]) {
    s.type = [subToOption[ext.sub_type]];
  } else if (ext.type === "LAND") {
    s.type = ["Plot / Land"];
  } else if (ext.type === "RESIDENTIAL") {
    s.type = ["Apartment / Flat"];
  } else if (ext.type === "COMMERCIAL") {
    s.type = ["Commercial Shop / Showroom"];
  }

  if (ext.purpose) s.purpose = ext.purpose;
  if (ext.city) s.city = ext.city;
  if (ext.location || ext.locality) s.locality = ext.locality || ext.location;
  if (ext.bhk) s.bhk = `${ext.bhk} BHK`;

  const approvalArr: string[] = Array.isArray(ext.approval) ? ext.approval : (ext.approval ? [ext.approval] : []);
  if (approvalArr.length) s.approval = approvalArr;

  const facingArr: string[] = Array.isArray(ext.facing) ? ext.facing : (ext.facing ? [ext.facing] : []);
  if (facingArr.length) s.facing = facingArr;

  if (typeof ext.road_width === "number") s.road_width = ext.road_width;
  if (typeof ext.corner_plot === "boolean") s.corner_plot = ext.corner_plot ? "Yes" : "No";
  if (typeof ext.water_connection === "boolean") s.water_connection = ext.water_connection ? "Yes" : "No";
  if (typeof ext.electricity === "boolean") s.electricity = ext.electricity ? "Yes" : "No";

  if (Array.isArray(ext.amenities) && ext.amenities.length) s.amenities = ext.amenities;

  if (ext.contact_name) s.contact_name = ext.contact_name;
  if (ext.contact_phone) s.contact_mobile = String(ext.contact_phone).replace(/\D/g, "").slice(-10);

  if (ext.furnishing) {
    s.furnishing_status = ext.furnishing;
    s.furnishing = ext.furnishing;
  }
  if (ext.car_parking) s.parking = ext.car_parking;
  if (ext.title || ext.project_name) s.title = ext.title || ext.project_name;
  if (ext.description) s.description = ext.description;
  if (ext.builder_name) s.builder_name = ext.builder_name;
  if (ext.rera_number) s.rera_number = ext.rera_number;
  if (ext.possession_status) s.possession_status = ext.possession_status;
  if (ext.possession_date) s.possession_date = ext.possession_date;
  if (ext.ownership) s.ownership = ext.ownership;
  if (ext.pincode) s.pincode = ext.pincode;
  if (ext.landmark) s.landmark = ext.landmark;
  if (ext.address) s.address = ext.address;
  if (ext.state) s.state_name = ext.state;
  if (ext.district) s.district = ext.district;
  if (ext.bathrooms) s.bathrooms = ext.bathrooms;
  if (ext.balconies) s.balconies = ext.balconies;
  if (ext.property_age) s.property_age = ext.property_age;
  if (ext.carpet_area) s.carpet_area = ext.carpet_area;
  if (ext.super_builtup_area) s.super_builtup_area = ext.super_builtup_area;

  if (ext.built_up_area) {
    const subLabel = s.type?.[0];
    const unit = ext.area_unit || "sq ft";
    if (subLabel === "Plot / Land") {
      s.plot_area = ext.built_up_area;
      s.unit = unit === "sq yd" ? "sq yd" : "sq ft";
    } else if (subLabel === "Farm Land") {
      s.total_acres = unit === "acre" ? ext.built_up_area : undefined;
    } else if (subLabel === "Villa") {
      s.built_up_area = ext.built_up_area;
    } else if (subLabel === "Commercial Shop / Showroom") {
      s.shop_area = ext.built_up_area;
    } else if (subLabel === "Commercial Office" || subLabel === "Warehouse / Godown") {
      s.total_area = ext.built_up_area;
    } else {
      s.built_up_area = ext.built_up_area;
    }

    s.price_unit = {
      unit,
      area: String(ext.built_up_area),
      pricePerUnit: ext.price_per_unit
        ? String(ext.price_per_unit)
        : ext.price && ext.built_up_area
          ? String(Math.round(Number(ext.price) / Number(ext.built_up_area)))
          : "",
    };
  }
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body?.text || "").trim();
    const imageUrl = typeof body?.image_url === "string" ? body.image_url : undefined;

    if (!text && !imageUrl) {
      return new Response(JSON.stringify({ error: "text or image_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const heuristic = heuristicExtract(text);
    const ai = await aiExtract(text, imageUrl);
    const extracted = merge(heuristic, ai);
    const confidences: Record<string, number> =
      (ai && typeof ai.confidences === "object" && ai.confidences) ? ai.confidences : {};
    // Give heuristic-only fields a safe default confidence so they auto-fill.
    for (const k of Object.keys(extracted)) {
      if (confidences[k] == null) confidences[k] = 0.85;
    }

    return new Response(
      JSON.stringify({
        extracted,
        confidences,
        listing_state: toListingState(extracted),
        decision_tree: DECISION_TREE,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("ai-extract-property error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
