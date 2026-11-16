import { createContext } from "react";
import type { PartnerCtx } from "@/hooks/usePartnerHotel";

export const PartnerWorkspaceContext = createContext<PartnerCtx | null>(null);