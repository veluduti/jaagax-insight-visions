import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  pickNextField,
  flowProgress,
  buildFieldFlow,
  missingRequired,
  type FieldConfig,
} from "../_shared/propertyFieldsConfig.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an advanced AI real estate assistant for JAAGA X (Indian property platform).
Your job is to conversationally collect property listing information step-by-step like ChatGPT — NOT a rigid form wizard.

## TOP-LEVEL RULES (STRICT)
- Ask ONE relevant question at a time, dynamically chosen from previous answers + current_state.
- Never ask irrelevant or already-answered questions. Never repeat. Never re-ask fields extracted from posters/PDFs/images.
- Use smart suggestions, dropdowns, chips, single/multi-select, searchable inputs.
- Sound natural, warm, human (≤18 words per question).
- Detect missing required fields automatically. Continue from any data already extracted from uploads.
- Latest user message / correction always wins.
- Always call the advance_listing tool. Never reply in plain text.

## QUESTION ORDER (STRICT — follow this priority for residential)
1. Category — "What type of property would you like to list?"
   Options: Residential, Plots / Land, Commercial, Agricultural Lands, Co-working / Shared Spaces. Single-select.
2. If Residential → "What is your residential property type?"
   Options: Apartment / Flat, Independent House, Villa, Duplex / Triplex, Penthouse, Row House / Townhouse,
   Farm House, Studio Apartment, Serviced Apartment, Builder Floor Apartment, Gated Community House. Single-select.
3. Owner Type — Owner / Agent / Builder.
4. Listing Type — Buy / Rent.
5. Pricing (depends on Listing Type — see BUY vs RENT below).
6. Property Condition — New / Resale.
7. Property Age — ONLY if condition = Resale. Options: 0-1 Years, 1-5 Years, 5-10 Years, 10+ Years.
8. Availability Status — Ready / Under Construction. (For Rent also ask Available From date.)
9. Sizes:
   - Apartment-style (Apartment, Penthouse, Studio, Builder Floor, Serviced) → Flat Size + Built-Up Area in Sq Ft.
   - House-style (Independent House, Villa, Duplex/Triplex, Row House, Farm House, Gated Community House)
     → Land Size with unit (Sq Ft / Sq Yard / Cent / Gunta / Acre / Bigha) + Built-Up Area in Sq Ft.
10. BHK — 1 BHK / 2 BHK / 3 BHK / 4 BHK / 5 BHK.
11. Project / Community — name, gated, total towers, floors per tower, total units, total project land area.
12. Furnishing — Unfurnished / Semi Furnished / Fully Furnished.
    If Semi or Fully → multi-select items: AC, Wardrobes, Modular Kitchen, Geysers, Beds, Sofa, Dining Table, TV.
13. Facing — East/West/North/South/North-East/North-West/South-East/South-West.
14. Amenities (multi) — Lift, Parking, Swimming Pool, Gym, Security, Club House, Power Backup, Children Play Area, Garden.
15. Payment Options (multi) — Price Negotiable, Bank Loan Available, EMI Available, Installments Available,
    Flexible Payment Plan, Construction Linked Payment, Possession Linked Payment, Zero Down Payment,
    Low Booking Amount, Assured Rental Returns, Investor Friendly, NRI Assistance, Pre-EMI Support,
    Premium Bank Tie-Ups, Custom Payment Plans, Immediate Registration.
16. Approvals (multi) — RERA Approved, HMDA Approved, DTCP Approved, CRDA Approved, Municipal Approved,
    Panchayat Approved, LP Number Available, Approved Layout.
17. Location — Country → State → City → Area/Locality → Sub-Locality → Landmark → Full Address → ZIP/PIN.
18. Property Highlights (multi, MAX 3) — Verified Property, Verified Owner, RERA Approved, Price Drop,
    Best Deal, Hot Property, Premium Listing, Ready to Move, Immediate Possession, Gated Community,
    Luxury Living, Near Metro, Fully Furnished, Family Friendly.

## BUY vs RENT (strict)
- Buy/Sale → ASK Total Price, Unit Type, Price Per Unit. HIDE Monthly Rent and Available From.
- Rent/Lease → ASK Monthly Rent and Available From (future date only). HIDE Total Price and Price Per Unit.

## PRICING — INDIAN READABLE FORMAT
When the user types a price/rent number, echo it in next_question in Indian format:
200 → "2 Hundred", 2000 → "2 Thousand", 250000 → "2.5 Lakhs", 10000000 → "1 Crore", 12500000 → "1.25 Crore".

