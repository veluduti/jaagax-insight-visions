// ============================================================
// Plots / Land conversational flow config
// FULL CLIENT-ALIGNED ADVANCED VERSION
// ============================================================

import type { PropertyFlowConfig } from "@/engines/types";

export const plotsFlow: PropertyFlowConfig = {
  category: "plots",

  label: "Plots / Land",

  // ============================================================
  // AI ENGINE
  // ============================================================

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

    // ========================================================
    // ADVANCED CLIENT AI FEATURES
    // ========================================================

    supportAnswerRevision: true,
    autoInvalidateDependentFields: true,
    recalculateFlowOnCorrection: true,
    supportSkipReasoning: true,
    supportNotApplicableState: true,
    supportDependencyPropagation: true,
    supportDynamicValidation: true,
    supportVariantListings: true,
    supportAutoDescriptionGeneration: true,
    supportDerivedRecommendations: true,
    supportStateRecovery: true,
    supportConversationMemory: true,
    supportConditionalRequirements: true,
    supportContextualAmenities: true,
    supportDynamicPricingComputation: true,
    supportDependentQuestionSuppression: true,
    supportMultiVariantPricing: true,
    supportRegionalMeasurementUnderstanding: true,
    supportLandSuitabilityInference: true,
    supportLegalIntelligence: true,
    supportAgriculturalLogic: true,
    supportRoadConnectivityLogic: true,
  },

  // ============================================================
  // QUESTION ORDER
  // ============================================================

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
    "road_type",
    "approach_road",
    "highway_access",

    "corner_plot",
    "open_sides",

    "plot_facing",

    "boundary_wall",
    "fencing_type",

    "gated_layout",

    "layout_name",
    "layout_type",
    "total_layout_area",
    "total_plots",

    "approvals",

    "legal_status",
    "clear_title",
    "registration_ready",
    "encumbrance_status",
    "land_conversion_status",

    "plot_amenities",

    "water_availability",
    "electricity_availability",
    "drainage_availability",

    // Agricultural
    "irrigation_type",
    "water_source",
    "soil_type",
    "crop_type",
    "borewell_count",
    "tractor_road_access",

    "payment_options",

    "location",

    "map_location",
    "latitude",
    "longitude",

    "property_highlights",

    "plot_description",

    "multiple_plot_variations",

    "media_uploads",

    "contact_name",
    "mobile_number",
  ],

  // ============================================================
  // FIELDS
  // ============================================================

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
        "Commercial Plot",
        "Industrial Plot",
        "Layout Plot",
        "Corner Plot",
        "Open Land",
        "Lake View Plot",
        "Highway Facing Plot",
      ],

      stateBehavior: {
        invalidateDependentsOnChange: true,
        recomputeFlowOnChange: true,
      },
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

      options: ["Buy", "Rent", "Lease"],

      stateBehavior: {
        invalidateDependentsOnChange: true,
        recomputeFlowOnChange: true,
      },
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

      autoCalculation: {
        enabled: true,

        formula: "plot_size * price_per_unit",

        realtime: true,

        normalizeRegionalUnits: true,

        allowManualOverride: true,
      },

      smartSuggestions: {
        enabled: true,
        realtime: true,
        searchable: true,
        chips: true,
        type: "indian_price_format",
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
        searchable: true,
        chips: true,

        type: "dynamic_measurement_units",

        units: ["Sqft", "Sqyd", "Sqm", "Acre", "Gunta", "Cent", "Bigha", "Hectare", "Katha"],
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

        units: ["Sqft", "Sqyd", "Sqm", "Acre", "Gunta", "Cent", "Bigha", "Hectare", "Katha"],
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
    },

    lease_duration: {
      type: "single_select",

      required: false,

      visibleIf: {
        listing_type: ["Lease"],
      },

      question: "What is the lease duration?",

      options: ["6 Months", "1 Year", "2 Years", "3 Years", "5 Years", "10 Years"],
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

      units: ["Sq Ft", "Sq Yard", "Acre", "Gunta", "Cent", "Bigha", "Hectare", "Katha"],

      allowMultipleVariants: true,

      variantListing: {
        enabled: true,
        createSeparateListings: true,

        linkedFields: ["plot_size", "price_per_unit", "total_price"],
      },

      smartSuggestions: {
        enabled: true,
        realtime: true,
        searchable: true,
        chips: true,

        type: "dynamic_measurement_units",

        autoUnitConversion: true,
      },
    },

    plot_dimensions: {
      type: "text",

      required: false,

      question: "What are the plot dimensions? Example: 40 x 60",

      allowSkip: true,
    },

    // =========================================================
    // ROAD LOGIC
    // =========================================================

    road_width: {
      type: "measurement",

      required: false,

      question: "What is the road width facing the plot?",

      units: ["Feet", "Meters"],

      allowSkip: true,

      validation: {
        min: 1,
      },
    },

    road_type: {
      type: "single_select",

      required: false,

      visibleIf: {
        plot_type: {
          notIn: ["Farm Land", "Open Land"],
        },
      },

      question: "What type of road access is available?",

      options: ["Black Top Road", "Cement Road", "Gravel Road", "Mud Road", "Internal Layout Road", "Highway Access"],
    },

    approach_road: {
      type: "single_select",

      required: false,

      visibleIf: {
        plot_type: {
          notIn: ["Farm Land"],
        },
      },

      question: "Is there proper approach road connectivity?",

      options: ["Yes", "No", "Partially"],
    },

    highway_access: {
      type: "single_select",

      required: false,

      visibleIf: {
        plot_type: ["Commercial Plot", "Industrial Plot", "Highway Facing Plot"],
      },

      question: "Does the property have highway access?",

      options: ["Direct Access", "Nearby", "No"],
    },

    // =========================================================
    // PLOT FEATURES
    // =========================================================

    corner_plot: {
      type: "single_select",

      required: false,

      question: "Is this a corner plot?",

      options: ["Yes", "No"],
    },

    open_sides: {
      type: "single_select",

      required: false,

      visibleIf: {
        plot_type: {
          notIn: ["Farm Land", "Open Land"],
        },
      },

      question: "How many sides are open?",

      options: ["1 Side", "2 Sides", "3 Sides", "4 Sides"],
    },

    plot_facing: {
      type: "single_select",

      required: false,

      visibleIf: {
        plot_type: {
          notIn: ["Farm Land", "Open Land"],
        },
      },

      question: "What is the plot facing?",

      options: ["East", "West", "North", "South", "North East", "North West", "South East", "South West"],
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

    fencing_type: {
      type: "single_select",

      required: false,

      visibleIf: {
        plot_type: ["Farm Land", "Open Land"],
      },

      question: "What type of fencing is available?",

      options: ["Wire Fencing", "Stone Fencing", "Compound Wall", "Partial Fencing", "No Fencing"],
    },

    // =========================================================
    // GATED LAYOUT
    // =========================================================

    gated_layout: {
      type: "single_select",

      required: false,

      visibleIf: {
        plot_type: {
          notIn: ["Farm Land", "Open Land"],
        },
      },

      question: "Is the plot inside a gated layout/community?",

      options: ["Yes", "No"],

      stateBehavior: {
        invalidateDependentsOnChange: true,
      },
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

      dependsOnAnswered: ["gated_layout"],

      question: "What is the layout or project name?",

      allowSkip: true,
    },

    layout_type: {
      type: "single_select",

      required: false,

      visibleIf: {
        gated_layout: ["Yes"],
      },

      dependsOnAnswered: ["gated_layout"],

      question: "What type of layout is it?",

      options: ["Open Layout", "Gated Layout", "Premium Layout", "Villa Layout"],
    },

    total_layout_area: {
      type: "measurement",

      required: false,

      visibleIf: {
        gated_layout: ["Yes"],
      },

      dependsOnAnswered: ["gated_layout"],

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

      dependsOnAnswered: ["gated_layout"],

      question: "How many plots are there in the layout?",

      allowSkip: true,
    },

    // =========================================================
    // APPROVALS
    // =========================================================

    approvals: {
      type: "multi_select",

      required: false,

      visibleIf: {
        plot_type: {
          notIn: ["Farm Land", "Open Land"],
        },
      },

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
    // LEGAL
    // =========================================================

    legal_status: {
      type: "single_select",

      required: false,

      question: "What is the legal status of the land?",

      options: ["Clear Title", "Dispute Free", "Under Verification", "Pending Clearance"],
    },

    clear_title: {
      type: "single_select",

      required: false,

      question: "Does the property have clear title?",

      options: ["Yes", "No"],
    },

    registration_ready: {
      type: "single_select",

      required: false,

      question: "Is the property ready for registration?",

      options: ["Yes", "No"],
    },

    encumbrance_status: {
      type: "single_select",

      required: false,

      question: "Encumbrance status?",

      options: ["No Encumbrance", "Encumbrance Available", "Pending Verification"],
    },

    land_conversion_status: {
      type: "single_select",

      required: false,

      visibleIf: {
        plot_type: {
          notIn: ["Farm Land"],
        },
      },

      question: "Land conversion status?",

      options: ["Converted", "Non Converted", "Conversion In Progress"],
    },

    // =========================================================
    // AMENITIES
    // =========================================================

    plot_amenities: {
      type: "multi_select",

      required: false,

      question: "What amenities are available?",

      dynamicOptionsByPlotType: {
        "Residential Plot": [
          "Underground Electricity",
          "Street Lights",
          "Drainage",
          "Water Connection",
          "Black Top Roads",
          "Security",
          "Parks",
          "Club House",
        ],

        "Commercial Plot": ["Highway Access", "Wide Roads", "Street Lights", "Drainage", "Water Connection"],

        "Farm Land": ["Borewell", "Canal Water", "Electricity", "Drip Irrigation", "Farm Shed"],
      },
    },

    // =========================================================
    // UTILITIES
    // =========================================================

    water_availability: {
      type: "single_select",

      required: false,

      question: "Water availability status?",

      options: ["Available", "Bore Available", "Canal Water", "Not Available"],
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

      visibleIf: {
        plot_type: {
          notIn: ["Farm Land"],
        },
      },

      question: "Drainage availability status?",

      options: ["Available", "Planned", "Not Available"],
    },

    // =========================================================
    // AGRICULTURAL LOGIC
    // =========================================================

    irrigation_type: {
      type: "single_select",

      required: false,

      visibleIf: {
        plot_type: ["Farm Land"],
      },

      question: "What type of irrigation is available?",

      options: ["Drip Irrigation", "Sprinkler", "Canal Irrigation", "Rain Fed", "Manual"],
    },

    water_source: {
      type: "multi_select",

      required: false,

      visibleIf: {
        plot_type: ["Farm Land"],
      },

      question: "What are the water sources?",

      options: ["Borewell", "Canal", "Lake", "River", "Rain Water", "Water Tanker"],
    },

    soil_type: {
      type: "single_select",

      required: false,

      visibleIf: {
        plot_type: ["Farm Land"],
      },

      question: "What type of soil is available?",

      options: ["Red Soil", "Black Soil", "Sandy Soil", "Clay Soil", "Mixed Soil"],
    },

    crop_type: {
      type: "multi_select",

      required: false,

      visibleIf: {
        plot_type: ["Farm Land"],
      },

      question: "What crops are suitable or currently cultivated?",

      options: ["Paddy", "Cotton", "Mango", "Coconut", "Banana", "Vegetables", "Sugarcane", "Maize"],
    },

    borewell_count: {
      type: "number",

      required: false,

      visibleIf: {
        plot_type: ["Farm Land"],
      },

      question: "How many borewells are available?",

      validation: {
        min: 0,
      },
    },

    tractor_road_access: {
      type: "single_select",

      required: false,

      visibleIf: {
        plot_type: ["Farm Land"],
      },

      question: "Is tractor road access available?",

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
        "Bank Loan Available",
        "EMI Available",
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

      autoRecommendations: {
        enabled: true,

        rules: [
          {
            when: {
              corner_plot: ["Yes"],
            },

            suggest: ["Corner Plot"],
          },

          {
            when: {
              gated_layout: ["Yes"],
            },

            suggest: ["Premium Listing"],
          },

          {
            when: {
              highway_access: ["Direct Access"],
            },

            suggest: ["Near Highway"],
          },
        ],
      },

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
        "Investment Opportunity",
        "Ready Registration",
        "Fast Growing Area",
      ],
    },

    // =========================================================
    // AI DESCRIPTION
    // =========================================================

    plot_description: {
      type: "ai_generated_text",

      required: false,

      question: "AI will generate smart plot description.",

      generation: {
        enabled: true,
        autoGenerate: true,
        regenerateOnFieldChange: true,

        useFields: [
          "plot_type",
          "plot_size",
          "road_width",
          "road_type",
          "approvals",
          "plot_amenities",
          "location",
          "total_price",
        ],
      },
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

  // ============================================================
  // RULE ENGINE
  // ============================================================

  rules: [
    {
      type: "dynamic_price_computation",
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
      type: "dependency_propagation",
    },

    {
      type: "skip_reasoning_engine",
    },

    {
      type: "auto_invalidate_hidden_fields",
    },

    {
      type: "recalculate_dependent_fields",
    },

    {
      type: "not_applicable_state_engine",
    },

    {
      type: "dynamic_validation_engine",
    },

    {
      type: "auto_generate_description",
    },

    {
      type: "variant_listing_engine",
    },

    {
      type: "derived_recommendation_engine",
    },

    {
      type: "conversation_recovery_engine",
    },

    {
      type: "regional_measurement_normalization",
    },

    {
      type: "land_suitability_engine",
    },

    {
      type: "legal_verification_engine",
    },

    {
      type: "agricultural_logic_engine",
    },
  ],
};

export default plotsFlow;
