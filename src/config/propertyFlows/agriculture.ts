// ============================================================
// Agriculture Land conversational flow config
// FULL CLIENT EXCEL ALIGNED VERSION
// UPDATED + VERIFIED
// ============================================================

import type { PropertyFlowConfig } from "@/engines/types";

export const agricultureLandFlow: PropertyFlowConfig = {
  category: "agriculture",

  label: "Agriculture Land",

  ai: {
    conversational: true,
    dynamicQuestioning: true,
    askOneQuestionAtATime: true,
    askOnlyMissingFields: true,
    allowNaturalConversation: true,
    supportGreetings: true,
    supportCorrections: true,
    supportTypos: true,
    supportIntentDetection: true,
    supportExtractionFromUploads: true,
    supportAutoFill: true,
    supportSmartSuggestions: true,
    supportHumanLikeReplies: true,
    supportContextAwareness: true,
    supportDynamicFollowups: true,
    persistSkippedFields: true,
    preventDuplicateQuestions: true,
    maintainConversationState: true,
    realtimeSuggestions: true,
    autoNormalizePricingUnits: true,
    supportQuickReplyChips: true,
    supportSearchableDropdowns: true,
    supportContextualQuestions: true,
    supportSectionSkipping: true,
    supportConditionalFollowups: true,
    supportAiGeneratedDescriptions: true,
  },

  order: [
    "land_type",
    "listed_by",
    "listing_type",

    "total_price",
    "unit_type",
    "price_per_unit",

    "rent_amount",
    "rent_frequency",
    "security_deposit",

    "lease_price",
    "lease_duration",
    "available_from",

    "partnership_type",
    "investment_expected",
    "revenue_sharing",

    "land_size",

    "soil_type",
    "crops_grown",
    "current_usage",

    "water_source",
    "irrigation_type",

    "road_access",
    "road_width",
    "truck_access",

    "additional_features",

    "electricity_connection",

    "farm_infrastructure",

    "borewell_count",
    "borewell_depth",
    "motor_hp",

    "organic_certification",

    "connectivity",

    "approvals",
    "ownership_type",
    "encumbrance_status",
    "survey_verified",

    "payment_options",

    "location",

    "map_location",
    "latitude",
    "longitude",

    "nearby_landmarks",

    "property_highlights",

    "property_description",

    "multiple_land_variations",

    "assign_nearest_agent",

    "media_uploads",

    "contact_name",
    "mobile_number",
  ],

  fields: {
    // =========================================================
    // LAND TYPE
    // =========================================================

    land_type: {
      type: "multi_select",

      required: true,

      question: "What type of agricultural land are you listing?",

      options: [
        "Farm Land",
        "Agricultural Land",
        "Organic Farm",
        "Orchard",
        "Plantation",
        "Dairy Farm",
        "Poultry Farm",
        "Fish Farm",
        "Coconut Farm",
        "Mango Farm",
        "Tea Estate",
        "Coffee Estate",
        "Palm Oil Farm",
        "Greenhouse Farm",
        "Polyhouse Farm",
        "Horticulture Land",
        "Mixed Crop Farm",
        "Open Farm Land",
      ],

      smartSuggestions: {
        enabled: true,
        searchable: true,
        chips: true,
      },
    },

    // =========================================================
    // LISTED BY
    // =========================================================

    listed_by: {
      type: "single_select",

      required: true,

      question: "Who are you listing this property as?",

      options: ["Owner", "Agent", "Developer"],
    },

    // =========================================================
    // LISTING TYPE
    // =========================================================

    listing_type: {
      type: "single_select",

      required: true,

      question: "What type of listing is this?",

      options: ["Buy", "Lease", "Rent", "Partnership"],
    },

    // =========================================================
    // BUY PRICE
    // =========================================================

    total_price: {
      type: "price",

      required: true,

      visibleIf: {
        listing_type: ["Buy"],
      },

      question: "What is the total land price?",

      smartSuggestions: {
        enabled: true,
        realtime: true,
        searchable: true,
        chips: true,
        type: "indian_price_format",
      },
    },

    unit_type: {
      type: "measurement_unit",

      required: true,

      visibleIf: {
        listing_type: ["Buy"],
      },

      question: "Select pricing unit.",

      smartSuggestions: {
        enabled: true,
        searchable: true,
        chips: true,
        type: "dynamic_measurement_units",

        units: ["Acre", "Gunta", "Cent", "Bigha", "Hectare", "Katha"],
      },
    },

    price_per_unit: {
      type: "price_per_unit",

      required: false,

      visibleIf: {
        listing_type: ["Buy"],
      },

      question: "What is the price per unit?",

      dynamicQuestionLabel: true,

      smartSuggestions: {
        enabled: true,
        realtime: true,
        searchable: true,
        chips: true,
        type: "dynamic_price_per_unit",

        units: ["Acre", "Gunta", "Cent", "Bigha", "Hectare", "Katha"],

        examples: ["₹1 Crore per Acre", "₹10 Lakhs per Gunta", "₹5 Lakhs per Cent"],
      },
    },

    // =========================================================
    // RENT FLOW
    // =========================================================

    rent_amount: {
      type: "rental_price",

      required: true,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "What is the rent amount?",
    },

    rent_frequency: {
      type: "single_select",

      required: true,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "Select rent frequency.",

      options: ["Monthly", "Yearly"],
    },

    security_deposit: {
      type: "price",

      required: false,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "What is the security deposit amount?",
    },

    // =========================================================
    // LEASE FLOW
    // =========================================================

    lease_price: {
      type: "rental_price",

      required: true,

      visibleIf: {
        listing_type: ["Lease"],
      },

      question: "What is the lease amount?",
    },

    lease_duration: {
      type: "single_select",

      required: true,

      visibleIf: {
        listing_type: ["Lease"],
      },

      question: "What is the lease duration?",

      options: ["1 Year", "3 Years", "5 Years", "10 Years"],
    },

    available_from: {
      type: "future_date",

      required: false,

      visibleIf: {
        listing_type: ["Lease"],
      },

      question: "When will the land be available?",
    },

    // =========================================================
    // PARTNERSHIP FLOW
    // =========================================================

    partnership_type: {
      type: "single_select",

      required: true,

      visibleIf: {
        listing_type: ["Partnership"],
      },

      question: "What type of partnership are you looking for?",

      options: ["Joint Venture", "Revenue Sharing", "Investment Partnership", "Operational Partnership"],
    },

    investment_expected: {
      type: "price",

      required: false,

      visibleIf: {
        listing_type: ["Partnership"],
      },

      question: "Expected investment amount?",
    },

    revenue_sharing: {
      type: "text",

      required: false,

      visibleIf: {
        listing_type: ["Partnership"],
      },

      question: "Describe revenue sharing expectations.",
    },

    // =========================================================
    // LAND SIZE
    // =========================================================

    land_size: {
      type: "measurement",

      required: true,

      question: "What is the land size?",

      units: ["Acre", "Gunta", "Cent", "Bigha", "Hectare", "Katha"],

      smartSuggestions: {
        enabled: true,
        searchable: true,
        chips: true,

        examples: ["1 Acre", "5 Gunta", "10 Acres"],
      },
    },

    // =========================================================
    // SOIL
    // =========================================================

    soil_type: {
      type: "single_select",

      required: false,

      question: "What is the soil type?",

      options: ["Black Soil", "Red Soil", "Alluvial Soil", "Clay Soil", "Sandy Soil", "Loamy Soil"],
    },

    // =========================================================
    // CROPS
    // =========================================================

    crops_grown: {
      type: "multi_select",

      required: false,

      question: "What crops are suitable or currently cultivated?",

      options: [
        "Rice",
        "Cotton",
        "Wheat",
        "Maize",
        "Sugarcane",
        "Vegetables",
        "Fruits",
        "Coconut",
        "Mango",
        "Banana",
        "Tea",
        "Coffee",
      ],
    },

    // =========================================================
    // CURRENT USAGE
    // =========================================================

    current_usage: {
      type: "multi_select",

      required: false,

      question: "What is the current land usage?",

      options: [
        "Currently Cultivated",
        "Vacant Land",
        "Organic Farming",
        "Poultry",
        "Dairy",
        "Fish Farming",
        "Plantation",
      ],
    },

    // =========================================================
    // WATER
    // =========================================================

    water_source: {
      type: "multi_select",

      required: false,

      question: "What water sources are available?",

      options: ["Borewell", "Canal", "River", "Lake", "Pond", "Rainwater", "Government Water", "Open Well"],
    },

    irrigation_type: {
      type: "multi_select",

      required: false,

      question: "What irrigation systems are available?",

      options: ["Drip Irrigation", "Sprinkler", "Flood Irrigation", "Canal Irrigation"],
    },

    // =========================================================
    // ROAD ACCESS
    // =========================================================

    road_access: {
      type: "multi_select",

      required: false,

      question: "What road access types are available?",

      options: [
        "National Highway",
        "State Highway",
        "Village Road",
        "Cement Road",
        "BT Road",
        "Gravel Road",
        "Mud Road",
      ],
    },

    road_width: {
      type: "measurement",

      required: false,

      question: "What is the road width?",

      units: ["Feet", "Meters"],
    },

    truck_access: {
      type: "single_select",

      required: false,

      question: "Is truck access available?",

      options: ["Yes", "No"],
    },

    // =========================================================
    // ADDITIONAL FEATURES
    // =========================================================

    additional_features: {
      type: "multi_select",

      required: false,

      question: "Select additional land features.",

      options: [
        "Corner Plot",
        "Boundary Wall",
        "Fencing",
        "Water Connection",
        "Electricity Available",
        "Bore Available",
        "River Access",
        "Pond Water",
        "Rainwater Harvesting",
      ],
    },

    // =========================================================
    // ELECTRICITY
    // =========================================================

    electricity_connection: {
      type: "multi_select",

      required: false,

      question: "Electricity facilities available?",

      options: ["Agricultural Power", "3 Phase Power", "Transformer Nearby", "Electricity Connection Available"],
    },

    // =========================================================
    // INFRASTRUCTURE
    // =========================================================

    farm_infrastructure: {
      type: "multi_select",

      required: false,

      question: "What farm infrastructure is available?",

      options: [
        "Farm House",
        "Storage Shed",
        "Tractor Access",
        "Boundary Wall",
        "Workers Quarters",
        "Cold Storage",
        "Greenhouse",
        "Polyhouse",
        "Cattle Shed",
      ],
    },

    // =========================================================
    // BOREWELL
    // =========================================================

    borewell_count: {
      type: "number",

      required: false,

      visibleIf: {
        water_source: ["Borewell"],
      },

      question: "How many borewells are available?",
    },

    borewell_depth: {
      type: "measurement",

      required: false,

      visibleIf: {
        water_source: ["Borewell"],
      },

      question: "What is the borewell depth?",

      units: ["Feet"],
    },

    motor_hp: {
      type: "number",

      required: false,

      visibleIf: {
        water_source: ["Borewell"],
      },

      question: "What is the motor capacity (HP)?",
    },

    // =========================================================
    // ORGANIC
    // =========================================================

    organic_certification: {
      type: "single_select",

      required: false,

      visibleIf: {
        land_type: ["Organic Farm"],
      },

      question: "Does the land have organic certification?",

      options: ["Yes", "No", "In Process"],
    },

    // =========================================================
    // CONNECTIVITY
    // =========================================================

    connectivity: {
      type: "multi_select",

      required: false,

      question: "Select nearby connectivity options.",

      options: [
        "Main Road Access",
        "Village Road Access",
        "Highway Access",
        "Near Market Yard",
        "Near Town",
        "Near River",
      ],
    },

    // =========================================================
    // APPROVALS
    // =========================================================

    approvals: {
      type: "multi_select",

      required: false,

      question: "What approvals or documents are available?",

      options: [
        "Patta",
        "Passbook",
        "Pattadar Passbook",
        "Title Deed",
        "Survey Number",
        "EC Available",
        "FMB Sketch",
        "Pahani",
        "Adangal",
        "Clear Title",
        "Government Approved",
      ],
    },

    ownership_type: {
      type: "single_select",

      required: false,

      question: "Ownership type?",

      options: ["Single Owner", "Joint Ownership", "Inherited Property"],
    },

    encumbrance_status: {
      type: "single_select",

      required: false,

      question: "Encumbrance status?",

      options: ["Clear", "Loan Active", "Dispute"],
    },

    survey_verified: {
      type: "single_select",

      required: false,

      question: "Is survey verification completed?",

      options: ["Yes", "No"],
    },

    // =========================================================
    // PAYMENT OPTIONS
    // =========================================================

    payment_options: {
      type: "multi_select",

      required: false,

      question: "What payment options are available?",

      options: [
        "Price Negotiable",
        "Installments Available",
        "Flexible Payment Plan",
        "Investor Friendly",
        "NRI Assistance",
        "Immediate Registration",
      ],
    },

    // =========================================================
    // LOCATION
    // =========================================================

    location: {
      type: "location",

      required: true,

      question: "Please provide property location details.",

      hierarchy: [
        "Country",
        "State",
        "City",
        "Area / Locality",
        "Sub Locality",
        "Village",
        "Mandal / Taluk",
        "District",
        "Landmark",
        "Full Address",
        "ZIP / PIN Code",
      ],

      smartSuggestions: {
        enabled: true,
        realtime: true,
        searchable: true,
        chips: true,
        typoFriendly: true,
        gpsSupport: true,
        mapSelection: true,
        pincodeAutoFill: true,
        dependentHierarchy: true,
        currentLocation: true,
      },
    },

    // =========================================================
    // MAP
    // =========================================================

    map_location: {
      type: "map_picker",

      required: false,

      question: "Would you like to pin the property on map?",
    },

    latitude: {
      type: "number",

      required: false,

      visibleIf: {
        map_location: ["Selected"],
      },

      question: "Latitude",
    },

    longitude: {
      type: "number",

      required: false,

      visibleIf: {
        map_location: ["Selected"],
      },

      question: "Longitude",
    },

    // =========================================================
    // LANDMARKS
    // =========================================================

    nearby_landmarks: {
      type: "multi_select",

      required: false,

      question: "Nearby landmarks?",

      options: [
        "Near Highway",
        "Near Village",
        "Near Town",
        "Near River",
        "Near Canal",
        "Near Market",
        "Near Railway Station",
      ],
    },

    // =========================================================
    // HIGHLIGHTS
    // =========================================================

    property_highlights: {
      type: "multi_select",

      required: false,

      maxSelections: 3,

      question: "Select property highlights.",

      options: [
        "Verified Property",
        "Verified Owner",
        "Organic Farm",
        "Fertile Land",
        "Near Highway",
        "Water Rich Land",
        "Best Investment",
        "Premium Farm",
        "Ready Registration",
        "High Yield Land",
        "River Facing",
        "Lake Nearby",
      ],
    },

    // =========================================================
    // AI DESCRIPTION
    // =========================================================

    property_description: {
      type: "textarea",

      required: false,

      question: "Property description",

      aiGenerated: true,

      autoGenerate: true,

      allowEditing: true,
    },

    // =========================================================
    // MULTIPLE VARIATIONS
    // =========================================================

    multiple_land_variations: {
      type: "repeatable_group",

      required: false,

      question: "Would you like to add another land size and pricing variation?",

      repeatFields: ["land_size", "total_price", "price_per_unit", "unit_type"],

      allowDynamicCopies: true,
    },

    // =========================================================
    // AGENT ASSIGNMENT
    // =========================================================

    assign_nearest_agent: {
      type: "single_select",

      required: false,

      question: "Would you like to assign this property to the nearest agent?",

      options: ["Yes", "No"],
    },

    // =========================================================
    // MEDIA
    // =========================================================

    media_uploads: {
      type: "media_upload",

      required: false,

      question: "Upload land images, brochures, PDFs or documents.",

      extraction: {
        enabled: true,
        autoExtractPropertyData: true,
        autoDetectMissingFields: true,
        continueFromExtractedState: true,
      },
    },

    // =========================================================
    // CONTACT
    // =========================================================

    contact_name: {
      type: "text",

      required: false,

      question: "Could I have your full name for the listing?",

      allowSkip: true,
    },

    mobile_number: {
      type: "phone",

      required: true,

      question: "Please share your mobile number.",
    },
  },

  // =========================================================
  // RULES
  // =========================================================

  rules: [
    {
      type: "auto_calculate_total_price",
      formula: "land_size * price_per_unit",
    },

    {
      type: "normalize_pricing_units",
    },

    {
      type: "ask_only_missing_fields",
    },

    {
      type: "skip_hidden_fields",
    },

    {
      type: "persist_skipped_fields",
    },

    {
      type: "prevent_duplicate_questions",
    },

    {
      type: "dynamic_followup_questions",
    },

    {
      type: "human_like_conversation",
    },

    {
      type: "realtime_suggestions",
    },

    {
      type: "multiple_listing_variations",
    },

    {
      type: "dynamic_dependency_questions",
    },

    {
      type: "context_aware_questioning",
    },

    {
      type: "ai_generate_property_description",
    },
  ],
};

export default agricultureLandFlow;
export { agricultureLandFlow as agricultureFlow };
