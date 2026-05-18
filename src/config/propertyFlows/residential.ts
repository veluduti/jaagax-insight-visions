// ============================================================
// Residential conversational flow config
// CLIENT EXCEL ALIGNED SIMPLIFIED VERSION
// ============================================================

import type { PropertyFlowConfig } from "@/engines/types";

export const residentialFlow: PropertyFlowConfig = {
  category: "residential",

  label: "Residential",

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

  // ============================================================
  // CLIENT FLOW ORDER
  // ============================================================

  order: [
    "property_type",

    "listed_by",

    "listing_type",

    "property_condition",

    "availability_status",
    "possession_date",

    "flat_size",
    "land_size",
    "built_area",

    "add_another_size_variation",

    "unit_type",
    "price_per_unit",
    "total_price",
    "monthly_rent",

    "bhk_type",
    "bathroom_count",
    "balcony_count",

    "floor_number",
    "total_floors",

    "parking_type",
    "parking_count",

    "project_name",
    "gated_community",
    "total_towers",
    "floors_per_tower",
    "total_units",
    "project_land_area",

    "furnishing_status",
    "furnishing_items",

    "property_facing",

    "amenities",

    "payment_options",

    "approvals",

    "location",

    "map_location",
    "latitude",
    "longitude",

    "property_highlights",

    "property_description",

    "assign_nearest_agent",

    "media_uploads",

    "contact_name",
    "mobile_number",
  ],

  fields: {
    // =========================================================
    // PROPERTY TYPE
    // =========================================================

    property_type: {
      type: "single_select",

      required: true,

      question: "What type of residential property are you listing?",

      options: [
        "Apartment / Flat",
        "Independent House",
        "Villa",
        "Duplex / Triplex",
        "Penthouse",
        "Row House / Townhouse",
        "Farm House",
        "Studio Apartment",
        "Serviced Apartment",
        "Builder Floor Apartment",
        "Gated Community House",
      ],
    },

    // =========================================================
    // LISTED BY
    // =========================================================

    listed_by: {
      type: "single_select",

      required: true,

      question: "Who are you listing this property as?",

      options: ["Owner", "Agent", "Builder"],
    },

    // =========================================================
    // LISTING TYPE
    // =========================================================

    listing_type: {
      type: "single_select",

      required: true,

      question: "What type of listing is this?",

      options: ["Buy", "Rent"],
    },

    // =========================================================
    // PROPERTY CONDITION
    // =========================================================

    property_condition: {
      type: "single_select",

      required: true,

      visibleIf: {
        listing_type: ["Buy"],
      },

      question: "What is the property condition?",

      options: ["New", "Resale"],
    },

    availability_status: {
      type: "single_select",

      required: false,

      visibleIf: {
        property_condition: ["New"],
      },

      question: "What is the availability status?",

      options: ["Ready to Move", "Under Construction"],
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

    flat_size: {
      type: "measurement",

      required: true,

      visibleIf: {
        property_type: [
          "Apartment / Flat",
          "Penthouse",
          "Studio Apartment",
          "Builder Floor Apartment",
          "Serviced Apartment",
        ],
      },

      question: "What is the flat size?",

      units: ["Sq Ft"],
    },

    land_size: {
      type: "measurement",

      required: true,

      visibleIf: {
        property_type: ["Independent House", "Villa", "Duplex / Triplex", "Farm House", "Row House / Townhouse"],
      },

      question: "What is the land size?",

      units: ["Sq Ft", "Sq Yard", "Cent", "Gunta", "Acre"],
    },

    built_area: {
      type: "measurement",

      required: true,

      visibleIf: {
        property_type: ["Independent House", "Villa", "Duplex / Triplex", "Farm House", "Row House / Townhouse"],
      },

      question: "What is the built area?",

      units: ["Sq Ft", "Sq Yard"],
    },

    // =========================================================
    // SIZE VARIATION
    // =========================================================

    add_another_size_variation: {
      type: "single_select",

      required: false,

      question: "Would you like to add another size and pricing variation?",

      options: ["Yes", "No"],

      variationFields: ["flat_size", "land_size", "built_area", "price_per_unit", "total_price", "property_facing"],
    },

    // =========================================================
    // PRICING
    // =========================================================

    unit_type: {
      type: "measurement_unit",

      required: false,

      visibleIf: {
        listing_type: ["Buy"],
      },

      question: "Select pricing unit.",

      smartSuggestions: {
        enabled: true,
        searchable: true,
        chips: true,

        units: ["Sqft", "Sqyd", "Sqm", "Acre", "Gunta", "Cent", "Bigha"],
      },
    },

    price_per_unit: {
      type: "price_per_unit",

      required: false,

      visibleIf: {
        listing_type: ["Buy"],
      },

      question: "What is the price per unit?",
    },

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

    monthly_rent: {
      type: "rental_price",

      required: true,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "What is the monthly rent?",
    },

    // =========================================================
    // BHK
    // =========================================================

    bhk_type: {
      type: "single_select",

      required: true,

      visibleIf: {
        property_type: {
          notIn: ["Studio Apartment"],
        },
      },

      question: "What is the BHK type?",

      options: ["1 RK", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK", "6+ BHK"],
    },

    bathroom_count: {
      type: "single_select",

      required: true,

      question: "How many bathrooms are available?",

      options: ["1", "2", "3", "4", "5+"],
    },

    balcony_count: {
      type: "single_select",

      required: false,

      question: "How many balconies are available?",

      options: ["0", "1", "2", "3", "4+"],
    },

    // =========================================================
    // FLOOR DETAILS
    // =========================================================

    floor_number: {
      type: "number",

      required: false,

      visibleIf: {
        property_type: [
          "Apartment / Flat",
          "Penthouse",
          "Builder Floor Apartment",
          "Studio Apartment",
          "Serviced Apartment",
        ],
      },

      question: "Which floor is the property on?",
    },

    total_floors: {
      type: "number",

      required: false,

      visibleIf: {
        property_type: [
          "Apartment / Flat",
          "Penthouse",
          "Builder Floor Apartment",
          "Studio Apartment",
          "Serviced Apartment",
        ],
      },

      question: "How many total floors are there?",
    },

    // =========================================================
    // PARKING
    // =========================================================

    parking_type: {
      type: "single_select",

      required: false,

      question: "What type of parking is available?",

      options: ["Covered Parking", "Open Parking", "Both", "No Parking"],
    },

    parking_count: {
      type: "single_select",

      required: false,

      visibleIf: {
        parking_type: ["Covered Parking", "Open Parking", "Both"],
      },

      question: "How many parking spaces are available?",

      options: ["1", "2", "3", "4+"],
    },

    // =========================================================
    // PROJECT DETAILS
    // =========================================================

    project_name: {
      type: "text",

      required: false,

      question: "What is the project or community name?",
    },

    gated_community: {
      type: "single_select",

      required: false,

      question: "Is this inside a gated community?",

      options: ["Yes", "No"],
    },

    total_towers: {
      type: "number",

      required: false,

      visibleIf: {
        gated_community: ["Yes"],
      },

      question: "How many towers are in the project?",
    },

    floors_per_tower: {
      type: "number",

      required: false,

      visibleIf: {
        gated_community: ["Yes"],
      },

      question: "How many floors per tower?",
    },

    total_units: {
      type: "number",

      required: false,

      visibleIf: {
        gated_community: ["Yes"],
      },

      question: "How many total units are there?",
    },

    project_land_area: {
      type: "measurement",

      required: false,

      visibleIf: {
        gated_community: ["Yes"],
      },

      question: "What is the total project land area?",

      units: ["Acres", "Sq Yard", "Sq Ft"],
    },

    // =========================================================
    // FURNISHING
    // =========================================================

    furnishing_status: {
      type: "single_select",

      required: true,

      question: "What is the furnishing status?",

      options: ["Unfurnished", "Semi Furnished", "Fully Furnished"],
    },

    furnishing_items: {
      type: "multi_select",

      required: false,

      visibleIf: {
        furnishing_status: ["Semi Furnished", "Fully Furnished"],
      },

      question: "What furnishing items are included?",

      options: ["AC", "Wardrobes", "Modular Kitchen", "Geysers", "Beds", "Sofa", "Dining Table", "TV"],
    },

    // =========================================================
    // FACING
    // =========================================================

    property_facing: {
      type: "single_select",

      required: true,

      question: "What is the property facing?",

      options: ["East", "West", "North", "South", "North East", "North West", "South East", "South West"],
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
        "Swimming Pool",
        "Gym",
        "Club House",
        "Security",
        "Power Backup",
        "Children Play Area",
        "Indoor Games",
        "Jogging Track",
        "Guest Rooms",
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
        "Investor Friendly",
        "NRI Assistance",
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
        "CRDA Approved",
        "Municipal Approved",
        "Panchayat Approved",
        "Approved Layout",
        "Occupancy Certificate",
        "Bank Approved",
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
    // HIGHLIGHTS / RIBBONS
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
        "Immediate Possession",
        "Gated Community",
        "Luxury Living",
        "Near Metro",
        "Fully Furnished",
        "Family Friendly",
        "Corner Flat",
        "Park Facing",
        "East Facing",
        "Loan Approved",
        "Ready Registration",
        "Limited Units",
        "Newly Launched",
      ],
    },

    // =========================================================
    // AI DESCRIPTION
    // =========================================================

    property_description: {
      type: "ai_generated_text",

      required: false,

      question: "AI will generate a smart property description.",

      generation: {
        enabled: true,
        autoGenerate: true,
      },
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

      question: "Upload property images, brochures, PDFs or videos.",

      extraction: {
        enabled: true,
        autoExtractPropertyData: true,
        autoDetectMissingFields: true,
      },
    },

    // =========================================================
    // CONTACT
    // =========================================================

    contact_name: {
      type: "text",

      required: false,

      question: "Please share your name.",
    },

    mobile_number: {
      type: "phone",

      required: true,

      question: "Please share your mobile number.",
    },
  },

  // ============================================================
  // RULES
  // ============================================================

  rules: [
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
      type: "auto_generate_description",
    },
  ],
};

export default residentialFlow;
