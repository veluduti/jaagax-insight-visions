export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          availability_schedule: Json | null
          created_at: string | null
          id: string
          license_doc: string | null
          rating: number | null
          total_visits: number | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          availability_schedule?: Json | null
          created_at?: string | null
          id?: string
          license_doc?: string | null
          rating?: number | null
          total_visits?: number | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          availability_schedule?: Json | null
          created_at?: string | null
          id?: string
          license_doc?: string | null
          rating?: number | null
          total_visits?: number | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      builders: {
        Row: {
          bank_accounts: Json | null
          company_name: string
          created_at: string | null
          documents: Json | null
          id: string
          rera_id: string | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          bank_accounts?: Json | null
          company_name: string
          created_at?: string | null
          documents?: Json | null
          id?: string
          rera_id?: string | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          bank_accounts?: Json | null
          company_name?: string
          created_at?: string | null
          documents?: Json | null
          id?: string
          rera_id?: string | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "builders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_preferences: {
        Row: {
          bedrooms_max: number | null
          bedrooms_min: number | null
          budget_max: number | null
          budget_min: number | null
          created_at: string | null
          id: string
          preferred_cities: string[] | null
          property_types: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bedrooms_max?: number | null
          bedrooms_min?: number | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          id?: string
          preferred_cities?: string[] | null
          property_types?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bedrooms_max?: number | null
          bedrooms_min?: number | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          id?: string
          preferred_cities?: string[] | null
          property_types?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          assigned_to: string | null
          complainant_id: string
          created_at: string | null
          defendant_id: string | null
          description: string
          id: string
          priority: string
          property_id: string | null
          resolution: string | null
          resolved_at: string | null
          status: string
          ticket_number: string
          type: string
          updated_at: string | null
          visit_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          complainant_id: string
          created_at?: string | null
          defendant_id?: string | null
          description: string
          id?: string
          priority?: string
          property_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          ticket_number?: string
          type: string
          updated_at?: string | null
          visit_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          complainant_id?: string
          created_at?: string | null
          defendant_id?: string | null
          description?: string
          id?: string
          priority?: string
          property_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          ticket_number?: string
          type?: string
          updated_at?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          availability: boolean | null
          created_at: string | null
          id: string
          license_doc: string
          rating: number | null
          updated_at: string | null
          user_id: string
          vehicle_info: Json
        }
        Insert: {
          availability?: boolean | null
          created_at?: string | null
          id?: string
          license_doc: string
          rating?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_info: Json
        }
        Update: {
          availability?: boolean | null
          created_at?: string | null
          id?: string
          license_doc?: string
          rating?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_info?: Json
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          created_at: string | null
          flag_reason: string | null
          id: string
          property_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_type: string
          submitted_by: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          flag_reason?: string | null
          id?: string
          property_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_type: string
          submitted_by: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          flag_reason?: string | null
          id?: string
          property_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_type?: string
          submitted_by?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_queue_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          escrow_flag: boolean | null
          id: string
          paid_at: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          transaction_id: string | null
          updated_at: string | null
          visit_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          escrow_flag?: boolean | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_id?: string | null
          updated_at?: string | null
          visit_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          escrow_flag?: boolean | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_id?: string | null
          updated_at?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          kyc_status: string | null
          name: string
          onboarding_completed: boolean | null
          phone: string | null
          preferred_language: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          kyc_status?: string | null
          name: string
          onboarding_completed?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          kyc_status?: string | null
          name?: string
          onboarding_completed?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          active: boolean | null
          address: string
          area_sqft: number | null
          bathrooms: number | null
          bedrooms: number | null
          builder_id: string
          completion_stage: string | null
          created_at: string | null
          description: string | null
          documents: Json | null
          featured: boolean | null
          floor_plan_url: string | null
          id: string
          images: Json | null
          latitude: number | null
          longitude: number | null
          moderation_status: string | null
          price: number
          property_type: Database["public"]["Enums"]["property_type"]
          rera_id: string | null
          title: string
          trust_score: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address: string
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          builder_id: string
          completion_stage?: string | null
          created_at?: string | null
          description?: string | null
          documents?: Json | null
          featured?: boolean | null
          floor_plan_url?: string | null
          id?: string
          images?: Json | null
          latitude?: number | null
          longitude?: number | null
          moderation_status?: string | null
          price: number
          property_type: Database["public"]["Enums"]["property_type"]
          rera_id?: string | null
          title: string
          trust_score?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          builder_id?: string
          completion_stage?: string | null
          created_at?: string | null
          description?: string | null
          documents?: Json | null
          featured?: boolean | null
          floor_plan_url?: string | null
          id?: string
          images?: Json | null
          latitude?: number | null
          longitude?: number | null
          moderation_status?: string | null
          price?: number
          property_type?: Database["public"]["Enums"]["property_type"]
          rera_id?: string | null
          title?: string
          trust_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_scores: {
        Row: {
          breakdown: Json
          id: string
          last_updated: string | null
          overall_score: number
          property_id: string
        }
        Insert: {
          breakdown?: Json
          id?: string
          last_updated?: string | null
          overall_score: number
          property_id: string
        }
        Update: {
          breakdown?: Json
          id?: string
          last_updated?: string | null
          overall_score?: number
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_scores_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"] | null
          language_pref:
            | Database["public"]["Enums"]["language_preference"]
            | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"] | null
          language_pref?:
            | Database["public"]["Enums"]["language_preference"]
            | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"] | null
          language_pref?:
            | Database["public"]["Enums"]["language_preference"]
            | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      visits: {
        Row: {
          agent_id: string | null
          created_at: string | null
          customer_feedback: string | null
          customer_id: string
          driver_id: string | null
          id: string
          notes: string | null
          property_id: string
          rating: number | null
          scheduled_at: string
          status: Database["public"]["Enums"]["visit_status"] | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          customer_feedback?: string | null
          customer_id: string
          driver_id?: string | null
          id?: string
          notes?: string | null
          property_id: string
          rating?: number | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["visit_status"] | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          customer_feedback?: string | null
          customer_id?: string
          driver_id?: string | null
          id?: string
          notes?: string | null
          property_id?: string
          rating?: number | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["visit_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_agent_id: { Args: { _user_id: string }; Returns: string }
      get_builder_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      kyc_status: "pending" | "verified" | "rejected"
      language_preference: "en" | "te"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      property_type: "apartment" | "villa" | "plot" | "commercial"
      user_role: "builder" | "agent" | "driver" | "customer" | "admin"
      visit_status: "scheduled" | "completed" | "cancelled" | "no_show"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      kyc_status: ["pending", "verified", "rejected"],
      language_preference: ["en", "te"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      property_type: ["apartment", "villa", "plot", "commercial"],
      user_role: ["builder", "agent", "driver", "customer", "admin"],
      visit_status: ["scheduled", "completed", "cancelled", "no_show"],
    },
  },
} as const
