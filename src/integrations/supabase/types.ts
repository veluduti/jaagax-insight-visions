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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ad_interactions: {
        Row: {
          ad_id: string
          created_at: string | null
          id: string
          interaction_type: string
          user_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string | null
          id?: string
          interaction_type: string
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string | null
          id?: string
          interaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_interactions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisements: {
        Row: {
          ad_type: string
          builder_id: string | null
          clicks: number | null
          contacts: number | null
          created_at: string | null
          cta_text: string | null
          description: string | null
          end_date: string | null
          featured: boolean | null
          highlights: string[] | null
          id: string
          images: string[] | null
          impressions: number | null
          offer_text: string | null
          priority: number | null
          project_id: string | null
          property_id: string | null
          saves: number | null
          start_date: string | null
          status: string
          tagline: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ad_type?: string
          builder_id?: string | null
          clicks?: number | null
          contacts?: number | null
          created_at?: string | null
          cta_text?: string | null
          description?: string | null
          end_date?: string | null
          featured?: boolean | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          impressions?: number | null
          offer_text?: string | null
          priority?: number | null
          project_id?: string | null
          property_id?: string | null
          saves?: number | null
          start_date?: string | null
          status?: string
          tagline?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ad_type?: string
          builder_id?: string | null
          clicks?: number | null
          contacts?: number | null
          created_at?: string | null
          cta_text?: string | null
          description?: string | null
          end_date?: string | null
          featured?: boolean | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          impressions?: number | null
          offer_text?: string | null
          priority?: number | null
          project_id?: string | null
          property_id?: string | null
          saves?: number | null
          start_date?: string | null
          status?: string
          tagline?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_profiles: {
        Row: {
          amenities: string[] | null
          builder_name: string
          certifications: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          images: string[] | null
          locations: string[] | null
          number_of_projects: number | null
          phone: string
          price_range_max: number | null
          price_range_min: number | null
          rera_number: string | null
          tagline: string | null
          type: string
          unit_types: string[] | null
          updated_at: string
          user_id: string | null
          videos: string[] | null
          whatsapp: string | null
          years_of_experience: number | null
        }
        Insert: {
          amenities?: string[] | null
          builder_name: string
          certifications?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          images?: string[] | null
          locations?: string[] | null
          number_of_projects?: number | null
          phone: string
          price_range_max?: number | null
          price_range_min?: number | null
          rera_number?: string | null
          tagline?: string | null
          type?: string
          unit_types?: string[] | null
          updated_at?: string
          user_id?: string | null
          videos?: string[] | null
          whatsapp?: string | null
          years_of_experience?: number | null
        }
        Update: {
          amenities?: string[] | null
          builder_name?: string
          certifications?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          images?: string[] | null
          locations?: string[] | null
          number_of_projects?: number | null
          phone?: string
          price_range_max?: number | null
          price_range_min?: number | null
          rera_number?: string | null
          tagline?: string | null
          type?: string
          unit_types?: string[] | null
          updated_at?: string
          user_id?: string | null
          videos?: string[] | null
          whatsapp?: string | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      hotel_bookings: {
        Row: {
          booking_type: string | null
          check_in: string
          check_out: string
          created_at: string | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          hotel_id: string
          id: string
          num_guests: number | null
          num_rooms: number | null
          package_id: string | null
          property_id: string | null
          room_type: string | null
          special_requests: string | null
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          booking_type?: string | null
          check_in: string
          check_out: string
          created_at?: string | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          hotel_id: string
          id?: string
          num_guests?: number | null
          num_rooms?: number | null
          package_id?: string | null
          property_id?: string | null
          room_type?: string | null
          special_requests?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          booking_type?: string | null
          check_in?: string
          check_out?: string
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          hotel_id?: string
          id?: string
          num_guests?: number | null
          num_rooms?: number | null
          package_id?: string | null
          property_id?: string | null
          room_type?: string | null
          special_requests?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "visit_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_hotels: {
        Row: {
          address: string | null
          amenities: string[] | null
          check_in_time: string | null
          check_out_time: string | null
          city: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          id: string
          images: string[] | null
          is_active: boolean | null
          locality: string
          manager_id: string | null
          name: string
          partner_since: string | null
          policies: Json | null
          price_per_night: number
          room_types: Json | null
          star_rating: number | null
          total_rooms: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          check_in_time?: string | null
          check_out_time?: string | null
          city: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          locality: string
          manager_id?: string | null
          name: string
          partner_since?: string | null
          policies?: Json | null
          price_per_night?: number
          room_types?: Json | null
          star_rating?: number | null
          total_rooms?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          locality?: string
          manager_id?: string | null
          name?: string
          partner_since?: string | null
          policies?: Json | null
          price_per_night?: number
          room_types?: Json | null
          star_rating?: number | null
          total_rooms?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          amenities: string[] | null
          area_range: string | null
          avg_price: number | null
          bhk_types: string | null
          builder_name: string | null
          city: string | null
          created_at: string | null
          description: string | null
          id: string
          image: string | null
          images: string[] | null
          latitude: number | null
          locality: string | null
          longitude: number | null
          name: string | null
          possession_date: string | null
          price_max: number | null
          price_min: number | null
          rera_id: string | null
          status: string | null
          trust_score: number | null
          verified: boolean | null
        }
        Insert: {
          amenities?: string[] | null
          area_range?: string | null
          avg_price?: number | null
          bhk_types?: string | null
          builder_name?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          images?: string[] | null
          latitude?: number | null
          locality?: string | null
          longitude?: number | null
          name?: string | null
          possession_date?: string | null
          price_max?: number | null
          price_min?: number | null
          rera_id?: string | null
          status?: string | null
          trust_score?: number | null
          verified?: boolean | null
        }
        Update: {
          amenities?: string[] | null
          area_range?: string | null
          avg_price?: number | null
          bhk_types?: string | null
          builder_name?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          images?: string[] | null
          latitude?: number | null
          locality?: string | null
          longitude?: number | null
          name?: string | null
          possession_date?: string | null
          price_max?: number | null
          price_min?: number | null
          rera_id?: string | null
          status?: string | null
          trust_score?: number | null
          verified?: boolean | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          area_sqft: number | null
          bathrooms: number | null
          bedrooms: number | null
          bhk: number | null
          builder_id: string | null
          building_area_sqft: number | null
          building_name: string | null
          city: string
          completion_stage: string | null
          created_at: string | null
          description: string | null
          elevators: number | null
          id: string
          images: string[] | null
          latitude: number | null
          locality: string
          longitude: number | null
          price: number
          retail_centres: number | null
          title: string
          total_floors: number | null
          total_parking: number | null
          trust_score: number | null
          type: string | null
          updated_at: string | null
          verified: boolean | null
          video_urls: string[] | null
        }
        Insert: {
          address?: string | null
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          bhk?: number | null
          builder_id?: string | null
          building_area_sqft?: number | null
          building_name?: string | null
          city: string
          completion_stage?: string | null
          created_at?: string | null
          description?: string | null
          elevators?: number | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          locality: string
          longitude?: number | null
          price?: number
          retail_centres?: number | null
          title: string
          total_floors?: number | null
          total_parking?: number | null
          trust_score?: number | null
          type?: string | null
          updated_at?: string | null
          verified?: boolean | null
          video_urls?: string[] | null
        }
        Update: {
          address?: string | null
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          bhk?: number | null
          builder_id?: string | null
          building_area_sqft?: number | null
          building_name?: string | null
          city?: string
          completion_stage?: string | null
          created_at?: string | null
          description?: string | null
          elevators?: number | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          locality?: string
          longitude?: number | null
          price?: number
          retail_centres?: number | null
          title?: string
          total_floors?: number | null
          total_parking?: number | null
          trust_score?: number | null
          type?: string | null
          updated_at?: string | null
          verified?: boolean | null
          video_urls?: string[] | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      visit_packages: {
        Row: {
          base_discount_percentage: number | null
          created_at: string | null
          description: string | null
          duration_days: number | null
          id: string
          includes_airport_pickup: boolean | null
          includes_local_transport: boolean | null
          includes_meals: boolean | null
          is_active: boolean | null
          name: string
        }
        Insert: {
          base_discount_percentage?: number | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          id?: string
          includes_airport_pickup?: boolean | null
          includes_local_transport?: boolean | null
          includes_meals?: boolean | null
          is_active?: boolean | null
          name: string
        }
        Update: {
          base_discount_percentage?: number | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          id?: string
          includes_airport_pickup?: boolean | null
          includes_local_transport?: boolean | null
          includes_meals?: boolean | null
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
