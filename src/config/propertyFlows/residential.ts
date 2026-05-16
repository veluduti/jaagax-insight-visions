// ============================================================
// Residential conversational flow config
// FULL CLIENT-ALIGNED ENTERPRISE AI VERSION
// FINAL ADVANCED CLIENT REQUIREMENT VERSION
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
    supportCategoryAwareQuestioning: true,
    supportBuilderFlow: true,
    supportRentalFlow: true,
    supportResaleFlow: true,
    supportConstructionFlow: true,
    supportMapBasedLocation: true,
    supportConnectivityIntelligence: true,
  },

  order: [
    "property_type",
    "listed_by",
    "listing_type",

    "property_variants",

    "total_price",
    "unit_type",
    "price_per_unit",

    "monthly_rent",
    "security_deposit",
    "maintenance_charges",
    "lease_duration",
    "notice_period",
    "preferred_tenants",
    "bachelors_allowed",
    "pet_friendly",
    "available_from",

    "property_condition",
    "property_age",

    "availability_status",
    "construction_stage",
    "completion_percentage",
    "possession_type",
    "possession_date",

    "flat_size",
    "floor_number",
    "total_floors",

    "land_size",
    "built_area",

    "bhk_type",
    "bathroom_count",
    "balcony_count",

    "study_room",
    "pooja_room",
    "servant_room",
    "utility_room",

    "parking_type",
    "parking_count",

    "water_supply",
    "power_backup_details",

    "property_facing",
    "vastu_compliant",
    "corner_property",

    "ownership_type",

    "occupancy_status",

    "project_name",

    "builder_name",
    "project_launch_status",

    "gated_community",
    "tower_name",
    "total_towers",
    "floors_per_tower",
    "total_units",
    "project_land_area",

    "furnishing_status",
    "furnishing_items",

    "amenities",

    "connectivity",

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
    // PROPERTY VARIANTS
    // =========================================================

    property_variants: {
      type: "repeatable_group",

      required: false,

      question: "Would you like to add multiple unit or pricing variations?",

      repeatFields: ["bhk_type", "flat_size", "built_area", "floor_number", "price_per_unit", "total_price"],

      allowDynamicCopies: true,
    },

    // =========================================================
    // BUY PRICE
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

    // =========================================================
    // RENT FLOW
    // =========================================================

    monthly_rent: {
      type: "rental_price",

      required: true,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "What is the monthly rent?",
    },

    security_deposit: {
      type: "price",

      required: false,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "What is the security deposit amount?",
    },

    maintenance_charges: {
      type: "price",

      required: false,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "What are the monthly maintenance charges?",
    },

    lease_duration: {
      type: "single_select",

      required: false,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "Preferred lease duration?",

      options: ["6 Months", "11 Months", "1 Year", "2 Years", "3+ Years"],
    },

    notice_period: {
      type: "single_select",

      required: false,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "What is the notice period?",

      options: ["15 Days", "1 Month", "2 Months", "3 Months"],
    },

    preferred_tenants: {
      type: "multi_select",

      required: false,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "Preferred tenant types?",

      options: ["Family", "Bachelors", "Students", "Working Professionals", "Company Lease"],
    },

    bachelors_allowed: {
      type: "single_select",

      required: false,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "Are bachelors allowed?",

      options: ["Yes", "No"],
    },

    pet_friendly: {
      type: "single_select",

      required: false,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "Is the property pet friendly?",

      options: ["Yes", "No"],
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

    occupancy_status: {
      type: "single_select",

      required: false,

      visibleIf: {
        property_condition: ["Resale"],
      },

      question: "Current occupancy status?",

      options: ["Vacant", "Owner Occupied", "Tenant Occupied"],
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

    construction_stage: {
      type: "single_select",

      required: false,

      visibleIf: {
        availability_status: ["Under Construction"],
      },

      question: "What is the construction stage?",

      options: ["Foundation", "Structure Completed", "Finishing Stage", "Near Completion"],
    },

    completion_percentage: {
      type: "number",

      required: false,

      visibleIf: {
        availability_status: ["Under Construction"],
      },

      question: "What is the construction completion percentage?",
    },

    possession_type: {
      type: "single_select",

      required: false,

      visibleIf: {
        availability_status: ["Under Construction"],
      },

      question: "Expected possession timeline?",

      options: ["Immediate", "Within 3 Months", "Within 6 Months", "Future Date"],
    },

    possession_date: {
      type: "future_date",

      required: false,

      visibleIf: {
        possession_type: ["Future Date"],
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

      question: "How many total floors are there?",
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
    // BHK & ROOMS
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

    study_room: {
      type: "single_select",

      required: false,

      question: "Is a study room available?",

      options: ["Yes", "No"],
    },

    pooja_room: {
      type: "single_select",

      required: false,

      question: "Is a pooja room available?",

      options: ["Yes", "No"],
    },

    servant_room: {
      type: "single_select",

      required: false,

      question: "Is a servant room available?",

      options: ["Yes", "No"],
    },

    utility_room: {
      type: "single_select",

      required: false,

      question: "Is a utility room available?",

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

      options: ["1", "2", "3", "4+"],
    },

    // =========================================================
    // UTILITIES
    // =========================================================

    water_supply: {
      type: "multi_select",

      required: false,

      question: "What water supply sources are available?",

      options: ["Borewell", "Municipal Water", "Tanker Water", "24/7 Water", "Corporation Water"],
    },

    power_backup_details: {
      type: "single_select",

      required: false,

      question: "Power backup availability?",

      options: ["Full Backup", "Partial Backup", "Common Area Backup", "No Backup"],
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

    vastu_compliant: {
      type: "single_select",

      required: false,

      question: "Is the property vastu compliant?",

      options: ["Yes", "No"],
    },

    corner_property: {
      type: "single_select",

      required: false,

      question: "Is this a corner property?",

      options: ["Yes", "No"],
    },

    // =========================================================
    // OWNERSHIP
    // =========================================================

    ownership_type: {
      type: "single_select",

      required: false,

      question: "Ownership type?",

      options: ["Freehold", "Leasehold", "Co-operative Society"],
    },

    // =========================================================
    // PROJECT
    // =========================================================

    project_name: {
      type: "text",

      required: false,

      question: "Project or community name?",
    },

    builder_name: {
      type: "text",

      required: false,

      visibleIf: {
        listed_by: ["Builder"],
      },

      question: "What is the builder name?",
    },

    project_launch_status: {
      type: "single_select",

      required: false,

      visibleIf: {
        listed_by: ["Builder"],
      },

      question: "What is the project launch status?",

      options: ["New Launch", "Ongoing", "Ready to Move"],
    },

    gated_community: {
      type: "single_select",

      required: false,

      question: "Is this inside a gated community?",

      options: ["Yes", "No"],
    },

    tower_name: {
      type: "text",

      required: false,

      visibleIf: {
        property_type: ["Apartment / Flat"],
      },

      question: "Tower or block name?",
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

      options: [
        "AC",
        "Wardrobes",
        "Modular Kitchen",
        "Geysers",
        "Beds",
        "Sofa",
        "Dining Table",
        "TV",
        "Refrigerator",
        "Washing Machine",
      ],
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
        "Jogging Track",
        "Indoor Games",
        "Guest Rooms",
        "Mini Theater",
        "EV Charging",
        "Solar Power",
        "Co-working Lounge",
      ],
    },

    // =========================================================
    // CONNECTIVITY
    // =========================================================

    connectivity: {
      type: "multi_select",

      required: false,

      question: "What nearby connectivity options are available?",

      options: [
        "Near Metro",
        "Near School",
        "Near Hospital",
        "Near IT Park",
        "Near Highway",
        "Near Airport",
        "Near Shopping Mall",
      ],
    },

    // =========================================================
    // PAYMENT
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
        "Occupancy Certificate",
        "Completion Certificate",
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
    },

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
    // HIGHLIGHTS
    // =========================================================

    property_highlights: {
      type: "multi_select",

      required: false,

      maxSelections: 3,

      question: "Select property highlights.",

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
    // DESCRIPTION
    // =========================================================

    property_description: {
      type: "ai_generated_text",

      required: false,

      question: "AI will generate property description.",

      generation: {
        enabled: true,
        autoGenerate: true,
        regenerateOnFieldChange: true,
      },
    },

    // =========================================================
    // AGENT
    // =========================================================

    assign_nearest_agent: {
      type: "single_select",

      required: false,

      question: "Would you like to assign this property to nearest agent?",

      options: ["Yes", "No"],
    },

    // =========================================================
    // MEDIA
    // =========================================================

    media_uploads: {
      type: "media_upload",

      required: false,

      question: "Upload property images, floor plans, brochures, videos or documents.",

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
    },

    mobile_number: {
      type: "phone",

      required: true,

      question: "Please share your mobile number.",
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

    {
      type: "category_aware_followups",
    },

    {
      type: "builder_specific_flow_engine",
    },

    {
      type: "rental_logic_engine",
    },

    {
      type: "construction_progress_engine",
    },
  ],
};

export default residentialFlow;
