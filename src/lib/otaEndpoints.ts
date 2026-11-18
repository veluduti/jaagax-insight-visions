// JAAGA X API endpoints an OTA calls; shown to Global Admin and hotel partners.
export const apiRoot = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
export const otaEndpoints: [string, string, string, string][] = [
  ["POST", "/integration-api/oauth/token", "Get an access token with the JAAGA X client ID and secret", "—"],
  ["GET", "/integration-api/v1/properties", "Hotel listing details (name, address, location, policies)", "properties:read"],
  ["GET", "/integration-api/v1/rooms", "Room types of the hotel", "inventory:read"],
  ["GET", "/integration-api/v1/rate-plans", "Rate plans of the hotel", "rates:read"],
  ["GET", "/integration-api/v1/availability?from=YYYY-MM-DD&to=YYYY-MM-DD", "Rooms available per date", "inventory:read"],
  ["GET", "/integration-api/v1/rates?from=YYYY-MM-DD&to=YYYY-MM-DD", "Prices per date", "rates:read"],
  ["PUT", "/integration-api/v1/availability", "Update availability (if allowed)", "inventory:write"],
  ["PUT", "/integration-api/v1/rates", "Update prices (if allowed)", "rates:write"],
  ["POST", "/integration-api/v1/reservations", "Create a booking", "reservations:write"],
  ["GET", "/integration-api/v1/reservations/{id}", "Read a booking", "reservations:read"],
  ["PATCH", "/integration-api/v1/reservations/{id}", "Modify a booking", "reservations:write"],
  ["POST", "/integration-api/v1/reservations/{id}/cancel", "Cancel a booking", "reservations:write"],
  ["POST", "/integration-webhooks/{client_id}", "OTA sends signed booking events to JAAGA X", "signed webhook"],
];

