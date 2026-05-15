// ============================================================
// Agriculture Land conversational flow config
// CLIENT EXCEL ALIGNED VERSION
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
  },

  order: [
    "land_type",
    "listed_by",
    "listing_type",

    "total_price",
    "unit_type",
    "price_per_unit",

    "lease_price",
    "lease_duration",
    "available_from",

    "land_size",
    "soil_type",
    "crop_type",
    "water_source",
    "irrigation_type",

    "road_access",
    "road_width",

    "fencing",
    "electricity_availability",

    "farm_house_available",
    "storage_available",
    "borewell_count",

    "organic_certification",

    "approvals",

    "payment_options",

    "location",

    "map_location",
    "latitude",
    "longitude",

    "nearby_landmarks",

    "property_highlights",

    "multiple_land_variations",

    "media_uploads",

    "contact_name",
    "mobile_number",
  ],

  fields: {
    // =========================================================
    // LAND TYPE
    // =========================================================

    land_type: {
      type: "single_select",

      required: true,

      question: "What type of agricultural land are you listing?",

      options: [
        "Farm Land",
        "Agricultural Land",
        "Orchard",
        "Plantation",
        "Organic Farm",
        "Dairy Farm",
        "Poultry Farm",
        "Fish Farm",
        "Coconut Farm",
        "Mango Farm",
        "Tea Estate",
        "Coffee Estate",
      ],
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

      options: ["Buy", "Lease"],
    },

    // =========================================================
    // PRICE
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
        realtime: true,
        searchable: true,
        chips: true,
        type: "dynamic_measurement_units",

        units: [
          "Acre",
          "Gunta",
          "Cent",
          "Bigha",
          "Hectare",
          "Katha",
        ],
      },
    },

    price_per_unit: {
      type: "price_per_unit",

      required: false,

      visibleIf: {
        listing_type: ["Buy"],
      },

      question: "What is the price per unit?",

      smartSuggestions: {
        enabled: true,
        realtime: true,
        searchable: true,
        chips: true,
        type: "dynamic_price_per_unit",

        units: [
          "Acre",
          "Gunta",
          "Cent",
          "Bigha",
          "Hectare",
          "Katha",
        ],
      },
    },

    // =========================================================
    // LEASE
    // =========================================================

    lease_price: {
      type: "rental_price",

      required: true,

      visibleIf: {
        listing_type: ["Lease"],
      },

      question: "What is the lease amount?",

      smartSuggestions: {
        enabled: true,
        realtime: true,
        chips: true,
        type: "rental_duration_suggestions",

        durations: [
          "Monthly",
          "Yearly",
          "3 Years",
          "5 Years",
          "10 Years",
        ],
      },
    },

    lease_duration: {
      type: "single_select",

      required: true,

      visibleIf: {
        listing_type: ["Lease"],
      },

      question: "What is the lease duration?",

      options: [
        "1 Year",
        "3 Years",
        "5 Years",
        "10 Years",
      ],
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
    // LAND SIZE
    // =========================================================

    land_size: {
      type: "measurement",

      required: true,

      question: "What is the land size?",

      units: [
        "Acre",
        "Gunta",
        "Cent",
        "Bigha",
        "Hectare",
        "Katha",
      ],

      smartSuggestions: {
        enabled: true,
        realtime: true,
        searchable: true,
        chips: true,
        type: "dynamic_measurement_units",

        examples: [
          "1 Acre",
          "5 Gunta",
          "10 Acre",
        ],
      },
    },

    // =========================================================
    // SOIL & CROPS
    // =========================================================

    soil_type: {
      type: "multi_select",

      required: false,

      question: "What is the soil type?",

      options: [
        "Black Soil",
        "Red Soil",
        "Alluvial Soil",
        "Clay Soil",
        "Sandy Soil",
        "Loamy Soil",
      ],
    },

    crop_type: {
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
    // WATER
    // =========================================================

    water_source: {
      type: "multi_select",

      required: false,

      question: "What water sources are available?",

      options: [
        "Borewell",
        "Canal",
        "River",
        "Lake",
        "Pond",
        "Rainwater",
        "Government Water",
      ],
    },

    irrigation_type: {
      type: "multi_select",

      required: false,

      question: "What irrigation systems are available?",

      options: [
        "Drip Irrigation",
        "Sprinkler",
        "Flood Irrigation",
        "Canal Irrigation",
      ],
    },

    // =========================================================
    // ROAD ACCESS
    // =========================================================

    road_access: {
      type: "single_select",

      required: false,

      question: "What type of road access does the land have?",

      options: [
        "National Highway",
        "State Highway",
        "Village Road",
        "Mud Road",
        "Black Top Road",
      ],
    },

    road_width: {
      type: "measurement",

      required: false,

      question: "What is the road width?",

      units: ["Feet", "Meters"],
    },

    // =========================================================
    // UTILITIES
    // =========================================================

    fencing: {
      type: "single_select",

      required: false,

      question: "Is fencing available?",

      options: ["Yes", "No", "Partial"],
    },

    electricity_availability: {
      type: "single_select",

      required: false,

      question: "Electricity availability status?",

      options: ["Available", "Nearby", "Not Available"],
    },

    farm_house_available: {
      type: "single_select",

      required: false,

      question: "Is there a farmhouse on the property?",

      options: ["Yes", "No"],
    },

    storage_available: {
      type: "single_select",

      required: false,

      question: "Is storage or warehouse available?",

      options: ["Yes", "No"],
    },

    borewell_count: {
      type: "number",

      required: false,

      question: "How many borewells are available?",

      allowSkip: true,
    },

    organic_certification: {
      type: "single_select",

      required: false,

      question: "Does the land have organic certification?",

      options: ["Yes", "No", "In Process"],
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
        "Title Deed",
        "Survey Number",
        "EC Available",
        "FMB Sketch",
        "Pahani",
        "Adangal",
      ],
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

      question: "Please provide location details.",

      hierarchy: [
        "Country",
        "State",
        "City",
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

      question: "Would you like to pin the land location on map?",

      allowSkip: true,
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

      question: "What nearby landmarks or access points are available?",

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

      question: "Select property highlights or ribbons.",

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
    // MULTIPLE VARIATIONS
    // =========================================================

    multiple_land_variations: {
      type: "single_select",

      required: false,

      question: "Would you like to create another listing variation for different land sizes?",

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

      question: "Please share your 10-digit mobile number.",
    },
  },

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
  ],
};

export default agricultureLandFlow;
export { agricultureLandFlow as agricultureFlow };
