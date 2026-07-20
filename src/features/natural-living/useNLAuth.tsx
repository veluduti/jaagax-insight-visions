import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type NLRole = "customer" | "farmer" | "land_owner" | "admin";

export interface NLProfile {
  id: string;
  user_id: string;
  role: NLRole;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
}

export interface NLKyc {
  id: string;
  user_id: string;
  id_type: string;
  id_number: string;
  id_document_url: string | null;
  address_proof_url: string | null;
  status: "pending" | "approved" | "rejected";
  reviewer_notes: string | null;
}

const sb = supabase as any;

export function useNLAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<NLProfile | null>(null);
  const [kyc, setKyc] = useState<NLKyc | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFor = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null);
      setKyc(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: p }, { data: k }] = await Promise.all([
      sb.from("nl_profiles").select("*").eq("user_id", u.id).maybeSingle(),
      sb
        .from("nl_kyc")
        .select("*")
        .eq("user_id", u.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setProfile(p ?? null);
    setKyc(k ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      setTimeout(() => void loadFor(s?.user ?? null), 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      void loadFor(data.session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [loadFor]);

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, role: NLRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/natural-living/start`,
        data: { nl_role: role },
      },
    });
    if (error || !data.user) return { error };
    // Best-effort profile insert (auth session may or may not be active depending on confirm)
    await sb
      .from("nl_profiles")
      .upsert({ user_id: data.user.id, role }, { onConflict: "user_id" });
    return { error: null };
  };

  const signInWithGoogle = async (next?: string) => {
    const redirectTo = `${window.location.origin}/natural-living/start${
      next ? `?next=${encodeURIComponent(next)}` : ""
    }`;
    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  };

  const resetPassword = async (email: string) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/natural-living/reset-password`,
    });
  };

  const resendVerification = async (email: string) => {
    return supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/natural-living/start` },
    });
  };

  const saveProfile = async (patch: Partial<NLProfile>) => {
    if (!user) return { error: new Error("Not signed in") };
    const { error } = await sb
      .from("nl_profiles")
      .upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" });
    if (!error) await loadFor(user);
    return { error };
  };

  const submitKyc = async (input: {
    id_type: string;
    id_number: string;
    id_document_url?: string | null;
    address_proof_url?: string | null;
  }) => {
    if (!user) return { error: new Error("Not signed in") };
    const { error } = await sb.from("nl_kyc").insert({
      user_id: user.id,
      ...input,
      status: "pending",
    });
    if (!error) await loadFor(user);
    return { error };
  };

  const uploadKycFile = async (file: File, kind: "id" | "address") => {
    if (!user) throw new Error("Not signed in");
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user.id}/nl-${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("kyc-documents")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const signOut = async () => supabase.auth.signOut();

  return {
    user,
    profile,
    kyc,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    resendVerification,
    saveProfile,
    submitKyc,
    uploadKycFile,
    signOut,
    reload: () => loadFor(user),
  };
}
