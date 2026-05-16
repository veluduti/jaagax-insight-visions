# Updated `residential.ts` — Client-Aligned Conversational AI Flow

```ts
// ============================================================
// Residential conversational flow config
// FULL CLIENT-ALIGNED ADVANCED VERSION
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

    // ========================================================
    // NEW ADVANCED AI FEATURES
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
  },

  order: [
    "property_type",
    "listed_by",
    "listing_type",

    "total_price",
    "unit_type",
    "price_per_unit",

    "monthly_rent",
    "available_from",

    "property_condition",
    "property_age",

    "availability_status",
    "possession_date",

    "flat_size",
    "floor_number",
    "total_floors",

    "land_size",
    "built_area",

    "parking_type",
    "parking_count",

    "bhk_type",

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

    "property_highlights",

    "property_description",

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

      options: ["Buy", "Rent"],

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

      question: "What is the total property price?",

      placeholder: "Enter property price",

      autoCalculation: {
        enabled: true,

        formulaByPropertyType: {
          "Apartment / Flat": "flat_size * price_per_unit",
          Penthouse: "flat_size * price_per_unit",
          "Studio Apartment": "flat_size * price_per_unit",
          "Builder Floor Apartment": "flat_size * price_per_unit",
          "Serviced Apartment": "flat_size * price_per_unit",
          Villa: "built_area * price_per_unit",
          "Independent House": "built_area * price_per_unit",
          "Duplex / Triplex": "built_area * price_per_unit",
          "Farm House": "land_size * price_per_unit",
          "Row House / Townhouse": "built_area * price_per_unit",
        },

        realtime: true,
        allowManualOverride: true,
      },

      smartSuggestions: {
        enabled: true,
        realtime: true,
        searchable: true,
        chips: true,
        type: "indian_price_format",

        behavior: {
          whileTyping: true,
          allowClickSelection: true,
          preserveRawValue: true,
        },

        examples: [
          "100 → 1 Hundred",
          "1000 → 1 Thousand",
          "100000 → 1 Lakh",
          "1000000 → 10 Lakhs",
          "10000000 → 1 Crore",
        ],
      },
    },

    // =========================================================
    // UNIT TYPE
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
    // RENTAL
    // =========================================================

    monthly_rent: {
      type: "rental_price",

      required: true,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "What is the monthly rent?",
    },

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

      visibleIf: {
        listing_type: ["Buy"],
      },

      question: "What is the property condition?",

      options: ["New", "Resale"],

      stateBehavior: {
        invalidateDependentsOnChange: true,
        recomputeFlowOnChange: true,
      },
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

      required: true,

      visibleIf: {
        availability_status: ["Under Construction"],
      },

      question: "When is possession expected?",
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

      allowMultipleVariants: true,

      variantListing: {
        enabled: true,
        createSeparateListings: true,

        linkedFields: [
          "flat_size",
          "price_per_unit",
          "total_price",
        ],
      },

      smartSuggestions: {
        enabled: true,
        realtime: true,
        chips: true,
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

      validation: {
        min: 0,
        maxField: "total_floors",
      },
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

      validation: {
        min: 1,
      },
    },

    // =========================================================
    // LAND SIZE
    // =========================================================

    land_size: {
      type: "measurement",

      required: true,

      visibleIf: {
        property_type: [
          "Independent House",
          "Villa",
          "Duplex / Triplex",
          "Farm House",
          "Row House / Townhouse",
        ],
      },

      question: "What is the land size?",

      units: ["Sq Ft", "Sq Yard", "Cent", "Gunta", "Acre", "Bigha"],

      smartSuggestions: {
        enabled: true,
        realtime: true,
        searchable: true,
        chips: true,
        type: "dynamic_measurement_units",
      },
    },

    built_area: {
      type: "measurement",

      required: true,

      visibleIf: {
        property_type: [
          "Independent House",
          "Villa",
          "Duplex / Triplex",
          "Farm House",
          "Row House / Townhouse",
        ],
      },

      question: "What is the built area?",

      units: ["Sq Ft", "Sq Yard"],
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

      options: [
        "1 RK",
        "1 BHK",
        "2 BHK",
        "3 BHK",
        "4 BHK",
        "5 BHK",
        "6+ BHK",
      ],

      allowCustomInput: true,
    },

    // =========================================================
    // PROJECT DETAILS
    // =========================================================

    project_name: {
      type: "text",

      required: false,

      question: "Please provide project or community name.",

      allowSkip: true,
    },

    gated_community: {
      type: "single_select",

      required: false,

      question: "Is this inside a gated community?",

      options: ["Yes", "No"],

      stateBehavior: {
        invalidateDependentsOnChange: true,
      },
    },

    total_towers: {
      type: "number",

      required: false,

      visibleIf: {
        property_type: [
          "Apartment / Flat",
          "Penthouse",
          "Builder Floor Apartment",
          "Serviced Apartment",
        ],

        gated_community: ["Yes"],
      },

      question: "How many towers are in the project?",

      allowSkip: true,

      skipBehavior: {
        reasonAware: true,
        suppressDependents: true,
        neverReask: true,
      },
    },

    floors_per_tower: {
      type: "number",

      required: false,

      visibleIf: {
        gated_community: ["Yes"],
      },

      dependsOnAnswered: ["total_towers"],

      question: "How many floors per tower?",

      allowSkip: true,
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

    project_land_area: {
      type: "measurement",

      required: false,

      visibleIf: {
        gated_community: ["Yes"],
      },

      dependsOnAnswered: ["total_towers"],

      question: "What is the total project land area?",

      units: ["Acres", "Sq Yard", "Sq Ft"],

      allowSkip: true,
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
        "Wardrobes",
        "Modular Kitchen",
        "Geysers",
        "Beds",
        "Sofa",
        "Dining Table",
        "TV",
      ],
    },

    // =========================================================
    // FACING
    // =========================================================

    property_facing: {
      type: "single_select",

      required: true,

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
    // AMENITIES
    // =========================================================

    amenities: {
      type: "multi_select",

      required: false,

      question: "What amenities are available?",

      dynamicOptionsByPropertyType: {
        "Apartment / Flat": [
          "Lift",
          "Swimming Pool",
          "Gym",
          "Club House",
          "Security",
          "Power Backup",
          "Children Play Area",
        ],

        Villa: [
          "Private Garden",
          "Private Pool",
          "Club House",
          "Security",
          "Power Backup",
        ],

        "Independent House": [
          "Parking",
          "Garden",
          "Power Backup",
          "Security",
        ],
      },
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
              gated_community: ["Yes"],
            },

            suggest: ["Gated Community"],
          },

          {
            when: {
              furnishing_status: ["Fully Furnished"],
            },

            suggest: ["Fully Furnished"],
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
        "Immediate Possession",
        "Gated Community",
        "Luxury Living",
        "Near Metro",
        "Fully Furnished",
        "Family Friendly",
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
        regenerateOnFieldChange: true,

        useFields: [
          "property_type",
          "bhk_type",
          "flat_size",
          "built_area",
          "land_size",
          "furnishing_status",
          "amenities",
          "location",
          "project_name",
          "total_price",
          "monthly_rent",
        ],
      },
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
  // GLOBAL RULE ENGINE
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
  ],
};

export default residentialFlow;
```

# IMPORTANT IMPLEMENTATION NOTE

This config now assumes your engine supports:

* `dependsOnAnswered`
* `stateBehavior`
* `variantListing`
* `autoCalculation`
* `dynamicOptionsByPropertyType`
* `skipBehavior`
* `generation`
* `autoRecommendations`
* `validation`
* advanced rule-engine behaviors

If your backend engine does NOT support these yet,
then UI will compile but logic will NOT fully work.

So next step after pasting:

1. Update types.ts
2. Update rule engine
3. Update resolver
4. Update extractor
5. Update dependency manager
6. Update state invalidation system
7. Update AI flow engine
8. Update validation engine

This config is now architecturally aligned with:

* client Excel
* conversational AI behavior
* dynamic property workflows
* GPT-like questioning logic
* variant listing system
* dependency propagation engine
* intelligent conversational state management