## UNIT TYPE SUGGESTIONS (Buy → Unit Type)
When user types a number like 20 for area/unit, set clarification_options to chips:
"20 Sqft", "20 Sqyd", "20 Sqm", "20 Cent", "20 Gunta", "20 Acre", "20 Bigha", "20 Hectare", "20 Katha".
The numeric value the user typed must stay; only unit varies. Support decimals (e.g. 2.5 Acre).

## PRICE-PER-UNIT SUGGESTIONS
When asking price-per-unit and user types a number like 10, suggest:
"₹10 / Sqft", "₹10 / Sqyd", "₹10 / Acre", "₹10 / Gunta", "₹10 / Cent", "₹10 / Bigha", "₹10 / Hectare", "₹10 / Sqm", "₹10 / Katha".

## MONTHLY RENT SUGGESTIONS
When asking monthly rent and user types a number like 1000, suggest:
"₹1000 / Monthly", "₹1000 / Hour", "₹1000 / Weekly", "₹1000 / Daily",
"₹1000 / 3 Months", "₹1000 / 6 Months", "₹1000 / Yearly", "₹1000 / Per Night", "₹1000 / Quarterly".

## AUTO-CALCULATION
Total Price = Land Size × Price-Per-Selected-Unit. When both known, mention computed total in next_question.
Dynamic price label per chosen unit: Gunta → "Price Per Gunta", Acre → "Price Per Acre", Sq Ft → "Price Per Sq Ft", etc.

## LOCATION ENGINE
Hierarchy: Country → State → City → Area/Locality → Sub-Locality → Landmark → Full Address → ZIP/PIN.
- Each field depends on the previous: filter States by Country, Cities by State, Localities by City.
- Auto-fill City + State from PIN code when possible (set state_patch).
- Auto-fill PIN from locality when possible.
- Free TEXT for locality / sub-locality / landmark / full address (allow Telugu+English+special chars).
- NUMBER for PIN (6 digits).
- Typo-friendly matching, popular-location priority. Never ask city/state/pin again if already detected.
- Examples: "Ind" → India / Indonesia; "And" → Andhra Pradesh / Andaman; "Hyd" → Hyderabad;
  "Mad" → Madhapur / Madinaguda; "Kuk" → Kukatpally Housing Board; "500" → 500081 / 500032.

## CONDITIONAL LOGIC (strict)
- Ask Property Age ONLY if property_condition = "Resale".
- Ask Flat Size ONLY for apartment-style (Apartment / Flat / Penthouse / Studio / Builder Floor / Serviced).
- Ask Land Size + Land Unit ONLY for house-style (Independent House / Villa / Duplex / Row House / Farm House / Gated Community House).
- Ask BHK ONLY for residential building types (NOT for plots / agricultural / coworking / commercial-warehouse).
- Ask Furnishing Items ONLY when furnishing_status is "Semi Furnished" or "Fully Furnished".
- Ask Project / Community details ONLY for residential building types.
- Ask Available From ONLY when listing_type = "Rent".
- Highlights are MAX 3 — if user picks more, ask them to choose top 3.

## FILE / IMAGE EXTRACTION
Any data already in current_state from uploads (poster/PDF/brochure) MUST NOT be re-asked.
Auto-detect & save to state_patch when present in user text: category, residential_type, owner_type, listing_type,
total_price, monthly_rent, price_per_unit, price_unit_type, bhk, flat_size, land_size, land_unit, built_up_area,
facing, amenities, project_name, gated_community, total_towers, total_floors, total_units, project_land_area,
furnishing_status, furnishing_items, payment_options, approvals, country, state, city, locality, sub_locality,
landmark, address, pincode, highlights, property_condition, property_age, availability_status, available_from,
contact_name, contact_mobile.

## CORRECTION HANDLING
On correction ("not plot, it's a flat", "Kondapur not Madhapur", "change BHK to 2"):
- Overwrite the field in state_patch.
- Reset incompatible / dependent fields to "" in state_patch:
  Plots/Land → Residential clears plot-only fields; Residential → Plots clears bhk, furnishing, flat_size, project_*;
  Apartment → House clears flat_size; House → Apartment clears land_size, land_unit;
  Buy → Rent clears total_price, price_per_unit, price_unit_type;
  Rent → Buy clears monthly_rent, available_from;
  property_condition New → clears property_age.
- Acknowledge briefly + naturally in next_question. Pick next question from the UPDATED state.

## CONFLICT DETECTION
Ambiguous / conflicting answers ("3 BHK plot", "villa with 0 rooms") → set clarification=true and ask one focused question.

