import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export type ProfileType = "buyer" | "agent" | "builder";
export type ProfileStatus = "active" | "pending" | "rejected";

export interface Profile {
  id: string;
  user_id: string;
  type: ProfileType;
  status: ProfileStatus;
  created_at: string;
}

interface ProfileContextValue {
  profiles: Profile[];
  activeProfile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  switchProfile: (profileId: string) => Promise<void>;
  addProfile: (type: ProfileType, extraData?: Record<string, any>) => Promise<{ profile: Profile | null; error: string | null }>;
  hasProfile: (type: ProfileType) => boolean;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

const ACTIVE_KEY = "jaagax.activeProfileId";
const ROLE_PRIORITY: ProfileType[] = ["builder", "agent", "buyer"];

export function ProfileProvider({ children, user }: { children: ReactNode; user: User | null }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfiles = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const [{ data: profileRows }, { data: settingsRow }] = await Promise.all([
        supabase.from("profiles" as any).select("*").eq("user_id", userId).order("created_at"),
        supabase.from("user_settings" as any).select("active_profile_id").eq("user_id", userId).maybeSingle(),
      ]);

      const list = ((profileRows ?? []) as unknown as Profile[]);
      setProfiles(list);

      // Determine active profile: localStorage → user_settings → first by priority
      const storedId = localStorage.getItem(ACTIVE_KEY);
      const settingsId = (settingsRow as any)?.active_profile_id ?? null;

      let active: Profile | null = null;
      if (storedId) active = list.find((p) => p.id === storedId) ?? null;
      if (!active && settingsId) active = list.find((p) => p.id === settingsId) ?? null;
      if (!active && list.length > 0) {
        // Fallback: first active profile by priority, else first in list
        for (const t of ROLE_PRIORITY) {
          const found = list.find((p) => p.type === t && p.status === "active");
          if (found) { active = found; break; }
        }
        if (!active) active = list[0];
      }

      setActiveProfile(active);
      if (active) localStorage.setItem(ACTIVE_KEY, active.id);
    } catch (err) {
      console.error("Failed to load profiles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      void loadProfiles(user.id);
    } else {
      setProfiles([]);
      setActiveProfile(null);
      setLoading(false);
      localStorage.removeItem(ACTIVE_KEY);
    }
  }, [user?.id, loadProfiles]);

  const refresh = useCallback(async () => {
    if (user?.id) await loadProfiles(user.id);
  }, [user?.id, loadProfiles]);

  const switchProfile = useCallback(async (profileId: string) => {
    const target = profiles.find((p) => p.id === profileId);
    if (!target || !user?.id) return;

    // Frontend-first: instant update
    setActiveProfile(target);
    localStorage.setItem(ACTIVE_KEY, profileId);

    // Persist to DB in background (non-blocking)
    void supabase
      .from("user_settings" as any)
      .upsert({ user_id: user.id, active_profile_id: profileId, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) console.error("Failed to persist active profile:", error);
      });
  }, [profiles, user?.id]);

  const hasProfile = useCallback((type: ProfileType) => {
    return profiles.some((p) => p.type === type);
  }, [profiles]);

  const addProfile = useCallback(async (type: ProfileType, extraData?: Record<string, any>) => {
    if (!user?.id) return { profile: null, error: "Not signed in" };
    if (hasProfile(type)) return { profile: null, error: `You already have a ${type} profile` };

    // Insert profile (status auto-enforced by DB trigger: builder=pending, others=active)
    const { data, error } = await supabase
      .from("profiles" as any)
      .insert({ user_id: user.id, type } as any)
      .select()
      .single();

    if (error || !data) {
      return { profile: null, error: error?.message ?? "Failed to create profile" };
    }

    const newProfile = data as unknown as Profile;

    // Insert role-specific data if provided
    if (extraData && Object.keys(extraData).length > 0) {
      const tableMap = { buyer: "buyer_profiles", agent: "agent_profiles", builder: "builder_profiles_data" };
      const table = tableMap[type];
      const { error: extraError } = await supabase
        .from(table as any)
        .insert({ profile_id: newProfile.id, ...extraData } as any);
      if (extraError) console.error(`Failed to insert ${type} extra data:`, extraError);
    }

    setProfiles((prev) => [...prev, newProfile]);
    return { profile: newProfile, error: null };
  }, [user?.id, hasProfile]);

  return (
    <ProfileContext.Provider value={{ profiles, activeProfile, loading, refresh, switchProfile, addProfile, hasProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
