// Stub: advertisements table does not exist in current schema
// To enable this feature, create the advertisements table via migration

import { toast } from "sonner";

export const seedAdvertisements = async () => {
  console.log("seedAdvertisements: advertisements table not available in current schema");
  toast.info("Advertisements feature not available - table does not exist");
  return { success: false, message: "advertisements table does not exist" };
};

export default seedAdvertisements;
