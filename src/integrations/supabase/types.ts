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
      agent_availability: {
        Row: {
          agent_id: number | null
          created_at: string | null
          date: string
          id: string
          is_available: boolean | null
          time_slots: Json
          updated_at: string | null
        }
        Insert: {
          agent_id?: number | null
          created_at?: string | null
          date: string
          id?: string
          is_available?: boolean | null
          time_slots: Json
          updated_at?: string | null
        }
        Update: {
          agent_id?: number | null
          created_at?: string | null
          date?: string
          id?: string
          is_available?: boolean | null
          time_slots?: Json
          updated_at?: string | null
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
        Relationships: []
      }
      agents: {
        Row: {
          agency_name: string | null
          cities_served: string | null
          completed_visits: number | null
          id: number
          languages: string | null
          level: number | null
          name: string | null
          photo_url: string | null
          rent_count: number | null
          sales_count: number | null
          trust_score: number | null
          user_id: string | null
          verified: boolean | null
          xp_points: number | null
        }
        Insert: {
          agency_name?: string | null
          cities_served?: string | null
          completed_visits?: number | null
          id?: number
          languages?: string | null
          level?: number | null
          name?: string | null
          photo_url?: string | null
          rent_count?: number | null
          sales_count?: number | null
          trust_score?: number | null
          user_id?: string | null
          verified?: boolean | null
          xp_points?: number | null
        }
        Update: {
          agency_name?: string | null
          cities_served?: string | null
          completed_visits?: number | null
          id?: number
          languages?: string | null
          level?: number | null
          name?: string | null
          photo_url?: string | null
          rent_count?: number | null
          sales_count?: number | null
          trust_score?: number | null
          user_id?: string | null
          verified?: boolean | null
          xp_points?: number | null
        }
        Relationships: []
      }
      ai_sessions: {
        Row: {
          created_at: string | null
          filters: Json | null
          id: number
          query: string
          response: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          filters?: Json | null
          id?: never
          query: string
          response: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          filters?: Json | null
          id?: never
          query?: string
          response?: Json
          user_id?: string | null
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
        Relationships: []
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
      builder_performance: {
        Row: {
          builder_id: string
          created_at: string | null
          id: string
          leads: number | null
          month: string
          project_id: number | null
          revenue: number | null
          units_sold: number | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          builder_id: string
          created_at?: string | null
          id?: string
          leads?: number | null
          month: string
          project_id?: number | null
          revenue?: number | null
          units_sold?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          builder_id?: string
          created_at?: string | null
          id?: string
          leads?: number | null
          month?: string
          project_id?: number | null
          revenue?: number | null
          units_sold?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "builder_performance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      builders: {
        Row: {
          city: string | null
          created_at: string | null
          description: string | null
          id: number
          logo_url: string | null
          name: string | null
          trust_score: number | null
          verified: boolean | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          logo_url?: string | null
          name?: string | null
          trust_score?: number | null
          verified?: boolean | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          logo_url?: string | null
          name?: string | null
          trust_score?: number | null
          verified?: boolean | null
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
      community_events: {
        Row: {
          accessibility_features: string[] | null
          cancellation_reason: string | null
          cancelled: boolean | null
          category: Database["public"]["Enums"]["event_category"]
          city: string
          created_at: string | null
          created_by: string | null
          current_attendees: number | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_date: string
          event_time: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          images: string[] | null
          language: string | null
          lat: number | null
          lng: number | null
          locality: string | null
          max_attendees: number | null
          organizer: string
          organizer_contact: string | null
          organizer_email: string | null
          published_at: string | null
          tags: string[] | null
          ticket_price: number | null
          title: string
          updated_at: string | null
          venue: string
          venue_address: string | null
          verified: boolean | null
        }
        Insert: {
          accessibility_features?: string[] | null
          cancellation_reason?: string | null
          cancelled?: boolean | null
          category?: Database["public"]["Enums"]["event_category"]
          city: string
          created_at?: string | null
          created_by?: string | null
          current_attendees?: number | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date: string
          event_time?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          language?: string | null
          lat?: number | null
          lng?: number | null
          locality?: string | null
          max_attendees?: number | null
          organizer: string
          organizer_contact?: string | null
          organizer_email?: string | null
          published_at?: string | null
          tags?: string[] | null
          ticket_price?: number | null
          title: string
          updated_at?: string | null
          venue: string
          venue_address?: string | null
          verified?: boolean | null
        }
        Update: {
          accessibility_features?: string[] | null
          cancellation_reason?: string | null
          cancelled?: boolean | null
          category?: Database["public"]["Enums"]["event_category"]
          city?: string
          created_at?: string | null
          created_by?: string | null
          current_attendees?: number | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string
          event_time?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          language?: string | null
          lat?: number | null
          lng?: number | null
          locality?: string | null
          max_attendees?: number | null
          organizer?: string
          organizer_contact?: string | null
          organizer_email?: string | null
          published_at?: string | null
          tags?: string[] | null
          ticket_price?: number | null
          title?: string
          updated_at?: string | null
          venue?: string
          venue_address?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      community_profiles: {
        Row: {
          ai_rating: number | null
          ai_recommendation: string | null
          ai_summary: string | null
          appreciation_rate: number | null
          avg_price: number | null
          city: string
          id: number
          locality: string
          updated_at: string | null
          verified_projects: number | null
          verified_properties: number | null
        }
        Insert: {
          ai_rating?: number | null
          ai_recommendation?: string | null
          ai_summary?: string | null
          appreciation_rate?: number | null
          avg_price?: number | null
          city: string
          id?: never
          locality: string
          updated_at?: string | null
          verified_projects?: number | null
          verified_properties?: number | null
        }
        Update: {
          ai_rating?: number | null
          ai_recommendation?: string | null
          ai_summary?: string | null
          appreciation_rate?: number | null
          avg_price?: number | null
          city?: string
          id?: never
          locality?: string
          updated_at?: string | null
          verified_projects?: number | null
          verified_properties?: number | null
        }
        Relationships: []
      }
      event_logs: {
        Row: {
          action: string
          created_at: string | null
          event_id: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          event_id: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          event_id?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          attendee_email: string
          attendee_name: string
          attendee_phone: string | null
          check_in_time: string | null
          created_at: string | null
          event_id: string
          id: string
          payment_id: string | null
          payment_status: string | null
          special_requests: string | null
          status: Database["public"]["Enums"]["rsvp_status"] | null
          tickets_count: number | null
          total_amount: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendee_email: string
          attendee_name: string
          attendee_phone?: string | null
          check_in_time?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          payment_id?: string | null
          payment_status?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"] | null
          tickets_count?: number | null
          total_amount?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attendee_email?: string
          attendee_name?: string
          attendee_phone?: string | null
          check_in_time?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          payment_id?: string | null
          payment_status?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"] | null
          tickets_count?: number | null
          total_amount?: number | null
          updated_at?: string | null
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
      event_vendors: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          booth_number: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          event_id: string
          id: string
          setup_time: string | null
          status: Database["public"]["Enums"]["vendor_status"] | null
          updated_at: string | null
          vendor_name: string
          vendor_type: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          booth_number?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          event_id: string
          id?: string
          setup_time?: string | null
          status?: Database["public"]["Enums"]["vendor_status"] | null
          updated_at?: string | null
          vendor_name: string
          vendor_type: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          booth_number?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          event_id?: string
          id?: string
          setup_time?: string | null
          status?: Database["public"]["Enums"]["vendor_status"] | null
          updated_at?: string | null
          vendor_name?: string
          vendor_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_vendors_event_id_fkey"
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
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_vehicles: {
        Row: {
          capacity: number | null
          created_at: string | null
          current_location: Json | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          status: string | null
          updated_at: string | null
          vehicle_model: string | null
          vehicle_number: string
          vehicle_type: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          current_location?: Json | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          vehicle_model?: string | null
          vehicle_number: string
          vehicle_type: string
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          current_location?: Json | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          vehicle_model?: string | null
          vehicle_number?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      lead_interactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          interaction_type: string
          lead_id: string
          notes: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          interaction_type: string
          lead_id: string
          notes?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          interaction_type?: string
          lead_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          project_id: number | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          project_id?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          project_id?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      market_insights: {
        Row: {
          ai_analysis: string | null
          city: string
          created_at: string | null
          data: Json
          expires_at: string | null
          id: string
          insight_type: string
          locality: string | null
          updated_at: string | null
        }
        Insert: {
          ai_analysis?: string | null
          city: string
          created_at?: string | null
          data: Json
          expires_at?: string | null
          id?: string
          insight_type: string
          locality?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_analysis?: string | null
          city?: string
          created_at?: string | null
          data?: Json
          expires_at?: string | null
          id?: string
          insight_type?: string
          locality?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      market_trends: {
        Row: {
          ai_summary: string | null
          appreciation_rate: number | null
          avg_price: number | null
          city: string | null
          id: number
          last_updated: string | null
          locality: string | null
        }
        Insert: {
          ai_summary?: string | null
          appreciation_rate?: number | null
          avg_price?: number | null
          city?: string | null
          id?: never
          last_updated?: string | null
          locality?: string | null
        }
        Update: {
          ai_summary?: string | null
          appreciation_rate?: number | null
          avg_price?: number | null
          city?: string | null
          id?: never
          last_updated?: string | null
          locality?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
      project_amenities: {
        Row: {
          created_at: string | null
          id: string
          name: string
          project_id: number
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          project_id: number
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          project_id?: number
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_amenities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_floor_plans: {
        Row: {
          area: number
          bhk: number
          created_at: string | null
          description: string | null
          facing: string | null
          features: Json | null
          id: string
          plan_image_url: string | null
          price: number
          project_id: number
          updated_at: string | null
        }
        Insert: {
          area: number
          bhk: number
          created_at?: string | null
          description?: string | null
          facing?: string | null
          features?: Json | null
          id?: string
          plan_image_url?: string | null
          price: number
          project_id: number
          updated_at?: string | null
        }
        Update: {
          area?: number
          bhk?: number
          created_at?: string | null
          description?: string | null
          facing?: string | null
          features?: Json | null
          id?: string
          plan_image_url?: string | null
          price?: number
          project_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_floor_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_highlights: {
        Row: {
          created_at: string | null
          highlight: string
          id: string
          project_id: number
        }
        Insert: {
          created_at?: string | null
          highlight: string
          id?: string
          project_id: number
        }
        Update: {
          created_at?: string | null
          highlight?: string
          id?: string
          project_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_highlights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_specifications: {
        Row: {
          category: string
          created_at: string | null
          id: string
          project_id: number
          specification: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          project_id: number
          specification: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          project_id?: number
          specification?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_specifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_web_data_status: {
        Row: {
          created_at: string | null
          error_message: string | null
          fetch_status: string | null
          last_fetched_at: string | null
          project_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          fetch_status?: string | null
          last_fetched_at?: string | null
          project_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          fetch_status?: string | null
          last_fetched_at?: string | null
          project_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_web_data_status_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          avg_price: number | null
          builder_id: number | null
          builder_name: string | null
          city: string | null
          id: number
          image: string | null
          locality: string | null
          name: string | null
          overview: string | null
          rera_id: string | null
          submitted_at: string | null
          submitted_by: string | null
          trust_score: number | null
          verification_status: string | null
          verified: boolean | null
        }
        Insert: {
          avg_price?: number | null
          builder_id?: number | null
          builder_name?: string | null
          city?: string | null
          id?: number
          image?: string | null
          locality?: string | null
          name?: string | null
          overview?: string | null
          rera_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          trust_score?: number | null
          verification_status?: string | null
          verified?: boolean | null
        }
        Update: {
          avg_price?: number | null
          builder_id?: number | null
          builder_name?: string | null
          city?: string | null
          id?: number
          image?: string | null
          locality?: string | null
          name?: string | null
          overview?: string | null
          rera_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          trust_score?: number | null
          verification_status?: string | null
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
          agent_id: number | null
          area: number | null
          baths: number | null
          beds: number | null
          bhk: number | null
          builder_id: number | null
          city: string | null
          description: string | null
          id: number
          images: string[] | null
          lat: number | null
          lng: number | null
          locality: string | null
          price: number | null
          project_id: number | null
          status: string | null
          submitted_at: string | null
          submitted_by: string | null
          title: string | null
          trust_score: number | null
          type: string | null
          verification_status: string | null
          verified: boolean | null
        }
        Insert: {
          agent_id?: number | null
          area?: number | null
          baths?: number | null
          beds?: number | null
          bhk?: number | null
          builder_id?: number | null
          city?: string | null
          description?: string | null
          id?: number
          images?: string[] | null
          lat?: number | null
          lng?: number | null
          locality?: string | null
          price?: number | null
          project_id?: number | null
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string | null
          trust_score?: number | null
          type?: string | null
          verification_status?: string | null
          verified?: boolean | null
        }
        Update: {
          agent_id?: number | null
          area?: number | null
          baths?: number | null
          beds?: number | null
          bhk?: number | null
          builder_id?: number | null
          city?: string | null
          description?: string | null
          id?: number
          images?: string[] | null
          lat?: number | null
          lng?: number | null
          locality?: string | null
          price?: number | null
          project_id?: number | null
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string | null
          trust_score?: number | null
          type?: string | null
          verification_status?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      property_comparisons: {
        Row: {
          ai_analysis: Json
          created_at: string | null
          id: string
          property_ids: number[]
          user_id: string
        }
        Insert: {
          ai_analysis: Json
          created_at?: string | null
          id?: string
          property_ids: number[]
          user_id: string
        }
        Update: {
          ai_analysis?: Json
          created_at?: string | null
          id?: string
          property_ids?: number[]
          user_id?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          created_at: string | null
          filters: Json
          id: string
          last_checked: string | null
          name: string
          notification_enabled: boolean | null
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filters: Json
          id?: string
          last_checked?: string | null
          name: string
          notification_enabled?: boolean | null
          query: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json
          id?: string
          last_checked?: string | null
          name?: string
          notification_enabled?: boolean | null
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          number_of_visitors: number | null
          project_id: number
          status: Database["public"]["Enums"]["site_visit_status"] | null
          updated_at: string | null
          visit_date: string
          visit_time: string
          visitor_email: string
          visitor_name: string
          visitor_phone: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          number_of_visitors?: number | null
          project_id: number
          status?: Database["public"]["Enums"]["site_visit_status"] | null
          updated_at?: string | null
          visit_date: string
          visit_time: string
          visitor_email: string
          visitor_name: string
          visitor_phone?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          number_of_visitors?: number | null
          project_id?: number
          status?: Database["public"]["Enums"]["site_visit_status"] | null
          updated_at?: string | null
          visit_date?: string
          visit_time?: string
          visitor_email?: string
          visitor_name?: string
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
        Relationships: []
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
        Relationships: []
      }
      visit_bookings: {
        Row: {
          agent_id: number | null
          agent_location: Json | null
          builder_id: number | null
          builder_notes: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          optimized_route: Json | null
          otp: string | null
          otp_code: string | null
          pickup_location: Json | null
          properties: Json | null
          property_id: number | null
          qr_code: string | null
          qr_code_url: string | null
          rejection_reason: string | null
          special_requests: string | null
          status: string | null
          travel_mode: string | null
          updated_at: string | null
          user_email: string
          user_id: string | null
          user_name: string
          user_phone: string | null
          vehicle_id: string | null
          vehicle_location: Json | null
          visit_date: string
          visit_time: string
          whatsapp_thread_id: string | null
        }
        Insert: {
          agent_id?: number | null
          agent_location?: Json | null
          builder_id?: number | null
          builder_notes?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          optimized_route?: Json | null
          otp?: string | null
          otp_code?: string | null
          pickup_location?: Json | null
          properties?: Json | null
          property_id?: number | null
          qr_code?: string | null
          qr_code_url?: string | null
          rejection_reason?: string | null
          special_requests?: string | null
          status?: string | null
          travel_mode?: string | null
          updated_at?: string | null
          user_email: string
          user_id?: string | null
          user_name: string
          user_phone?: string | null
          vehicle_id?: string | null
          vehicle_location?: Json | null
          visit_date: string
          visit_time: string
          whatsapp_thread_id?: string | null
        }
        Update: {
          agent_id?: number | null
          agent_location?: Json | null
          builder_id?: number | null
          builder_notes?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          optimized_route?: Json | null
          otp?: string | null
          otp_code?: string | null
          pickup_location?: Json | null
          properties?: Json | null
          property_id?: number | null
          qr_code?: string | null
          qr_code_url?: string | null
          rejection_reason?: string | null
          special_requests?: string | null
          status?: string | null
          travel_mode?: string | null
          updated_at?: string | null
          user_email?: string
          user_id?: string | null
          user_name?: string
          user_phone?: string | null
          vehicle_id?: string | null
          vehicle_location?: Json | null
          visit_date?: string
          visit_time?: string
          whatsapp_thread_id?: string | null
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
            foreignKeyName: "visit_bookings_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
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
      visit_feedback: {
        Row: {
          agent_rating: number | null
          ai_insights: string | null
          booking_id: string | null
          created_at: string | null
          feedback: string | null
          id: string
          photo_urls: string[] | null
          property_rating: number | null
          rating: number | null
          service_rating: number | null
          user_id: string | null
        }
        Insert: {
          agent_rating?: number | null
          ai_insights?: string | null
          booking_id?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          photo_urls?: string[] | null
          property_rating?: number | null
          rating?: number | null
          service_rating?: number | null
          user_id?: string | null
        }
        Update: {
          agent_rating?: number | null
          ai_insights?: string | null
          booking_id?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          photo_urls?: string[] | null
          property_rating?: number | null
          rating?: number | null
          service_rating?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_feedback_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "visit_bookings"
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
      visit_notifications: {
        Row: {
          booking_id: string | null
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          recipient: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          booking_id?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          recipient: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          booking_id?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          recipient?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "visit_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_story_updates: {
        Row: {
          agent_id: number | null
          booking_id: string
          content: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          update_type: string
        }
        Insert: {
          agent_id?: number | null
          booking_id: string
          content?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          update_type: string
        }
        Update: {
          agent_id?: number | null
          booking_id?: string
          content?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_story_updates_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_story_updates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "visit_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_summaries: {
        Row: {
          ai_insights: string | null
          booking_id: string
          buyer_liked: string[] | null
          concerns: string[] | null
          created_at: string | null
          highlights: string[] | null
          id: string
          next_steps: string[] | null
          recommended_properties: Json | null
          updated_at: string | null
        }
        Insert: {
          ai_insights?: string | null
          booking_id: string
          buyer_liked?: string[] | null
          concerns?: string[] | null
          created_at?: string | null
          highlights?: string[] | null
          id?: string
          next_steps?: string[] | null
          recommended_properties?: Json | null
          updated_at?: string | null
        }
        Update: {
          ai_insights?: string | null
          booking_id?: string
          buyer_liked?: string[] | null
          concerns?: string[] | null
          created_at?: string | null
          highlights?: string[] | null
          id?: string
          next_steps?: string[] | null
          recommended_properties?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_summaries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "visit_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          booking_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          recipient: string
          status: string | null
          template_type: string | null
          twilio_sid: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          recipient: string
          status?: string | null
          template_type?: string | null
          twilio_sid?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          recipient?: string
          status?: string | null
          template_type?: string | null
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "visit_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      daily_market_stats: {
        Row: {
          avg_price: number | null
          avg_trust_score: number | null
          city: string | null
          date: string | null
          locality: string | null
          total_properties: number | null
          verified_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      clean_expired_insights: { Args: never; Returns: undefined }
      create_test_notification: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      delete_expired_stories: { Args: never; Returns: undefined }
      get_builder_analytics: {
        Args: { p_builder_id: string; p_months?: number }
        Returns: {
          avg_views: number
          growth_rate: number
          total_leads: number
          total_revenue: number
          total_units_sold: number
          total_views: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
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
      event_category:
        | "festival"
        | "cultural"
        | "sports"
        | "community"
        | "workshop"
        | "exhibition"
        | "concert"
        | "food"
        | "religious"
        | "other"
      lead_status: "new" | "contacted" | "qualified" | "converted" | "lost"
      poi_type: "metro" | "school" | "hospital" | "mall" | "office" | "airport"
      property_type: "apartment" | "villa" | "plot" | "commercial"
      rsvp_status: "confirmed" | "pending" | "cancelled" | "waitlist"
      site_visit_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "rescheduled"
      user_role: "buyer" | "seller" | "builder" | "admin"
      vendor_status: "pending" | "approved" | "rejected" | "active"
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
      event_category: [
        "festival",
        "cultural",
        "sports",
        "community",
        "workshop",
        "exhibition",
        "concert",
        "food",
        "religious",
        "other",
      ],
      lead_status: ["new", "contacted", "qualified", "converted", "lost"],
      poi_type: ["metro", "school", "hospital", "mall", "office", "airport"],
      property_type: ["apartment", "villa", "plot", "commercial"],
      rsvp_status: ["confirmed", "pending", "cancelled", "waitlist"],
      site_visit_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "rescheduled",
      ],
      user_role: ["buyer", "seller", "builder", "admin"],
      vendor_status: ["pending", "approved", "rejected", "active"],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const