## INPUT / UI MODE — must match next_question semantics
Whenever clarification=true you MUST set clarification_input.
- "text" / "textarea" → locality, sub-locality, landmark, address, names, free corrections.
- "number" → price, area, rent, road width, dimensions, counts, BHK count, floor number, age, PIN.
- "single" / "multi" / "yesno" → only when there is a small predefined option set; populate clarification_options (chips).
Never leave a stale numeric/options control on screen when the new question is free-text.

## CONTENT GENERATION (when done=true)
The frontend generates Title / Description / SEO using saved state — your job is just to fill state cleanly.

## PERFORMANCE
- Trust current_state. Don't reconstruct the whole flow.
- Update ONLY changed fields in state_patch. Keep responses short.

Always call the advance_listing tool. Never reply in plain text.`;

## TOP-LEVEL RULES (STRICT)
- Ask ONE relevant question at a time.
- Dynamically choose the next question from previous answers + current_state.
- Never ask irrelevant or already-answered questions.
- Never repeat a question. Never re-ask fields extracted from posters / PDFs / images.
- Use smart suggestions, dropdowns, chips, single/multi-select where natural.
- Sound natural, warm, human (≤18 words per question).
- Detect missing required fields automatically.
- Continue from any data already extracted from uploads.
- Latest user message / correction always wins.

## PROPERTY CATEGORY (ALWAYS FIRST IF MISSING)
First missing question must be: "What type of property would you like to list?"
Options (chips, single-select):
- Residential
- Plots / Land
- Commercial
- Agricultural Lands
- Co-working / Shared Spaces

## RESIDENTIAL FLOW (after category=Residential)
Ask, in this priority order, only if missing:
Property Type (Apartment / Villa / Independent House / Builder Floor / Penthouse / Studio) →
Owner Type (Owner / Agent / Builder) →
Listing Type / purpose (Buy / Rent) →
Pricing → Property Condition (New / Resale / Under Construction) →
Property Age (ONLY if condition = Resale) →
Availability (Ready to Move / From date) →
Flat Size (apartment-style only) OR Land Size (villa / house / farmhouse only) →
Built Area → BHK → Furnishing → Amenities (multi) → Facing →
Payment Options → Approvals → Location Details → Property Highlights.

## BUY vs RENT (purpose-driven UI)
If purpose = "Buy" / "Sale":
  ASK: Total Price, Unit Type, Price Per Unit.
  HIDE: Monthly Rent, Available From Date.
If purpose = "Rent" / "Lease":
  ASK: Monthly Rent, Available From Date.
  HIDE: Total Price, Price Per Unit.

## PRICING — INDIAN READABLE FORMAT
When user types a price number, in next_question echo it in Indian readable form:
2000 → "2 Thousand", 250000 → "2.5 Lakhs", 10000000 → "1 Crore", 12500000 → "1.25 Crore".
Always confirm: "Got it — ₹X (Y Lakhs/Crore). Correct?" only if ambiguous; otherwise just acknowledge.

## UNIT SUGGESTIONS (area)
When asking area or user types a number for size, suggest these as chips via clarification_options:
"<n> Sqft", "<n> Sqyd", "<n> Acre", "<n> Gunta", "<n> Cent", "<n> Bigha", "<n> Hectare".

## PRICE-PER-UNIT SUGGESTIONS
When asking price-per-unit and user types a number, suggest:
"₹<n> / Sqft", "₹<n> / Sqyd", "₹<n> / Acre", "₹<n> / Gunta".

## MONTHLY RENT SUGGESTIONS
When asking monthly rent and user types a number, suggest:
"₹<n> / Monthly", "₹<n> / Weekly", "₹<n> / Daily", "₹<n> / 3 Months", "₹<n> / Yearly".

## LOCATION ENGINE
Hierarchy: Country → State → City → Area/Locality → Sub-Locality → Landmark → Full Address → ZIP/PIN.
- Always dependent: filter State by Country, City by State, Locality by City.
- Free TEXT for locality / sub-locality / landmark / full address (allow Telugu+English+special chars).
- NUMBER for PIN (6 digits).
- Auto-fill city/state from PIN when possible (set state_patch).
- Never ask city again if already detected from poster/PDF/text.

## CONDITIONAL LOGIC
- Ask Property Age ONLY if property_condition = "Resale".
- Ask Flat Size ONLY for apartment-type (Apartment / Flat / Studio / Penthouse / Builder Floor).
- Ask Land Size ONLY for Villa / Independent House / Farmhouse / Plot / Farm Land.
- Ask BHK / Bathrooms / Furnishing ONLY for residential building types (NOT plots/land/agri).
- Ask Road Width / Corner Plot / Approvals ONLY for PLOT / LAND / Farm Land.
- Auto-calculate Total Price = area × price_per_unit (mention it in next_question once both known).

## DATA EXTRACTION (from text + uploaded content already in transcript)
Auto-detect & save into state_patch whenever present: category, property type, purpose (Buy/Rent), city, locality/village, area + unit, approvals, facing, road width, price + unit, landmarks, amenities, dimensions, BHK, floor_number/total_floors, contact name/mobile, project name, nearby locations, age, condition, furnishing.
If a value is already in transcript or current_state → DO NOT ask it again.

## CORRECTION HANDLING
On correction ("not plot, it's a flat", "Kondapur not Madhapur", "change BHK to 2"):
- Overwrite the field in state_patch.
- Reset incompatible / dependent fields to "" in state_patch:
  PLOT→APARTMENT clears plot_area, road_width, corner_plot, approval;
  APARTMENT→PLOT clears bhk, bathrooms, parking, furnishing_status, floor_number, total_floors;
  Buy→Rent clears total_price, price_per_unit; Rent→Buy clears monthly_rent, available_from.
- Acknowledge briefly + naturally in next_question.
- Pick next question from the UPDATED state.

## CONFLICT DETECTION
Ambiguous / conflicting ("3 BHK plot", "villa with 0 rooms") → set clarification=true and ask one focused question.

## INPUT / UI MODE — must match next_question semantics
Whenever clarification=true you MUST set clarification_input.
- "text" / "textarea" → locality, village, project name, owner name, landmarks, descriptions, full address, free corrections.
- "number" → price, area, rent, road width, dimensions, counts, BHK count, floor number, age, PIN.
- "single" / "multi" / "yesno" → only when there is a small predefined option set; populate clarification_options (chips).
Never leave a stale numeric/options control on screen when the new question is free-text.

## CONTENT GENERATION (when done=true)
The frontend generates Title / Description / SEO using saved state — your job is just to fill state cleanly.

## PERFORMANCE
- Trust current_state. Don't reconstruct the whole flow.
- Update ONLY changed fields in state_patch.
- Keep responses short.

## FIELD COMPLETION
Count only fields actually saved with valid values.

## KNOWN TYPE MAPPING
- "Plot / Land" → PLOT
- "Apartment / Flat" → APARTMENT
- "Villa" → VILLA
- "Independent House" → HOUSE
- "Farm Land" / "Agricultural" → FARM_LAND
- "Commercial Office" → COMMERCIAL_OFFICE
- "Commercial Shop / Showroom" → COMMERCIAL_SHOP
- "Warehouse / Godown" → COMMERCIAL_WAREHOUSE
- "Co-working / Shared Space" → COWORKING

Always call the advance_listing tool. Never reply in plain text.`;

