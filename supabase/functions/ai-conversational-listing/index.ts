import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ============================================================
   FIELD CATALOG — what we ultimately need to collect.
   The AI orchestrator picks WHICH field to ask next based on
   what is already filled and the property type.
   ============================================================ */

type FieldDef = {
  id: string;              // unique key in collected state
  section: string;         // human label
  question: string;        // default question text
  input:
    | "text" | "textarea" | "number" | "phone" | "email"
    | "single" | "multi" | "yesno" | "media";
  options?: string[];      // for single/multi
  optional?: boolean;
  // gating: only ask when these conditions on collected state pass
  when?: (s: Record<string, any>) => boolean;
};

const ALL_PROPERTY_TYPES = [
  "Apartment / Flat", "Independent House", "Villa", "Plot / Land",
  "Agricultural Land", "Penthouse", "Duplex / Triplex", "Row House / Townhouse",
];

const isLand = (t: string) =>
  t === "Plot / Land" || t === "Agricultural Land";
const isApartmentLike = (t: string) =>
  ["Apartment / Flat", "Penthouse"].includes(t);
const isHouseLike = (t: string) =>
  ["Independent House", "Villa", "Duplex / Triplex", "Row House / Townhouse", "Penthouse"].includes(t);

const FIELDS: FieldDef[] = [
  // 1. Basic Info
  { id: "type", section: "Basic Info", question: "What kind of property are you listing?", input: "single", options: ALL_PROPERTY_TYPES },
  { id: "purpose", section: "Basic Info", question: "Are you listing it for…", input: "single", options: ["Sale", "Rent", "Lease"] },
  { id: "listed_by", section: "Basic Info", question: "Who is listing this property?", input: "single", options: ["Owner", "Agent", "Builder"] },
  { id: "rera_number", section: "Basic Info", question: "RERA number (if applicable)", input: "text", optional: true,
    when: (s) => isApartmentLike(s.type) || isHouseLike(s.type) },

  // 2. Location
  { id: "country", section: "Location", question: "Country?", input: "single", options: ["India"] },
  { id: "state", section: "Location", question: "Which state?", input: "text" },
  { id: "city", section: "Location", question: "Which city?", input: "text" },
  { id: "locality", section: "Location", question: "Area / Locality?", input: "text" },
  { id: "landmark", section: "Location", question: "Nearest landmark?", input: "text", optional: true },
  { id: "address", section: "Location", question: "Full address", input: "textarea" },
  { id: "pincode", section: "Location", question: "PIN code?", input: "text" },
  { id: "gated_community", section: "Location", question: "Gated community name (optional)", input: "text", optional: true,
    when: (s) => ["Villa", "Apartment / Flat", "Row House / Townhouse"].includes(s.type) },

  // 3. Price
  { id: "expected_price", section: "Price", question: "Expected total price (₹)?", input: "number" },
  { id: "negotiable", section: "Price", question: "Is the price negotiable?", input: "yesno" },
  { id: "price_per_sqft", section: "Price", question: "Price per Sq Ft (₹)?", input: "number", optional: true,
    when: (s) => !isLand(s.type) },
  { id: "booking_amount", section: "Price", question: "Booking amount (₹)?", input: "number", optional: true },
  { id: "maintenance_monthly", section: "Price", question: "Monthly maintenance charges (₹)?", input: "number", optional: true,
    when: (s) => isApartmentLike(s.type) || s.type === "Villa" || s.type === "Row House / Townhouse" },
  { id: "property_tax_yearly", section: "Price", question: "Annual property tax (₹)?", input: "number", optional: true },
  { id: "brokerage_applicable", section: "Price", question: "Is brokerage applicable?", input: "yesno", optional: true },

  // 4. Size
  { id: "super_built_up", section: "Size", question: "Super built-up area (sq ft)?", input: "number", optional: true,
    when: (s) => isApartmentLike(s.type) },
  { id: "built_up", section: "Size", question: "Built-up area (sq ft)?", input: "number", optional: true,
    when: (s) => !isLand(s.type) },
  { id: "carpet_area", section: "Size", question: "Carpet area (sq ft)?", input: "number", optional: true,
    when: (s) => !isLand(s.type) },
  { id: "plot_area", section: "Size", question: "Plot area (sq ft)?", input: "number",
    when: (s) => isLand(s.type) || ["Independent House", "Villa", "Row House / Townhouse"].includes(s.type) },
  { id: "terrace_area", section: "Size", question: "Terrace area (sq ft)?", input: "number", optional: true,
    when: (s) => isHouseLike(s.type) },

  // 5. Configuration  (skip for land)
  { id: "bhk", section: "Configuration", question: "How many BHK?", input: "single", options: ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK"],
    when: (s) => !isLand(s.type) },
  { id: "bathrooms", section: "Configuration", question: "Number of bathrooms?", input: "number", when: (s) => !isLand(s.type) },
  { id: "balconies", section: "Configuration", question: "Number of balconies?", input: "number", optional: true, when: (s) => !isLand(s.type) },
  { id: "total_floors", section: "Configuration", question: "Total floors in building?", input: "number", optional: true, when: (s) => !isLand(s.type) },
  { id: "floor_number", section: "Configuration", question: "Property floor number?", input: "number", optional: true, when: (s) => isApartmentLike(s.type) },
  { id: "servant_room", section: "Configuration", question: "Servant room?", input: "yesno", optional: true, when: (s) => !isLand(s.type) },
  { id: "study_room", section: "Configuration", question: "Study room?", input: "yesno", optional: true, when: (s) => !isLand(s.type) },
  { id: "pooja_room", section: "Configuration", question: "Pooja room?", input: "yesno", optional: true, when: (s) => !isLand(s.type) },

  // 6. Furnishing
  { id: "furnishing", section: "Furnishing", question: "Furnishing status?", input: "single",
    options: ["Unfurnished", "Semi-Furnished", "Fully Furnished"], when: (s) => !isLand(s.type) },
  { id: "furnishing_items", section: "Furnishing", question: "What's included?", input: "multi",
    options: ["Wardrobes", "AC Units", "Beds", "Sofa", "Dining Table", "Modular Kitchen", "Geysers"],
    when: (s) => s.furnishing && s.furnishing !== "Unfurnished" },

  // 7. Status
  { id: "property_status", section: "Status", question: "What's the property status?", input: "single",
    options: ["Ready to Move", "Under Construction", "New Launch", "Resale"], when: (s) => !isLand(s.type) },
  { id: "possession_date", section: "Status", question: "Expected possession date?", input: "text",
    when: (s) => s.property_status === "Under Construction" || s.property_status === "New Launch" },

  // 8. Amenities
  { id: "amenities", section: "Amenities", question: "Pick all amenities available", input: "multi",
    options: [
      "Lift", "Parking", "Power Backup", "Security", "CCTV", "Swimming Pool",
      "Gym", "Club House", "Park", "Children Play Area", "Water Supply", "Rainwater Harvesting",
    ], optional: true, when: (s) => !isLand(s.type) },

  // 9. Parking
  { id: "car_parking", section: "Parking", question: "How many car parking slots?", input: "number", optional: true, when: (s) => !isLand(s.type) },
  { id: "parking_type", section: "Parking", question: "Parking type?", input: "single", options: ["Covered", "Open", "Both"], optional: true, when: (s) => !isLand(s.type) },
  { id: "bike_parking", section: "Parking", question: "Bike parking available?", input: "yesno", optional: true, when: (s) => !isLand(s.type) },

  // 10. Legal / Approval
  { id: "ownership_type", section: "Legal", question: "Ownership type?", input: "single", options: ["Freehold", "Leasehold", "Co-operative Society", "Power of Attorney"] },
  { id: "title_clear", section: "Legal", question: "Is the title clear?", input: "yesno" },
  { id: "loan_available", section: "Legal", question: "Bank loan pre-approved?", input: "yesno", optional: true },
  { id: "approval_type", section: "Legal", question: "Approval type?", input: "single", options: ["HMDA", "DTCP", "CRDA", "Municipal", "Panchayat", "RERA Approved", "Other"] },
  { id: "encumbrance_clear", section: "Legal", question: "Encumbrance clear?", input: "yesno", optional: true },

  // 11. Facing
  { id: "facing", section: "Facing", question: "Which direction is the property facing?", input: "single",
    options: ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"] },

  // 12. Media (optional skip-able)
  { id: "media", section: "Media", question: "Upload photos / floor plan / video (optional)", input: "media", optional: true },

  // 13. Contact
  { id: "contact_name", section: "Contact", question: "Your full name?", input: "text" },
  { id: "contact_mobile", section: "Contact", question: "Mobile number?", input: "phone" },
  { id: "contact_whatsapp", section: "Contact", question: "WhatsApp number?", input: "phone", optional: true },
  { id: "contact_email", section: "Contact", question: "Email address?", input: "email", optional: true },
  { id: "contact_time", section: "Contact", question: "Best time to contact?", input: "single",
    options: ["Anytime", "Morning (9–12)", "Afternoon (12–4)", "Evening (4–8)", "Late evening"] },

  // 14. Visit Options (Jaagax)
  { id: "visit_self", section: "Visit Options", question: "Self visit available?", input: "yesno", optional: true },
  { id: "visit_guided", section: "Visit Options", question: "Guided visit available?", input: "yesno", optional: true },
  { id: "visit_weekend", section: "Visit Options", question: "Weekend visit available?", input: "yesno", optional: true },
  { id: "visit_stay", section: "Visit Options", question: "Visit + Stay package available?", input: "yesno", optional: true },

  // ===== Type-specific extras =====
  // Apartment
  { id: "tower_block", section: "Apartment Details", question: "Tower / Block name?", input: "text", optional: true,
    when: (s) => s.type === "Apartment / Flat" },
  { id: "society_name", section: "Apartment Details", question: "Society name?", input: "text", optional: true,
    when: (s) => s.type === "Apartment / Flat" },
  { id: "uds_share", section: "Apartment Details", question: "UDS share (sq ft)?", input: "number", optional: true,
    when: (s) => s.type === "Apartment / Flat" },
  { id: "number_of_lifts", section: "Apartment Details", question: "Number of lifts?", input: "number", optional: true,
    when: (s) => s.type === "Apartment / Flat" || s.type === "Penthouse" },

  // Independent House
  { id: "plot_dimensions", section: "House Details", question: "Plot dimensions (e.g. 30x40)?", input: "text", optional: true,
    when: (s) => s.type === "Independent House" },
  { id: "number_of_floors", section: "House Details", question: "Number of floors?", input: "number", optional: true,
    when: (s) => s.type === "Independent House" || s.type === "Duplex / Triplex" || s.type === "Row House / Townhouse" },
  { id: "open_terrace", section: "House Details", question: "Open terrace available?", input: "yesno", optional: true,
    when: (s) => s.type === "Independent House" || s.type === "Villa" },
  { id: "water_source", section: "House Details", question: "Water source?", input: "single", options: ["Borewell", "Municipal", "Both"], optional: true,
    when: (s) => s.type === "Independent House" || s.type === "Villa" || isLand(s.type) },

  // Villa
  { id: "clubhouse_access", section: "Villa Details", question: "Clubhouse access?", input: "yesno", optional: true,
    when: (s) => s.type === "Villa" },
  { id: "private_garden", section: "Villa Details", question: "Private garden?", input: "yesno", optional: true,
    when: (s) => s.type === "Villa" || s.type === "Independent House" },
  { id: "private_pool", section: "Villa Details", question: "Private pool?", input: "yesno", optional: true,
    when: (s) => s.type === "Villa" || s.type === "Penthouse" },

  // Duplex / Triplex
  { id: "internal_staircase", section: "Duplex Details", question: "Internal staircase?", input: "yesno", optional: true,
    when: (s) => s.type === "Duplex / Triplex" },
  { id: "levels_count", section: "Duplex Details", question: "Number of levels?", input: "single", options: ["2", "3"], optional: true,
    when: (s) => s.type === "Duplex / Triplex" },
  { id: "double_height_living", section: "Duplex Details", question: "Double-height living room?", input: "yesno", optional: true,
    when: (s) => s.type === "Duplex / Triplex" || s.type === "Penthouse" },

  // Penthouse
  { id: "private_terrace_size", section: "Penthouse Details", question: "Private terrace size (sq ft)?", input: "number", optional: true,
    when: (s) => s.type === "Penthouse" },
  { id: "top_floor_number", section: "Penthouse Details", question: "Top floor number?", input: "number", optional: true,
    when: (s) => s.type === "Penthouse" },
  { id: "private_lift", section: "Penthouse Details", question: "Private lift access?", input: "yesno", optional: true,
    when: (s) => s.type === "Penthouse" },

  // Row House / Townhouse
  { id: "common_wall_count", section: "Townhouse Details", question: "Common wall count?", input: "single", options: ["0", "1", "2"], optional: true,
    when: (s) => s.type === "Row House / Townhouse" },
  { id: "front_back_yard", section: "Townhouse Details", question: "Front / back yard?", input: "single", options: ["Front only", "Back only", "Both", "Neither"], optional: true,
    when: (s) => s.type === "Row House / Townhouse" },

  // Final: title + description (AI assists)
  { id: "title", section: "Listing", question: "Give your listing a catchy title (AI can suggest)", input: "text" },
  { id: "description", section: "Listing", question: "Short description (AI can suggest)", input: "textarea" },
];

/* ============================================================
   Helper: pick the next field that is missing & gated correctly
   ============================================================ */
function pickNextField(state: Record<string, any>): FieldDef | null {
  for (const f of FIELDS) {
    const present = state[f.id];
    // A field is considered handled if it has any value OR was explicitly skipped (null marker)
    const wasSkipped = present === null;
    const isFilled = Array.isArray(present)
      ? present.length > 0
      : present !== undefined && present !== "";
    if (isFilled || wasSkipped) continue;
    if (f.when && !f.when(state)) continue;
    return f;
  }
  return null;
}

/* ============================================================
   Try AI to enrich the next question (smarter wording, suggest title/desc)
   Falls back gracefully if AI gateway fails (e.g. 402 credits).
   ============================================================ */
async function aiEnrich(field: FieldDef, state: Record<string, any>) {
  if (!LOVABLE_API_KEY) return null;
  // Only enrich for free-text creative fields
  if (!["title", "description"].includes(field.id)) return null;

  const userPrompt = `You are helping list a property in India.
Collected facts:
${JSON.stringify(state, null, 2)}

Task: Suggest 4 short ${field.id === "title" ? "catchy titles (max 70 chars)" : "2-3 sentence descriptions"} that fit the property. Return JSON: { suggestions: string[] }`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Return only the requested tool call." },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest",
            description: "Return suggestions",
            parameters: {
              type: "object",
              properties: {
                suggestions: { type: "array", items: { type: "string" } },
              },
              required: ["suggestions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest" } },
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) return null;
    const parsed = JSON.parse(tc.function.arguments);
    return parsed.suggestions as string[];
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const state = body.state || {};

    const next = pickNextField(state);

    if (!next) {
      return new Response(
        JSON.stringify({ done: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const suggestions = await aiEnrich(next, state);

    // progress: how many of currently-applicable fields are filled
    const applicable = FIELDS.filter((f) => !f.when || f.when(state));
    const filled = applicable.filter((f) => {
      const v = state[f.id];
      return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "";
    }).length;

    return new Response(
      JSON.stringify({
        done: false,
        field: next,
        suggestions: suggestions || [],
        progress: { filled, total: applicable.length },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-conversational-listing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
