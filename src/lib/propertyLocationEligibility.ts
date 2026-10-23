export function hasRequiredLocationHierarchy(location: {
  country_id?: string | null;
  state_id?: string | null;
  district_id?: string | null;
  city_id?: string | null;
  city?: string | null;
  place_id?: string | null;
}) {
  return Boolean(location.country_id && location.state_id && location.district_id &&
    (location.city_id || (location.city?.trim() && location.place_id?.trim())));
}