# FINAL CLIENT-ALIGNED RESIDENTIAL FLOW

```ts
// ============================================================
// FINAL CLIENT-ALIGNED RESIDENTIAL FLOW
// EXACT CLIENT EXCEL BEHAVIOR VERSION
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
  // FINAL CLIENT FLOW ORDER
  // ============================================================

  order: [
    "property_type",

    "listed_by",

    "listing_type",

    // BUY FLOW
    "property_condition",
    "property_age",
    "availability_status",
    "possession_date",

    // RENT FLOW
    "available_from_date",

    // AREA
    "flat_size",
    "land_size",
    "built_area",

    // VARIATION
    "add_another_size_variation",

    // PRICING
    "unit_type",
    "price_per_unit",
    "total_price",
    "monthly_rent",

    // PROPERTY DETAILS
    "bhk_type",
    "bathroom_count",
    "balcony_count",

    // FLOOR
    "total_floors",
    "floor_number",

    // PARKING
    "parking_type",
    "parking_count",

    // PROJECT
    "project_name",
    "gated_community",
    "total_towers",
    "floors_per_tower",
    "total_units",
    "project_land_area",

    // FURNISHING
    "furnishing_status",
    "furnishing_items",

    // FACING
    "property_facing",

    // AMENITIES
    "amenities",

    // PAYMENT
    "payment_options",

    // APPROVALS
    "approvals",

    // LOCATION
    "location",
    "google_maps_link",
    "map_location",
    "latitude",
    "longitude",

    // HIGHLIGHTS
    "property_highlights",

    // DESCRIPTION
    "property_description",

    // AGENT
    "assign_nearest_agent",

    // MEDIA
    "media_uploads",

    // CONTACT
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

    property_age: {
      type: "single_select",

      required: true,

      visibleIf: {
        property_condition: ["Resale"],
      },

      question: "What is the property age?",

      options: [
        "0-1 Years",
        "1-5 Years",
        "5-10 Years",
        "10+ Years",
      ],
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

    available_from_date: {
      type: "future_date",

      required: true,

      visibleIf: {
        listing_type: ["Rent"],
      },

      question: "When is the property available from?",
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
        property_type: [
          "Independent House",
          "Villa",
          "Duplex / Triplex",
          "Farm House",
          "Row House / Townhouse",
          "Gated Community House",
        ],
      },

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

      visibleIf: {
        property_type: [
          "Independent House",
          "Villa",
          "Duplex / Triplex",
          "Farm House",
          "Row House / Townhouse",
          "Gated Community House",
        ],
      },

      question: "What is the built area?",

      units: ["Sq Ft"],
    },

    // =========================================================
    // SIZE VARIATIONS
    // =========================================================

    add_another_size_variation: {
      type: "single_select",

      required: false,

      question:
        "Would you like to add another size and pricing variation?",

      options: ["Yes", "No"],

      variationFields: [
        "flat_size",
        "land_size",
        "built_area",
        "total_price",
        "property_facing",
      ],
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

        units: [
          "Sqft",
          "Sqyd",
          "Sqm",
          "Acre",
          "Gunta",
          "Cent",
          "Bigha",
        ],
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
    // PROPERTY DETAILS
    // =========================================================

    bhk_type: {
      type: "single_select",

      required: true,

      visibleIf: {
        property_type: {
          notIn: ["Studio Apartment"],
        },
      },

      question: "What is the bedroom configuration?",

      options: [
        "1 Bed Room",
        "2 Bed Room",
        "3 Bed Room",
        "4 Bed Room",
        "5 Bed Room",
        "6+ Bed Room",
      ],
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

    // =========================================================
    // PARKING
    // =========================================================

    parking_type: {
      type: "single_select",

      required: false,

      question: "What type of parking is available?",

      options: [
        "Covered Parking",
        "Open Parking",
        "Both",
        "No Parking",
      ],
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

      visibleIf: {
        property_type: [
          "Apartment / Flat",
          "Villa",
          "Penthouse",
          "Builder Floor Apartment",
          "Serviced Apartment",
          "Gated Community House",
        ],
      },

      question: "What is the project or community name?",
    },

    gated_community: {
      type: "single_select",

      required: false,

      visibleIf: {
        property_type: [
          "Apartment / Flat",
          "Villa",
          "Penthouse",
          "Builder Floor Apartment",
          "Serviced Apartment",
          "Gated Community House",
        ],
      },

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

      options: [
        "Unfurnished",
        "Semi Furnished",
        "Fully Furnished",
      ],
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
        "Parking",
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
        "Zero Down Payment",
        "Low Booking Amount",
        "Assured Rental Returns",
        "Pre-EMI Support",
        "Premium Bank Tie-Ups",
        "Custom Payment Plans",
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
        "LP Number Available",
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

    google_maps_link: {
      type: "url",

      required: false,

      question: "Please share Google Maps link if available.",
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

      maxSelections: 5,

      question: "Select property highlights or ribbons.",

      options: [
        "Verified Property",
        "Verified Owner",
        "Trusted Agent",
        "RERA Approved",
        "Clear Title",
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
        "Semi Furnished",
        "Family Friendly",
        "Bachelor Friendly",
        "Family Preferred",
        "Pet Friendly",
        "Corner Flat",
        "Corner Property",
        "Park Facing",
        "Nature View",
        "East Facing",
        "Loan Approved",
        "Ready Registration",
        "Limited Units",
        "Limited Offer",
        "Popular",
        "Trending",
        "Most Viewed",
        "New Launch",
        "Newly Renovated",
        "Investment Hotspot",
        "High ROI",
        "Rental Income",
        "Future Growth Area",
        "By Owner",
        "By Agent",
        "By Builder",
        "Negotiable",
      ],
    },

    // =========================================================
    // DESCRIPTION
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
    // AGENT
    // =========================================================

    assign_nearest_agent: {
      type: "single_select",

      required: false,

      question:
        "Would you like to assign this property to the nearest agent?",

      helperText:
        "Agent commission may apply depending on verification status.",

      options: ["Yes", "No"],
    },

    // =========================================================
    // MEDIA
    // =========================================================

    media_uploads: {
      type: "media_upload",

      required: false,

      question:
        "Upload property images, brochures, PDFs or videos.",

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
```

---

# IMPORTANT ENGINE FIX (VERY CRITICAL)

Your flow will STILL fail if engine visibility validation is wrong.

Inside your question resolver engine:

Use this EXACT order:

```ts
if (!isFieldVisible(field, currentAnswers)) {
  continue;
}

if (isFieldAlreadyAnswered(field, currentAnswers)) {
  continue;
}

if (isFieldSkipped(field, currentAnswers)) {
  continue;
}

askField(field);
```

Without this:

AI will still:

* ask hidden questions
* ask gated community fields wrongly
* ask resale fields during rent flow
* ask skipped questions again

This engine validation is mandatory.
