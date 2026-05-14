// ============================================================
// Residential flow config — SCAFFOLD ONLY.
// Business logic intentionally not implemented yet.
// ============================================================
import type { PropertyFlowConfig } from "@/engines/types";

export const residentialFlow = {
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
  },

  order: [
    "property_type",
    "listed_by",
    "listing_type",

    "total_price",
    "price_per_unit",

    "monthly_rent",
    "available_from",

    "property_condition",
    "property_age",

    "availability_status",

    "flat_size",
    "floor_number",
    "total_floors",

    "land_size",
    "built_area",

    "parking_type",
    "parking_count",

    "bhk_type",

    "project_details",

    "furnishing_status",
    "furnishing_items",

    "property_facing",

    "amenities",

    "payment_options",

    "approvals",

    "location",

    "property_highlights",

    "media_uploads",
  ],

  fields: {
    // =========================================================
    // PROPERTY TYPE
    // =========================================================

    property_type: {
      type: "single_select",

      required: true,

      question: "What is your residential property type?",

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
    // TOTAL PRICE
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

        type: "indian_price_format",

        examples: ["2 Hundred", "2 Thousand", "2.5 Lakhs", "1 Crore"],
      },
    },

    // =========================================================
    // PRICE PER UNIT
    // =========================================================

    price_per_unit: {
      type: "price_per_unit",

      required: false,

      visibleIf: {
        listing_type: ["Buy"],
      },

      question: "What is the price per unit?",

      smartSuggestions: {
        enabled: true,

        type: "unit_price",

        units: ["Sqft", "Sqyd", "Acre", "Gunta", "Cent", "Bigha", "Hectare", "Sqm", "Katha"],
      },
    },

    // =========================================================
    // MONTHLY RENT
    // =========================================================

    monthly_rent: {
      type: "rental_price",

      required: true,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "What is the monthly rent?",

      smartSuggestions: {
        enabled: true,

        type: "rental_duration",

        durations: ["Monthly", "Hourly", "Weekly", "Daily", "3 Months", "6 Months", "Yearly", "Per Night", "Quarterly"],
      },
    },

    // =========================================================
    // AVAILABLE FROM
    // =========================================================

    available_from: {
      type: "future_date",

      required: true,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "When will the property be available?",
    },

    // =========================================================
    // PROPERTY CONDITION
    // =========================================================

    property_condition: {
      type: "single_select",

      required: true,

      question: "What is the property condition?",

      options: ["New", "Resale"],
    },

    property_age: {
      type: "single_select",

      required: true,

      visibleIf: {
        property_condition: ["Resale"],
      },

      question: "What is the property age?",

      options: ["0-1 Years", "1-5 Years", "5-10 Years", "10+ Years"],
    },

    // =========================================================
    // AVAILABILITY
    // =========================================================

    availability_status: {
      type: "single_select",

      required: true,

      question: "What is the availability status?",

      options: ["Ready", "Under Construction"],
    },

    // =========================================================
    // FLAT SIZE
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

      smartSuggestions: {
        enabled: true,
        type: "measurement_units",
      },
    },

    floor_number: {
      type: "number",

      required: true,

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

      required: true,

      visibleIf: {
        property_type: [
          "Apartment / Flat",
          "Penthouse",
          "Builder Floor Apartment",
          "Studio Apartment",
          "Serviced Apartment",
        ],
      },

      question: "How many total floors are there in the building?",
    },

    // =========================================================
    // LAND SIZE
    // =========================================================

    land_size: {
      type: "measurement",

      required: true,

      visibleIf: {
        property_type: ["Independent House", "Villa", "Duplex / Triplex", "Farm House", "Row House / Townhouse"],
      },

      question: "What is the land size?",

      units: ["Sq Ft", "Sq Yard", "Cent", "Gunta", "Acre", "Bigha"],
      smartSuggestions: {
        enabled: true,
        type: "measurement_units",
      },
    },

    built_area: {
      type: "measurement",

      required: false,

      question: "What is the built area?",

      units: ["Sq Ft", "Sq Yard"],

      smartSuggestions: {
        enabled: true,
        type: "measurement_units",
      },
    },

    // =========================================================
    // BHK
    // =========================================================

    bhk_type: {
      type: "single_select",

      required: true,

      question: "What is the BHK type?",

      options: ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK"],
    },

    // =========================================================
    // PROJECT DETAILS
    // =========================================================

    project_details: {
      type: "group",

      required: false,

      question: "Please provide project or community details.",

      fields: [
        "Community / Project Name",
        "Gated Community",
        "Total Towers",
        "Total Floors per Tower",
        "Total Units",
        "Total Land Area of Project",
      ],
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
        "Parking",
        "Swimming Pool",
        "Gym",
        "Security",
        "Club House",
        "Power Backup",
        "Children Play Area",
        "Garden",
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
        "Zero Down Payment",
        "Low Booking Amount",
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
        "LP Number Available",
        "Approved Layout",
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
        realtime: true,
        typoFriendly: true,
        gpsSupport: true,
        mapSelection: true,
        pincodeAutoFill: true,
        dependentHierarchy: true,
      },
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
        "Immediate Possession",
        "Gated Community",
        "Luxury Living",
        "Near Metro",
        "Fully Furnished",
        "Family Friendly",
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
      },
    },
  },

  rules: [
    {
      type: "auto_calculate_total_price",

      formula: "land_size * price_per_unit",
    },

    {
      type: "ask_only_missing_fields",
    },

    {
      type: "skip_hidden_fields",
    },

    {
      type: "dynamic_followup_questions",
    },

    {
      type: "human_like_conversation",
    },
  ],
};

export default residentialFlow;
