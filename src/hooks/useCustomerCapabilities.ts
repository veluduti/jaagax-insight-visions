import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

export interface CustomerCapabilities {
  /** Signed-in and part of the unified Customer experience */
  isCustomer: boolean;
  canBuy: boolean;
  canSell: boolean;
  canBuild: boolean;
}

const CUSTOMER_ROLES = ["customer", "buyer", "seller", "builder"];

/**
 * Single source of truth for what a signed-in Customer can do.
 * Components should ask for a capability instead of reading the raw role,
 * because buyer / seller / builder are all presented as one "Customer" profile.
 */
export const useCustomerCapabilities = (): CustomerCapabilities => {
  const { user, role } = useAuth();

  return useMemo(() => {
    const isCustomer = Boolean(user) && (!role || CUSTOMER_ROLES.includes(role));
    return {
      isCustomer,
      canBuy: isCustomer,
      canSell: isCustomer,
      canBuild: isCustomer,
    };
  }, [user, role]);
};

export default useCustomerCapabilities;
