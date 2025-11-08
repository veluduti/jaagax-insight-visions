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
      agent_reviews: {
        Row: {
          agent_id: string
          created_at: string | null
          feedback: string
          id: string
          property_type: string | null
          rating: number
          reviewer_id: string
          transaction_type: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          feedback: string
          id?: string
          property_type?: string | null
          rating: number
          reviewer_id: string
          transaction_type?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          feedback?: string
          id?: string
          property_type?: string | null
          rating?: number
          reviewer_id?: string
          transaction_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_reviews_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["user_id"]
          },
        ]
      }
      agents: {
        Row: {
          agency_name: string | null
          avg_response_time: string | null
          bio: string | null
          cities_served: string[] | null
          created_at: string | null
          id: string
          languages: string[] | null
          license_id: string | null
          rent_count: number | null
          sales_count: number | null
          specialization: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agency_name?: string | null
          avg_response_time?: string | null
          bio?: string | null
          cities_served?: string[] | null
          created_at?: string | null
          id?: string
          languages?: string[] | null
          license_id?: string | null
          rent_count?: number | null
          sales_count?: number | null
          specialization?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agency_name?: string | null
          avg_response_time?: string | null
          bio?: string | null
          cities_served?: string[] | null
          created_at?: string | null
          id?: string
          languages?: string[] | null
          license_id?: string | null
          rent_count?: number | null
          sales_count?: number | null
          specialization?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      amenities: {
        Row: {
          created_at: string | null
          id: string
          project_id: string | null
          status: string | null
          type: Database["public"]["Enums"]["amenity_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          status?: string | null
          type: Database["public"]["Enums"]["amenity_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["amenity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "amenities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          favorites: number | null
          id: string
          impressions: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          favorites?: number | null
          id?: string
          impressions?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          favorites?: number | null
          id?: string
          impressions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chats: {
        Row: {
          created_at: string | null
          id: string
          message: string
          receiver_id: string | null
          sender_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          receiver_id?: string | null
          sender_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          receiver_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      poi: {
        Row: {
          city: string
          created_at: string | null
          id: string
          lat: number
          lng: number
          name: string
          rating: number | null
          type: Database["public"]["Enums"]["poi_type"]
        }
        Insert: {
          city: string
          created_at?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          rating?: number | null
          type: Database["public"]["Enums"]["poi_type"]
        }
        Update: {
          city?: string
          created_at?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          rating?: number | null
          type?: Database["public"]["Enums"]["poi_type"]
        }
        Relationships: []
      }
      projects: {
        Row: {
          avg_price: number | null
          builder_id: string | null
          city: string
          created_at: string | null
          id: string
          image: string | null
          locality: string
          name: string
          overview: string | null
          rera_id: string | null
          trust_score: number | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          avg_price?: number | null
          builder_id?: string | null
          city: string
          created_at?: string | null
          id?: string
          image?: string | null
          locality: string
          name: string
          overview?: string | null
          rera_id?: string | null
          trust_score?: number | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          avg_price?: number | null
          builder_id?: string | null
          city?: string
          created_at?: string | null
          id?: string
          image?: string | null
          locality?: string
          name?: string
          overview?: string | null
          rera_id?: string | null
          trust_score?: number | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          agent_id: number | null
          area: number | null
          baths: number | null
          beds: number | null
          bhk: number | null
          city: string
          created_at: string | null
          description: string | null
          id: string
          images: string[] | null
          lat: number
          lng: number
          locality: string
          owner_id: string | null
          price: number
          project_id: number | null
          status: string | null
          title: string
          trust_score: number | null
          type: Database["public"]["Enums"]["property_type"]
          updated_at: string | null
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          agent_id?: number | null
          area?: number | null
          baths?: number | null
          beds?: number | null
          bhk?: number | null
          city: string
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          lat: number
          lng: number
          locality: string
          owner_id?: string | null
          price: number
          project_id?: number | null
          status?: string | null
          title: string
          trust_score?: number | null
          type: Database["public"]["Enums"]["property_type"]
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          agent_id?: number | null
          area?: number | null
          baths?: number | null
          beds?: number | null
          bhk?: number | null
          city?: string
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          lat?: number
          lng?: number
          locality?: string
          owner_id?: string | null
          price?: number
          project_id?: number | null
          status?: string | null
          title?: string
          trust_score?: number | null
          type?: Database["public"]["Enums"]["property_type"]
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      towers: {
        Row: {
          created_at: string | null
          floors: number
          id: string
          name: string
          project_id: string | null
        }
        Insert: {
          created_at?: string | null
          floors: number
          id?: string
          name: string
          project_id?: string | null
        }
        Update: {
          created_at?: string | null
          floors?: number
          id?: string
          name?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "towers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          area: number
          bhk: number
          created_at: string | null
          facing: string | null
          id: string
          plan_3d: string | null
          plan_svg: string | null
          price: number
          tower_id: string | null
        }
        Insert: {
          area: number
          bhk: number
          created_at?: string | null
          facing?: string | null
          id?: string
          plan_3d?: string | null
          plan_svg?: string | null
          price: number
          tower_id?: string | null
        }
        Update: {
          area?: number
          bhk?: number
          created_at?: string | null
          facing?: string | null
          id?: string
          plan_3d?: string | null
          plan_svg?: string | null
          price?: number
          tower_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_tower_id_fkey"
            columns: ["tower_id"]
            isOneToOne: false
            referencedRelation: "towers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          area_unit: string | null
          created_at: string | null
          currency: string | null
          id: string
          language: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          area_unit?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          language?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          area_unit?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          language?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      verifications: {
        Row: {
          created_at: string | null
          document_url: string
          id: string
          project_id: string | null
          rera_verified: boolean | null
          status: Database["public"]["Enums"]["verification_status"] | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_url: string
          id?: string
          project_id?: string | null
          rera_verified?: boolean | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_url?: string
          id?: string
          project_id?: string | null
          rera_verified?: boolean | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      amenity_type:
        | "gym"
        | "pool"
        | "parking"
        | "garden"
        | "clubhouse"
        | "playground"
        | "security"
      app_role: "buyer" | "seller" | "builder" | "agent" | "admin"
      poi_type: "metro" | "school" | "hospital" | "mall" | "office" | "airport"
      property_type: "apartment" | "villa" | "plot" | "commercial"
      user_role: "buyer" | "seller" | "builder" | "admin"
      verification_status: "pending" | "verified" | "rejected"
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
      amenity_type: [
        "gym",
        "pool",
        "parking",
        "garden",
        "clubhouse",
        "playground",
        "security",
      ],
      app_role: ["buyer", "seller", "builder", "agent", "admin"],
      poi_type: ["metro", "school", "hospital", "mall", "office", "airport"],
      property_type: ["apartment", "villa", "plot", "commercial"],
      user_role: ["buyer", "seller", "builder", "admin"],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const
