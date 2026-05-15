// ============================================================
// Plots / Land conversational flow config
// CLIENT EXCEL ALIGNED VERSION
// ============================================================

import type { PropertyFlowConfig } from "@/engines/types";

export const plotsFlow: PropertyFlowConfig = {
  category: "plots_land",

  label: "Plots / Land",

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
    "plot_type",
    "listed_by",
    "listing_type",

    "total_price",
    "unit_type",
    "price_per_unit",

    "monthly_rent",
    "lease_duration",
    "available_from",

    "plot_size",
    "plot_dimensions",
    "road_width",
    "corner_plot",
    "open_sides",

    "plot_facing",

    "boundary_wall",
    "gated_layout",

    "layout_name",
    "layout_type",
    "total_layout_area",
    "total_plots",

    "approvals",

    "plot_amenities",

    "water_availability",
    "electricity_availability",
    "drainage_availability",

    "payment_options",

    "location",

    "map_location",
    "latitude",
    "longitude",

    "property_highlights",

    "multiple_plot_variations",

    "media_uploads",

    "contact_name",
    "mobile_number",
  ],

  fields: {
    // =========================================================
    // PLOT TYPE
    // =========================================================

    plot_type: {
      type: "single_select",

      required: true,

      question: "What type of plot or land are you listing?",

      options: [
        "Residential Plot",
        "Villa Plot",
        "Farm Land",
        "Agricultural Land",
        "Commercial Plot",
        "Industrial Plot",
        "Layout Plot",
        "Corner Plot",
        "Open Land",
        "Lake View Plot",
        "Highway Facing Plot",
      ],
    },

    // =========================================================
    // LISTED BY
    // =========================================================

    listed_by: {
      type: "single_select",

      required: true,

      question: "Who are you listing this property as?",

      options: ["Owner", "Agent", "Builder", "Developer"],
    },

    // =========================================================
    // LISTING TYPE
    // =========================================================

    listing_type: {
      type: "single_select",

      required: true,

      question: "What type of listing is this?",

      options: ["Buy", "Rent", "Lease"],
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

      question: "What is the total plot price?",

      smartSuggestions: {
        enabled: true,
        realtime: true,
        searchable: true,
        chips: true,
        type: "indian_price_format",

        examples: [
          "1000 → 1 Thousand",
          "100000 → 1 Lakh",
          "10000000 → 1 Crore",
        ],
      },
    },

    // =========================================================
    // UNIT TYPE
    // =========================================================

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
        chips: true,
        type: "dynamic_measurement_units",

        units: [
          "Sqft",
          "Sqyd",
          "Sqm",
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
        realtime: true,
        searchable: true,
        chips: true,
        type: "dynamic_price_per_unit",

        units: [
          "Sqft",
          "Sqyd",
          "Sqm",
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
    // RENT / LEASE
    // =========================================================

    monthly_rent: {
      type: "rental_price",

      required: true,

      visibleIf: {
        listing_type: ["Rent", "Lease"],
      },

      question: "What is the rent or lease amount?",

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
          "3 Months",
          "6 Months",
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

      question: "When will the land be available?",
    },

    // =========================================================
    // PLOT SIZE
    // =========================================================

    plot_size: {
      type: "measurement",

      required: true,

      question: "What is the plot size?",

      units: [
        "Sq Ft",
        "Sq Yard",
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
          "100 Sqft",
          "100 Gunta",
          "100 Acre",
          "100 Sq Yard",
        ],
      },
    },

    plot_dimensions: {
      type: "text",

      required: false,

      question: "What are the plot dimensions? Example: 40 x 60",

      allowSkip: true,
    },

    road_width: {
      type: "measurement",

      required: false,

      question: "What is the road width facing the plot?",

      units: ["Feet", "Meters"],

      allowSkip: true,
    },

    corner_plot: {
      type: "single_select",

      required: false,

      question: "Is this a corner plot?",

      options: ["Yes", "No"],
    },

    open_sides: {
      type: "single_select",

      required: false,

      question: "How many sides are open?",

      options: ["1 Side", "2 Sides", "3 Sides", "4 Sides"],
    },

    // =========================================================
    // FACING
    // =========================================================

    plot_facing: {
      type: "single_select",

      required: true,

      question: "What is the plot facing?",

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
    // BOUNDARY
    // =========================================================

    boundary_wall: {
      type: "single_select",

      required: false,

      question: "Does the plot have a boundary wall?",

      options: ["Yes", "No", "Partial"],
    },

    gated_layout: {
      type: "single_select",

      required: false,

      question: "Is the plot inside a gated layout/community?",

      options: ["Yes", "No"],
    },

    // =========================================================
    // LAYOUT DETAILS
    // =========================================================

    layout_name: {
      type: "text",

      required: false,

      visibleIf: {
        gated_layout: ["Yes"],
      },

      question: "What is the layout or project name?",

      allowSkip: true,
    },

    layout_type: {
      type: "single_select",

      required: false,

      visibleIf: {
        gated_layout: ["Yes"],
      },

      question: "What type of layout is it?",

      options: [
        "Open Layout",
        "Gated Layout",
        "Premium Layout",
        "Villa Layout",
      ],
    },

    total_layout_area: {
      type: "measurement",

      required: false,

      visibleIf: {
        gated_layout: ["Yes"],
      },

      question: "What is the total layout area?",

      units: ["Acres", "Sq Yard", "Sq Ft"],

      allowSkip: true,
    },

    total_plots: {
      type: "number",

      required: false,

      visibleIf: {
        gated_layout: ["Yes"],
      },

      question: "How many plots are there in the layout?",

      allowSkip: true,
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
    // AMENITIES
    // =========================================================

    plot_amenities: {
      type: "multi_select",

      required: false,

      question: "What amenities are available?",

      options: [
        "Underground Electricity",
        "Street Lights",
        "Drainage",
        "Water Connection",
        "Black Top Roads",
        "Security",
        "Parks",
        "Children Play Area",
        "Club House",
        "Avenue Plantation",
        "Rain Water Harvesting",
        "CCTV",
      ],
    },

    // =========================================================
    // UTILITIES
    // =========================================================

    water_availability: {
      type: "single_select",

      required: false,

      question: "Water availability status?",

      options: ["Available", "Bore Available", "Not Available"],
    },

    electricity_availability: {
      type: "single_select",

      required: false,

      question: "Electricity availability status?",

      options: ["Available", "Nearby", "Not Available"],
    },

    drainage_availability: {
      type: "single_select",

      required: false,

      question: "Drainage availability status?",

      options: ["Available", "Planned", "Not Available"],
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
        "Assured Rental Returns",
        "Investor Friendly",
        "NRI Assistance",
        "Pre-EMI Support",
        "Premium Bank Tie-Ups",
        "Custom Payment Plans",
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
    // MAP LOCATION
    // =========================================================

    map_location: {
      type: "map_picker",

      required: false,

      question: "Would you like to pin the plot location on map?",

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
        "Gated Community",
        "Corner Plot",
        "Lake View",
        "Near Highway",
        "Near Metro",
        "Investment Opportunity",
        "Ready Registration",
        "Fast Growing Area",
      ],
    },

    // =========================================================
    // MULTIPLE VARIATIONS
    // =========================================================

    multiple_plot_variations: {
      type: "single_select",

      required: false,

      question: "Would you like to create another listing variation for different plot sizes?",

      options: ["Yes", "No"],
    },

    // =========================================================
    // MEDIA
    // =========================================================

    media_uploads: {
      type: "media_upload",

      required: false,

      question: "Upload plot images, brochures, PDFs or documents.",

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
      formula: "plot_size * price_per_unit",
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

export default plotsFlow;
```
