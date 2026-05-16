// ============================================================
// Co-working / Shared Spaces conversational flow config
// FULL CLIENT EXCEL ALIGNED VERSION
// UPDATED + VERIFIED
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
    supportContextualQuestions: true,
    supportConditionalFollowups: true,
    supportNestedWorkspaceVariations: true,
    supportInventoryManagement: true,
    supportAiGeneratedDescriptions: true,
    supportDynamicPricingLogic: true,
    supportWorkspaceAvailabilityLogic: true,
  },

  order: [
    "space_type",
    "listed_by",
    "listing_type",

    "workspace_variations",

    "pricing_model",
    "monthly_rent",
    "price_per_seat",
    "hourly_pricing",
    "daily_pricing",
    "weekly_pricing",
    "security_deposit",

    "availability_status",
    "available_from",

    "workspace_capacity",
    "available_seats",
    "minimum_seats",
    "maximum_seats",

    "commercial_area",
    "built_area",

    "floor_number",
    "total_floors",

    "office_infrastructure",

    "meeting_rooms",
    "conference_rooms",
    "private_cabins",
    "shared_cabins",
    "hot_desks",
    "dedicated_desks",
    "event_spaces",
    "training_rooms",
    "interview_cabins",

    "operating_hours",
    "working_days",
    "weekend_access",
    "holiday_access",
    "visitor_timing",

    "furnishing_status",
    "furnishing_items",

    "internet_speed",
    "power_backup",
    "air_conditioning",

    "cafeteria_available",
    "parking_available",
    "reception_available",

    "amenities",

    "virtual_office_services",

    "meeting_room_features",

    "community_features",

    "suitable_for",

    "membership_options",

    "lockin_period",
    "notice_period",
    "minimum_booking_duration",
    "maximum_booking_duration",

    "payment_options",

    "approvals",

    "location",

    "map_location",
    "latitude",
    "longitude",

    "business_connectivity",

    "nearby_landmarks",

    "property_highlights",

    "property_description",

    "assign_nearest_agent",

    "media_uploads",

    "contact_name",
    "mobile_number",
  ],

  fields: {
    // =========================================================
    // SPACE TYPE
    // =========================================================

    space_type: {
      type: "multi_select",

      required: true,

      question: "What types of coworking or shared spaces are available?",

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
        "Meeting Room",
        "Conference Hall",
        "Interview Cabin",
        "Training Room",
        "Event Space",
        "Flexible Workspace",
        "Shared Cabin",
      ],

      smartSuggestions: {
        enabled: true,
        searchable: true,
        chips: true,
      },
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
    // WORKSPACE VARIATIONS
    // =========================================================

    workspace_variations: {
      type: "repeatable_group",

      required: false,

      question: "Would you like to add multiple workspace types, cabins or seating variations?",

      repeatFields: [
        "space_type",
        "workspace_capacity",
        "available_seats",
        "pricing_model",
        "monthly_rent",
        "price_per_seat",
      ],

      allowDynamicCopies: true,
    },

    // =========================================================
    // PRICING MODELS
    // =========================================================

    pricing_model: {
      type: "multi_select",

      required: true,

      question: "What pricing models are available?",

      options: ["Per Seat", "Per Cabin", "Per Day", "Per Hour", "Monthly", "Quarterly", "Yearly"],
    },

    monthly_rent: {
      type: "rental_price",

      required: false,

      visibleIf: {
        pricing_model: ["Monthly", "Quarterly", "Yearly"],
      },

      question: "What is the monthly or membership pricing?",
    },

    price_per_seat: {
      type: "price",

      required: false,

      visibleIf: {
        pricing_model: ["Per Seat"],
      },

      question: "What is the price per seat?",
    },

    hourly_pricing: {
      type: "price",

      required: false,

      visibleIf: {
        pricing_model: ["Per Hour"],
      },

      question: "What is the hourly pricing?",
    },

    daily_pricing: {
      type: "price",

      required: false,

      visibleIf: {
        pricing_model: ["Per Day"],
      },

      question: "What is the daily pricing?",
    },

    weekly_pricing: {
      type: "price",

      required: false,

      visibleIf: {
        pricing_model: ["Weekly"],
      },

      question: "What is the weekly pricing?",
    },

    security_deposit: {
      type: "price",

      required: false,

      question: "What is the security deposit amount?",

      allowSkip: true,
    },

    // =========================================================
    // AVAILABILITY
    // =========================================================

    availability_status: {
      type: "single_select",

      required: true,

      question: "What is the current availability status?",

      options: ["Immediate Availability", "Available Soon", "Limited Seats", "Fully Occupied", "Waitlist Available"],
    },

    available_from: {
      type: "future_date",

      required: false,

      visibleIf: {
        availability_status: ["Available Soon"],
      },

      question: "When will the workspace be available?",
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

      question: "Minimum number of seats that can be booked?",
    },

    maximum_seats: {
      type: "number",

      required: false,

      question: "Maximum number of seats that can be booked?",
    },

    // =========================================================
    // AREA
    // =========================================================

    commercial_area: {
      type: "measurement",

      required: true,

      question: "What is the workspace area size?",

      units: ["Sq Ft", "Sq Yard", "Sqm"],
    },

    built_area: {
      type: "measurement",

      required: false,

      question: "What is the built-up area?",

      units: ["Sq Ft", "Sq Yard"],
    },

    floor_number: {
      type: "number",

      required: false,

      question: "Which floor is the workspace on?",
    },

    total_floors: {
      type: "number",

      required: false,

      question: "How many total floors are there in the building?",
    },

    // =========================================================
    // INFRASTRUCTURE
    // =========================================================

    office_infrastructure: {
      type: "multi_select",

      required: false,

      question: "What office infrastructure is available?",

      options: [
        "Conference Rooms",
        "Meeting Rooms",
        "Pantry",
        "Cafeteria",
        "Lounge",
        "Event Space",
        "Interview Rooms",
        "Printing Zone",
        "Phone Booth",
        "Lockers",
      ],
    },

    // =========================================================
    // WORKSPACE DETAILS
    // =========================================================

    meeting_rooms: {
      type: "number",

      required: false,

      visibleIf: {
        space_type: ["Meeting Room"],
      },

      question: "How many meeting rooms are available?",
    },

    conference_rooms: {
      type: "number",

      required: false,

      visibleIf: {
        space_type: ["Conference Hall"],
      },

      question: "How many conference halls are available?",
    },

    private_cabins: {
      type: "number",

      required: false,

      visibleIf: {
        space_type: ["Private Office"],
      },

      question: "How many private cabins are available?",
    },

    shared_cabins: {
      type: "number",

      required: false,

      visibleIf: {
        space_type: ["Shared Cabin"],
      },

      question: "How many shared cabins are available?",
    },

    hot_desks: {
      type: "number",

      required: false,

      visibleIf: {
        space_type: ["Hot Desk"],
      },

      question: "How many hot desks are available?",
    },

    dedicated_desks: {
      type: "number",

      required: false,

      visibleIf: {
        space_type: ["Dedicated Desk"],
      },

      question: "How many dedicated desks are available?",
    },

    event_spaces: {
      type: "number",

      required: false,

      visibleIf: {
        space_type: ["Event Space"],
      },

      question: "How many event spaces are available?",
    },

    training_rooms: {
      type: "number",

      required: false,

      visibleIf: {
        space_type: ["Training Room"],
      },

      question: "How many training rooms are available?",
    },

    interview_cabins: {
      type: "number",

      required: false,

      visibleIf: {
        space_type: ["Interview Cabin"],
      },

      question: "How many interview cabins are available?",
    },

    // =========================================================
    // OPERATIONS
    // =========================================================

    operating_hours: {
      type: "single_select",

      required: false,

      question: "What are the workspace operating hours?",

      options: ["24/7", "Business Hours Only", "Flexible Access", "Custom Timings"],
    },

    working_days: {
      type: "multi_select",

      required: false,

      question: "Which working days are supported?",

      options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    },

    weekend_access: {
      type: "single_select",

      required: false,

      question: "Is weekend access available?",

      options: ["Yes", "No"],
    },

    holiday_access: {
      type: "single_select",

      required: false,

      question: "Is holiday access available?",

      options: ["Yes", "No"],
    },

    visitor_timing: {
      type: "text",

      required: false,

      question: "Visitor timing restrictions if any?",
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

      options: ["50 Mbps", "100 Mbps", "200 Mbps", "500 Mbps", "1 Gbps"],
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
    // VIRTUAL OFFICE
    // =========================================================

    virtual_office_services: {
      type: "multi_select",

      required: false,

      visibleIf: {
        space_type: ["Virtual Office"],
      },

      question: "What virtual office services are available?",

      options: [
        "Business Address",
        "GST Registration Support",
        "Mail Handling",
        "Reception Support",
        "Company Registration Support",
      ],
    },

    // =========================================================
    // MEETING ROOM FEATURES
    // =========================================================

    meeting_room_features: {
      type: "multi_select",

      required: false,

      visibleIf: {
        space_type: ["Meeting Room"],
      },

      question: "What meeting room features are available?",

      options: ["Projector", "Video Conferencing", "Whiteboard", "Speaker System", "Screen Sharing"],
    },

    // =========================================================
    // COMMUNITY
    // =========================================================

    community_features: {
      type: "multi_select",

      required: false,

      question: "What community features are available?",

      options: ["Networking Events", "Startup Ecosystem", "Mentor Sessions", "Investor Network", "Community Meetups"],
    },

    // =========================================================
    // SUITABLE FOR
    // =========================================================

    suitable_for: {
      type: "multi_select",

      required: false,

      question: "Who is this workspace suitable for?",

      options: [
        "Startups",
        "Freelancers",
        "IT Companies",
        "Remote Teams",
        "Consultants",
        "Enterprises",
        "Training Institutes",
      ],
    },

    // =========================================================
    // MEMBERSHIP
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
    // CONTRACT
    // =========================================================

    lockin_period: {
      type: "text",

      required: false,

      question: "What is the lock-in period?",
    },

    notice_period: {
      type: "text",

      required: false,

      question: "What is the notice period?",
    },

    minimum_booking_duration: {
      type: "text",

      required: false,

      question: "Minimum booking duration?",
    },

    maximum_booking_duration: {
      type: "text",

      required: false,

      question: "Maximum booking duration?",
    },

    // =========================================================
    // PAYMENT
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

      options: ["Trade License", "Fire Safety Approved", "Occupancy Certificate", "RERA Approved", "ISO Certified"],
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
    // BUSINESS CONNECTIVITY
    // =========================================================

    business_connectivity: {
      type: "multi_select",

      required: false,

      question: "Select nearby business connectivity options.",

      options: [
        "Near Metro",
        "Near IT Park",
        "Near Airport",
        "Near Business District",
        "Near Startup Hub",
        "Near Corporate Zone",
      ],
    },

    // =========================================================
    // LANDMARKS
    // =========================================================

    nearby_landmarks: {
      type: "multi_select",

      required: false,

      question: "What nearby landmarks are available?",

      options: ["Near Bus Stop", "Near Railway Station", "Near Mall", "Near Restaurant"],
    },

    // =========================================================
    // HIGHLIGHTS
    // =========================================================

    property_highlights: {
      type: "multi_select",

      required: false,

      maxSelections: 3,

      question: "Select workspace highlights.",

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
    // DESCRIPTION
    // =========================================================

    property_description: {
      type: "textarea",

      required: false,

      question: "Workspace description",

      aiGenerated: true,

      autoGenerate: true,

      allowEditing: true,
    },

    // =========================================================
    // AGENT
    // =========================================================

    assign_nearest_agent: {
      type: "single_select",

      required: false,

      question: "Would you like to assign this workspace to the nearest agent?",

      options: ["Yes", "No"],
    },

    // =========================================================
    // MEDIA
    // =========================================================

    media_uploads: {
      type: "media_upload",

      required: false,

      question: "Upload workspace images, cabin photos, brochures, videos or documents.",

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

  // =========================================================
  // RULES
  // =========================================================

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
      type: "multiple_workspace_variations",
    },

    {
      type: "dynamic_workspace_inventory",
    },

    {
      type: "context_aware_questioning",
    },

    {
      type: "dynamic_pricing_logic",
    },

    {
      type: "workspace_availability_management",
    },

    {
      type: "ai_generate_property_description",
    },
  ],
};

export default coworkingSharedSpacesFlow;
export { coworkingSharedSpacesFlow as coworkingFlow };
