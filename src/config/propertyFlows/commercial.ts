// ============================================================
// Commercial conversational flow config
// CLIENT EXCEL ALIGNED VERSION
// ============================================================

import type { PropertyFlowConfig } from "@/engines/types";

export const commercialFlow: PropertyFlowConfig = {
  category: "commercial",

  label: "Commercial",

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
    "commercial_type",
    "listed_by",
    "listing_type",

    "total_price",
    "unit_type",
    "price_per_unit",

    "monthly_rent",
    "lease_duration",
    "available_from",

    "property_condition",
    "property_age",

    "availability_status",
    "possession_date",

    "commercial_area",
    "built_area",
    "carpet_area",
    "super_builtup_area",

    "floor_number",
    "total_floors",

    "washrooms",
    "conference_rooms",
    "cabins",
    "workstations",

    "parking_type",
    "parking_count",

    "furnishing_status",
    "furnishing_items",

    "power_backup",
    "internet_availability",
    "fire_safety",

    "property_facing",

    "project_name",
    "gated_community",
    "total_towers",
    "total_units",

    "amenities",

    "payment_options",

    "approvals",

    "location",

    "map_location",
    "latitude",
    "longitude",

    "property_highlights",

    "media_uploads",

    "contact_name",
    "mobile_number",
  ],

  fields: {
    // =========================================================
    // COMMERCIAL TYPE
    // =========================================================

    commercial_type: {
      type: "single_select",

      required: true,

      question: "What type of commercial property are you listing?",

      options: [
        "Office Space",
        "Coworking Space",
        "Shop",
        "Showroom",
        "Retail Space",
        "Commercial Building",
        "Warehouse",
        "Industrial Shed",
        "Factory",
        "Hotel",
        "Restaurant",
        "Hospital",
        "School",
        "Mall",
        "IT Park",
      ],
    },

    listed_by: {
      type: "single_select",
      required: true,
      question: "Who are you listing this property as?",
      options: ["Owner", "Agent", "Builder", "Developer"],
    },

    listing_type: {
      type: "single_select",
      required: true,
      question: "What type of listing is this?",
      options: ["Buy", "Rent", "Lease"],
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
      question: "What is the total property price?",
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
      required: false,
      visibleIf: {
        listing_type: ["Buy"],
      },
      question: "Select pricing unit.",
      smartSuggestions: {
        enabled: true,
        realtime: true,
        chips: true,
        type: "dynamic_measurement_units",
        units: [
          "Sqft",
          "Sqyd",
          "Sqm",
          "Acre",
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
        chips: true,
        type: "dynamic_price_per_unit",
        units: [
          "Sqft",
          "Sqyd",
          "Sqm",
          "Acre",
        ],
      },
    },

    monthly_rent: {
      type: "rental_price",
      required: true,
      visibleIf: {
        listing_type: ["Rent", "Lease"],
      },
      question: "What is the rent amount?",
      smartSuggestions: {
        enabled: true,
        realtime: true,
        chips: true,
        type: "rental_duration_suggestions",
        durations: [
          "Monthly",
          "Weekly",
          "Daily",
          "Yearly",
          "Quarterly",
        ],
      },
    },

    lease_duration: {
      type: "single_select",
      required: false,
      visibleIf: {
        listing_type: ["Lease"],
      },
      question: "What is the lease duration?",
      options: [
        "6 Months",
        "1 Year",
        "2 Years",
        "3 Years",
        "5 Years",
        "10 Years",
      ],
    },

    available_from: {
      type: "future_date",
      required: true,
      visibleIf: {
        listing_type: ["Rent", "Lease"],
      },
      question: "When will the property be available?",
    },

    // =========================================================
    // CONDITION
    // =========================================================

    property_condition: {
      type: "single_select",
      required: true,
      question: "What is the property condition?",
      options: ["New", "Resale"],
    },

    property_age: {
      type: "single_select",
      required: false,
      visibleIf: {
        property_condition: ["Resale"],
      },
      question: "What is the property age?",
      options: ["0-1 Years", "1-5 Years", "5-10 Years", "10+ Years"],
    },

    availability_status: {
      type: "single_select",
      required: true,
      visibleIf: {
        property_condition: ["New"],
      },
      question: "What is the availability status?",
      options: ["Ready", "Under Construction"],
    },

    possession_date: {
      type: "future_date",
      required: false,
      visibleIf: {
        availability_status: ["Under Construction"],
      },
      question: "When is possession expected?",
    },

    // =========================================================
    // AREA
    // =========================================================

    commercial_area: {
      type: "measurement",
      required: true,
      question: "What is the commercial area size?",
      units: ["Sq Ft", "Sq Yard", "Sqm"],
      smartSuggestions: {
        enabled: true,
        realtime: true,
        chips: true,
        type: "measurement_units",
      },
    },

    built_area: {
      type: "measurement",
      required: false,
      question: "What is the built-up area?",
      units: ["Sq Ft", "Sq Yard"],
      allowSkip: true,
    },

    carpet_area: {
      type: "measurement",
      required: false,
      question: "What is the carpet area?",
      units: ["Sq Ft", "Sq Yard"],
      allowSkip: true,
    },

    super_builtup_area: {
      type: "measurement",
      required: false,
      question: "What is the super built-up area?",
      units: ["Sq Ft", "Sq Yard"],
      allowSkip: true,
    },

    floor_number: {
      type: "number",
      required: false,
      question: "Which floor is the property on?",
      allowSkip: true,
    },

    total_floors: {
      type: "number",
      required: false,
      question: "How many total floors are there?",
      allowSkip: true,
    },

    // =========================================================
    // COMMERCIAL DETAILS
    // =========================================================

    washrooms: {
      type: "number",
      required: false,
      question: "How many washrooms are available?",
      allowSkip: true,
    },

    conference_rooms: {
      type: "number",
      required: false,
      visibleIf: {
        commercial_type: ["Office Space", "Coworking Space", "IT Park"],
      },
      question: "How many conference rooms are available?",
      allowSkip: true,
    },

    cabins: {
      type: "number",
      required: false,
      visibleIf: {
        commercial_type: ["Office Space", "Coworking Space", "IT Park"],
      },
      question: "How many cabins are available?",
      allowSkip: true,
    },

    workstations: {
      type: "number",
      required: false,
      visibleIf: {
        commercial_type: ["Office Space", "Coworking Space", "IT Park"],
      },
      question: "How many workstations are available?",
      allowSkip: true,
    },

    // =========================================================
    // PARKING
    // =========================================================

    parking_type: {
      type: "single_select",
      required: false,
      question: "What type of parking is available?",
      options: [
        "Covered Parking",
        "Open Parking",
        "Both",
        "No Parking",
      ],
    },

    parking_count: {
      type: "single_select",
      required: false,
      visibleIf: {
        parking_type: [
          "Covered Parking",
          "Open Parking",
          "Both",
        ],
      },
      question: "How many parking spaces are available?",
      options: ["1", "2", "3", "4+", "10+", "50+"],
    },

    // =========================================================
    // FURNISHING
    // =========================================================

    furnishing_status: {
      type: "single_select",
      required: true,
      question: "What is the furnishing status?",
      options: [
        "Unfurnished",
        "Semi Furnished",
        "Fully Furnished",
      ],
    },

    furnishing_items: {
      type: "multi_select",
      required: false,
      visibleIf: {
        furnishing_status: [
          "Semi Furnished",
          "Fully Furnished",
        ],
      },
      question: "What furnishing items are included?",
      options: [
        "AC",
        "Workstations",
        "Conference Tables",
        "Cabins",
        "Reception",
        "CCTV",
        "Server Room",
        "UPS",
        "Storage",
      ],
    },

    power_backup: {
      type: "single_select",
      required: false,
      question: "Is power backup available?",
      options: ["Full Backup", "Partial Backup", "No"],
    },

    internet_availability: {
      type: "single_select",
      required: false,
      question: "Internet availability status?",
      options: ["Fiber", "Broadband", "Leased Line", "Not Available"],
    },

    fire_safety: {
      type: "single_select",
      required: false,
      question: "Fire safety status?",
      options: ["Available", "Not Available"],
    },

    // =========================================================
    // FACING
    // =========================================================

    property_facing: {
      type: "single_select",
      required: false,
      question: "What is the property facing?",
      options: [
        "East",
        "West",
        "North",
        "South",
        "North East",
        "North West",
        "South East",
        "South West",
      ],
    },

    // =========================================================
    // PROJECT DETAILS
    // =========================================================

    project_name: {
      type: "text",
      required: false,
      question: "What is the project or building name?",
      allowSkip: true,
    },

    gated_community: {
      type: "single_select",
      required: false,
      question: "Is this inside a gated commercial complex?",
      options: ["Yes", "No"],
    },

    total_towers: {
      type: "number",
      required: false,
      visibleIf: {
        gated_community: ["Yes"],
      },
      question: "How many towers are there?",
      allowSkip: true,
    },

    total_units: {
      type: "number",
      required: false,
      visibleIf: {
        gated_community: ["Yes"],
      },
      question: "How many total units are there?",
      allowSkip: true,
    },

    // =========================================================
    // AMENITIES
    // =========================================================

    amenities: {
      type: "multi_select",
      required: false,
      question: "What amenities are available?",
      options: [
        "Lift",
        "Parking",
        "Power Backup",
        "Security",
        "CCTV",
        "Conference Room",
        "Reception",
        "Food Court",
        "ATM",
        "Gym",
        "Cafeteria",
        "Fire Safety",
        "Visitor Parking",
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
        "Bank Loan Available",
        "EMI Available",
        "Installments Available",
        "Flexible Payment Plan",
        "Construction Linked Payment",
        "Possession Linked Payment",
        "Zero Down Payment",
        "Low Booking Amount",
        "Investor Friendly",
        "NRI Assistance",
        "Pre-EMI Support",
        "Premium Bank Tie-Ups",
        "Immediate Registration",
      ],
    },

    // =========================================================
    // APPROVALS
    // =========================================================

    approvals: {
      type: "multi_select",
      required: false,
      question: "What approvals does this property have?",
      options: [
        "RERA Approved",
        "HMDA Approved",
        "DTCP Approved",
        "Municipal Approved",
        "Fire NOC",
        "Occupancy Certificate",
        "Trade License",
        "Pollution Clearance",
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
        "Area / Locality",
        "Sub Locality",
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

    map_location: {
      type: "map_picker",
      required: false,
      question: "Would you like to pin the property location on map?",
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
        "RERA Approved",
        "Price Drop",
        "Best Deal",
        "Hot Property",
        "Premium Listing",
        "Ready to Move",
        "Near Metro",
        "Corner Property",
        "Main Road Facing",
        "High Rental Yield",
        "Investment Opportunity",
        "Fully Furnished",
      ],
    },

    // =========================================================
    // MEDIA
    // =========================================================

    media_uploads: {
      type: "media_upload",
      required: false,
      question: "Upload images, brochures, PDFs or documents.",
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
      formula: "commercial_area * price_per_unit",
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
  ],
};

export default commercialFlow;
