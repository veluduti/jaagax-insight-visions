// ============================================================
// Commercial conversational flow config
// FULL CLIENT-ALIGNED ADVANCED VERSION
// ============================================================

import type { PropertyFlowConfig } from "@/engines/types";

export const commercialFlow: PropertyFlowConfig = {
  category: "commercial",

  label: "Commercial",

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
    // ADVANCED AI FEATURES
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
    supportBusinessSuitabilityInference: true,
    supportCommercialInvestmentIntelligence: true,
    supportRentalYieldInference: true,
    supportOperationalInfrastructureLogic: true,
    supportIndustrySpecificQuestioning: true,
  },

  // ============================================================
  // QUESTION ORDER
  // ============================================================

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

    // Office / IT
    "conference_rooms",
    "cabins",
    "workstations",

    // Warehouse / Industrial
    "loading_docks",
    "truck_access",
    "truck_parking",
    "ceiling_height",
    "industrial_power",
    "cargo_lift",

    // Retail
    "frontage_width",
    "main_road_facing",
    "footfall_rating",

    // Hotel / Restaurant
    "room_count",
    "banquet_hall",
    "restaurant_capacity",
    "kitchen_setup",

    // Hospital / School
    "icu_beds",
    "operation_theaters",
    "classrooms",
    "labs",
    "playground",

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

    "rental_yield_estimation",
    "investment_score",

    "payment_options",

    "approvals",

    "location",

    "map_location",
    "latitude",
    "longitude",

    "property_highlights",

    "commercial_description",

    "multiple_listing_variations",

    "media_uploads",

    "contact_name",
    "mobile_number",
  ],

  // ============================================================
  // FIELDS
  // ============================================================

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

      stateBehavior: {
        invalidateDependentsOnChange: true,
        recomputeFlowOnChange: true,
      },
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

      stateBehavior: {
        invalidateDependentsOnChange: true,
        recomputeFlowOnChange: true,
      },
    },

    // =========================================================
    // PRICING
    // =========================================================

    total_price: {
      type: "price",

      required: true,

      visibleIf: {
        listing_type: ["Buy"],
      },

      question: "What is the total property price?",

      autoCalculation: {
        enabled: true,

        formula: "commercial_area * price_per_unit",

        realtime: true,

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

        units: ["Sqft", "Sqyd", "Sqm", "Acre"],
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

        units: ["Sqft", "Sqyd", "Sqm", "Acre"],
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

      question: "What is the rent amount?",
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

      question: "When will the property be available?",
    },

    // =========================================================
    // CONDITION
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

      allowMultipleVariants: true,

      variantListing: {
        enabled: true,
        createSeparateListings: true,

        linkedFields: ["commercial_area", "price_per_unit", "total_price"],
      },

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

      visibleIf: {
        commercial_type: {
          notIn: ["Warehouse", "Industrial Shed", "Factory"],
        },
      },

      question: "Which floor is the property on?",

      validation: {
        min: 0,
        maxField: "total_floors",
      },
    },

    total_floors: {
      type: "number",

      required: false,

      visibleIf: {
        commercial_type: {
          notIn: ["Warehouse", "Industrial Shed", "Factory"],
        },
      },

      question: "How many total floors are there?",

      validation: {
        min: 1,
      },
    },

    // =========================================================
    // BASIC DETAILS
    // =========================================================

    washrooms: {
      type: "number",

      required: false,

      question: "How many washrooms are available?",
    },

    // =========================================================
    // OFFICE / IT
    // =========================================================

    conference_rooms: {
      type: "number",

      required: false,

      visibleIf: {
        commercial_type: ["Office Space", "Coworking Space", "IT Park"],
      },

      question: "How many conference rooms are available?",
    },

    cabins: {
      type: "number",

      required: false,

      visibleIf: {
        commercial_type: ["Office Space", "Coworking Space", "IT Park"],
      },

      question: "How many cabins are available?",
    },

    workstations: {
      type: "number",

      required: false,

      visibleIf: {
        commercial_type: ["Office Space", "Coworking Space", "IT Park"],
      },

      question: "How many workstations are available?",
    },

    // =========================================================
    // WAREHOUSE / INDUSTRIAL
    // =========================================================

    loading_docks: {
      type: "number",

      required: false,

      visibleIf: {
        commercial_type: ["Warehouse", "Industrial Shed", "Factory"],
      },

      question: "How many loading docks are available?",
    },

    truck_access: {
      type: "single_select",

      required: false,

      visibleIf: {
        commercial_type: ["Warehouse", "Industrial Shed", "Factory"],
      },

      question: "Is truck access available?",

      options: ["Yes", "No"],
    },

    truck_parking: {
      type: "single_select",

      required: false,

      visibleIf: {
        commercial_type: ["Warehouse", "Industrial Shed", "Factory"],
      },

      question: "Is truck parking available?",

      options: ["Yes", "No"],
    },

    ceiling_height: {
      type: "measurement",

      required: false,

      visibleIf: {
        commercial_type: ["Warehouse", "Industrial Shed", "Factory"],
      },

      question: "What is the ceiling height?",

      units: ["Feet"],
    },

    industrial_power: {
      type: "single_select",

      required: false,

      visibleIf: {
        commercial_type: ["Warehouse", "Industrial Shed", "Factory"],
      },

      question: "Industrial power connection status?",

      options: ["Available", "Not Available"],
    },

    cargo_lift: {
      type: "single_select",

      required: false,

      visibleIf: {
        commercial_type: ["Warehouse", "Industrial Shed", "Factory"],
      },

      question: "Is cargo lift available?",

      options: ["Yes", "No"],
    },

    // =========================================================
    // RETAIL
    // =========================================================

    frontage_width: {
      type: "measurement",

      required: false,

      visibleIf: {
        commercial_type: ["Shop", "Showroom", "Retail Space", "Mall"],
      },

      question: "What is the frontage width?",

      units: ["Feet"],
    },

    main_road_facing: {
      type: "single_select",

      required: false,

      visibleIf: {
        commercial_type: ["Shop", "Showroom", "Retail Space", "Mall"],
      },

      question: "Is the property main road facing?",

      options: ["Yes", "No"],
    },

    footfall_rating: {
      type: "single_select",

      required: false,

      visibleIf: {
        commercial_type: ["Shop", "Showroom", "Retail Space", "Mall"],
      },

      question: "Expected customer footfall?",

      options: ["Low", "Medium", "High", "Very High"],
    },

    // =========================================================
    // HOTEL / RESTAURANT
    // =========================================================

    room_count: {
      type: "number",

      required: false,

      visibleIf: {
        commercial_type: ["Hotel"],
      },

      question: "How many rooms are available?",
    },

    banquet_hall: {
      type: "single_select",

      required: false,

      visibleIf: {
        commercial_type: ["Hotel"],
      },

      question: "Is banquet hall available?",

      options: ["Yes", "No"],
    },

    restaurant_capacity: {
      type: "number",

      required: false,

      visibleIf: {
        commercial_type: ["Restaurant"],
      },

      question: "What is the seating capacity?",
    },

    kitchen_setup: {
      type: "single_select",

      required: false,

      visibleIf: {
        commercial_type: ["Restaurant"],
      },

      question: "Kitchen setup status?",

      options: ["Fully Equipped", "Semi Equipped", "Not Available"],
    },

    // =========================================================
    // HOSPITAL / SCHOOL
    // =========================================================

    icu_beds: {
      type: "number",

      required: false,

      visibleIf: {
        commercial_type: ["Hospital"],
      },

      question: "How many ICU beds are available?",
    },

    operation_theaters: {
      type: "number",

      required: false,

      visibleIf: {
        commercial_type: ["Hospital"],
      },

      question: "How many operation theaters are available?",
    },

    classrooms: {
      type: "number",

      required: false,

      visibleIf: {
        commercial_type: ["School"],
      },

      question: "How many classrooms are available?",
    },

    labs: {
      type: "number",

      required: false,

      visibleIf: {
        commercial_type: ["School"],
      },

      question: "How many labs are available?",
    },

    playground: {
      type: "single_select",

      required: false,

      visibleIf: {
        commercial_type: ["School"],
      },

      question: "Is playground available?",

      options: ["Yes", "No"],
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

      options: ["1", "2", "3", "4+", "10+", "50+"],
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

    // =========================================================
    // INFRASTRUCTURE
    // =========================================================

    power_backup: {
      type: "single_select",

      required: false,

      question: "Is power backup available?",

      options: ["Full Backup", "Partial Backup", "No"],
    },

    internet_availability: {
      type: "single_select",

      required: false,

      visibleIf: {
        commercial_type: {
          notIn: ["Warehouse", "Industrial Shed"],
        },
      },

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

      options: ["East", "West", "North", "South", "North East", "North West", "South East", "South West"],
    },

    // =========================================================
    // PROJECT
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

      stateBehavior: {
        invalidateDependentsOnChange: true,
      },
    },

    total_towers: {
      type: "number",

      required: false,

      visibleIf: {
        gated_community: ["Yes"],
      },

      dependsOnAnswered: ["gated_community"],

      question: "How many towers are there?",

      allowSkip: true,

      skipBehavior: {
        reasonAware: true,
        suppressDependents: true,
      },
    },

    total_units: {
      type: "number",

      required: false,

      visibleIf: {
        gated_community: ["Yes"],
      },

      dependsOnAnswered: ["total_towers"],

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

      dynamicOptionsByCommercialType: {
        "Office Space": ["Lift", "Conference Room", "Reception", "Power Backup", "Cafeteria"],

        Warehouse: ["Cargo Lift", "Truck Parking", "Loading Dock", "Industrial Power"],

        Hotel: ["Swimming Pool", "Banquet Hall", "Restaurant", "Gym"],

        Mall: ["Food Court", "Escalator", "ATM", "Visitor Parking"],
      },
    },

    // =========================================================
    // INVESTMENT
    // =========================================================

    rental_yield_estimation: {
      type: "single_select",

      required: false,

      visibleIf: {
        listing_type: ["Buy"],
      },

      question: "Expected rental yield category?",

      options: ["Low Yield", "Medium Yield", "High Yield", "Premium Yield"],
    },

    investment_score: {
      type: "single_select",

      required: false,

      visibleIf: {
        listing_type: ["Buy"],
      },

      question: "Investment potential score?",

      options: ["Low", "Medium", "High", "Very High"],
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

      renderMode: "widget",
      widget: "SmartLocationWidget",
      groupedFields: ["country", "state_name", "city", "locality", "sub_locality", "landmark", "address", "pincode"],

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

      autoRecommendations: {
        enabled: true,

        rules: [
          {
            when: {
              furnishing_status: ["Fully Furnished"],
            },

            suggest: ["Fully Furnished"],
          },

          {
            when: {
              main_road_facing: ["Yes"],
            },

            suggest: ["Main Road Facing"],
          },

          {
            when: {
              rental_yield_estimation: ["High Yield"],
            },

            suggest: ["Investment Opportunity"],
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
    // AI DESCRIPTION
    // =========================================================

    commercial_description: {
      type: "ai_generated_text",

      required: false,

      question: "AI will generate smart commercial property description.",

      generation: {
        enabled: true,
        autoGenerate: true,
        regenerateOnFieldChange: true,

        useFields: [
          "commercial_type",
          "commercial_area",
          "furnishing_status",
          "amenities",
          "location",
          "total_price",
          "monthly_rent",
        ],
      },
    },

    // =========================================================
    // MULTIPLE VARIATIONS
    // =========================================================

    multiple_listing_variations: {
      type: "single_select",

      required: false,

      question: "Would you like to create another listing variation for different sizes?",

      options: ["Yes", "No"],
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
      type: "commercial_investment_engine",
    },

    {
      type: "business_suitability_engine",
    },

    {
      type: "industry_specialization_engine",
    },
  ],
};

export default commercialFlow;
