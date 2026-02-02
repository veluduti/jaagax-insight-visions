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
      advertisements: {
        Row: {
          ad_type: string
          budget: number | null
          builder_id: string
          clicks: number | null
          contacts: number | null
          created_at: string | null
          cta_text: string | null
          description: string | null
          end_date: string | null
          featured: boolean | null
          highlights: Json | null
          id: string
          images: Json | null
          impressions: number | null
          offer_text: string | null
          priority: number | null
          project_id: string | null
          property_id: string | null
          saves: number | null
          spent: number | null
          start_date: string | null
          status: string
          tagline: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ad_type: string
          budget?: number | null
          builder_id: string
          clicks?: number | null
          contacts?: number | null
          created_at?: string | null
          cta_text?: string | null
          description?: string | null
          end_date?: string | null
          featured?: boolean | null
          highlights?: Json | null
          id?: string
          images?: Json | null
          impressions?: number | null
          offer_text?: string | null
          priority?: number | null
          project_id?: string | null
          property_id?: string | null
          saves?: number | null
          spent?: number | null
          start_date?: string | null
          status?: string
          tagline?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ad_type?: string
          budget?: number | null
          builder_id?: string
          clicks?: number | null
          contacts?: number | null
          created_at?: string | null
          cta_text?: string | null
          description?: string | null
          end_date?: string | null
          featured?: boolean | null
          highlights?: Json | null
          id?: string
          images?: Json | null
          impressions?: number | null
          offer_text?: string | null
          priority?: number | null
          project_id?: string | null
          property_id?: string | null
          saves?: number | null
          spent?: number | null
          start_date?: string | null
          status?: string
          tagline?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_activity_log: {
        Row: {
          activity_type: string
          agent_id: string
          created_at: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          agent_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          agent_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_activity_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_assignment_requests: {
        Row: {
          agent_id: string
          cascade_order: number | null
          created_at: string | null
          id: string
          rejection_reason: string | null
          requested_at: string | null
          responded_at: string | null
          status: string | null
          visit_booking_id: string
        }
        Insert: {
          agent_id: string
          cascade_order?: number | null
          created_at?: string | null
          id?: string
          rejection_reason?: string | null
          requested_at?: string | null
          responded_at?: string | null
          status?: string | null
          visit_booking_id: string
        }
        Update: {
          agent_id?: string
          cascade_order?: number | null
          created_at?: string | null
          id?: string
          rejection_reason?: string | null
          requested_at?: string | null
          responded_at?: string | null
          status?: string | null
          visit_booking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_assignment_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_assignment_requests_visit_booking_id_fkey"
            columns: ["visit_booking_id"]
            isOneToOne: false
            referencedRelation: "visit_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_availability: {
        Row: {
          agent_id: string
          created_at: string | null
          date: string
          id: string
          is_available: boolean | null
          time_slots: Json | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          date: string
          id?: string
          is_available?: boolean | null
          time_slots?: Json | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          date?: string
          id?: string
          is_available?: boolean | null
          time_slots?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_availability_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_earnings: {
        Row: {
          agent_id: string
          amount: number
          created_at: string | null
          id: string
          paid_at: string | null
          status: string | null
          type: string | null
          visit_booking_id: string | null
        }
        Insert: {
          agent_id: string
          amount: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          status?: string | null
          type?: string | null
          visit_booking_id?: string | null
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          status?: string | null
          type?: string | null
          visit_booking_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_earnings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_earnings_visit_booking_id_fkey"
            columns: ["visit_booking_id"]
            isOneToOne: false
            referencedRelation: "visit_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_performance_daily: {
        Row: {
          acceptance_rate: number | null
          agent_id: string
          avg_rating: number | null
          avg_response_time_seconds: number | null
          cancelled_visits: number | null
          completed_visits: number | null
          date: string
          distance_traveled_km: number | null
          id: string
          online_hours: number | null
          total_earnings: number | null
          total_visits: number | null
        }
        Insert: {
          acceptance_rate?: number | null
          agent_id: string
          avg_rating?: number | null
          avg_response_time_seconds?: number | null
          cancelled_visits?: number | null
          completed_visits?: number | null
          date: string
          distance_traveled_km?: number | null
          id?: string
          online_hours?: number | null
          total_earnings?: number | null
          total_visits?: number | null
        }
        Update: {
          acceptance_rate?: number | null
          agent_id?: string
          avg_rating?: number | null
          avg_response_time_seconds?: number | null
          cancelled_visits?: number | null
          completed_visits?: number | null
          date?: string
          distance_traveled_km?: number | null
          id?: string
          online_hours?: number | null
          total_earnings?: number | null
          total_visits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_performance_daily_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          acceptance_rate: number | null
          agency_name: string | null
          availability_schedule: Json | null
          avg_response_time_seconds: number | null
          cities_served: string[] | null
          created_at: string | null
          current_latitude: number | null
          current_longitude: number | null
          id: string
          is_online: boolean | null
          languages: string[] | null
          last_location_update: string | null
          license_doc: string | null
          name: string | null
          phone: string | null
          photo_url: string | null
          rating: number | null
          rent_count: number | null
          sales_count: number | null
          total_assignments: number | null
          total_visits: number | null
          trust_score: number | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          acceptance_rate?: number | null
          agency_name?: string | null
          availability_schedule?: Json | null
          avg_response_time_seconds?: number | null
          cities_served?: string[] | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          id?: string
          is_online?: boolean | null
          languages?: string[] | null
          last_location_update?: string | null
          license_doc?: string | null
          name?: string | null
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          rent_count?: number | null
          sales_count?: number | null
          total_assignments?: number | null
          total_visits?: number | null
          trust_score?: number | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          acceptance_rate?: number | null
          agency_name?: string | null
          availability_schedule?: Json | null
          avg_response_time_seconds?: number | null
          cities_served?: string[] | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          id?: string
          is_online?: boolean | null
          languages?: string[] | null
          last_location_update?: string | null
          license_doc?: string | null
          name?: string | null
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          rent_count?: number | null
          sales_count?: number | null
          total_assignments?: number | null
          total_visits?: number | null
          trust_score?: number | null
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
      community_events: {
        Row: {
          accessibility_features: Json | null
          category: string
          city: string
          created_at: string | null
          current_attendees: number | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_date: string
          event_time: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          images: Json | null
          language: string | null
          latitude: number | null
          locality: string | null
          longitude: number | null
          max_attendees: number | null
          organizer: string | null
          organizer_contact: string | null
          organizer_email: string | null
          organizer_id: string | null
          published_at: string | null
          status: string | null
          tags: Json | null
          ticket_price: number | null
          title: string
          updated_at: string | null
          venue: string
          venue_address: string | null
          verified: boolean | null
        }
        Insert: {
          accessibility_features?: Json | null
          category: string
          city: string
          created_at?: string | null
          current_attendees?: number | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date: string
          event_time?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          images?: Json | null
          language?: string | null
          latitude?: number | null
          locality?: string | null
          longitude?: number | null
          max_attendees?: number | null
          organizer?: string | null
          organizer_contact?: string | null
          organizer_email?: string | null
          organizer_id?: string | null
          published_at?: string | null
          status?: string | null
          tags?: Json | null
          ticket_price?: number | null
          title: string
          updated_at?: string | null
          venue: string
          venue_address?: string | null
          verified?: boolean | null
        }
        Update: {
          accessibility_features?: Json | null
          category?: string
          city?: string
          created_at?: string | null
          current_attendees?: number | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string
          event_time?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          images?: Json | null
          language?: string | null
          latitude?: number | null
          locality?: string | null
          longitude?: number | null
          max_attendees?: number | null
          organizer?: string | null
          organizer_contact?: string | null
          organizer_email?: string | null
          organizer_id?: string | null
          published_at?: string | null
          status?: string | null
          tags?: Json | null
          ticket_price?: number | null
          title?: string
          updated_at?: string | null
          venue?: string
          venue_address?: string | null
          verified?: boolean | null
        }
        Relationships: []
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
      event_rsvps: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          project_id: string | null
          property_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          property_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          property_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          flag_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          flag_name: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          flag_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
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
      projects: {
        Row: {
          address: string | null
          amenities: Json | null
          available_units: number | null
          avg_price: number | null
          builder_id: string | null
          builder_name: string
          city: string
          completion_date: string | null
          configurations: Json | null
          created_at: string | null
          description: string | null
          documents: Json | null
          id: string
          image: string | null
          images: Json | null
          latitude: number | null
          launch_date: string | null
          locality: string
          longitude: number | null
          max_price: number | null
          min_price: number | null
          name: string
          rera_id: string | null
          status: string | null
          total_units: number | null
          trust_score: number | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          address?: string | null
          amenities?: Json | null
          available_units?: number | null
          avg_price?: number | null
          builder_id?: string | null
          builder_name: string
          city: string
          completion_date?: string | null
          configurations?: Json | null
          created_at?: string | null
          description?: string | null
          documents?: Json | null
          id?: string
          image?: string | null
          images?: Json | null
          latitude?: number | null
          launch_date?: string | null
          locality: string
          longitude?: number | null
          max_price?: number | null
          min_price?: number | null
          name: string
          rera_id?: string | null
          status?: string | null
          total_units?: number | null
          trust_score?: number | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          address?: string | null
          amenities?: Json | null
          available_units?: number | null
          avg_price?: number | null
          builder_id?: string | null
          builder_name?: string
          city?: string
          completion_date?: string | null
          configurations?: Json | null
          created_at?: string | null
          description?: string | null
          documents?: Json | null
          id?: string
          image?: string | null
          images?: Json | null
          latitude?: number | null
          launch_date?: string | null
          locality?: string
          longitude?: number | null
          max_price?: number | null
          min_price?: number | null
          name?: string
          rera_id?: string | null
          status?: string | null
          total_units?: number | null
          trust_score?: number | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          active: boolean | null
          address: string
          area_sqft: number | null
          bathrooms: number | null
          bedrooms: number | null
          bhk: number | null
          builder_id: string
          city: string | null
          completion_stage: string | null
          created_at: string | null
          description: string | null
          documents: Json | null
          featured: boolean | null
          floor_plan_url: string | null
          id: string
          images: Json | null
          latitude: number | null
          locality: string | null
          longitude: number | null
          moderation_status: string | null
          price: number
          property_type: Database["public"]["Enums"]["property_type"]
          rera_id: string | null
          submitted_by: string | null
          title: string
          trust_score: number | null
          type: string | null
          updated_at: string | null
          verification_status: string | null
          verified: boolean | null
        }
        Insert: {
          active?: boolean | null
          address: string
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          bhk?: number | null
          builder_id: string
          city?: string | null
          completion_stage?: string | null
          created_at?: string | null
          description?: string | null
          documents?: Json | null
          featured?: boolean | null
          floor_plan_url?: string | null
          id?: string
          images?: Json | null
          latitude?: number | null
          locality?: string | null
          longitude?: number | null
          moderation_status?: string | null
          price: number
          property_type: Database["public"]["Enums"]["property_type"]
          rera_id?: string | null
          submitted_by?: string | null
          title: string
          trust_score?: number | null
          type?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified?: boolean | null
        }
        Update: {
          active?: boolean | null
          address?: string
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          bhk?: number | null
          builder_id?: string
          city?: string | null
          completion_stage?: string | null
          created_at?: string | null
          description?: string | null
          documents?: Json | null
          featured?: boolean | null
          floor_plan_url?: string | null
          id?: string
          images?: Json | null
          latitude?: number | null
          locality?: string | null
          longitude?: number | null
          moderation_status?: string | null
          price?: number
          property_type?: Database["public"]["Enums"]["property_type"]
          rera_id?: string | null
          submitted_by?: string | null
          title?: string
          trust_score?: number | null
          type?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified?: boolean | null
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
      property_verifications: {
        Row: {
          admin_notes: string | null
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          agent_id: string
          agent_notes: string | null
          assigned_at: string | null
          completed_at: string | null
          created_at: string | null
          documents_verified: boolean | null
          final_status: string | null
          gps_coordinates: Json | null
          id: string
          location_verified: boolean | null
          photos_match: boolean | null
          property_id: string
          status: string | null
          updated_at: string | null
          verification_photos: Json | null
          verification_type: string | null
        }
        Insert: {
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          agent_id: string
          agent_notes?: string | null
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          documents_verified?: boolean | null
          final_status?: string | null
          gps_coordinates?: Json | null
          id?: string
          location_verified?: boolean | null
          photos_match?: boolean | null
          property_id: string
          status?: string | null
          updated_at?: string | null
          verification_photos?: Json | null
          verification_type?: string | null
        }
        Update: {
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          agent_id?: string
          agent_notes?: string | null
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          documents_verified?: boolean | null
          final_status?: string | null
          gps_coordinates?: Json | null
          id?: string
          location_verified?: boolean | null
          photos_match?: boolean | null
          property_id?: string
          status?: string | null
          updated_at?: string | null
          verification_photos?: Json | null
          verification_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_verifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_verifications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
      visit_bookings: {
        Row: {
          agent_id: string | null
          agent_location: Json | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string | null
          id: string
          notes: string | null
          otp_code: string | null
          project_id: string | null
          property_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          vehicle_location: Json | null
          verification_code: string | null
          visit_date: string
          visit_time: string
        }
        Insert: {
          agent_id?: string | null
          agent_location?: Json | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          otp_code?: string | null
          project_id?: string | null
          property_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          vehicle_location?: Json | null
          verification_code?: string | null
          visit_date: string
          visit_time: string
        }
        Update: {
          agent_id?: string | null
          agent_location?: Json | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          otp_code?: string | null
          project_id?: string | null
          property_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          vehicle_location?: Json | null
          verification_code?: string | null
          visit_date?: string
          visit_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_bookings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_bookings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_locations: {
        Row: {
          booking_id: string
          created_at: string | null
          id: string
          lat: number
          lng: number
          location_type: string
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          id?: string
          lat: number
          lng: number
          location_type: string
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          id?: string
          lat?: number
          lng?: number
          location_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_locations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "visit_bookings"
            referencedColumns: ["id"]
          },
        ]
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
