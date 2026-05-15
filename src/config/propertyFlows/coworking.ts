// ============================================================
// Co-working / Shared Spaces conversational flow config
// CLIENT EXCEL ALIGNED VERSION
// ============================================================

import type { PropertyFlowConfig } from "@/engines/types";

export const coworkingSharedSpacesFlow: PropertyFlowConfig = {
  category: "coworking",

  label: "Co-working / Shared Spaces",

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
    "space_type",
    "listed_by",
    "listing_type",

    "monthly_rent",
    "price_per_seat",
    "security_deposit",
    "available_from",

    "workspace_capacity",
    "available_seats",
    "minimum_seats",

    "commercial_area",
    "built_area",

    "floor_number",
    "total_floors",

    "meeting_rooms",
    "conference_rooms",
    "private_cabins",
    "hot_desks",
    "dedicated_desks",

    "operating_hours",
    "working_days",

    "furnishing_status",
    "furnishing_items",

    "internet_speed",
    "power_backup",
    "air_conditioning",

    "cafeteria_available",
    "parking_available",
    "reception_available",

    "amenities",

    "membership_options",

    "payment_options",

    "approvals",

    "location",

    "map_location",
    "latitude",
    "longitude",

    "nearby_landmarks",

    "property_highlights",

    "media_uploads",

    "contact_name",
    "mobile_number",
  ],

  fields: {
    // =========================================================
    // SPACE TYPE
    // =========================================================

    space_type: {
      type: "single_select",

      required: true,

      question: "What type of co-working or shared space are you listing?",

      options: [
        "Coworking Space",
        "Shared Office",
        "Managed Office",
        "Private Office",
        "Dedicated Desk",
        "Hot Desk",
        "Virtual Office",
        "Business Center",
        "Startup Hub",
        "Incubation Center",
        "Training Center",
        "Shared Studio",
      ],
    },

    // =========================================================
    // LISTED BY
    // =========================================================

    listed_by: {
      type: "single_select",

      required: true,

      question: "Who are you listing this property as?",

      options: ["Owner", "Operator", "Agent", "Developer"],
    },

    // =========================================================
    // LISTING TYPE
    // =========================================================

    listing_type: {
      type: "single_select",

      required: true,

      question: "What type of listing is this?",

      options: ["Rent", "Membership", "Lease"],
    },

    // =========================================================
    // PRICING
    // =========================================================

    monthly_rent: {
      type: "rental_price",

      required: true,

      question: "What is the monthly rent or membership price?",

      smartSuggestions: {
        enabled: true,
        realtime: true,
        searchable: true,
        chips: true,
        type: "rental_duration_suggestions",

        durations: [
          "Per Seat / Month",
          "Monthly",
          "Weekly",
          "Daily",
          "Hourly",
          "Yearly",
        ],
      },
    },

    price_per_seat: {
      type: "price",

      required: false,

      question: "What is the price per seat?",

      smartSuggestions: {
        enabled: true,
        realtime: true,
        searchable: true,
        chips: true,
        type: "indian_price_format",
      },
    },

    security_deposit: {
      type: "price",

      required: false,

      question: "What is the security deposit amount?",

      allowSkip: true,

      smartSuggestions: {
        enabled: true,
        realtime: true,
        chips: true,
        type: "indian_price_format",
      },
    },

    available_from: {
      type: "future_date",

      required: true,

      question: "When will the space be available?",
    },

    // =========================================================
    // CAPACITY
    // =========================================================

    workspace_capacity: {
      type: "number",

      required: true,

      question: "What is the total workspace capacity?",
    },

    available_seats: {
      type: "number",

      required: true,

      question: "How many seats are currently available?",
    },

    minimum_seats: {
      type: "number",

      required: false,

      question: "What is the minimum number of seats that can be booked?",

      allowSkip: true,
    },

    // =========================================================
    // AREA
    // =========================================================

    commercial_area: {
      type: "measurement",

      required: true,

      question: "What is the workspace area size?",

      units: ["Sq Ft", "Sq Yard", "Sqm"],

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

    floor_number: {
      type: "number",

      required: false,

      question: "Which floor is the workspace on?",

      allowSkip: true,
    },

    total_floors: {
      type: "number",

      required: false,

      question: "How many total floors are there in the building?",

      allowSkip: true,
    },

    // =========================================================
    // WORKSPACE DETAILS
    // =========================================================

    meeting_rooms: {
      type: "number",

      required: false,

      question: "How many meeting rooms are available?",

      allowSkip: true,
    },

    conference_rooms: {
      type: "number",

      required: false,

      question: "How many conference rooms are available?",

      allowSkip: true,
    },

    private_cabins: {
      type: "number",

      required: false,

      question: "How many private cabins are available?",

      allowSkip: true,
    },

    hot_desks: {
      type: "number",

      required: false,

      question: "How many hot desks are available?",

      allowSkip: true,
    },

    dedicated_desks: {
      type: "number",

      required: false,

      question: "How many dedicated desks are available?",

      allowSkip: true,
    },

    // =========================================================
    // WORKING HOURS
    // =========================================================

    operating_hours: {
      type: "single_select",

      required: false,

      question: "What are the operating hours?",

      options: [
        "24/7",
        "Business Hours Only",
        "Flexible Access",
        "Custom Timings",
      ],
    },

    working_days: {
      type: "multi_select",

      required: false,

      question: "Which working days are supported?",

      options: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
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
        furnishing_status: [
          "Semi Furnished",
          "Fully Furnished",
        ],
      },

      question: "What furnishing items are included?",

      options: [
        "Workstations",
        "Office Chairs",
        "Conference Tables",
        "Reception Desk",
        "Storage Cabinets",
        "Projector",
        "Printer",
        "Whiteboards",
        "Lockers",
        "UPS",
        "Server Room",
        "AC",
      ],
    },

    // =========================================================
    // UTILITIES
    // =========================================================

    internet_speed: {
      type: "single_select",

      required: false,

      question: "What internet speed is available?",

      options: [
        "50 Mbps",
        "100 Mbps",
        "200 Mbps",
        "500 Mbps",
        "1 Gbps",
      ],
    },

    power_backup: {
      type: "single_select",

      required: false,

      question: "Is power backup available?",

      options: ["Full Backup", "Partial Backup", "No"],
    },

    air_conditioning: {
      type: "single_select",

      required: false,

      question: "Air conditioning availability?",

      options: ["Central AC", "Split AC", "No AC"],
    },

    cafeteria_available: {
      type: "single_select",

      required: false,

      question: "Is cafeteria or pantry available?",

      options: ["Yes", "No"],
    },

    parking_available: {
      type: "single_select",

      required: false,

      question: "Is parking available?",

      options: ["Yes", "No", "Paid Parking"],
    },

    reception_available: {
      type: "single_select",

      required: false,

      question: "Is reception support available?",

      options: ["Yes", "No"],
    },

    // =========================================================
    // AMENITIES
    // =========================================================

    amenities: {
      type: "multi_select",

      required: false,

      question: "What amenities are available?",

      options: [
        "High-Speed Internet",
        "Conference Rooms",
        "Meeting Rooms",
        "Printer",
        "Scanner",
        "Reception",
        "Security",
        "CCTV",
        "Pantry",
        "Cafeteria",
        "Parking",
        "Housekeeping",
        "Power Backup",
        "Lift",
        "Lounge Area",
        "Gaming Zone",
      ],
    },

    // =========================================================
    // MEMBERSHIP OPTIONS
    // =========================================================

    membership_options: {
      type: "multi_select",

      required: false,

      question: "What membership options are available?",

      options: [
        "Daily Pass",
        "Weekly Pass",
        "Monthly Membership",
        "Dedicated Desk",
        "Private Cabin",
        "Virtual Office",
        "Enterprise Plan",
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
        "Monthly Billing",
        "Quarterly Billing",
        "Yearly Billing",
        "Flexible Contracts",
        "No Lock-In",
        "Security Deposit",
        "EMI Available",
        "Corporate Plans",
      ],
    },

    // =========================================================
    // APPROVALS
    // =========================================================

    approvals: {
      type: "multi_select",

      required: false,

      question: "What approvals or certifications are available?",

      options: [
        "Trade License",
        "Fire Safety Approved",
        "Occupancy Certificate",
        "RERA Approved",
        "ISO Certified",
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

      question: "Would you like to pin the workspace location on map?",

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
    // LANDMARKS
    // =========================================================

    nearby_landmarks: {
      type: "multi_select",

      required: false,

      question: "What nearby landmarks are available?",

      options: [
        "Near Metro",
        "Near IT Park",
        "Near Airport",
        "Near Bus Stop",
        "Near Railway Station",
        "Near Mall",
        "Near Restaurant",
      ],
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
        "Premium Workspace",
        "24/7 Access",
        "Near Metro",
        "High-Speed Internet",
        "Flexible Membership",
        "Startup Friendly",
        "Fully Furnished",
        "Ready to Move",
        "Corporate Ready",
        "Hot Property",
        "Best Deal",
      ],
    },

    // =========================================================
    // MEDIA
    // =========================================================

    media_uploads: {
      type: "media_upload",

      required: false,

      question: "Upload workspace images, brochures, PDFs or documents.",

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
  ],
};

export default coworkingSharedSpacesFlow;
export { coworkingSharedSpacesFlow as coworkingFlow };
