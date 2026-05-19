// ============================================================
// COMMERCIAL CONVERSATIONAL FLOW CONFIG
// FINAL CLIENT-ALIGNED DYNAMIC VERSION
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

    resolverStrategy: "ai_dynamic",

    nextQuestionEngine: {
      enabled: true,
      mode: "priority_based",
      dependencyAware: true,
      contextAware: true,
      skipAware: true,
      confidenceAware: true,
      commercialTypeAware: true,
      listingTypeAware: true,
      conversationAware: true,
      adaptiveFollowups: true,
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
  // STRATEGY
  // ============================================================

  strategy: {
    mode: "ai_dynamic",
    priorityBased: true,
    dependencyAware: true,
    commercialTypeAware: true,
    listingTypeAware: true,
    skipAware: true,
    conversationAware: true,
  },

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

      priority: 100,

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

      priority: 99,

      question: "Are you listing this property as the owner, agent, or builder?",

      options: ["Owner", "Agent", "Builder"],
    },

    // =========================================================
    // LISTING TYPE
    // =========================================================

    listing_type: {
      type: "single_select",

      required: true,

      priority: 98,

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

      priority: 97,

      question: "What's the current condition of the property?",

      options: ["New", "Resale", "Ready to Occupy", "Under Construction"],
    },

    property_age: {
      type: "single_select",

      required: false,

      priority: 96,

      visibleIf: {
        property_condition: ["Resale"],
      },

      dependsOnResolved: ["property_condition"],

      question: "Approximately how old is the property?",

      options: ["0-1 Years", "1-5 Years", "5-10 Years", "10+ Years"],

      allowSkip: true,
    },

    // =========================================================
    // LOCATION
    // =========================================================

    location: {
      type: "location",

      required: true,

      priority: 95,

      renderMode: "widget",

      widgetType: "SmartLocationWidget",

      question: "Could you share the property location details?",

      groupedFields: ["country", "state_name", "city", "locality", "sub_locality", "landmark", "address", "pincode"],

      extraction: {
        enabled: true,
        autoParseNaturalLocation: true,
        autoFillHierarchy: true,
      },

      smartSuggestions: {
        enabled: true,
        gpsSupport: true,
        mapSelection: true,
        pincodeAutoFill: true,
        currentLocation: true,
      },
    },

    // =========================================================
    // LAND SIZE
    // =========================================================

    land_size: {
      type: "measurement",

      requiredIf: {
        commercial_type: ["Commercial Land / Plot"],
      },

      priority: 90,

      visibleIf: {
        commercial_type: ["Commercial Land / Plot"],
      },

      question: "What is the land size of the plot?",

      units: ["Sq Ft", "Sq Yard", "Cent", "Gunta", "Acre", "Bigha"],

      allowSkip: true,
    },

    // =========================================================
    // BUILT AREA
    // =========================================================

    built_area: {
      type: "measurement",

      requiredIf: {
        commercial_type: {
          notIn: ["Commercial Land / Plot"],
        },
      },

      priority: 89,

      visibleIf: {
        commercial_type: {
          notIn: ["Commercial Land / Plot"],
        },
      },

      question: "What is the built-up area?",

      units: ["Sq Ft", "Sq Yard", "Sqm"],

      allowMultipleVariants: true,

      variantListing: {
        enabled: true,

        createSeparateListings: true,

        askForAnotherVariant: true,

        cloneStrategy: {
          preserveFields: [
            "commercial_type",
            "listing_type",
            "listed_by",

            "country",
            "state_name",
            "city",
            "locality",
            "sub_locality",
            "landmark",
            "address",
            "pincode",

            "property_condition",
            "property_age",

            "furnishing_status",

            "amenities",

            "visibility_access",

            "approvals",
          ],
        },
      },
    },

    carpet_area: {
      type: "measurement",

      required: false,

      priority: 88,

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

      required: false,

      priority: 87,

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

      required: false,

      priority: 86,

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

      required: false,

      priority: 85,

      dependsOnResolved: ["floor_number"],

      visibleIf: {
        commercial_type: {
          notIn: ["Warehouse / Godown", "Industrial Shed", "Factory", "Commercial Land / Plot"],
        },
      },

      question: "How many total floors does the building have?",

      allowSkip: true,
    },

    // =========================================================
    // BUY PRICING
    // =========================================================

    total_price: {
      type: "price",

      requiredIf: {
        listing_type: ["Buy"],
      },

      priority: 80,

      visibleIf: {
        listing_type: ["Buy"],
      },

      question: "What is the expected sale price?",
    },

    monthly_rent: {
      type: "price",

      requiredIf: {
        listing_type: ["Rent", "Lease"],
      },

      priority: 79,

      visibleIf: {
        listing_type: ["Rent", "Lease"],
      },

      question: "What monthly rent are you expecting?",
    },

    lease_duration: {
      type: "single_select",

      required: false,

      priority: 78,

      visibleIf: {
        listing_type: ["Lease"],
      },

      question: "How long is the lease duration expected to be?",

      options: ["6 Months", "1 Year", "2 Years", "3 Years", "5 Years"],

      allowSkip: true,
    },

    // =========================================================
    // COMMERCIAL FEATURES
    // =========================================================

    cabins: {
      type: "number",

      priority: 70,

      visibleIf: {
        commercial_type: ["Office Space", "Coworking Space", "Business Center", "IT Park"],
      },

      question: "How many cabins are available inside the office?",

      allowSkip: true,
    },

    workstations: {
      type: "number",

      priority: 69,

      visibleIf: {
        commercial_type: ["Office Space", "Coworking Space", "Business Center", "IT Park"],
      },

      question: "Approximately how many workstations can fit comfortably?",

      allowSkip: true,
    },

    truck_access: {
      type: "single_select",

      priority: 68,

      visibleIf: {
        commercial_type: ["Warehouse / Godown", "Industrial Shed", "Factory"],
      },

      question: "Is truck access available for the property?",

      options: ["Yes", "No"],
    },

    loading_docks: {
      type: "number",

      priority: 67,

      visibleIf: {
        commercial_type: ["Warehouse / Godown", "Industrial Shed", "Factory"],
      },

      question: "How many loading docks are available?",

      allowSkip: true,
    },

    furnishing_status: {
      type: "single_select",

      priority: 66,

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

      priority: 65,

      visibleIf: {
        furnishing_status: ["Semi Furnished", "Fully Furnished"],
      },

      dependsOnResolved: ["furnishing_status"],

      question: "What furnishings or infrastructure are included?",

      options: ["Workstations", "Reception", "Central AC", "CCTV", "Server Room", "Pantry", "Fire Safety"],

      allowSkip: true,
    },

    suitable_for: {
      type: "multi_select",

      priority: 64,

      question: "What kind of businesses would this property suit best?",

      options: ["IT Company", "Startup", "Bank", "Showroom", "Call Center", "Clinic", "Restaurant", "Warehouse"],

      allowSkip: true,
    },

    // =========================================================
    // AMENITIES
    // =========================================================

    amenities: {
      type: "multi_select",

      priority: 50,

      question: "What amenities are available in the property?",

      allowSkip: true,
    },

    visibility_access: {
      type: "multi_select",

      priority: 49,

      question: "What visibility or accessibility advantages does the property have?",

      options: ["Main Road Facing", "High Footfall Area", "Near Metro", "Highway Access", "Corner Property"],

      allowSkip: true,
    },

    parking_features: {
      type: "multi_select",

      priority: 48,

      question: "What parking facilities are available?",

      options: ["Car Parking", "Bike Parking", "Visitor Parking", "Truck Parking"],

      allowSkip: true,
    },

    // =========================================================
    // MEDIA
    // =========================================================

    media_uploads: {
      type: "media_upload",

      priority: 20,

      question: "You can upload photos, brochures, PDFs, or floor plans if you'd like.",
    },

    commercial_description: {
      type: "ai_generated_text",

      required: false,

      priority: 1000,

      requiresMinimumCompletion: 70,

      question: "AI will now generate a professional commercial listing description.",
    },

    // =========================================================
    // CONTACT
    // =========================================================

    assign_nearest_agent: {
      type: "single_select",

      priority: 10,

      question: "Would you like us to assign the nearest agent to help market this property?",

      options: ["Yes", "No"],
    },

    contact_name: {
      type: "text",

      priority: 9,

      question: "Could I have your name for the listing contact details?",

      allowSkip: true,
    },

    mobile_number: {
      type: "phone",

      required: true,

      priority: 8,

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
