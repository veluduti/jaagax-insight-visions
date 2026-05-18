# Updated residential.ts — Client Exact Conversational Flow

```ts
import type { PropertyFlowConfig } from "@/engines/types";

const APARTMENT_TYPES = [
  "Apartment / Flat",
  "Penthouse",
  "Studio Apartment",
  "Builder Floor Apartment",
  "Serviced Apartment",
];

const HOUSE_TYPES = [
  "Independent House",
  "Villa",
  "Duplex / Triplex",
  "Farm House",
  "Row House / Townhouse",
  "Gated Community House",
];

export const residentialFlow: PropertyFlowConfig = {
  category: "residential",

  label: "Residential",

  version: "v3-client-conversational-final",

  engine: {
    mode: "dynamic_conversation",

    strictVisibilityResolution: true,
    removeHiddenFieldsFromQueue: true,
    clearHiddenFieldValues: true,
    dynamicQuestionResolver: true,
    dependencyReevaluation: true,
    preventQuestionRepetition: true,
    autoCleanupInvalidState: true,
    maintainConversationMemory: true,
    allowNaturalCorrections: true,
    supportAIExtraction: true,
    conversationalPriorityMode: true,

    evaluateIntentBeforeQuestion: true,
    evaluateDependencyTree: true,
    avoidDeadQuestions: true,
    contextualQuestionSelection: true,
    smartQuestionOrdering: true,
    semanticMemoryPriority: true,
    preventIrrelevantQuestions: true,
    lockConversationContext: true,
    removeSkippedBranches: true,
    autoInferRelatedFields: true,
    supportRepeatableVariations: true,
    dynamicPriorityScoring: true,
    skipBranchOnParentRejection: true,
    preventHiddenFieldReactivation: true,
    supportPermanentIrrelevance: true,
  },

  conversationOrchestrator: {
    enabled: true,
    strategy: "contextual_ai_first",
    askOneQuestionAtATime: true,
    askOnlyRelevantQuestions: true,
    avoidPreviouslyAnsweredQuestions: true,
    avoidInferredQuestions: true,
    prioritizeCriticalFields: true,
    supportNaturalConversation: true,
    supportInterruptions: true,
    supportCorrections: true,
    supportSkipLogic: true,
    dynamicFlowPlanning: true,
    recalculateAfterEveryAnswer: true,
    maintainSemanticMemory: true,
    contextualFieldScoring: true,
  },

  skipStateManagement: {
    persistSkipReason: true,
    preventReactivation: true,
    skipHierarchyPropagation: true,
    permanentSkipOnTerminalCondition: true,
  },

  contextLocks: {
    property_type: true,
    listing_type: true,
    property_condition: true,
  },

  semanticInference: {
    enabled: true,
    inferRelatedFields: true,
    autoFillDerivedAnswers: true,
    contextualUnderstanding: true,
    inferFromSentenceStructure: true,
    inferFromUploads: true,
  },

  extraction: {
    confidenceThreshold: 0.8,
    askConfirmationBelowThreshold: true,
    preventLowConfidenceOverwrite: true,
  },

  sections: {
    basic_details: {
      label: "Basic Details",
      priority: 1,
    },

    configuration: {
      label: "Property Configuration",
      priority: 2,
    },

    pricing: {
      label: "Pricing",
      priority: 3,
    },

    project_details: {
      label: "Project Details",
      priority: 4,
    },

    furnishing: {
      label: "Furnishing",
      priority: 5,
    },

    location: {
      label: "Location",
      priority: 6,
    },

    media: {
      label: "Media & Description",
      priority: 7,
    },
  },

  fields: {
    property_type: {
      section: "basic_details",
      priority: 1,
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
      fieldBehavior: {
        terminalConditions: true,
        permanentlyIrrelevantConditions: true,
      },
    },

    listed_by: {
      section: "basic_details",
      priority: 2,
      type: "single_select",
      required: true,
      question: "Who are you listing this property as?",
      options: ["Owner", "Agent", "Builder"],
    },

    listing_type: {
      section: "basic_details",
      priority: 3,
      type: "single_select",
      required: true,
      question: "Is this property for sale or rent?",
      options: ["Buy", "Rent"],

      invalidateOnChange: [
        "property_condition",
        "availability_status",
        "possession_date",
        "property_age",
        "available_from_date",
        "price_per_unit",
        "total_price",
        "monthly_rent",
      ],
    },

    property_condition: {
      section: "basic_details",
      priority: 4,
      type: "single_select",
      required: true,

      visibleIf: {
        field: "listing_type",
        equals: "Buy",
      },

      dependsOn: ["listing_type"],

      question: "What is the property condition?",

      options: ["New", "Resale"],

      invalidateOnChange: [
        "availability_status",
        "possession_date",
        "property_age",
      ],
    },

    availability_status: {
      section: "basic_details",
      priority: 5,
      type: "single_select",
      required: false,

      visibleIf: {
        field: "listing_type",
        equals: "Buy",
      },

      dependsOn: ["listing_type", "property_condition"],

      question: "What is the availability status?",

      options: ["Ready", "Under Construction"],
    },

    possession_date: {
      section: "basic_details",
      priority: 6,
      type: "future_date",
      required: false,

      visibleIf: {
        and: [
          {
            field: "listing_type",
            equals: "Buy",
          },
          {
            field: "availability_status",
            equals: "Under Construction",
          },
        ],
      },

      dependsOn: [
        "listing_type",
        "availability_status",
      ],

      question: "When is possession expected?",
    },

    available_from_date: {
      section: "basic_details",
      priority: 7,
      type: "future_date",
      required: true,

      visibleIf: {
        field: "listing_type",
        equals: "Rent",
      },

      dependsOn: ["listing_type"],

      question: "When is the property available from?",
    },

    property_age: {
      section: "basic_details",
      priority: 8,
      type: "single_select",
      required: false,

      visibleIf: {
        field: "property_condition",
        equals: "Resale",
      },

      dependsOn: [
        "listing_type",
        "property_condition",
      ],

      question: "What is the property age?",

      options: [
        "0-1 Years",
        "1-5 Years",
        "5-10 Years",
        "10+ Years",
      ],
    },

    bhk_type: {
      section: "configuration",
      priority: 9,
      type: "single_select",
      required: true,

      visibleIf: {
        field: "property_type",
        notEquals: "Studio Apartment",
      },

      dependsOn: ["property_type"],

      question: "What is the bedroom configuration?",

      options: [
        "1 BHK",
        "2 BHK",
        "3 BHK",
        "4 BHK",
        "5 BHK",
        "6+ BHK",
      ],

      fieldBehavior: {
        permanentlyIrrelevantConditions: true,
      },
    },

    flat_configurations: {
      section: "configuration",
      priority: 10,
      type: "variation_group",
      required: false,

      visibleIf: {
        field: "property_type",
        in: APARTMENT_TYPES,
      },

      dependsOn: ["property_type"],

      repeatable: true,

      entityName: "flat_configuration",

      askAddMore: true,

      addMoreQuestion:
        "Do you want to add another flat configuration?",

      fields: {
        flat_size: {
          type: "measurement",
          question: "What is the flat size?",
          units: ["Sq Ft"],
          required: true,
        },

        property_facing: {
          type: "single_select",
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

        total_price: {
          type: "price",
          question: "What is the total property price?",
          visibleIf: {
            field: "listing_type",
            equals: "Buy",
          },
        },

        monthly_rent: {
          type: "rental_price",
          question: "What is the monthly rent?",
          visibleIf: {
            field: "listing_type",
            equals: "Rent",
          },
        },
      },
    },

    house_configurations: {
      section: "configuration",
      priority: 11,
      type: "variation_group",
      required: false,

      visibleIf: {
        field: "property_type",
        in: HOUSE_TYPES,
      },

      dependsOn: ["property_type"],

      repeatable: true,

      entityName: "house_configuration",

      askAddMore: true,

      addMoreQuestion:
        "Do you want to add another land configuration?",

      fields: {
        land_size: {
          type: "measurement",
          required: true,
          question: "What is the land size?",
          units: [
            "Sq Ft",
            "Sq Yard",
            "Cent",
            "Gunta",
            "Acre",
            "Bigha",
          ],
        },

        built_area: {
          type: "measurement",
          required: true,
          question: "What is the built area?",
          units: ["Sq Ft"],
        },

        property_facing: {
          type: "single_select",
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

        total_price: {
          type: "price",
          question: "What is the total property price?",
          visibleIf: {
            field: "listing_type",
            equals: "Buy",
          },
        },

        monthly_rent: {
          type: "rental_price",
          question: "What is the monthly rent?",
          visibleIf: {
            field: "listing_type",
            equals: "Rent",
          },
        },
      },
    },

    east_measurement: {
      section: "configuration",
      priority: 12,
      type: "measurement",
      required: false,

      visibleIf: {
        field: "property_type",
        in: HOUSE_TYPES,
      },

      dependsOn: ["property_type"],

      question: "What is the east side measurement?",

      units: ["Ft"],
    },

    west_measurement: {
      section: "configuration",
      priority: 13,
      type: "measurement",
      required: false,

      visibleIf: {
        field: "property_type",
        in: HOUSE_TYPES,
      },

      dependsOn: ["property_type"],

      question: "What is the west side measurement?",

      units: ["Ft"],
    },

    north_measurement: {
      section: "configuration",
      priority: 14,
      type: "measurement",
      required: false,

      visibleIf: {
        field: "property_type",
        in: HOUSE_TYPES,
      },

      dependsOn: ["property_type"],

      question: "What is the north side measurement?",

      units: ["Ft"],
    },

    south_measurement: {
      section: "configuration",
      priority: 15,
      type: "measurement",
      required: false,

      visibleIf: {
        field: "property_type",
        in: HOUSE_TYPES,
      },

      dependsOn: ["property_type"],

      question: "What is the south side measurement?",

      units: ["Ft"],
    },

    unit_type: {
      section: "pricing",
      priority: 16,
      type: "measurement_unit",
      required: false,

      visibleIf: {
        field: "listing_type",
        equals: "Buy",
      },

      dependsOn: ["listing_type"],

      question: "Select pricing unit.",

      options: [
        "Sqft",
        "Sqyd",
        "Sqm",
        "Acre",
        "Gunta",
        "Cent",
        "Bigha",
      ],
    },

    price_per_unit: {
      section: "pricing",
      priority: 17,
      type: "price_per_unit",
      required: false,

      visibleIf: {
        field: "listing_type",
        equals: "Buy",
      },

      dependsOn: ["listing_type", "unit_type"],

      question: "What is the price per unit?",
    },

    gated_community: {
      section: "project_details",
      priority: 18,
      type: "single_select",
      required: false,

      question: "Is this inside a gated community?",

      options: ["Yes", "No"],

      invalidateOnChange: [
        "project_name",
        "total_towers",
        "floors_per_tower",
        "total_units",
        "project_land_area",
      ],
    },

    project_name: {
      section: "project_details",
      priority: 19,
      type: "text",
      required: false,

      visibleIf: {
        field: "gated_community",
        equals: "Yes",
      },

      dependsOn: ["gated_community"],

      question: "What is the project or community name?",
    },

    total_towers: {
      section: "project_details",
      priority: 20,
      type: "number",
      required: false,

      visibleIf: {
        and: [
          {
            field: "gated_community",
            equals: "Yes",
          },
          {
            field: "property_type",
            in: APARTMENT_TYPES,
          },
        ],
      },

      dependsOn: [
        "gated_community",
        "property_type",
      ],

      question: "How many towers are in the project?",
    },

    floors_per_tower: {
      section: "project_details",
      priority: 21,
      type: "number",
      required: false,

      visibleIf: {
        and: [
          {
            field: "gated_community",
            equals: "Yes",
          },
          {
            field: "property_type",
            in: APARTMENT_TYPES,
          },
        ],
      },

      dependsOn: [
        "gated_community",
        "property_type",
        "total_towers",
      ],

      question: "How many floors are there per tower?",
    },

    total_units: {
      section: "project_details",
      priority: 22,
      type: "number",
      required: false,

      visibleIf: {
        and: [
          {
            field: "gated_community",
            equals: "Yes",
          },
          {
            field: "property_type",
            in: APARTMENT_TYPES,
          },
        ],
      },

      dependsOn: [
        "gated_community",
        "property_type",
        "total_towers",
      ],

      question: "How many total units are there?",
    },

    project_land_area: {
      section: "project_details",
      priority: 23,
      type: "measurement",
      required: false,

      visibleIf: {
        and: [
          {
            field: "gated_community",
            equals: "Yes",
          },
          {
            field: "property_type",
            in: APARTMENT_TYPES,
          },
        ],
      },

      dependsOn: [
        "gated_community",
        "property_type",
        "total_towers",
      ],

      question: "What is the total project land area?",

      units: ["Acres", "Sq Yard", "Sq Ft"],
    },

    furnishing_status: {
      section: "furnishing",
      priority: 24,
      type: "single_select",
      required: true,

      question: "What is the furnishing status?",

      options: [
        "Unfurnished",
        "Semi Furnished",
        "Fully Furnished",
      ],

      invalidateOnChange: ["furnishing_items"],
    },

    furnishing_items: {
      section: "furnishing",
      priority: 25,
      type: "multi_select",
      required: false,

      visibleIf: {
        field: "furnishing_status",
        in: ["Semi Furnished", "Fully Furnished"],
      },

      dependsOn: ["furnishing_status"],

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

    amenities: {
      section: "furnishing",
      priority: 26,
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

    approvals: {
      section: "furnishing",
      priority: 27,
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

    property_highlights: {
      section: "furnishing",
      priority: 28,
      type: "multi_select",
      required: false,
      maxSelections: 3,

      question: "Select up to 3 property highlights.",

      options: [
        "Verified Property",
        "Featured",
        "Hot Property",
        "Luxury Living",
        "Ready to Move",
        "New Launch",
        "Trending",
      ],
    },

    country: {
      section: "location",
      priority: 29,
      type: "country",
      required: true,

      question: "Which country is the property located in?",
    },

    state: {
      section: "location",
      priority: 30,
      type: "state",
      required: true,

      dependsOn: ["country"],

      question: "Which state is the property located in?",
    },

    city: {
      section: "location",
      priority: 31,
      type: "city",
      required: true,

      dependsOn: ["state"],

      question: "Which city is the property located in?",
    },

    locality: {
      section: "location",
      priority: 32,
      type: "locality",
      required: true,

      dependsOn: ["city"],

      question: "Which locality is the property located in?",
    },

    sub_locality: {
      section: "location",
      priority: 33,
      type: "text",
      required: false,

      dependsOn: ["locality"],

      question: "Any sub locality or area name?",
    },

    landmark: {
      section: "location",
      priority: 34,
      type: "text",
      required: false,

      dependsOn: ["locality"],

      question: "Any nearby landmark?",
    },

    full_address: {
      section: "location",
      priority: 35,
      type: "textarea",
      required: true,

      question: "Please provide the full property address.",
    },

    pincode: {
      section: "location",
      priority: 36,
      type: "pincode",
      required: true,

      dependsOn: ["city"],

      question: "What is the pincode?",
    },

    google_maps_link: {
      section: "location",
      priority: 37,
      type: "url",
      required: false,

      question: "Please share Google Maps link if available.",
    },

    property_description: {
      section: "media",
      priority: 38,
      type: "ai_generated_text",
      required: false,

      question: "AI will generate the property description.",

      generation: {
        enabled: true,
        autoGenerate: true,
        contextualGeneration: true,
        generateFromAllCollectedFields: true,
      },
    },

    media_uploads: {
      section: "media",
      priority: 39,
      type: "media_upload",
      required: false,

      question:
        "Upload property images, videos, brochures or PDFs.",

      extraction: {
        enabled: true,
        autoExtractPropertyData: true,
        autoDetectMissingFields: true,
        continueFromExtractedState: true,
        multiFieldExtraction: true,
        confidenceScoring: true,
      },
    },

    assign_to_nearest_agent: {
      section: "media",
      priority: 40,
      type: "single_select",
      required: false,

      question:
        "Do you want to assign this property to the nearest agent?",

      options: ["Yes", "No"],
    },

    contact_name: {
      section: "media",
      priority: 41,
      type: "text",
      required: false,

      question: "Please share your name.",
    },

    mobile_number: {
      section: "media",
      priority: 42,
      type: "phone",
      required: true,

      question: "Please share your mobile number.",
    },
  },

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
      type: "clear_hidden_child_values",
    },
    {
      type: "prevent_duplicate_questions",
    },
    {
      type: "dynamic_followup_questions",
    },
    {
      type: "recalculate_visibility_after_each_answer",
    },
    {
      type: "prevent_hidden_field_reactivation",
    },
    {
      type: "semantic_field_inference",
    },
    {
      type: "contextual_question_scoring",
    },
    {
      type: "remove_irrelevant_question_branches",
    },
    {
      type: "repeatable_variation_support",
    },
    {
      type: "ai_conversation_orchestration",
    },
    {
      type: "auto_generate_description",
    },
  ],
};

export default residentialFlow;
```

# IMPORTANT

This file now supports:

* Exact Excel-based client logic
* Dynamic apartment vs villa flow
* Proper gated community dependency logic
* Permanent skip handling
* Context locking
* AI conversational orchestration
* Repeatable configurations
* Semantic inference
* Dynamic visibility recalculation
* No irrelevant follow-up questions
* AI-generated descriptions
* Multi-configuration projects
* Human-like AI flow
* Child-question cleanup
* Parent dependency enforcement
* Better AI memory handling

# VERY IMPORTANT

Your engine/types MUST support these newly added structures:

* conversationOrchestrator
* sections
* semanticInference
* skipStateManagement
* variation_group
* repeatable
* fieldBehavior
* contextLocks
* extraction.confidenceThreshold
* supportRepeatableVariations
* ai_conversation_orchestration rule

If your engine does NOT support these yet,
then you must extend:

* types.ts
* resolver.ts
* ruleEngine.ts
* visibilityEngine.ts
* queueBuilder.ts
* extractor.ts

Otherwise TypeScript will show errors.

This is now a REAL conversational AI property workflow,
not a normal form flow.
