// ============================================================
// COMMERCIAL CONVERSATIONAL FLOW CONFIG
// FINAL 100% CLIENT-ALIGNED VERSION
// TRUE AI STAGED CONVERSATION ENGINE
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
    // ADVANCED AI
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

    // ========================================================
    // TRUE AI DECISION ENGINE
    // ========================================================

    resolverStrategy: "ai_staged_dynamic",

    nextQuestionEngine: {
      enabled: true,
      mode: "stage_priority_based",
      dependencyAware: true,
      contextAware: true,
      skipAware: true,
      confidenceAware: true,
      commercialTypeAware: true,
      listingTypeAware: true,
      conversationAware: true,
      adaptiveFollowups: true,
      stageAware: true,
    },

    extractionEngine: {
      enabled: true,

      confidenceThresholds: {
        autoAccept: 0.9,
        askConfirmation: 0.6,
        rejectBelow: 0.4,
      },

      entityExtraction: {
        location: true,
        pricing: true,
        commercialIntent: true,
        propertyType: true,
        amenities: true,
        measurements: true,
      },
    },

    dependencyResolver: {
      enabled: true,
      suppressChildrenOnSkip: true,
      suppressChildrenOnNA: true,
      suppressChildrenOnHidden: true,
      invalidateChildrenOnParentChange: true,
      preventDependencyLeaks: true,
    },

    conversationEngine: {
      enabled: true,
      useQuestionVariants: true,
      useNaturalTransitions: true,
      contextualFollowups: true,
      avoidRoboticQuestions: true,
    },
  },

  // ============================================================
  // RESOLVER STRATEGY
  // ============================================================

  strategy: {
    mode: "ai_staged_dynamic",
    priorityBased: true,
    dependencyAware: true,
    commercialTypeAware: true,
    listingTypeAware: true,
    skipAware: true,
    conversationAware: true,
    stageAware: true,
  },

  // ============================================================
  // CONVERSATION STAGES
  // ============================================================

  conversationStages: [
    {
      id: "basic_classification",

      requiredCompletion: true,

      fields: ["commercial_type", "listed_by", "listing_type", "property_condition", "location"],
    },

    {
      id: "property_dimensions",

      fields: ["land_size", "built_area", "carpet_area", "super_builtup_area", "floor_number", "total_floors"],
    },

    {
      id: "pricing",

      fields: [
        "total_price",
        "price_per_unit",
        "monthly_rent",
        "security_deposit",
        "lease_duration",
        "available_from",
        "possession_date",
      ],
    },

    {
      id: "commercial_features",

      fields: [
        "cabins",
        "meeting_rooms",
        "workstations",
        "truck_access",
        "truck_parking",
        "truck_capacity",
        "loading_docks",
        "parking_features",
        "furnishing_status",
        "furnishing_items",
        "currently_operating_as",
        "suitable_for",
      ],
    },

    {
      id: "amenities_visibility",

      fields: ["amenities", "visibility_access", "approvals", "property_highlights"],
    },

    {
      id: "media_ai",

      fields: ["media_uploads", "commercial_description", "multiple_listing_variations"],
    },

    {
      id: "finalization",

      fields: ["assign_nearest_agent", "contact_name", "mobile_number"],
    },
  ],

  // ============================================================
  // GLOBAL SKIP OPTIONS
  // ============================================================

  globalSkipOptions: ["Don't Know", "Will Update Later", "Not Applicable"],

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

      stage: "basic_classification",

      priority: 10,

      question: "What kind of commercial property are you planning to list?",

      questionVariants: [
        "What type of commercial property is this?",
        "Could you tell me what kind of commercial space you're listing?",
        "Is this an office, warehouse, showroom, land, or something else?",
      ],

      options: [
        "Office Space",
        "Coworking Space",
        "Shop / Retail Store",
        "Showroom",
        "Commercial Building",
        "Warehouse / Godown",
        "Industrial Shed",
        "Factory",
        "Restaurant / Cafe Space",
        "Hotel / Lodge Building",
        "Clinic / Hospital Space",
        "Educational Institute",
        "Commercial Land / Plot",
        "Business Center",
        "IT Park",
      ],

      stateBehavior: {
        invalidateDependentsOnChange: true,
        recomputeFlowOnChange: true,
        clearIrrelevantFields: true,
      },
    },

    // =========================================================
    // LISTED BY
    // =========================================================

    listed_by: {
      type: "single_select",

      required: true,

      stage: "basic_classification",

      priority: 9,

      question: "Are you listing this property as the owner, agent, or builder?",

      options: ["Owner", "Agent", "Builder"],
    },

    // =========================================================
    // LISTING TYPE
    // =========================================================

    listing_type: {
      type: "single_select",

      required: true,

      stage: "basic_classification",

      priority: 10,

      question: "Is this property for sale, rent, or lease?",

      questionVariants: [
        "Are you planning to sell, rent, or lease this property?",
        "What's the listing type for this commercial property?",
      ],

      options: ["Buy", "Rent", "Lease"],

      stateBehavior: {
        invalidateDependentsOnChange: true,
        recomputeFlowOnChange: true,
        clearIrrelevantPricingFields: true,
      },
    },

    // =========================================================
    // PROPERTY CONDITION
    // =========================================================

    property_condition: {
      type: "single_select",

      required: true,

      stage: "basic_classification",

      priority: 8,

      question: "What's the current condition of the property?",

      questionVariants: [
        "Is the property new, resale, under construction, or ready to occupy?",
        "Can you tell me the current status of the property?",
      ],

      options: ["New", "Resale", "Ready to Occupy", "Under Construction"],
    },

    property_age: {
      type: "single_select",

      required: false,

      stage: "basic_classification",

      priority: 7,

      visibleIf: {
        property_condition: ["Resale"],
      },

      dependsOnResolved: ["property_condition"],

      question: "Approximately how old is the property?",

      options: ["0-1 Years", "1-5 Years", "5-10 Years", "10+ Years"],

      allowSkip: true,

      skipBehavior: {
        suppressDependents: true,
      },
    },

    // =========================================================
    // LOCATION
    // =========================================================

    location: {
      type: "location",

      required: true,

      stage: "basic_classification",

      priority: 10,

      renderMode: "widget",

      widgetType: "SmartLocationWidget",

      question: "Could you share the property location details?",

      questionVariants: ["Where exactly is the property located?", "Please share the property location details."],

      extraction: {
        enabled: true,
        autoParseNaturalLocation: true,
        autoFillHierarchy: true,
      },

      groupedFields: ["country", "state_name", "city", "area", "sub_locality", "landmark", "full_address", "pincode"],

      smartSuggestions: {
        enabled: true,
        gpsSupport: true,
        mapSelection: true,
        pincodeAutoFill: true,
        currentLocation: true,
      },
    },

    // =========================================================
    // MAP
    // =========================================================

    map_location: {
      type: "map_picker",

      required: false,

      stage: "basic_classification",

      priority: 4,

      question: "Would you like to pin the exact property location on the map?",

      allowSkip: true,
    },

    latitude: {
      type: "number",

      required: false,

      stage: "basic_classification",

      visibleIf: {
        map_location: ["Selected"],
      },

      dependsOnResolved: ["map_location"],

      question: "Latitude",
    },

    longitude: {
      type: "number",

      required: false,

      stage: "basic_classification",

      visibleIf: {
        map_location: ["Selected"],
      },

      dependsOnResolved: ["map_location"],

      question: "Longitude",
    },

    // =========================================================
    // AVAILABILITY
    // =========================================================

    available_from: {
      type: "future_date",

      stage: "pricing",

      renderAs: "calendar",

      required: false,

      priority: 7,

      visibleIf: {
        listing_type: ["Rent", "Lease"],
      },

      question: "When will the property be available?",

      allowSkip: true,
    },

    possession_date: {
      type: "future_date",

      stage: "pricing",

      renderAs: "calendar",

      required: false,

      priority: 6,

      visibleIf: {
        property_condition: ["Under Construction"],
      },

      question: "When is possession expected?",

      allowSkip: true,
    },

    // =========================================================
    // LAND SIZE
    // =========================================================

    land_size: {
      type: "measurement",

      stage: "property_dimensions",

      requiredIf: {
        commercial_type: ["Commercial Land / Plot"],
      },

      priority: 9,

      visibleIf: {
        commercial_type: ["Commercial Land / Plot"],
      },

      question: "What is the land size of the plot?",

      units: ["Sq Ft", "Sq Yard", "Cent", "Gunta", "Acre", "Bigha"],

      allowSkip: true,

      variantListing: {
        enabled: true,
        createSeparateListings: true,
      },
    },

    // =========================================================
    // BUILT AREA
    // =========================================================

    built_area: {
      type: "measurement",

      stage: "property_dimensions",

      requiredIf: {
        commercial_type: {
          notIn: ["Commercial Land / Plot"],
        },
      },

      priority: 9,

      visibleIf: {
        commercial_type: {
          notIn: ["Commercial Land / Plot"],
        },
      },

      question: "What is the built-up area?",

      questionVariants: ["How much built-up area does the property have?", "Could you share the built-up area size?"],

      units: ["Sq Ft", "Sq Yard", "Sqm"],

      allowMultipleVariants: true,

      variantListing: {
        enabled: true,
        createSeparateListings: true,
        askForAnotherVariant: true,
      },
    },

    carpet_area: {
      type: "measurement",

      stage: "property_dimensions",

      required: false,

      priority: 5,

      visibleIf: {
        commercial_type: {
          notIn: ["Commercial Land / Plot"],
        },
      },

      question: "Do you also know the carpet area?",

      units: ["Sq Ft", "Sq Yard"],

      allowSkip: true,
    },

    super_builtup_area: {
      type: "measurement",

      stage: "property_dimensions",

      required: false,

      priority: 4,

      visibleIf: {
        commercial_type: {
          notIn: ["Commercial Land / Plot"],
        },
      },

      question: "Would you like to share the super built-up area as well?",

      units: ["Sq Ft", "Sq Yard"],

      allowSkip: true,
    },

    // =========================================================
    // FLOOR DETAILS
    // =========================================================

    floor_number: {
      type: "number",

      stage: "property_dimensions",

      required: false,

      priority: 6,

      visibleIf: {
        commercial_type: {
          notIn: ["Warehouse / Godown", "Industrial Shed", "Factory", "Commercial Land / Plot"],
        },
      },

      question: "Which floor is the property located on?",

      allowSkip: true,

      skipBehavior: {
        suppressDependents: true,
      },
    },

    total_floors: {
      type: "number",

      stage: "property_dimensions",

      required: false,

      priority: 5,

      visibleIf: {
        commercial_type: {
          notIn: ["Warehouse / Godown", "Industrial Shed", "Factory", "Commercial Land / Plot"],
        },
      },

      dependsOnResolved: ["floor_number"],

      question: "How many total floors does the building have?",

      allowSkip: true,
    },

    // =========================================================
    // BUY PRICING
    // =========================================================

    total_price: {
      type: "price",

      stage: "pricing",

      requiredIf: {
        listing_type: ["Buy"],
      },

      priority: 10,

      visibleIf: {
        listing_type: ["Buy"],
      },

      question: "What is the expected sale price?",
    },

    price_per_unit: {
      type: "price_per_unit",

      stage: "pricing",

      required: false,

      priority: 6,

      visibleIf: {
        listing_type: ["Buy"],
      },

      question: "Do you know the approximate price per square foot or unit?",

      allowSkip: true,
    },

    // =========================================================
    // RENT / LEASE
    // =========================================================

    monthly_rent: {
      type: "price",

      stage: "pricing",

      requiredIf: {
        listing_type: ["Rent", "Lease"],
      },

      priority: 10,

      visibleIf: {
        listing_type: ["Rent", "Lease"],
      },

      question: "What monthly rent are you expecting?",
    },

    security_deposit: {
      type: "price",

      stage: "pricing",

      required: false,

      priority: 5,

      visibleIf: {
        listing_type: ["Rent", "Lease"],
      },

      question: "What security deposit are you expecting?",

      allowSkip: true,
    },

    lease_duration: {
      type: "single_select",

      stage: "pricing",

      required: false,

      priority: 5,

      visibleIf: {
        listing_type: ["Lease"],
      },

      question: "How long is the lease duration expected to be?",

      options: ["6 Months", "1 Year", "2 Years", "3 Years", "5 Years", "10 Years"],

      allowSkip: true,
    },

    // =========================================================
    // OFFICE / BUSINESS
    // =========================================================

    cabins: {
      type: "number",

      stage: "commercial_features",

      required: false,

      priority: 5,

      visibleIf: {
        commercial_type: ["Office Space", "Coworking Space", "Business Center", "IT Park"],
      },

      question: "How many cabins are available inside the office?",

      allowSkip: true,
    },

    meeting_rooms: {
      type: "number",

      stage: "commercial_features",

      required: false,

      priority: 5,

      visibleIf: {
        commercial_type: ["Office Space", "Coworking Space", "Business Center", "IT Park"],
      },

      question: "Does the office include meeting rooms?",

      allowSkip: true,
    },

    workstations: {
      type: "number",

      stage: "commercial_features",

      required: false,

      priority: 5,

      visibleIf: {
        commercial_type: ["Office Space", "Coworking Space", "Business Center", "IT Park"],
      },

      question: "Approximately how many workstations can fit comfortably?",

      allowSkip: true,
    },

    // =========================================================
    // WAREHOUSE / INDUSTRIAL
    // =========================================================

    truck_access: {
      type: "single_select",

      stage: "commercial_features",

      required: false,

      priority: 8,

      visibleIf: {
        commercial_type: ["Warehouse / Godown", "Industrial Shed", "Factory"],
      },

      question: "Is truck access available for the property?",

      options: ["Yes", "No"],
    },

    truck_parking: {
      type: "single_select",

      stage: "commercial_features",

      required: false,

      priority: 7,

      visibleIf: {
        commercial_type: ["Warehouse / Godown", "Industrial Shed", "Factory"],
      },

      question: "Is dedicated truck parking available?",

      options: ["Yes", "No"],

      contextualFollowups: [
        {
          when: {
            truck_parking: ["Yes"],
          },

          ask: "truck_capacity",
        },
      ],
    },

    truck_capacity: {
      type: "number",

      stage: "commercial_features",

      required: false,

      priority: 4,

      visibleIf: {
        truck_parking: ["Yes"],
      },

      dependsOnResolved: ["truck_parking"],

      question: "Roughly how many trucks can park comfortably?",

      allowSkip: true,
    },

    loading_docks: {
      type: "number",

      stage: "commercial_features",

      required: false,

      priority: 5,

      visibleIf: {
        commercial_type: ["Warehouse / Godown", "Industrial Shed", "Factory"],
      },

      question: "How many loading docks are available?",

      allowSkip: true,
    },

    // =========================================================
    // PARKING
    // =========================================================

    parking_features: {
      type: "multi_select",

      stage: "commercial_features",

      required: false,

      priority: 5,

      question: "What parking facilities are available?",

      options: ["Car Parking", "Bike Parking", "Visitor Parking", "Truck Parking"],

      allowSkip: true,
    },

    // =========================================================
    // FURNISHING
    // =========================================================

    furnishing_status: {
      type: "single_select",

      stage: "commercial_features",

      required: false,

      priority: 7,

      visibleIf: {
        commercial_type: {
          notIn: ["Commercial Land / Plot"],
        },
      },

      question: "Is the property fully furnished, semi-furnished, or unfurnished?",

      options: ["Unfurnished", "Semi Furnished", "Fully Furnished"],

      allowSkip: true,
    },

    furnishing_items: {
      type: "multi_select",

      stage: "commercial_features",

      required: false,

      priority: 4,

      visibleIf: {
        furnishing_status: ["Semi Furnished", "Fully Furnished"],
      },

      dependsOnResolved: ["furnishing_status"],

      question: "What furnishings or infrastructure are included?",

      options: [
        "Workstations",
        "Reception",
        "Central AC",
        "CCTV",
        "Server Room",
        "Pantry",
        "Fire Safety",
        "Conference Tables",
        "UPS",
      ],

      allowSkip: true,
    },

    // =========================================================
    // CURRENTLY OPERATING AS
    // =========================================================

    currently_operating_as: {
      type: "single_select",

      stage: "commercial_features",

      required: false,

      priority: 5,

      question: "What is the property currently being used for?",

      options: ["Office", "Restaurant", "Gym", "Warehouse", "Retail Store", "Manufacturing Unit", "Vacant"],

      allowSkip: true,
    },

    // =========================================================
    // SUITABLE FOR
    // =========================================================

    suitable_for: {
      type: "multi_select",

      stage: "commercial_features",

      required: false,

      priority: 5,

      question: "What kind of businesses would this property suit best?",

      options: ["IT Company", "Startup", "Bank", "Showroom", "Call Center", "Clinic", "Restaurant", "Warehouse"],

      allowSkip: true,
    },

    // =========================================================
    // AMENITIES
    // =========================================================

    amenities: {
      type: "multi_select",

      stage: "amenities_visibility",

      required: false,

      priority: 4,

      question: "What amenities are available in the property?",

      dynamicOptionsByCommercialType: {
        "Office Space": ["Lift", "Conference Room", "Reception", "Power Backup", "Cafeteria"],

        "Warehouse / Godown": ["Loading Dock", "Industrial Power", "Cargo Lift", "Truck Parking"],

        "Restaurant / Cafe Space": ["Kitchen Setup", "Dining Area", "Power Backup"],

        "Hotel / Lodge Building": ["Swimming Pool", "Restaurant", "Gym", "Banquet Hall"],
      },

      allowSkip: true,
    },

    // =========================================================
    // VISIBILITY & ACCESS
    // =========================================================

    visibility_access: {
      type: "multi_select",

      stage: "amenities_visibility",

      required: false,

      priority: 7,

      question: "What visibility or accessibility advantages does the property have?",

      options: [
        "Main Road Facing",
        "High Footfall Area",
        "Near Metro",
        "Highway Access",
        "Corner Property",
        "Easy Public Transport",
        "Truck Access",
      ],

      allowSkip: true,
    },

    // =========================================================
    // APPROVALS
    // =========================================================

    approvals: {
      type: "multi_select",

      stage: "amenities_visibility",

      required: false,

      priority: 4,

      question: "Which approvals or certifications does the property have?",

      options: ["RERA Approved", "Fire NOC", "Trade License", "Occupancy Certificate"],

      allowSkip: true,
    },

    // =========================================================
    // PROPERTY HIGHLIGHTS
    // =========================================================

    property_highlights: {
      type: "multi_select",

      stage: "amenities_visibility",

      required: false,

      priority: 3,

      maxSelections: 3,

      question: "Pick up to 3 highlights you'd like shown on the listing.",

      options: ["Prime Location", "High ROI", "Startup Friendly", "Business Hub", "Main Road Facing"],

      allowSkip: true,
    },

    // =========================================================
    // MEDIA
    // =========================================================

    media_uploads: {
      type: "media_upload",

      stage: "media_ai",

      required: false,

      priority: 6,

      question: "You can upload photos, brochures, PDFs, or floor plans if you'd like.",

      extraction: {
        enabled: true,
        autoExtractPropertyData: true,
        autoDetectMissingFields: true,
        continueFromExtractedState: true,
        confidenceBasedAutoFill: true,
      },
    },

    // =========================================================
    // AI DESCRIPTION
    // =========================================================

    commercial_description: {
      type: "ai_generated_text",

      stage: "media_ai",

      requiresMinimumCompletion: 70,

      required: false,

      priority: 2,

      question: "AI will now generate a professional commercial listing description.",

      generation: {
        enabled: true,
        autoGenerate: true,
        regenerateOnFieldChange: true,

        useFields: [
          "commercial_type",
          "listing_type",
          "built_area",
          "land_size",
          "furnishing_status",
          "amenities",
          "visibility_access",
          "location",
          "total_price",
          "monthly_rent",
        ],
      },
    },

    // =========================================================
    // MULTIPLE VARIANTS
    // =========================================================

    multiple_listing_variations: {
      type: "single_select",

      stage: "media_ai",

      required: false,

      priority: 2,

      question: "Would you like to create another variation for a different size or pricing option?",

      options: ["Yes", "No"],
    },

    // =========================================================
    // AGENT ASSIGNMENT
    // =========================================================

    assign_nearest_agent: {
      type: "single_select",

      stage: "finalization",

      required: false,

      priority: 2,

      question: "Would you like us to assign the nearest agent to help market this property?",

      options: ["Yes", "No"],
    },

    // =========================================================
    // CONTACT
    // =========================================================

    contact_name: {
      type: "text",

      stage: "finalization",

      required: false,

      priority: 4,

      question: "Could I have your name for the listing contact details?",

      allowSkip: true,
    },

    mobile_number: {
      type: "phone",

      stage: "finalization",

      required: true,

      priority: 10,

      question: "Please share your mobile number for listing verification.",
    },
  },

  // ============================================================
  // RULE ENGINE
  // ============================================================

  rules: [
    {
      type: "dynamic_resolver_engine",
    },

    {
      type: "staged_conversation_engine",
    },

    {
      type: "next_best_question_engine",
    },

    {
      type: "commercial_context_engine",
    },

    {
      type: "listing_type_pricing_engine",
    },

    {
      type: "hard_dependency_suppression_engine",
    },

    {
      type: "skip_reasoning_engine",
    },

    {
      type: "visibility_suppression_engine",
    },

    {
      type: "question_priority_engine",
    },

    {
      type: "confidence_based_extraction_engine",
    },

    {
      type: "contextual_followup_engine",
    },

    {
      type: "conversation_template_engine",
    },

    {
      type: "humanized_conversation_engine",
    },

    {
      type: "variant_listing_engine",
    },

    {
      type: "auto_generate_description_engine",
    },

    {
      type: "dynamic_validation_engine",
    },

    {
      type: "location_intelligence_engine",
    },

    {
      type: "commercial_recommendation_engine",
    },

    {
      type: "business_suitability_engine",
    },

    {
      type: "conversation_recovery_engine",
    },
  ],
};

export default commercialFlow;