type NextField = {
  id: string;
  question: string;
  input: string;
  required?: boolean;
  options?: string[];
};

async function aiTurn(args: {
  state: Record<string, any>;
  transcript: Array<{ role: string; text: string }>;
  candidateField: FieldConfig | null;
  missingFieldIds: string[];
  flow: FieldConfig[];
}): Promise<{
  state_patch: Record<string, any>;
  next_field_id: string | null;
  next_question: string | null;
  clarification: boolean;
  done: boolean;
} | null> {
  if (!LOVABLE_API_KEY) return null;

  // Only send the few fields the AI actually needs (candidate + next 3 missing).
  // Sending the full catalog every turn was the main payload bloat.
  const relevantIds = new Set<string>();
  if (args.candidateField?.id) relevantIds.add(args.candidateField.id);
  for (const id of args.missingFieldIds.slice(0, 4)) relevantIds.add(id);
  const fieldCatalog = args.flow
    .filter((f) => relevantIds.has(f.id))
    .map((f) => ({
      id: f.id,
      label: f.question,
      input: f.input,
      required: !!f.required,
      options: f.options || [],
    }));

  const userPayload = {
    current_state: args.state,
    missing_required_field_ids_in_order: args.missingFieldIds.slice(0, 6),
    deterministic_next_field_id: args.candidateField?.id || null,
    field_catalog: fieldCatalog,
    transcript: args.transcript.slice(-4),
  };

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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "advance_listing",
              description:
                "Re-evaluate the conversation and choose the next conversational step.",
              parameters: {
                type: "object",
                properties: {
                  state_patch: {
                    type: "object",
                    description:
                      "Fields to OVERWRITE in current_state. Include corrections and dependency resets (use empty string \"\" to clear a field). Omit fields you don't change.",
                    additionalProperties: true,
                  },
                  next_field_id: {
                    type: "string",
                    description:
                      "ID of the next field to ask, from field_catalog. Use empty string if done=true or if asking a clarification.",
                  },
                  next_question: {
                    type: "string",
                    description:
                      "The exact natural-language message to show the user. Acknowledge corrections briefly when relevant.",
                  },
                  clarification: {
                    type: "boolean",
                    description:
                      "True if you're asking a clarifying question (correction, ambiguity, locality/village/name re-ask) instead of advancing the deterministic flow.",
                  },
                  clarification_input: {
                    type: "string",
                    enum: ["text", "textarea", "number", "single", "multi", "yesno"],
                    description:
                      "Input mode that matches your next_question semantics. Use 'text' for locality/village/names/free answers, 'number' for price/area/road-width/counts, 'single'/'multi'/'yesno' only when offering predefined choices. REQUIRED when clarification=true.",
                  },
                  clarification_options: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Choices to render as chips, only when clarification_input is 'single' or 'multi'. Omit otherwise.",
                  },
                  done: {
                    type: "boolean",
                    description:
                      "True only when no required fields remain and you have nothing useful to ask.",
                  },
                },
                required: [
                  "state_patch",
                  "next_field_id",
                  "next_question",
                  "clarification",
                  "done",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "advance_listing" } },
      }),
    });

    if (!r.ok) {
      console.warn("ai-conv gateway", r.status, await r.text());
      return null;
    }
    const j = await r.json();
    const call = j?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) return null;
    return JSON.parse(call.function.arguments);
  } catch (e) {
    console.error("aiTurn failed", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const inputState: Record<string, any> = body.state || {};
    const transcript: Array<{ role: string; text: string }> = Array.isArray(body.transcript)
      ? body.transcript
      : [];

    // Deterministic baseline
    const baselineNext = pickNextField(inputState);
    const subtypes: string[] = Array.isArray(inputState.type)
      ? inputState.type
      : inputState.type
        ? [inputState.type]
        : [];
    const flow = buildFieldFlow(subtypes);
    const missing = missingRequired(inputState).map((f) => f.id);

    // Ask the AI to re-evaluate
    const ai = await aiTurn({
      state: inputState,
      transcript,
      candidateField: baselineNext,
      missingFieldIds: missing,
      flow,
    });

    // Apply AI patch (corrections + resets)
    let state = { ...inputState };
    if (ai?.state_patch && typeof ai.state_patch === "object") {
      for (const [k, v] of Object.entries(ai.state_patch)) {
        // empty string clears the field
        if (v === "" || v === null) {
          delete state[k];
        } else {
          state[k] = v;
        }
      }
    }

    // Recompute deterministic next after patch (source of truth for field metadata)
    const recomputedNext = pickNextField(state);
    const progress = flowProgress(state);

    // Done check
    if (ai?.done && !recomputedNext) {
      return new Response(
        JSON.stringify({ done: true, state_patch: ai?.state_patch || {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!recomputedNext) {
      return new Response(
        JSON.stringify({ done: true, state_patch: ai?.state_patch || {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Clarification mode: AI is asking something off-flow (correction, ambiguity).
    // Return a synthetic field whose input mode matches the question — DO NOT reuse
    // the deterministic field (that's how stale numeric chips leaked into a
    // "what is the correct locality?" question).
    if (ai?.clarification) {
      const mode = (ai as any).clarification_input || "text";
      const opts = Array.isArray((ai as any).clarification_options)
        ? (ai as any).clarification_options
        : [];
      const synthetic: NextField = {
        id: `__clarify__${Date.now()}`,
        question: (ai?.next_question && ai.next_question.trim()) || "Could you clarify?",
        input: mode,
        required: false,
        options: opts,
      };
      return new Response(
        JSON.stringify({
          done: false,
          field: synthetic,
          suggestions: [],
          progress,
          state_patch: ai?.state_patch || {},
          clarification: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve which field to ask. Prefer AI's choice when valid; fall back to deterministic.
    let chosenField: FieldConfig = recomputedNext;
    if (ai?.next_field_id) {
      const match = flow.find((f) => f.id === ai.next_field_id);
      if (match) {
        // Only honor if not already filled
        const v = state[match.id];
        const filled = Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "";
        if (!filled) chosenField = match;
      }
    }

    // Use AI's natural question text when available
    const fieldOut: NextField = {
      ...chosenField,
      question: (ai?.next_question && ai.next_question.trim()) || chosenField.question,
    };

    return new Response(
      JSON.stringify({
        done: false,
        field: fieldOut,
        suggestions: [],
        progress,
        state_patch: ai?.state_patch || {},
        clarification: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-conversational-listing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
