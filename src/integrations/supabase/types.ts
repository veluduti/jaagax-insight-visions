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
      admin_activity_log: {
        Row: {
          action: string
          actor_user_id: string | null
          country: string | null
          created_at: string
          district: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          state: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          state?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          state?: string | null
        }
        Relationships: []
      }
      admin_reminders: {
        Row: {
          country: string | null
          created_at: string
          district: string | null
          entity_id: string | null
          entity_type: string | null
          from_admin_id: string
          id: string
          message: string
          read_at: string | null
          state: string | null
          status: string
          to_admin_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          district?: string | null
          entity_id?: string | null
          entity_type?: string | null
          from_admin_id: string
          id?: string
          message: string
          read_at?: string | null
          state?: string | null
          status?: string
          to_admin_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          district?: string | null
          entity_id?: string | null
          entity_type?: string | null
          from_admin_id?: string
          id?: string
          message?: string
          read_at?: string | null
          state?: string | null
          status?: string
          to_admin_id?: string
        }
        Relationships: []
      }
      admin_scopes: {
        Row: {
          country: string | null
          country_id: string | null
          created_at: string
          created_by: string | null
          district: string | null
          district_id: string | null
          id: string
          is_active: boolean
          role: string
          state: string | null
          state_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          district_id?: string | null
          id?: string
          is_active?: boolean
          role: string
          state?: string | null
          state_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          district_id?: string | null
          id?: string
          is_active?: boolean
          role?: string
          state?: string | null
          state_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_scopes_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "loc_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_scopes_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "loc_districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_scopes_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "loc_states"
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
      agent_applications: {
        Row: {
          aadhaar_back_url: string | null
          aadhaar_front_url: string | null
          aadhaar_number: string | null
          account_holder_name: string | null
          account_number: string | null
          address: string | null
          admin_remarks: string | null
          agency_name: string | null
          bank_name: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          experience_years: number | null
          full_name: string
          id: string
          ifsc_code: string | null
          languages: string | null
          mobile: string
          operating_locations: string | null
          pan_card_url: string | null
          pan_number: string | null
          pincode: string | null
          profile_photo_url: string | null
          rera_number: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          state: string | null
          status: string
          terms_accepted: boolean
          trial_started_at: string | null
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          aadhaar_back_url?: string | null
          aadhaar_front_url?: string | null
          aadhaar_number?: string | null
          account_holder_name?: string | null
          account_number?: string | null
          address?: string | null
          admin_remarks?: string | null
          agency_name?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          experience_years?: number | null
          full_name: string
          id?: string
          ifsc_code?: string | null
          languages?: string | null
          mobile: string
          operating_locations?: string | null
          pan_card_url?: string | null
          pan_number?: string | null
          pincode?: string | null
          profile_photo_url?: string | null
          rera_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          state?: string | null
          status?: string
          terms_accepted?: boolean
          trial_started_at?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          aadhaar_back_url?: string | null
          aadhaar_front_url?: string | null
          aadhaar_number?: string | null
          account_holder_name?: string | null
          account_number?: string | null
          address?: string | null
          admin_remarks?: string | null
          agency_name?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          experience_years?: number | null
          full_name?: string
          id?: string
          ifsc_code?: string | null
          languages?: string | null
          mobile?: string
          operating_locations?: string | null
          pan_card_url?: string | null
          pan_number?: string | null
          pincode?: string | null
          profile_photo_url?: string | null
          rera_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          state?: string | null
          status?: string
          terms_accepted?: boolean
          trial_started_at?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_badges: {
        Row: {
          achieved_at: string | null
          agent_id: string | null
          badge_color: string
          badge_level: number
          badge_name: string
          created_at: string
          id: string
          is_current: boolean
          sales_required: number
          trust_score_required: number
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          agent_id?: string | null
          badge_color?: string
          badge_level?: number
          badge_name?: string
          created_at?: string
          id?: string
          is_current?: boolean
          sales_required?: number
          trust_score_required?: number
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          agent_id?: string | null
          badge_color?: string
          badge_level?: number
          badge_name?: string
          created_at?: string
          id?: string
          is_current?: boolean
          sales_required?: number
          trust_score_required?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_badges_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_kyc_verifications: {
        Row: {
          aadhaar_back_url: string | null
          aadhaar_front_url: string | null
          agent_id: string | null
          business_proof_url: string | null
          created_at: string
          id: string
          pan_card_url: string | null
          rejection_reason: string | null
          rera_certificate_url: string | null
          selfie_url: string | null
          trust_score: number
          updated_at: string
          user_id: string
          verification_status: string
          verified_at: string | null
          verified_badge: boolean
        }
        Insert: {
          aadhaar_back_url?: string | null
          aadhaar_front_url?: string | null
          agent_id?: string | null
          business_proof_url?: string | null
          created_at?: string
          id?: string
          pan_card_url?: string | null
          rejection_reason?: string | null
          rera_certificate_url?: string | null
          selfie_url?: string | null
          trust_score?: number
          updated_at?: string
          user_id: string
          verification_status?: string
          verified_at?: string | null
          verified_badge?: boolean
        }
        Update: {
          aadhaar_back_url?: string | null
          aadhaar_front_url?: string | null
          agent_id?: string | null
          business_proof_url?: string | null
          created_at?: string
          id?: string
          pan_card_url?: string | null
          rejection_reason?: string | null
          rera_certificate_url?: string | null
          selfie_url?: string | null
          trust_score?: number
          updated_at?: string
          user_id?: string
          verification_status?: string
          verified_at?: string | null
          verified_badge?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "agent_kyc_verifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_profiles: {
        Row: {
          agency_name: string | null
          bio: string | null
          cities_served: string | null
          created_at: string
          experience_years: number | null
          full_name: string | null
          phone: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          agency_name?: string | null
          bio?: string | null
          cities_served?: string | null
          created_at?: string
          experience_years?: number | null
          full_name?: string | null
          phone?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          agency_name?: string | null
          bio?: string | null
          cities_served?: string | null
          created_at?: string
          experience_years?: number | null
          full_name?: string | null
          phone?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_project_experience: {
        Row: {
          agent_id: string
          created_at: string
          experience_years: number
          id: string
          project_location: string | null
          project_name: string
          project_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          experience_years?: number
          id?: string
          project_location?: string | null
          project_name: string
          project_type: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          experience_years?: number
          id?: string
          project_location?: string | null
          project_name?: string
          project_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_project_experience_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_promotions: {
        Row: {
          agent_id: string | null
          amount: number
          created_at: string
          end_date: string | null
          id: string
          promotion_type: string
          property_id: string | null
          start_date: string
          status: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          amount: number
          created_at?: string
          end_date?: string | null
          id?: string
          promotion_type: string
          property_id?: string | null
          start_date?: string
          status?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          amount?: number
          created_at?: string
          end_date?: string | null
          id?: string
          promotion_type?: string
          property_id?: string | null
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_promotions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_promotions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_ratings: {
        Row: {
          agent_id: string
          booking_id: string | null
          buyer_id: string
          comment: string | null
          created_at: string
          id: string
          property_id: string | null
          rating: number
          review: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          booking_id?: string | null
          buyer_id: string
          comment?: string | null
          created_at?: string
          id?: string
          property_id?: string | null
          rating: number
          review?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          booking_id?: string | null
          buyer_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          property_id?: string | null
          rating?: number
          review?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_referrals: {
        Row: {
          agent_id: string | null
          converted_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string | null
          referred_user_type: string | null
          reward_amount: number | null
          status: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id?: string | null
          referred_user_type?: string | null
          reward_amount?: number | null
          status?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string | null
          referred_user_type?: string | null
          reward_amount?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_referrals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_subscriptions: {
        Row: {
          agent_id: string | null
          auto_renew: boolean
          benefits: Json
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          plan_name: string | null
          plan_type: string
          price: number | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          auto_renew?: boolean
          benefits?: Json
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          plan_name?: string | null
          plan_type?: string
          price?: number | null
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          auto_renew?: boolean
          benefits?: Json
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          plan_name?: string | null
          plan_type?: string
          price?: number | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_subscriptions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_success_logs: {
        Row: {
          agent_id: string | null
          avg_customer_rating: number | null
          calculated_at: string
          conversion_rate: number | null
          id: string
          response_time_avg: number | null
          success_score: number | null
          user_id: string
          verified_listings: number | null
          visit_success_rate: number | null
        }
        Insert: {
          agent_id?: string | null
          avg_customer_rating?: number | null
          calculated_at?: string
          conversion_rate?: number | null
          id?: string
          response_time_avg?: number | null
          success_score?: number | null
          user_id: string
          verified_listings?: number | null
          visit_success_rate?: number | null
        }
        Update: {
          agent_id?: string | null
          avg_customer_rating?: number | null
          calculated_at?: string
          conversion_rate?: number | null
          id?: string
          response_time_avg?: number | null
          success_score?: number | null
          user_id?: string
          verified_listings?: number | null
          visit_success_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_success_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_success_scores: {
        Row: {
          builder_profile_id: string
          conversion_rate: number
          created_at: string
          customer_rating: number
          id: string
          last_calculated: string
          overall_score: number
          response_time: number
          updated_at: string
          verified_listings: number
          visit_success_rate: number
        }
        Insert: {
          builder_profile_id: string
          conversion_rate?: number
          created_at?: string
          customer_rating?: number
          id?: string
          last_calculated?: string
          overall_score?: number
          response_time?: number
          updated_at?: string
          verified_listings?: number
          visit_success_rate?: number
        }
        Update: {
          builder_profile_id?: string
          conversion_rate?: number
          created_at?: string
          customer_rating?: number
          id?: string
          last_calculated?: string
          overall_score?: number
          response_time?: number
          updated_at?: string
          verified_listings?: number
          visit_success_rate?: number
        }
        Relationships: []
      }
      agent_tasks: {
        Row: {
          agent_id: string
          agent_user_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          priority: string
          property_id: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          agent_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          property_id?: string | null
          status?: string
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          agent_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          property_id?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_team_members: {
        Row: {
          agent_id: string | null
          assigned_leads: Json
          created_at: string
          id: string
          member_email: string | null
          member_id: string | null
          member_name: string
          member_phone: string | null
          performance_score: number | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          assigned_leads?: Json
          created_at?: string
          id?: string
          member_email?: string | null
          member_id?: string | null
          member_name: string
          member_phone?: string | null
          performance_score?: number | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          assigned_leads?: Json
          created_at?: string
          id?: string
          member_email?: string | null
          member_id?: string | null
          member_name?: string
          member_phone?: string | null
          performance_score?: number | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_team_members_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          agency_name: string | null
          avg_rating: number | null
          bio: string | null
          cities_served: string | null
          city: string | null
          city_id: string | null
          country: string | null
          country_id: string | null
          created_at: string
          date_of_birth: string | null
          district: string | null
          district_id: string | null
          email: string | null
          experience_years: number | null
          gender: string | null
          id: string
          languages: string | null
          localities_served: string | null
          locality: string | null
          locality_id: string | null
          name: string
          office_address: string | null
          phone: string
          photo_url: string | null
          sales_count: number | null
          specializations: string[] | null
          state: string | null
          state_id: string | null
          total_ratings: number | null
          trust_score: number | null
          updated_at: string
          user_id: string | null
          verified: boolean | null
          whatsapp_number: string | null
        }
        Insert: {
          agency_name?: string | null
          avg_rating?: number | null
          bio?: string | null
          cities_served?: string | null
          city?: string | null
          city_id?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          district?: string | null
          district_id?: string | null
          email?: string | null
          experience_years?: number | null
          gender?: string | null
          id?: string
          languages?: string | null
          localities_served?: string | null
          locality?: string | null
          locality_id?: string | null
          name: string
          office_address?: string | null
          phone: string
          photo_url?: string | null
          sales_count?: number | null
          specializations?: string[] | null
          state?: string | null
          state_id?: string | null
          total_ratings?: number | null
          trust_score?: number | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean | null
          whatsapp_number?: string | null
        }
        Update: {
          agency_name?: string | null
          avg_rating?: number | null
          bio?: string | null
          cities_served?: string | null
          city?: string | null
          city_id?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          district?: string | null
          district_id?: string | null
          email?: string | null
          experience_years?: number | null
          gender?: string | null
          id?: string
          languages?: string | null
          localities_served?: string | null
          locality?: string | null
          locality_id?: string | null
          name?: string
          office_address?: string | null
          phone?: string
          photo_url?: string | null
          sales_count?: number | null
          specializations?: string[] | null
          state?: string | null
          state_id?: string | null
          total_ratings?: number | null
          trust_score?: number | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "loc_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "loc_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "loc_districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "loc_localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "loc_states"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_memory: {
        Row: {
          agent_key: string | null
          created_at: string
          expires_at: string | null
          id: string
          key: string
          module_key: string | null
          scope: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          agent_key?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          key: string
          module_key?: string | null
          scope: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          agent_key?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          key?: string
          module_key?: string | null
          scope?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      alert_preferences: {
        Row: {
          created_at: string
          email_address: string | null
          email_enabled: boolean
          id: string
          sms_enabled: boolean
          sms_phone: string | null
          updated_at: string
          user_id: string
          whatsapp_enabled: boolean
          whatsapp_phone: string | null
        }
        Insert: {
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean
          id?: string
          sms_enabled?: boolean
          sms_phone?: string | null
          updated_at?: string
          user_id: string
          whatsapp_enabled?: boolean
          whatsapp_phone?: string | null
        }
        Update: {
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean
          id?: string
          sms_enabled?: boolean
          sms_phone?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_enabled?: boolean
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      assigned_agents: {
        Row: {
          agent_id: string
          assigned_at: string
          id: string
          property_id: string
          status: string
        }
        Insert: {
          agent_id: string
          assigned_at?: string
          id?: string
          property_id: string
          status?: string
        }
        Update: {
          agent_id?: string
          assigned_at?: string
          id?: string
          property_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assigned_agents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_recharge_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          payment_method_id: string | null
          recharge_amount: number
          threshold_amount: number
          updated_at: string
          wallet_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          payment_method_id?: string | null
          recharge_amount?: number
          threshold_amount?: number
          updated_at?: string
          wallet_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          payment_method_id?: string | null
          recharge_amount?: number
          threshold_amount?: number
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_recharge_settings_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: true
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_definitions: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          min_properties: number | null
          min_rating: number | null
          min_reviews: number | null
          name: string
          requirements: Json | null
          sort_order: number | null
          tier: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          min_properties?: number | null
          min_rating?: number | null
          min_reviews?: number | null
          name: string
          requirements?: Json | null
          sort_order?: number | null
          tier: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          min_properties?: number | null
          min_rating?: number | null
          min_reviews?: number | null
          name?: string
          requirements?: Json | null
          sort_order?: number | null
          tier?: number
        }
        Relationships: []
      }
      builder_profiles: {
        Row: {
          about_features: string[] | null
          about_mission: string | null
          about_vision: string | null
          amenities: string[] | null
          amenity_images: Json | null
          awards: string[] | null
          bhk_types_offered: string | null
          brochure_url: string | null
          builder_name: string
          certifications: string | null
          city_id: string | null
          clubhouse_description: string | null
          clubhouse_images: string[] | null
          company_registration_number: string | null
          completed_projects_count: number | null
          country_id: string | null
          created_at: string
          created_by_role: string | null
          customer_rating: number | null
          description: string | null
          district_id: string | null
          email: string | null
          established_year: number | null
          floor_plans_data: Json | null
          gallery_images: string[] | null
          google_maps_link: string | null
          hero_image: string | null
          id: string
          images: string[] | null
          key_people: Json | null
          land_area: string | null
          latitude: number | null
          live_stats_data: Json | null
          locality_id: string | null
          locations: string[] | null
          logo: string | null
          longitude: number | null
          master_plan_image: string | null
          number_of_projects: number | null
          office_addresses: Json | null
          ongoing_projects_count: number | null
          operating_cities: string[] | null
          phone: string
          price_range_max: number | null
          price_range_min: number | null
          project_location: string | null
          project_subtitle: string | null
          rera_number: string | null
          size_range: string | null
          slug: string | null
          social_links: Json | null
          specializations: string[] | null
          state_id: string | null
          tagline: string | null
          timeline_data: Json | null
          total_floors_count: string | null
          total_land_developed_sqft: number | null
          total_reviews: number | null
          total_units_count: number | null
          total_units_delivered: number | null
          towers_count: number | null
          type: string
          unit_types: string[] | null
          upcoming_projects_count: number | null
          updated_at: string
          user_id: string | null
          videos: string[] | null
          website: string | null
          whatsapp: string | null
          years_of_experience: number | null
        }
        Insert: {
          about_features?: string[] | null
          about_mission?: string | null
          about_vision?: string | null
          amenities?: string[] | null
          amenity_images?: Json | null
          awards?: string[] | null
          bhk_types_offered?: string | null
          brochure_url?: string | null
          builder_name: string
          certifications?: string | null
          city_id?: string | null
          clubhouse_description?: string | null
          clubhouse_images?: string[] | null
          company_registration_number?: string | null
          completed_projects_count?: number | null
          country_id?: string | null
          created_at?: string
          created_by_role?: string | null
          customer_rating?: number | null
          description?: string | null
          district_id?: string | null
          email?: string | null
          established_year?: number | null
          floor_plans_data?: Json | null
          gallery_images?: string[] | null
          google_maps_link?: string | null
          hero_image?: string | null
          id?: string
          images?: string[] | null
          key_people?: Json | null
          land_area?: string | null
          latitude?: number | null
          live_stats_data?: Json | null
          locality_id?: string | null
          locations?: string[] | null
          logo?: string | null
          longitude?: number | null
          master_plan_image?: string | null
          number_of_projects?: number | null
          office_addresses?: Json | null
          ongoing_projects_count?: number | null
          operating_cities?: string[] | null
          phone: string
          price_range_max?: number | null
          price_range_min?: number | null
          project_location?: string | null
          project_subtitle?: string | null
          rera_number?: string | null
          size_range?: string | null
          slug?: string | null
          social_links?: Json | null
          specializations?: string[] | null
          state_id?: string | null
          tagline?: string | null
          timeline_data?: Json | null
          total_floors_count?: string | null
          total_land_developed_sqft?: number | null
          total_reviews?: number | null
          total_units_count?: number | null
          total_units_delivered?: number | null
          towers_count?: number | null
          type?: string
          unit_types?: string[] | null
          upcoming_projects_count?: number | null
          updated_at?: string
          user_id?: string | null
          videos?: string[] | null
          website?: string | null
          whatsapp?: string | null
          years_of_experience?: number | null
        }
        Update: {
          about_features?: string[] | null
          about_mission?: string | null
          about_vision?: string | null
          amenities?: string[] | null
          amenity_images?: Json | null
          awards?: string[] | null
          bhk_types_offered?: string | null
          brochure_url?: string | null
          builder_name?: string
          certifications?: string | null
          city_id?: string | null
          clubhouse_description?: string | null
          clubhouse_images?: string[] | null
          company_registration_number?: string | null
          completed_projects_count?: number | null
          country_id?: string | null
          created_at?: string
          created_by_role?: string | null
          customer_rating?: number | null
          description?: string | null
          district_id?: string | null
          email?: string | null
          established_year?: number | null
          floor_plans_data?: Json | null
          gallery_images?: string[] | null
          google_maps_link?: string | null
          hero_image?: string | null
          id?: string
          images?: string[] | null
          key_people?: Json | null
          land_area?: string | null
          latitude?: number | null
          live_stats_data?: Json | null
          locality_id?: string | null
          locations?: string[] | null
          logo?: string | null
          longitude?: number | null
          master_plan_image?: string | null
          number_of_projects?: number | null
          office_addresses?: Json | null
          ongoing_projects_count?: number | null
          operating_cities?: string[] | null
          phone?: string
          price_range_max?: number | null
          price_range_min?: number | null
          project_location?: string | null
          project_subtitle?: string | null
          rera_number?: string | null
          size_range?: string | null
          slug?: string | null
          social_links?: Json | null
          specializations?: string[] | null
          state_id?: string | null
          tagline?: string | null
          timeline_data?: Json | null
          total_floors_count?: string | null
          total_land_developed_sqft?: number | null
          total_reviews?: number | null
          total_units_count?: number | null
          total_units_delivered?: number | null
          towers_count?: number | null
          type?: string
          unit_types?: string[] | null
          upcoming_projects_count?: number | null
          updated_at?: string
          user_id?: string | null
          videos?: string[] | null
          website?: string | null
          whatsapp?: string | null
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "builder_profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "loc_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_profiles_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "loc_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "loc_districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_profiles_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "loc_localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_profiles_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "loc_states"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_profiles_data: {
        Row: {
          city: string | null
          company_name: string | null
          created_at: string
          description: string | null
          established_year: number | null
          phone: string | null
          profile_id: string
          rera_number: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          established_year?: number | null
          phone?: string | null
          profile_id: string
          rera_number?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          established_year?: number | null
          phone?: string | null
          profile_id?: string
          rera_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "builder_profiles_data_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_context: {
        Row: {
          budget_comfort: string | null
          confidence_score: number | null
          created_at: string
          decision_mode: string | null
          id: string
          last_ai_update: string | null
          life_stage: string | null
          primary_fear: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_comfort?: string | null
          confidence_score?: number | null
          created_at?: string
          decision_mode?: string | null
          id?: string
          last_ai_update?: string | null
          life_stage?: string | null
          primary_fear?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_comfort?: string | null
          confidence_score?: number | null
          created_at?: string
          decision_mode?: string | null
          id?: string
          last_ai_update?: string | null
          life_stage?: string | null
          primary_fear?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      buyer_journey_events: {
        Row: {
          booked_at: string | null
          contacted_at: string | null
          created_at: string
          id: string
          notes: string | null
          property_id: string
          shortlisted_at: string | null
          stage: string
          updated_at: string
          user_id: string
          viewed_at: string | null
          visit_scheduled_at: string | null
          visited_at: string | null
        }
        Insert: {
          booked_at?: string | null
          contacted_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          property_id: string
          shortlisted_at?: string | null
          stage?: string
          updated_at?: string
          user_id: string
          viewed_at?: string | null
          visit_scheduled_at?: string | null
          visited_at?: string | null
        }
        Update: {
          booked_at?: string | null
          contacted_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          property_id?: string
          shortlisted_at?: string | null
          stage?: string
          updated_at?: string
          user_id?: string
          viewed_at?: string | null
          visit_scheduled_at?: string | null
          visited_at?: string | null
        }
        Relationships: []
      }
      buyer_preferred_locations: {
        Row: {
          city: string | null
          created_at: string
          id: string
          last_notification_at: string | null
          latitude: number | null
          locality: string | null
          longitude: number | null
          name: string
          notifications_enabled: boolean
          radius_km: number
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          last_notification_at?: string | null
          latitude?: number | null
          locality?: string | null
          longitude?: number | null
          name: string
          notifications_enabled?: boolean
          radius_km?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          last_notification_at?: string | null
          latitude?: number | null
          locality?: string | null
          longitude?: number | null
          name?: string
          notifications_enabled?: boolean
          radius_km?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      buyer_profiles: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          full_name: string | null
          notes: string | null
          preferred_bhk: string[] | null
          preferred_cities: string[] | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          full_name?: string | null
          notes?: string | null
          preferred_bhk?: string[] | null
          preferred_cities?: string[] | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          full_name?: string | null
          notes?: string | null
          preferred_bhk?: string[] | null
          preferred_cities?: string[] | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      buyer_referral_events: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referee_id: string | null
          referee_name: string | null
          referrer_id: string
          reward_amount: number
          source: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referee_id?: string | null
          referee_name?: string | null
          referrer_id: string
          reward_amount?: number
          source?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referee_id?: string | null
          referee_name?: string | null
          referrer_id?: string
          reward_amount?: number
          source?: string
          status?: string
        }
        Relationships: []
      }
      cash_back_entries: {
        Row: {
          amount: number
          created_at: string
          id: string
          redeemed_at: string | null
          reference_id: string | null
          source: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          redeemed_at?: string | null
          reference_id?: string | null
          source: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          redeemed_at?: string | null
          reference_id?: string | null
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      cashback_earnings: {
        Row: {
          amount: number
          created_at: string
          credited_at: string | null
          id: string
          reference_id: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          credited_at?: string | null
          id?: string
          reference_id?: string | null
          source: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credited_at?: string | null
          id?: string
          reference_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      construction_updates: {
        Row: {
          completion_percentage: number | null
          created_at: string
          delay_reason: string | null
          description: string | null
          id: string
          is_delay: boolean
          media_type: string | null
          media_urls: string[] | null
          milestone: string | null
          project_id: string
          title: string
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string
          delay_reason?: string | null
          description?: string | null
          id?: string
          is_delay?: boolean
          media_type?: string | null
          media_urls?: string[] | null
          milestone?: string | null
          project_id: string
          title: string
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string
          delay_reason?: string | null
          description?: string | null
          id?: string
          is_delay?: boolean
          media_type?: string | null
          media_urls?: string[] | null
          milestone?: string | null
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "construction_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_stats_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "construction_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notes: {
        Row: {
          assigned_to: string | null
          builder_profile_id: string | null
          completed_at: string | null
          content: string | null
          created_at: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          priority: string | null
          related_to_id: string | null
          related_to_type: string | null
          reminder_at: string | null
          status: string | null
          title: string
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          builder_profile_id?: string | null
          completed_at?: string | null
          content?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          reminder_at?: string | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          builder_profile_id?: string | null
          completed_at?: string | null
          content?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          reminder_at?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_builder_profile_id_fkey"
            columns: ["builder_profile_id"]
            isOneToOne: false
            referencedRelation: "builder_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          flag_name: string
          id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          flag_name: string
          id?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          flag_name?: string
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      financial_activities: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          metadata: Json | null
          provider_id: string | null
          type: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          provider_id?: string | null
          type?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          provider_id?: string | null
          type?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_activities_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "financial_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_application_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          application_id: string
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          message: string | null
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          application_id: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          message?: string | null
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          application_id?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          message?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "financial_loan_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_application_notes: {
        Row: {
          application_id: string
          author_id: string | null
          author_name: string | null
          created_at: string
          id: string
          note: string
        }
        Insert: {
          application_id: string
          author_id?: string | null
          author_name?: string | null
          created_at?: string
          id?: string
          note: string
        }
        Update: {
          application_id?: string
          author_id?: string | null
          author_name?: string | null
          created_at?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "financial_loan_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_branches: {
        Row: {
          branch_locations: Json | null
          created_at: string
          head_office: string
          id: string
          operating_states: string[] | null
          provider_id: string
          service_areas: string[] | null
          updated_at: string
          website: string | null
        }
        Insert: {
          branch_locations?: Json | null
          created_at?: string
          head_office: string
          id?: string
          operating_states?: string[] | null
          provider_id: string
          service_areas?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          branch_locations?: Json | null
          created_at?: string
          head_office?: string
          id?: string
          operating_states?: string[] | null
          provider_id?: string
          service_areas?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      financial_enquiries: {
        Row: {
          advisor_contact: string | null
          advisor_id: string | null
          advisor_name: string | null
          advisor_notes: string | null
          amount_requested: number | null
          builder_profile_id: string | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          contact_date: string | null
          created_at: string
          deactivated_reason: string | null
          documents: Json
          employment_type: string | null
          enquiry_type: string | null
          follow_up_date: string | null
          id: string
          interest_rate_offered: number | null
          loan_amount: number | null
          loan_tenure_years: number | null
          loan_type: string
          monthly_emi: number | null
          monthly_income: number | null
          notes: string | null
          property_address: string | null
          property_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          advisor_contact?: string | null
          advisor_id?: string | null
          advisor_name?: string | null
          advisor_notes?: string | null
          amount_requested?: number | null
          builder_profile_id?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          contact_date?: string | null
          created_at?: string
          deactivated_reason?: string | null
          documents?: Json
          employment_type?: string | null
          enquiry_type?: string | null
          follow_up_date?: string | null
          id?: string
          interest_rate_offered?: number | null
          loan_amount?: number | null
          loan_tenure_years?: number | null
          loan_type: string
          monthly_emi?: number | null
          monthly_income?: number | null
          notes?: string | null
          property_address?: string | null
          property_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          advisor_contact?: string | null
          advisor_id?: string | null
          advisor_name?: string | null
          advisor_notes?: string | null
          amount_requested?: number | null
          builder_profile_id?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          contact_date?: string | null
          created_at?: string
          deactivated_reason?: string | null
          documents?: Json
          employment_type?: string | null
          enquiry_type?: string | null
          follow_up_date?: string | null
          id?: string
          interest_rate_offered?: number | null
          loan_amount?: number | null
          loan_tenure_years?: number | null
          loan_type?: string
          monthly_emi?: number | null
          monthly_income?: number | null
          notes?: string | null
          property_address?: string | null
          property_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_enquiries_builder_profile_id_fkey"
            columns: ["builder_profile_id"]
            isOneToOne: false
            referencedRelation: "builder_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_leads: {
        Row: {
          budget: number | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          customer_name: string
          district: string | null
          district_admin_id: string | null
          documents: Json | null
          full_details: Json | null
          id: string
          is_purchased: boolean
          lead_type: string
          location: string | null
          price: number
          purchased_at: string | null
          purchased_by_provider_id: string | null
          requirement: string | null
          source_user_id: string | null
          state: string | null
        }
        Insert: {
          budget?: number | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          customer_name: string
          district?: string | null
          district_admin_id?: string | null
          documents?: Json | null
          full_details?: Json | null
          id?: string
          is_purchased?: boolean
          lead_type: string
          location?: string | null
          price?: number
          purchased_at?: string | null
          purchased_by_provider_id?: string | null
          requirement?: string | null
          source_user_id?: string | null
          state?: string | null
        }
        Update: {
          budget?: number | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          customer_name?: string
          district?: string | null
          district_admin_id?: string | null
          documents?: Json | null
          full_details?: Json | null
          id?: string
          is_purchased?: boolean
          lead_type?: string
          location?: string | null
          price?: number
          purchased_at?: string | null
          purchased_by_provider_id?: string | null
          requirement?: string | null
          source_user_id?: string | null
          state?: string | null
        }
        Relationships: []
      }
      financial_loan_applications: {
        Row: {
          accepted_at: string | null
          approved_at: string | null
          assigned_rm: string | null
          assigned_rm_id: string | null
          assigned_rm_name: string | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_name: string | null
          buyer_phone: string | null
          closed_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          disbursed_amount: number | null
          disbursed_at: string | null
          documents: Json | null
          documents_request_reason: string | null
          emi_amount: number | null
          id: string
          interest_rate: number | null
          loan_amount: number | null
          loan_type: string | null
          monthly_income: number | null
          notes: string | null
          priority: string | null
          processing_fee: number | null
          property_id: string | null
          property_title: string | null
          property_value: number | null
          provider_id: string | null
          rejected_at: string | null
          rejection_reason: string | null
          sanction_amount: number | null
          status: string | null
          tenure_months: number | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          approved_at?: string | null
          assigned_rm?: string | null
          assigned_rm_id?: string | null
          assigned_rm_name?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          closed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          disbursed_amount?: number | null
          disbursed_at?: string | null
          documents?: Json | null
          documents_request_reason?: string | null
          emi_amount?: number | null
          id?: string
          interest_rate?: number | null
          loan_amount?: number | null
          loan_type?: string | null
          monthly_income?: number | null
          notes?: string | null
          priority?: string | null
          processing_fee?: number | null
          property_id?: string | null
          property_title?: string | null
          property_value?: number | null
          provider_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          sanction_amount?: number | null
          status?: string | null
          tenure_months?: number | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          approved_at?: string | null
          assigned_rm?: string | null
          assigned_rm_id?: string | null
          assigned_rm_name?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          closed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          disbursed_amount?: number | null
          disbursed_at?: string | null
          documents?: Json | null
          documents_request_reason?: string | null
          emi_amount?: number | null
          id?: string
          interest_rate?: number | null
          loan_amount?: number | null
          loan_type?: string | null
          monthly_income?: number | null
          notes?: string | null
          priority?: string | null
          processing_fee?: number | null
          property_id?: string | null
          property_title?: string | null
          property_value?: number | null
          provider_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          sanction_amount?: number | null
          status?: string | null
          tenure_months?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_loan_applications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "financial_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_loan_documents: {
        Row: {
          application_id: string
          document_type: string
          file_name: string | null
          file_path: string | null
          file_url: string | null
          id: string
          notes: string | null
          request_reason: string | null
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
          verified_by: string | null
          verified_status: string
        }
        Insert: {
          application_id: string
          document_type: string
          file_name?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          request_reason?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          verified_by?: string | null
          verified_status?: string
        }
        Update: {
          application_id?: string
          document_type?: string
          file_name?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          request_reason?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          verified_by?: string | null
          verified_status?: string
        }
        Relationships: []
      }
      financial_meetings: {
        Row: {
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          date: string | null
          description: string | null
          duration: number | null
          id: string
          location: string | null
          notes: string | null
          provider_id: string | null
          status: string | null
          time: string | null
          title: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          provider_id?: string | null
          status?: string | null
          time?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          provider_id?: string | null
          status?: string | null
          time?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_meetings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "financial_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          provider_id: string | null
          read: boolean | null
          title: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          provider_id?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          provider_id?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_notifications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "financial_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_promotions: {
        Row: {
          amount: number
          created_at: string
          duration_days: number
          end_date: string
          id: string
          is_active: boolean
          package_type: string
          provider_id: string
          start_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          duration_days: number
          end_date: string
          id?: string
          is_active?: boolean
          package_type: string
          provider_id: string
          start_date?: string
        }
        Update: {
          amount?: number
          created_at?: string
          duration_days?: number
          end_date?: string
          id?: string
          is_active?: boolean
          package_type?: string
          provider_id?: string
          start_date?: string
        }
        Relationships: []
      }
      financial_providers: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          entity_type: string | null
          id: string
          interest_rate: number | null
          is_active: boolean
          kyc_status: string | null
          loan_products: Json
          logo_url: string | null
          notification_prefs: Json
          processing_fee_percent: number | null
          rating: number
          rbi_registration: string | null
          services_offered: string[] | null
          subscription_status: string | null
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          entity_type?: string | null
          id?: string
          interest_rate?: number | null
          is_active?: boolean
          kyc_status?: string | null
          loan_products?: Json
          logo_url?: string | null
          notification_prefs?: Json
          processing_fee_percent?: number | null
          rating?: number
          rbi_registration?: string | null
          services_offered?: string[] | null
          subscription_status?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          entity_type?: string | null
          id?: string
          interest_rate?: number | null
          is_active?: boolean
          kyc_status?: string | null
          loan_products?: Json
          logo_url?: string | null
          notification_prefs?: Json
          processing_fee_percent?: number | null
          rating?: number
          rbi_registration?: string | null
          services_offered?: string[] | null
          subscription_status?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      financial_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          provider_id: string | null
          status: string | null
          title: string | null
          type: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          provider_id?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          provider_id?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_tasks_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "financial_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_team_members: {
        Row: {
          applications_count: number | null
          approvals_count: number | null
          avatar: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string | null
          pending_count: number | null
          provider_id: string | null
          revenue: number | null
          role: string | null
        }
        Insert: {
          applications_count?: number | null
          approvals_count?: number | null
          avatar?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          pending_count?: number | null
          provider_id?: string | null
          revenue?: number | null
          role?: string | null
        }
        Update: {
          applications_count?: number | null
          approvals_count?: number | null
          avatar?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          pending_count?: number | null
          provider_id?: string | null
          revenue?: number | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_team_members_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "financial_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_portal_requests: {
        Row: {
          booking_id: string
          created_at: string
          handled_by: string | null
          hotel_id: string
          id: string
          payload: Json
          request_type: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          handled_by?: string | null
          hotel_id: string
          id?: string
          payload?: Json
          request_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          handled_by?: string | null
          hotel_id?: string
          id?: string
          payload?: Json
          request_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_portal_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_portal_requests_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_addons: {
        Row: {
          available_from: string | null
          available_to: string | null
          category: string
          created_at: string
          description: string | null
          hotel_id: string
          id: string
          is_active: boolean
          photo_url: string | null
          price: number
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          available_from?: string | null
          available_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          hotel_id: string
          id?: string
          is_active?: boolean
          photo_url?: string | null
          price?: number
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          available_from?: string | null
          available_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          hotel_id?: string
          id?: string
          is_active?: boolean
          photo_url?: string | null
          price?: number
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_addons_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_booking_addons: {
        Row: {
          addon_id: string
          booking_id: string
          created_at: string
          id: string
          quantity: number
          status: string
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          addon_id: string
          booking_id: string
          created_at?: string
          id?: string
          quantity?: number
          status?: string
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          addon_id?: string
          booking_id?: string
          created_at?: string
          id?: string
          quantity?: number
          status?: string
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_booking_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "hotel_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_booking_addons_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_booking_items: {
        Row: {
          adult_count: number
          booking_id: string
          child_count: number
          created_at: string
          hotel_id: string | null
          id: string
          item_name: string
          item_type: string
          price_snapshot: Json | null
          quantity: number
          subtotal: number
          tax_amount: number
          total_amount: number
          unit_price: number
          units: number
        }
        Insert: {
          adult_count?: number
          booking_id: string
          child_count?: number
          created_at?: string
          hotel_id?: string | null
          id?: string
          item_name: string
          item_type: string
          price_snapshot?: Json | null
          quantity?: number
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          unit_price?: number
          units?: number
        }
        Update: {
          adult_count?: number
          booking_id?: string
          child_count?: number
          created_at?: string
          hotel_id?: string | null
          id?: string
          item_name?: string
          item_type?: string
          price_snapshot?: Json | null
          quantity?: number
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          unit_price?: number
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "hotel_booking_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_booking_items_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_booking_notes: {
        Row: {
          author_id: string | null
          booking_id: string
          created_at: string
          hotel_id: string
          id: string
          note: string
        }
        Insert: {
          author_id?: string | null
          booking_id: string
          created_at?: string
          hotel_id: string
          id?: string
          note: string
        }
        Update: {
          author_id?: string | null
          booking_id?: string
          created_at?: string
          hotel_id?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_booking_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_booking_notes_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_bookings: {
        Row: {
          actual_check_in_at: string | null
          actual_check_out_at: string | null
          addon_total: number
          adults: number
          amount_paid: number
          booked_by_agent_id: string | null
          booking_reference: string | null
          booking_type: string | null
          builder_profile_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          check_in: string
          check_out: string
          checked_in_at: string | null
          checkin_info: Json | null
          children: number
          country: string | null
          created_at: string | null
          currency: string
          discount_total: number
          district: string | null
          district_admin_id: string | null
          extra_bed_total: number
          extra_beds: number
          extra_charges: number
          gst_rate: number | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          guest_portal_token: string | null
          hotel_address: string | null
          hotel_id: string
          hotel_name: string | null
          housekeeping_staff: string | null
          housekeeping_status: string | null
          id: string
          invoice_url: string | null
          meal_total: number
          meals: Json
          num_guests: number | null
          num_rooms: number | null
          package_id: string | null
          payment_attempted_at: string | null
          payment_method: string | null
          payment_status: string
          price_snapshot: Json | null
          promo_code: string | null
          property_id: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_refund_id: string | null
          razorpay_signature: string | null
          refunded_amount: number | null
          refunded_at: string | null
          room_charges: number
          room_cleaned_at: string | null
          room_id: string | null
          room_number: string | null
          room_type: string | null
          source: string
          special_requests: string | null
          state: string | null
          status: string
          tax_amount: number
          taxable_subtotal: number
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          actual_check_in_at?: string | null
          actual_check_out_at?: string | null
          addon_total?: number
          adults?: number
          amount_paid?: number
          booked_by_agent_id?: string | null
          booking_reference?: string | null
          booking_type?: string | null
          builder_profile_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_in: string
          check_out: string
          checked_in_at?: string | null
          checkin_info?: Json | null
          children?: number
          country?: string | null
          created_at?: string | null
          currency?: string
          discount_total?: number
          district?: string | null
          district_admin_id?: string | null
          extra_bed_total?: number
          extra_beds?: number
          extra_charges?: number
          gst_rate?: number | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          guest_portal_token?: string | null
          hotel_address?: string | null
          hotel_id: string
          hotel_name?: string | null
          housekeeping_staff?: string | null
          housekeeping_status?: string | null
          id?: string
          invoice_url?: string | null
          meal_total?: number
          meals?: Json
          num_guests?: number | null
          num_rooms?: number | null
          package_id?: string | null
          payment_attempted_at?: string | null
          payment_method?: string | null
          payment_status?: string
          price_snapshot?: Json | null
          promo_code?: string | null
          property_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          razorpay_signature?: string | null
          refunded_amount?: number | null
          refunded_at?: string | null
          room_charges?: number
          room_cleaned_at?: string | null
          room_id?: string | null
          room_number?: string | null
          room_type?: string | null
          source?: string
          special_requests?: string | null
          state?: string | null
          status?: string
          tax_amount?: number
          taxable_subtotal?: number
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          actual_check_in_at?: string | null
          actual_check_out_at?: string | null
          addon_total?: number
          adults?: number
          amount_paid?: number
          booked_by_agent_id?: string | null
          booking_reference?: string | null
          booking_type?: string | null
          builder_profile_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_in?: string
          check_out?: string
          checked_in_at?: string | null
          checkin_info?: Json | null
          children?: number
          country?: string | null
          created_at?: string | null
          currency?: string
          discount_total?: number
          district?: string | null
          district_admin_id?: string | null
          extra_bed_total?: number
          extra_beds?: number
          extra_charges?: number
          gst_rate?: number | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          guest_portal_token?: string | null
          hotel_address?: string | null
          hotel_id?: string
          hotel_name?: string | null
          housekeeping_staff?: string | null
          housekeeping_status?: string | null
          id?: string
          invoice_url?: string | null
          meal_total?: number
          meals?: Json
          num_guests?: number | null
          num_rooms?: number | null
          package_id?: string | null
          payment_attempted_at?: string | null
          payment_method?: string | null
          payment_status?: string
          price_snapshot?: Json | null
          promo_code?: string | null
          property_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_refund_id?: string | null
          razorpay_signature?: string | null
          refunded_amount?: number | null
          refunded_at?: string | null
          room_charges?: number
          room_cleaned_at?: string | null
          room_id?: string | null
          room_number?: string | null
          room_type?: string | null
          source?: string
          special_requests?: string | null
          state?: string | null
          status?: string
          tax_amount?: number
          taxable_subtotal?: number
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_bookings_booked_by_agent_id_fkey"
            columns: ["booked_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_bookings_builder_profile_id_fkey"
            columns: ["builder_profile_id"]
            isOneToOne: false
            referencedRelation: "builder_profiles"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "hotel_bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_channel_mappings: {
        Row: {
          application_id: string | null
          channel: string
          commission_percent: number | null
          created_at: string
          external_property_id: string | null
          id: string
          last_sync_at: string | null
          last_sync_status: string | null
          notes: string | null
          pms_connection_id: string | null
          sync_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          channel: string
          commission_percent?: number | null
          created_at?: string
          external_property_id?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          notes?: string | null
          pms_connection_id?: string | null
          sync_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          channel?: string
          commission_percent?: number | null
          created_at?: string
          external_property_id?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          notes?: string | null
          pms_connection_id?: string | null
          sync_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_channel_mappings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "hotel_partner_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_channel_mappings_pms_connection_id_fkey"
            columns: ["pms_connection_id"]
            isOneToOne: false
            referencedRelation: "hotel_pms_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_commission_config: {
        Row: {
          channel: string
          commission_percent: number
          created_at: string
          hotel_id: string
          id: string
          updated_at: string
        }
        Insert: {
          channel: string
          commission_percent?: number
          created_at?: string
          hotel_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          commission_percent?: number
          created_at?: string
          hotel_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_commission_config_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_guest_messages: {
        Row: {
          body: string
          booking_id: string | null
          created_at: string
          guest_name: string | null
          guest_phone: string | null
          guest_user_id: string | null
          hotel_id: string
          id: string
          read_by_guest: boolean
          read_by_partner: boolean
          sender: string
          sent_via_whatsapp: boolean
          whatsapp_sid: string | null
        }
        Insert: {
          body: string
          booking_id?: string | null
          created_at?: string
          guest_name?: string | null
          guest_phone?: string | null
          guest_user_id?: string | null
          hotel_id: string
          id?: string
          read_by_guest?: boolean
          read_by_partner?: boolean
          sender: string
          sent_via_whatsapp?: boolean
          whatsapp_sid?: string | null
        }
        Update: {
          body?: string
          booking_id?: string | null
          created_at?: string
          guest_name?: string | null
          guest_phone?: string | null
          guest_user_id?: string | null
          hotel_id?: string
          id?: string
          read_by_guest?: boolean
          read_by_partner?: boolean
          sender?: string
          sent_via_whatsapp?: boolean
          whatsapp_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_guest_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_guest_messages_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_guests: {
        Row: {
          created_at: string
          email: string | null
          hotel_id: string
          id: string
          last_stay_at: string | null
          name: string
          notes: string | null
          phone: string | null
          tags: string[] | null
          total_bookings: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          hotel_id: string
          id?: string
          last_stay_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          total_bookings?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          hotel_id?: string
          id?: string
          last_stay_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          total_bookings?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_guests_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_meals: {
        Row: {
          adult_price: number
          child_price: number
          created_at: string
          hotel_id: string
          id: string
          is_active: boolean
          is_available: boolean
          meal_type: string
          pricing_mode: string
          room_id: string | null
          updated_at: string
        }
        Insert: {
          adult_price?: number
          child_price?: number
          created_at?: string
          hotel_id: string
          id?: string
          is_active?: boolean
          is_available?: boolean
          meal_type: string
          pricing_mode?: string
          room_id?: string | null
          updated_at?: string
        }
        Update: {
          adult_price?: number
          child_price?: number
          created_at?: string
          hotel_id?: string
          id?: string
          is_active?: boolean
          is_available?: boolean
          meal_type?: string
          pricing_mode?: string
          room_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_meals_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_meals_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_partner_applications: {
        Row: {
          address: string | null
          address_proof_url: string | null
          admin_notes: string | null
          amenities: string[] | null
          approved_hotel_id: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bank_name: string | null
          business_registration_url: string | null
          business_type: string
          cancelled_cheque_url: string | null
          check_in_24h: boolean
          check_in_time: string | null
          check_out_time: string | null
          city: string
          company_name: string | null
          country: string | null
          created_at: string
          district: string | null
          district_admin_id: string | null
          email: string
          front_desk_24h: boolean
          gst_certificate_url: string | null
          gst_number: string | null
          hotel_name: string
          id: string
          id_proof_url: string | null
          identity_proof_url: string | null
          latitude: number | null
          locality: string
          longitude: number | null
          num_hotels: number | null
          num_rooms_total: number | null
          owner_name: string
          pan_number: string | null
          phone: string
          photos: string[] | null
          pincode: string | null
          pms_provider: string | null
          pms_setup_completed: boolean
          price_max: number | null
          price_min: number | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          room_categories: Json
          room_types: string[] | null
          state: string | null
          status: string
          total_rooms: number | null
          trade_license_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          address_proof_url?: string | null
          admin_notes?: string | null
          amenities?: string[] | null
          approved_hotel_id?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          business_registration_url?: string | null
          business_type?: string
          cancelled_cheque_url?: string | null
          check_in_24h?: boolean
          check_in_time?: string | null
          check_out_time?: string | null
          city: string
          company_name?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          district_admin_id?: string | null
          email: string
          front_desk_24h?: boolean
          gst_certificate_url?: string | null
          gst_number?: string | null
          hotel_name: string
          id?: string
          id_proof_url?: string | null
          identity_proof_url?: string | null
          latitude?: number | null
          locality: string
          longitude?: number | null
          num_hotels?: number | null
          num_rooms_total?: number | null
          owner_name: string
          pan_number?: string | null
          phone: string
          photos?: string[] | null
          pincode?: string | null
          pms_provider?: string | null
          pms_setup_completed?: boolean
          price_max?: number | null
          price_min?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_categories?: Json
          room_types?: string[] | null
          state?: string | null
          status?: string
          total_rooms?: number | null
          trade_license_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          address_proof_url?: string | null
          admin_notes?: string | null
          amenities?: string[] | null
          approved_hotel_id?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          business_registration_url?: string | null
          business_type?: string
          cancelled_cheque_url?: string | null
          check_in_24h?: boolean
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string
          company_name?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          district_admin_id?: string | null
          email?: string
          front_desk_24h?: boolean
          gst_certificate_url?: string | null
          gst_number?: string | null
          hotel_name?: string
          id?: string
          id_proof_url?: string | null
          identity_proof_url?: string | null
          latitude?: number | null
          locality?: string
          longitude?: number | null
          num_hotels?: number | null
          num_rooms_total?: number | null
          owner_name?: string
          pan_number?: string | null
          phone?: string
          photos?: string[] | null
          pincode?: string | null
          pms_provider?: string | null
          pms_setup_completed?: boolean
          price_max?: number | null
          price_min?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_categories?: Json
          room_types?: string[] | null
          state?: string | null
          status?: string
          total_rooms?: number | null
          trade_license_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      hotel_payout_batches: {
        Row: {
          bookings_count: number
          commission_amount: number
          created_at: string
          currency: string
          gross_amount: number
          hotel_id: string
          id: string
          invoice_url: string | null
          net_amount: number
          notes: string | null
          paid_at: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          bookings_count?: number
          commission_amount?: number
          created_at?: string
          currency?: string
          gross_amount?: number
          hotel_id: string
          id?: string
          invoice_url?: string | null
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          bookings_count?: number
          commission_amount?: number
          created_at?: string
          currency?: string
          gross_amount?: number
          hotel_id?: string
          id?: string
          invoice_url?: string | null
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_payout_batches_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_payout_settings: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string
          gst_number: string | null
          hotel_id: string
          id: string
          ifsc_code: string | null
          pan_number: string | null
          payout_frequency: string
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          gst_number?: string | null
          hotel_id: string
          id?: string
          ifsc_code?: string | null
          pan_number?: string | null
          payout_frequency?: string
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          gst_number?: string | null
          hotel_id?: string
          id?: string
          ifsc_code?: string | null
          pan_number?: string | null
          payout_frequency?: string
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_payout_settings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: true
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_pms_connections: {
        Row: {
          api_endpoint: string | null
          api_key_masked: string | null
          application_id: string | null
          connection_mode: string
          created_at: string
          hotel_id: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          last_sync_error: string | null
          pms_provider: string
          property_code: string | null
          sync_interval_minutes: number
          sync_inventory: boolean
          sync_rates: boolean
          sync_reservations: boolean
          sync_restrictions: boolean
          sync_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_endpoint?: string | null
          api_key_masked?: string | null
          application_id?: string | null
          connection_mode?: string
          created_at?: string
          hotel_id?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          pms_provider: string
          property_code?: string | null
          sync_interval_minutes?: number
          sync_inventory?: boolean
          sync_rates?: boolean
          sync_reservations?: boolean
          sync_restrictions?: boolean
          sync_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_endpoint?: string | null
          api_key_masked?: string | null
          application_id?: string | null
          connection_mode?: string
          created_at?: string
          hotel_id?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          pms_provider?: string
          property_code?: string | null
          sync_interval_minutes?: number
          sync_inventory?: boolean
          sync_rates?: boolean
          sync_reservations?: boolean
          sync_restrictions?: boolean
          sync_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_pms_connections_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "hotel_partner_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_pricing_rules: {
        Row: {
          adjustment_type: string
          adjustment_value: number
          conditions: Json
          created_at: string
          ends_on: string | null
          hotel_id: string
          id: string
          is_active: boolean
          name: string
          priority: number
          room_id: string | null
          rule_type: string
          starts_on: string | null
          updated_at: string
        }
        Insert: {
          adjustment_type: string
          adjustment_value?: number
          conditions?: Json
          created_at?: string
          ends_on?: string | null
          hotel_id: string
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          room_id?: string | null
          rule_type: string
          starts_on?: string | null
          updated_at?: string
        }
        Update: {
          adjustment_type?: string
          adjustment_value?: number
          conditions?: Json
          created_at?: string
          ends_on?: string | null
          hotel_id?: string
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          room_id?: string | null
          rule_type?: string
          starts_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_pricing_rules_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_pricing_rules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_promo_codes: {
        Row: {
          applicable_room_ids: string[] | null
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          hotel_id: string
          id: string
          is_active: boolean
          max_uses: number | null
          min_nights: number | null
          updated_at: string
          uses_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_room_ids?: string[] | null
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value?: number
          hotel_id: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_nights?: number | null
          updated_at?: string
          uses_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_room_ids?: string[] | null
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          hotel_id?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_nights?: number | null
          updated_at?: string
          uses_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_promo_codes_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_rate_calendar: {
        Row: {
          available_units: number | null
          created_at: string
          date: string
          hotel_id: string
          id: string
          min_stay: number | null
          price: number | null
          room_id: string
          stop_sell: boolean
          updated_at: string
        }
        Insert: {
          available_units?: number | null
          created_at?: string
          date: string
          hotel_id: string
          id?: string
          min_stay?: number | null
          price?: number | null
          room_id: string
          stop_sell?: boolean
          updated_at?: string
        }
        Update: {
          available_units?: number | null
          created_at?: string
          date?: string
          hotel_id?: string
          id?: string
          min_stay?: number | null
          price?: number | null
          room_id?: string
          stop_sell?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_rate_calendar_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_rate_calendar_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_rate_plans: {
        Row: {
          adjustment_type: string
          adjustment_value: number
          conditions: Json | null
          created_at: string
          description: string | null
          hotel_id: string
          id: string
          is_active: boolean
          is_refundable: boolean
          name: string
          updated_at: string
        }
        Insert: {
          adjustment_type?: string
          adjustment_value?: number
          conditions?: Json | null
          created_at?: string
          description?: string | null
          hotel_id: string
          id?: string
          is_active?: boolean
          is_refundable?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          adjustment_type?: string
          adjustment_value?: number
          conditions?: Json | null
          created_at?: string
          description?: string | null
          hotel_id?: string
          id?: string
          is_active?: boolean
          is_refundable?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_rate_plans_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_reviews: {
        Row: {
          body: string | null
          booking_id: string | null
          created_at: string
          guest_name: string
          guest_user_id: string | null
          hotel_id: string
          id: string
          rating: number
          responded_at: string | null
          response: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          booking_id?: string | null
          created_at?: string
          guest_name: string
          guest_user_id?: string | null
          hotel_id: string
          id?: string
          rating: number
          responded_at?: string | null
          response?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          booking_id?: string | null
          created_at?: string
          guest_name?: string
          guest_user_id?: string | null
          hotel_id?: string
          id?: string
          rating?: number
          responded_at?: string | null
          response?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_reviews_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_room_channel_mappings: {
        Row: {
          channel: string
          commission_percent: number | null
          created_at: string
          external_rate_plan_id: string | null
          external_room_id: string | null
          hotel_id: string
          id: string
          last_sync_at: string | null
          last_sync_status: string | null
          notes: string | null
          room_id: string
          sync_enabled: boolean
          updated_at: string
        }
        Insert: {
          channel: string
          commission_percent?: number | null
          created_at?: string
          external_rate_plan_id?: string | null
          external_room_id?: string | null
          hotel_id: string
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          notes?: string | null
          room_id: string
          sync_enabled?: boolean
          updated_at?: string
        }
        Update: {
          channel?: string
          commission_percent?: number | null
          created_at?: string
          external_rate_plan_id?: string | null
          external_room_id?: string | null
          hotel_id?: string
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          notes?: string | null
          room_id?: string
          sync_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_room_channel_mappings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_room_channel_mappings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_room_inventory: {
        Row: {
          available_units: number
          created_at: string
          date: string
          hotel_id: string
          id: string
          room_id: string
          updated_at: string
        }
        Insert: {
          available_units?: number
          created_at?: string
          date: string
          hotel_id: string
          id?: string
          room_id: string
          updated_at?: string
        }
        Update: {
          available_units?: number
          created_at?: string
          date?: string
          hotel_id?: string
          id?: string
          room_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_room_inventory_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_room_inventory_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_rooms: {
        Row: {
          amenities: Json | null
          base_price: number
          bed_type: string | null
          breakfast_included: boolean
          cancellation_policy: string | null
          category: string | null
          child_age_to: number
          child_free_age_to: number
          created_at: string
          description: string | null
          extra_bed_allowed: boolean
          extra_bed_price: number | null
          hotel_id: string
          id: string
          is_active: boolean
          max_adults: number
          max_children: number
          max_extra_beds: number
          max_occupancy: number
          min_nights: number
          photos: string[] | null
          pms_room_code: string | null
          pms_room_id: string | null
          room_type: string
          size_sqft: number | null
          smoking_allowed: boolean
          total_units: number
          updated_at: string
          view_type: string | null
        }
        Insert: {
          amenities?: Json | null
          base_price?: number
          bed_type?: string | null
          breakfast_included?: boolean
          cancellation_policy?: string | null
          category?: string | null
          child_age_to?: number
          child_free_age_to?: number
          created_at?: string
          description?: string | null
          extra_bed_allowed?: boolean
          extra_bed_price?: number | null
          hotel_id: string
          id?: string
          is_active?: boolean
          max_adults?: number
          max_children?: number
          max_extra_beds?: number
          max_occupancy?: number
          min_nights?: number
          photos?: string[] | null
          pms_room_code?: string | null
          pms_room_id?: string | null
          room_type: string
          size_sqft?: number | null
          smoking_allowed?: boolean
          total_units?: number
          updated_at?: string
          view_type?: string | null
        }
        Update: {
          amenities?: Json | null
          base_price?: number
          bed_type?: string | null
          breakfast_included?: boolean
          cancellation_policy?: string | null
          category?: string | null
          child_age_to?: number
          child_free_age_to?: number
          created_at?: string
          description?: string | null
          extra_bed_allowed?: boolean
          extra_bed_price?: number | null
          hotel_id?: string
          id?: string
          is_active?: boolean
          max_adults?: number
          max_children?: number
          max_extra_beds?: number
          max_occupancy?: number
          min_nights?: number
          photos?: string[] | null
          pms_room_code?: string | null
          pms_room_id?: string | null
          room_type?: string
          size_sqft?: number | null
          smoking_allowed?: boolean
          total_units?: number
          updated_at?: string
          view_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_staff: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          invited_email: string | null
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          invited_email?: string | null
          is_active?: boolean
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          invited_email?: string | null
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_staff_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "partner_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          created_at: string
          file_url: string
          id: string
          rejection_reason: string | null
          status: string
          type: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          rejection_reason?: string | null
          status?: string
          type: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          rejection_reason?: string | null
          status?: string
          type?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      kyc_verifications: {
        Row: {
          aadhaar_url: string | null
          created_at: string
          id: string
          pan_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aadhaar_url?: string | null
          created_at?: string
          id?: string
          pan_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aadhaar_url?: string | null
          created_at?: string
          id?: string
          pan_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loan_documents: {
        Row: {
          enquiry_id: string
          file_url: string
          id: string
          status: string
          type: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          enquiry_id: string
          file_url: string
          id?: string
          status?: string
          type: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          enquiry_id?: string
          file_url?: string
          id?: string
          status?: string
          type?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_documents_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "financial_enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      loc_cities: {
        Row: {
          created_at: string
          district_id: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          district_id: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          district_id?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loc_cities_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "loc_districts"
            referencedColumns: ["id"]
          },
        ]
      }
      loc_countries: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          iso2: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          iso2?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          iso2?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      loc_districts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          state_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          state_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          state_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loc_districts_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "loc_states"
            referencedColumns: ["id"]
          },
        ]
      }
      loc_localities: {
        Row: {
          city_id: string
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          pincode: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          pincode?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          pincode?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loc_localities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "loc_cities"
            referencedColumns: ["id"]
          },
        ]
      }
      loc_states: {
        Row: {
          country_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loc_states_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "loc_countries"
            referencedColumns: ["id"]
          },
        ]
      }
      location_hierarchy: {
        Row: {
          city_display: string
          city_normalized: string
          country: string
          created_at: string
          district: string
          id: string
          state: string
          updated_at: string
        }
        Insert: {
          city_display: string
          city_normalized: string
          country?: string
          created_at?: string
          district: string
          id?: string
          state: string
          updated_at?: string
        }
        Update: {
          city_display?: string
          city_normalized?: string
          country?: string
          created_at?: string
          district?: string
          id?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_posting_limits: {
        Row: {
          created_at: string
          free_limit: number
          id: string
          month_year: string
          posts_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          free_limit?: number
          id?: string
          month_year: string
          posts_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          free_limit?: number
          id?: string
          month_year?: string
          posts_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nl_ai_profile_fields: {
        Row: {
          category: string | null
          code: string
          created_at: string
          description: string | null
          field_type: string
          id: string
          is_active: boolean
          label: string
          max_value: number | null
          metadata: Json
          min_value: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          field_type?: string
          id?: string
          is_active?: boolean
          label: string
          max_value?: number | null
          metadata?: Json
          min_value?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          field_type?: string
          id?: string
          is_active?: boolean
          label?: string
          max_value?: number | null
          metadata?: Json
          min_value?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      nl_ai_profile_versions: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          reason: string | null
          snapshot: Json
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          reason?: string | null
          snapshot?: Json
          user_id: string
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          reason?: string | null
          snapshot?: Json
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "nl_ai_profile_versions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "nl_ai_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_ai_profiles: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          intent_score: number | null
          model: string | null
          persona: string | null
          raw_output: Json
          readiness_score: number | null
          risk_score: number | null
          risks: string[]
          scores: Json
          session_id: string | null
          strengths: string[]
          summary: string | null
          tags: string[]
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          intent_score?: number | null
          model?: string | null
          persona?: string | null
          raw_output?: Json
          readiness_score?: number | null
          risk_score?: number | null
          risks?: string[]
          scores?: Json
          session_id?: string | null
          strengths?: string[]
          summary?: string | null
          tags?: string[]
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          intent_score?: number | null
          model?: string | null
          persona?: string | null
          raw_output?: Json
          readiness_score?: number | null
          risk_score?: number | null
          risks?: string[]
          scores?: Json
          session_id?: string | null
          strengths?: string[]
          summary?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "nl_ai_profiles_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "nl_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_crops: {
        Row: {
          created_at: string
          description: string | null
          expected_harvest_at: string | null
          hero_image_url: string | null
          id: string
          name: string
          planted_at: string | null
          plot_id: string
          price_per_kg: number | null
          season: string | null
          status: string
          updated_at: string
          variety: string | null
          yield_kg: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          expected_harvest_at?: string | null
          hero_image_url?: string | null
          id?: string
          name: string
          planted_at?: string | null
          plot_id: string
          price_per_kg?: number | null
          season?: string | null
          status?: string
          updated_at?: string
          variety?: string | null
          yield_kg?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          expected_harvest_at?: string | null
          hero_image_url?: string | null
          id?: string
          name?: string
          planted_at?: string | null
          plot_id?: string
          price_per_kg?: number | null
          season?: string | null
          status?: string
          updated_at?: string
          variety?: string | null
          yield_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nl_crops_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "nl_plots"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_districts: {
        Row: {
          created_at: string
          description: string | null
          hero_image_url: string | null
          id: string
          name: string
          slug: string
          state_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          name: string
          slug: string
          state_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          name?: string
          slug?: string
          state_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_districts_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "nl_states"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_farm_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          farm_id: string
          id: string
          receipt_url: string | null
          spent_on: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          description?: string | null
          farm_id: string
          id?: string
          receipt_url?: string | null
          spent_on?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          farm_id?: string
          id?: string
          receipt_url?: string | null
          spent_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_farm_expenses_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "nl_farms"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_farm_harvests: {
        Row: {
          created_at: string
          crop_id: string | null
          farm_id: string
          harvest_date: string
          id: string
          notes: string | null
          plot_id: string | null
          price_per_kg: number | null
          quality_grade: string | null
          quantity_kg: number
          total_revenue: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          crop_id?: string | null
          farm_id: string
          harvest_date?: string
          id?: string
          notes?: string | null
          plot_id?: string | null
          price_per_kg?: number | null
          quality_grade?: string | null
          quantity_kg?: number
          total_revenue?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          crop_id?: string | null
          farm_id?: string
          harvest_date?: string
          id?: string
          notes?: string | null
          plot_id?: string | null
          price_per_kg?: number | null
          quality_grade?: string | null
          quantity_kg?: number
          total_revenue?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_farm_harvests_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "nl_crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_farm_harvests_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "nl_farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_farm_harvests_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "nl_plots"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_farm_inventory: {
        Row: {
          category: string
          created_at: string
          farm_id: string
          id: string
          item_name: string
          notes: string | null
          quantity: number
          reorder_level: number
          supplier: string | null
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          farm_id: string
          id?: string
          item_name: string
          notes?: string | null
          quantity?: number
          reorder_level?: number
          supplier?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          farm_id?: string
          id?: string
          item_name?: string
          notes?: string | null
          quantity?: number
          reorder_level?: number
          supplier?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_farm_inventory_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "nl_farms"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_farm_managers: {
        Row: {
          assigned_at: string
          created_at: string
          farm_id: string
          id: string
          is_active: boolean
          manager_id: string
          permissions: Json
          role: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          farm_id: string
          id?: string
          is_active?: boolean
          manager_id: string
          permissions?: Json
          role?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          farm_id?: string
          id?: string
          is_active?: boolean
          manager_id?: string
          permissions?: Json
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_farm_managers_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "nl_farms"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_farm_tasks: {
        Row: {
          assigned_to: string | null
          category: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          farm_id: string
          id: string
          notes: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          farm_id: string
          id?: string
          notes?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          farm_id?: string
          id?: string
          notes?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_farm_tasks_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "nl_farms"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_farm_workers: {
        Row: {
          created_at: string
          daily_wage: number
          farm_id: string
          id: string
          is_active: boolean
          joined_on: string
          name: string
          notes: string | null
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_wage?: number
          farm_id: string
          id?: string
          is_active?: boolean
          joined_on?: string
          name: string
          notes?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_wage?: number
          farm_id?: string
          id?: string
          is_active?: boolean
          joined_on?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_farm_workers_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "nl_farms"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_farms: {
        Row: {
          certification: string | null
          created_at: string
          description: string | null
          farming_method: string | null
          gallery: Json | null
          hero_image_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          owner_user_id: string
          slug: string
          status: string
          total_area_acres: number
          updated_at: string
          village_id: string | null
        }
        Insert: {
          certification?: string | null
          created_at?: string
          description?: string | null
          farming_method?: string | null
          gallery?: Json | null
          hero_image_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_user_id: string
          slug: string
          status?: string
          total_area_acres?: number
          updated_at?: string
          village_id?: string | null
        }
        Update: {
          certification?: string | null
          created_at?: string
          description?: string | null
          farming_method?: string | null
          gallery?: Json | null
          hero_image_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_user_id?: string
          slug?: string
          status?: string
          total_area_acres?: number
          updated_at?: string
          village_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nl_farms_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "nl_villages"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_goals: {
        Row: {
          category: string | null
          code: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          interview_pack_code: string | null
          is_active: boolean
          metadata: Json
          persona_tags: string[]
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          interview_pack_code?: string | null
          is_active?: boolean
          metadata?: Json
          persona_tags?: string[]
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          interview_pack_code?: string | null
          is_active?: boolean
          metadata?: Json
          persona_tags?: string[]
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      nl_interview_packs: {
        Row: {
          code: string
          created_at: string
          description: string | null
          estimated_minutes: number
          goal_codes: string[]
          id: string
          is_active: boolean
          metadata: Json
          persona_tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          goal_codes?: string[]
          id?: string
          is_active?: boolean
          metadata?: Json
          persona_tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          goal_codes?: string[]
          id?: string
          is_active?: boolean
          metadata?: Json
          persona_tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      nl_interview_sessions: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          current_question_code: string | null
          derived_tags: string[]
          id: string
          metadata: Json
          pack_id: string | null
          progress_pct: number
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          current_question_code?: string | null
          derived_tags?: string[]
          id?: string
          metadata?: Json
          pack_id?: string | null
          progress_pct?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          current_question_code?: string | null
          derived_tags?: string[]
          id?: string
          metadata?: Json
          pack_id?: string | null
          progress_pct?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_interview_sessions_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "nl_interview_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_interview_turns: {
        Row: {
          answer: Json | null
          answer_text: string | null
          confidence: number | null
          created_at: string
          id: string
          question_code: string | null
          question_id: string | null
          question_snapshot: Json
          role: string
          session_id: string
          skipped: boolean
          turn_index: number
          user_id: string
        }
        Insert: {
          answer?: Json | null
          answer_text?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          question_code?: string | null
          question_id?: string | null
          question_snapshot?: Json
          role?: string
          session_id: string
          skipped?: boolean
          turn_index?: number
          user_id: string
        }
        Update: {
          answer?: Json | null
          answer_text?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          question_code?: string | null
          question_id?: string | null
          question_snapshot?: Json
          role?: string
          session_id?: string
          skipped?: boolean
          turn_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_interview_turns_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "nl_question_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_interview_turns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "nl_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_inventory_movements: {
        Row: {
          cost: number
          created_at: string
          farm_id: string
          id: string
          inventory_id: string
          movement_type: string
          performed_by: string | null
          quantity: number
          reason: string | null
        }
        Insert: {
          cost?: number
          created_at?: string
          farm_id: string
          id?: string
          inventory_id: string
          movement_type?: string
          performed_by?: string | null
          quantity?: number
          reason?: string | null
        }
        Update: {
          cost?: number
          created_at?: string
          farm_id?: string
          id?: string
          inventory_id?: string
          movement_type?: string
          performed_by?: string | null
          quantity?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nl_inventory_movements_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "nl_farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_inventory_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "nl_farm_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_kyc: {
        Row: {
          address_proof_url: string | null
          approval_level: number | null
          assigned_admin_id: string | null
          assigned_admin_role: string | null
          city: string | null
          country: string | null
          created_at: string
          district: string | null
          id: string
          id_document_url: string | null
          id_number: string
          id_type: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          state: string | null
          status: Database["public"]["Enums"]["nl_kyc_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_proof_url?: string | null
          approval_level?: number | null
          assigned_admin_id?: string | null
          assigned_admin_role?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          id?: string
          id_document_url?: string | null
          id_number: string
          id_type: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["nl_kyc_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_proof_url?: string | null
          approval_level?: number | null
          assigned_admin_id?: string | null
          assigned_admin_role?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          id?: string
          id_document_url?: string | null
          id_number?: string
          id_type?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["nl_kyc_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nl_land_conversations: {
        Row: {
          content: string
          created_at: string
          extracted_fields: Json | null
          id: string
          registration_id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          extracted_fields?: Json | null
          id?: string
          registration_id: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          extracted_fields?: Json | null
          id?: string
          registration_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_land_conversations_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "nl_land_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_land_parcels: {
        Row: {
          area_acres: number
          created_at: string
          description: string | null
          hero_image_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          owner_user_id: string
          soil_type: string | null
          status: string
          updated_at: string
          village_id: string | null
          water_source: string | null
        }
        Insert: {
          area_acres?: number
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_user_id: string
          soil_type?: string | null
          status?: string
          updated_at?: string
          village_id?: string | null
          water_source?: string | null
        }
        Update: {
          area_acres?: number
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_user_id?: string
          soil_type?: string | null
          status?: string
          updated_at?: string
          village_id?: string | null
          water_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nl_land_parcels_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "nl_villages"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_land_partnerships: {
        Row: {
          created_at: string
          ends_on: string | null
          farm_id: string | null
          farmer_user_id: string
          id: string
          monthly_lease: number
          notes: string | null
          parcel_id: string
          revenue_share_pct: number
          starts_on: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          farm_id?: string | null
          farmer_user_id: string
          id?: string
          monthly_lease?: number
          notes?: string | null
          parcel_id: string
          revenue_share_pct?: number
          starts_on?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          farm_id?: string | null
          farmer_user_id?: string
          id?: string
          monthly_lease?: number
          notes?: string | null
          parcel_id?: string
          revenue_share_pct?: number
          starts_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_land_partnerships_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "nl_farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_land_partnerships_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "nl_land_parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_land_registrations: {
        Row: {
          approval_level: number | null
          area_unit: string | null
          assigned_admin_id: string | null
          assigned_admin_role: string | null
          available_from: string | null
          borewell_count: number | null
          change_request_notes: string | null
          city_id: string | null
          completion_pct: number
          country: string | null
          country_id: string | null
          created_at: string
          crop_history: Json | null
          current_crop: string | null
          current_status: string | null
          district: string | null
          district_id: string | null
          electricity: string | null
          extra: Json | null
          farming_readiness: string | null
          google_map_url: string | null
          id: string
          infrastructure: Json | null
          is_published: boolean
          last_crop: string | null
          latitude: number | null
          lease_reason: string | null
          local_environment: Json | null
          locality_id: string | null
          longitude: number | null
          mandal: string | null
          missing_fields: Json | null
          nearby_attractions: Json | null
          nearby_facilities: Json | null
          opportunity_ratings: Json | null
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          profile_created: boolean
          profile_created_at: string | null
          profile_slug: string | null
          profile_tier: string | null
          project_age: string | null
          project_duration: string | null
          project_tenure: string | null
          published_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          road_access: string | null
          school_activities: Json | null
          soil: string | null
          state: string | null
          state_id: string | null
          status: string
          stay_accommodation: Json | null
          stay_experience: Json | null
          stay_facilities: Json | null
          submitted_at: string | null
          suitable_for: Json | null
          survey_numbers: string | null
          terrain: string | null
          total_area: number | null
          updated_at: string
          user_id: string
          vehicle_access: Json | null
          village: string | null
          water_availability: string | null
          water_sources: Json | null
        }
        Insert: {
          approval_level?: number | null
          area_unit?: string | null
          assigned_admin_id?: string | null
          assigned_admin_role?: string | null
          available_from?: string | null
          borewell_count?: number | null
          change_request_notes?: string | null
          city_id?: string | null
          completion_pct?: number
          country?: string | null
          country_id?: string | null
          created_at?: string
          crop_history?: Json | null
          current_crop?: string | null
          current_status?: string | null
          district?: string | null
          district_id?: string | null
          electricity?: string | null
          extra?: Json | null
          farming_readiness?: string | null
          google_map_url?: string | null
          id?: string
          infrastructure?: Json | null
          is_published?: boolean
          last_crop?: string | null
          latitude?: number | null
          lease_reason?: string | null
          local_environment?: Json | null
          locality_id?: string | null
          longitude?: number | null
          mandal?: string | null
          missing_fields?: Json | null
          nearby_attractions?: Json | null
          nearby_facilities?: Json | null
          opportunity_ratings?: Json | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          profile_created?: boolean
          profile_created_at?: string | null
          profile_slug?: string | null
          profile_tier?: string | null
          project_age?: string | null
          project_duration?: string | null
          project_tenure?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          road_access?: string | null
          school_activities?: Json | null
          soil?: string | null
          state?: string | null
          state_id?: string | null
          status?: string
          stay_accommodation?: Json | null
          stay_experience?: Json | null
          stay_facilities?: Json | null
          submitted_at?: string | null
          suitable_for?: Json | null
          survey_numbers?: string | null
          terrain?: string | null
          total_area?: number | null
          updated_at?: string
          user_id: string
          vehicle_access?: Json | null
          village?: string | null
          water_availability?: string | null
          water_sources?: Json | null
        }
        Update: {
          approval_level?: number | null
          area_unit?: string | null
          assigned_admin_id?: string | null
          assigned_admin_role?: string | null
          available_from?: string | null
          borewell_count?: number | null
          change_request_notes?: string | null
          city_id?: string | null
          completion_pct?: number
          country?: string | null
          country_id?: string | null
          created_at?: string
          crop_history?: Json | null
          current_crop?: string | null
          current_status?: string | null
          district?: string | null
          district_id?: string | null
          electricity?: string | null
          extra?: Json | null
          farming_readiness?: string | null
          google_map_url?: string | null
          id?: string
          infrastructure?: Json | null
          is_published?: boolean
          last_crop?: string | null
          latitude?: number | null
          lease_reason?: string | null
          local_environment?: Json | null
          locality_id?: string | null
          longitude?: number | null
          mandal?: string | null
          missing_fields?: Json | null
          nearby_attractions?: Json | null
          nearby_facilities?: Json | null
          opportunity_ratings?: Json | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          profile_created?: boolean
          profile_created_at?: string | null
          profile_slug?: string | null
          profile_tier?: string | null
          project_age?: string | null
          project_duration?: string | null
          project_tenure?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          road_access?: string | null
          school_activities?: Json | null
          soil?: string | null
          state?: string | null
          state_id?: string | null
          status?: string
          stay_accommodation?: Json | null
          stay_experience?: Json | null
          stay_facilities?: Json | null
          submitted_at?: string | null
          suitable_for?: Json | null
          survey_numbers?: string | null
          terrain?: string | null
          total_area?: number | null
          updated_at?: string
          user_id?: string
          vehicle_access?: Json | null
          village?: string | null
          water_availability?: string | null
          water_sources?: Json | null
        }
        Relationships: []
      }
      nl_land_uploads: {
        Row: {
          created_at: string
          file_name: string | null
          file_url: string
          id: string
          kind: string
          meta: Json | null
          registration_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_url: string
          id?: string
          kind: string
          meta?: Json | null
          registration_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_url?: string
          id?: string
          kind?: string
          meta?: Json | null
          registration_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_land_uploads_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "nl_land_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_landing_signals: {
        Row: {
          created_at: string
          device: Json
          goal_code: string | null
          id: string
          metadata: Json
          section: string | null
          session_key: string | null
          signal_type: string
          user_id: string | null
          utm: Json
        }
        Insert: {
          created_at?: string
          device?: Json
          goal_code?: string | null
          id?: string
          metadata?: Json
          section?: string | null
          session_key?: string | null
          signal_type: string
          user_id?: string | null
          utm?: Json
        }
        Update: {
          created_at?: string
          device?: Json
          goal_code?: string | null
          id?: string
          metadata?: Json
          section?: string | null
          session_key?: string | null
          signal_type?: string
          user_id?: string | null
          utm?: Json
        }
        Relationships: []
      }
      nl_onboarding_state: {
        Row: {
          completed_at: string | null
          context: Json
          created_at: string
          id: string
          last_step: string | null
          progress_pct: number
          stage: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          context?: Json
          created_at?: string
          id?: string
          last_step?: string | null
          progress_pct?: number
          stage?: string
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          context?: Json
          created_at?: string
          id?: string
          last_step?: string | null
          progress_pct?: number
          stage?: string
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nl_order_items: {
        Row: {
          created_at: string
          crop_id: string | null
          id: string
          item_name: string
          line_total: number
          order_id: string
          price_per_kg: number
          quantity_kg: number
        }
        Insert: {
          created_at?: string
          crop_id?: string | null
          id?: string
          item_name: string
          line_total?: number
          order_id: string
          price_per_kg?: number
          quantity_kg?: number
        }
        Update: {
          created_at?: string
          crop_id?: string | null
          id?: string
          item_name?: string
          line_total?: number
          order_id?: string
          price_per_kg?: number
          quantity_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "nl_order_items_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "nl_crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "nl_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_orders: {
        Row: {
          contact_phone: string | null
          created_at: string
          customer_user_id: string
          delivered_at: string | null
          delivery_address: string
          delivery_city: string | null
          delivery_fee: number
          delivery_pincode: string | null
          farm_id: string
          id: string
          notes: string | null
          placed_at: string
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          contact_phone?: string | null
          created_at?: string
          customer_user_id: string
          delivered_at?: string | null
          delivery_address: string
          delivery_city?: string | null
          delivery_fee?: number
          delivery_pincode?: string | null
          farm_id: string
          id?: string
          notes?: string | null
          placed_at?: string
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          contact_phone?: string | null
          created_at?: string
          customer_user_id?: string
          delivered_at?: string | null
          delivery_address?: string
          delivery_city?: string | null
          delivery_fee?: number
          delivery_pincode?: string | null
          farm_id?: string
          id?: string
          notes?: string | null
          placed_at?: string
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_orders_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "nl_farms"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_plots: {
        Row: {
          created_at: string
          description: string | null
          farm_id: string
          hero_image_url: string | null
          id: string
          name: string
          size_acres: number
          soil_type: string | null
          status: string
          updated_at: string
          water_source: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          farm_id: string
          hero_image_url?: string | null
          id?: string
          name: string
          size_acres?: number
          soil_type?: string | null
          status?: string
          updated_at?: string
          water_source?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          farm_id?: string
          hero_image_url?: string | null
          id?: string
          name?: string
          size_acres?: number
          soil_type?: string | null
          status?: string
          updated_at?: string
          water_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nl_plots_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "nl_farms"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarding_completed: boolean
          phone: string | null
          role: Database["public"]["Enums"]["nl_role"]
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["nl_role"]
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["nl_role"]
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nl_question_bank: {
        Row: {
          applies_when: Json
          category: string | null
          code: string
          created_at: string
          helper_text: string | null
          id: string
          is_active: boolean
          is_required: boolean
          metadata: Json
          options: Json
          pack_id: string | null
          question: string
          question_type: string
          sort_order: number
          tags: string[]
          updated_at: string
          weight: number
        }
        Insert: {
          applies_when?: Json
          category?: string | null
          code: string
          created_at?: string
          helper_text?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          metadata?: Json
          options?: Json
          pack_id?: string | null
          question: string
          question_type?: string
          sort_order?: number
          tags?: string[]
          updated_at?: string
          weight?: number
        }
        Update: {
          applies_when?: Json
          category?: string | null
          code?: string
          created_at?: string
          helper_text?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          metadata?: Json
          options?: Json
          pack_id?: string | null
          question?: string
          question_type?: string
          sort_order?: number
          tags?: string[]
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "nl_question_bank_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "nl_interview_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_recommendation_feedback: {
        Row: {
          action: string
          comment: string | null
          created_at: string
          id: string
          item_id: string | null
          item_type: string | null
          metadata: Json
          rating: number | null
          recommendation_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          comment?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          item_type?: string | null
          metadata?: Json
          rating?: number | null
          recommendation_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          comment?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          item_type?: string | null
          metadata?: Json
          rating?: number | null
          recommendation_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_recommendation_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "nl_recommendations_cache"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_recommendations_cache: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          item_id: string | null
          item_ref: string | null
          item_type: string
          matched_tags: string[]
          payload: Json
          profile_id: string | null
          rank: number
          reason: string | null
          score: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          item_id?: string | null
          item_ref?: string | null
          item_type: string
          matched_tags?: string[]
          payload?: Json
          profile_id?: string | null
          rank?: number
          reason?: string | null
          score?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          item_id?: string | null
          item_ref?: string | null
          item_type?: string
          matched_tags?: string[]
          payload?: Json
          profile_id?: string | null
          rank?: number
          reason?: string | null
          score?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_recommendations_cache_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "nl_ai_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_states: {
        Row: {
          created_at: string
          description: string | null
          hero_image_url: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      nl_subscription_plans: {
        Row: {
          created_at: string
          crop_id: string | null
          description: string | null
          farm_id: string | null
          frequency: string
          id: string
          included_kg: number | null
          is_active: boolean
          name: string
          plot_id: string | null
          price: number
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          crop_id?: string | null
          description?: string | null
          farm_id?: string | null
          frequency?: string
          id?: string
          included_kg?: number | null
          is_active?: boolean
          name: string
          plot_id?: string | null
          price: number
          tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          crop_id?: string | null
          description?: string | null
          farm_id?: string | null
          frequency?: string
          id?: string
          included_kg?: number | null
          is_active?: boolean
          name?: string
          plot_id?: string | null
          price?: number
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_subscription_plans_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "nl_crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_subscription_plans_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "nl_farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_subscription_plans_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "nl_plots"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_subscriptions: {
        Row: {
          amount_paid: number
          created_at: string
          crop_id: string | null
          customer_user_id: string
          delivery_address: string | null
          delivery_city: string | null
          delivery_pincode: string | null
          ends_on: string | null
          farm_id: string | null
          id: string
          notes: string | null
          plan_id: string
          plot_id: string | null
          starts_on: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          crop_id?: string | null
          customer_user_id: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_pincode?: string | null
          ends_on?: string | null
          farm_id?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          plot_id?: string | null
          starts_on?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          crop_id?: string | null
          customer_user_id?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_pincode?: string | null
          ends_on?: string | null
          farm_id?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          plot_id?: string | null
          starts_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_subscriptions_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "nl_crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_subscriptions_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "nl_farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "nl_subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_subscriptions_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "nl_plots"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_user_goals: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          intent_level: string
          notes: string | null
          priority: number
          selected_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          intent_level?: string
          notes?: string | null
          priority?: number
          selected_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          intent_level?: string
          notes?: string | null
          priority?: number
          selected_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_user_goals_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "nl_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_villages: {
        Row: {
          coordinator_user_id: string | null
          created_at: string
          description: string | null
          district_id: string
          hero_image_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          population: number | null
          slug: string
        }
        Insert: {
          coordinator_user_id?: string | null
          created_at?: string
          description?: string | null
          district_id: string
          hero_image_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          population?: number | null
          slug: string
        }
        Update: {
          coordinator_user_id?: string | null
          created_at?: string
          description?: string | null
          district_id?: string
          hero_image_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          population?: number | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_villages_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "nl_districts"
            referencedColumns: ["id"]
          },
        ]
      }
      nl_worker_attendance: {
        Row: {
          attendance_date: string
          created_at: string
          farm_id: string
          hours: number
          id: string
          notes: string | null
          status: string
          updated_at: string
          wage_paid: number
          worker_id: string
        }
        Insert: {
          attendance_date?: string
          created_at?: string
          farm_id: string
          hours?: number
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          wage_paid?: number
          worker_id: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          farm_id?: string
          hours?: number
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          wage_paid?: number
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nl_worker_attendance_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "nl_farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nl_worker_attendance_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "nl_farm_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_channels: {
        Row: {
          created_at: string
          enabled_globally: boolean
          key: string
          label: string
        }
        Insert: {
          created_at?: string
          enabled_globally?: boolean
          key: string
          label: string
        }
        Update: {
          created_at?: string
          enabled_globally?: boolean
          key?: string
          label?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          category: string
          channel_key: string
          created_at: string
          enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          channel_key: string
          created_at?: string
          enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          channel_key?: string
          created_at?: string
          enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_channel_key_fkey"
            columns: ["channel_key"]
            isOneToOne: false
            referencedRelation: "notification_channels"
            referencedColumns: ["key"]
          },
        ]
      }
      notifications: {
        Row: {
          builder_profile_id: string | null
          created_at: string
          id: string
          is_archived: boolean
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          builder_profile_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          builder_profile_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_builder_profile_id_fkey"
            columns: ["builder_profile_id"]
            isOneToOne: false
            referencedRelation: "builder_profiles"
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
          country: string | null
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          district: string | null
          district_admin_id: string | null
          gst_rate: number | null
          id: string
          images: string[] | null
          is_active: boolean | null
          latitude: number | null
          locality: string
          longitude: number | null
          manager_id: string | null
          name: string
          partner_since: string | null
          policies: Json | null
          price_per_night: number
          room_types: Json | null
          star_rating: number | null
          state: string | null
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
          country?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          district?: string | null
          district_admin_id?: string | null
          gst_rate?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          latitude?: number | null
          locality: string
          longitude?: number | null
          manager_id?: string | null
          name: string
          partner_since?: string | null
          policies?: Json | null
          price_per_night?: number
          room_types?: Json | null
          star_rating?: number | null
          state?: string | null
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
          country?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          district?: string | null
          district_admin_id?: string | null
          gst_rate?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          latitude?: number | null
          locality?: string
          longitude?: number | null
          manager_id?: string | null
          name?: string
          partner_since?: string | null
          policies?: Json | null
          price_per_night?: number
          room_types?: Json | null
          star_rating?: number | null
          state?: string | null
          total_rooms?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          base_amount: number
          booking_id: string | null
          created_at: string
          currency: string
          gst_amount: number
          gst_percent: number
          id: string
          invoice_number: string
          metadata: Json
          method: string
          property_id: string | null
          purpose: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          base_amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          gst_amount?: number
          gst_percent?: number
          id?: string
          invoice_number?: string
          metadata?: Json
          method?: string
          property_id?: string | null
          purpose: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          base_amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          gst_amount?: number
          gst_percent?: number
          id?: string
          invoice_number?: string
          metadata?: Json
          method?: string
          property_id?: string | null
          purpose?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_registrations: {
        Row: {
          attempt_count: number
          auth_provider: string
          consumed_at: string | null
          country: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          google_user_id: string | null
          id: string
          last_sent_at: string
          otp_hash: string
          password: string | null
          phone: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number
          auth_provider?: string
          consumed_at?: string | null
          country?: string | null
          created_at?: string
          email: string
          expires_at: string
          full_name?: string | null
          google_user_id?: string | null
          id?: string
          last_sent_at?: string
          otp_hash: string
          password?: string | null
          phone: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number
          auth_provider?: string
          consumed_at?: string | null
          country?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          google_user_id?: string | null
          id?: string
          last_sent_at?: string
          otp_hash?: string
          password?: string | null
          phone?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          key: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          resource?: string
        }
        Relationships: []
      }
      phone_login_otps: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          last_sent_at: string
          otp_hash: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at: string
          last_sent_at?: string
          otp_hash: string
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          last_sent_at?: string
          otp_hash?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_events: {
        Row: {
          actor_user_id: string | null
          id: string
          module_key: string | null
          occurred_at: string
          payload: Json
          subject_id: string | null
          subject_type: string | null
          topic: string
        }
        Insert: {
          actor_user_id?: string | null
          id?: string
          module_key?: string | null
          occurred_at?: string
          payload?: Json
          subject_id?: string | null
          subject_type?: string | null
          topic: string
        }
        Update: {
          actor_user_id?: string | null
          id?: string
          module_key?: string | null
          occurred_at?: string
          payload?: Json
          subject_id?: string | null
          subject_type?: string | null
          topic?: string
        }
        Relationships: []
      }
      platform_media: {
        Row: {
          bucket: string
          created_at: string
          id: string
          kind: string
          meta: Json
          mime: string | null
          module_key: string | null
          owner_user_id: string
          path: string
          size_bytes: number | null
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: string
          kind: string
          meta?: Json
          mime?: string | null
          module_key?: string | null
          owner_user_id: string
          path: string
          size_bytes?: number | null
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          mime?: string | null
          module_key?: string | null
          owner_user_id?: string
          path?: string
          size_bytes?: number | null
        }
        Relationships: []
      }
      platform_pricing_settings: {
        Row: {
          agent_billing_cycle: string
          agent_subscription_duration_days: number
          agent_subscription_enabled: boolean
          agent_subscription_gst_percent: number
          agent_subscription_price: number
          agent_trial_days: number
          agent_trial_free_posts: number
          created_at: string
          currency: string
          free_posts_limit: number
          free_visits_limit: number
          id: string
          pay_per_post_enabled: boolean
          posting_fee: number
          posting_gst_percent: number
          singleton: boolean
          updated_at: string
          visit_booking_paid_enabled: boolean
          visit_fee: number
          visit_gst_percent: number
        }
        Insert: {
          agent_billing_cycle?: string
          agent_subscription_duration_days?: number
          agent_subscription_enabled?: boolean
          agent_subscription_gst_percent?: number
          agent_subscription_price?: number
          agent_trial_days?: number
          agent_trial_free_posts?: number
          created_at?: string
          currency?: string
          free_posts_limit?: number
          free_visits_limit?: number
          id?: string
          pay_per_post_enabled?: boolean
          posting_fee?: number
          posting_gst_percent?: number
          singleton?: boolean
          updated_at?: string
          visit_booking_paid_enabled?: boolean
          visit_fee?: number
          visit_gst_percent?: number
        }
        Update: {
          agent_billing_cycle?: string
          agent_subscription_duration_days?: number
          agent_subscription_enabled?: boolean
          agent_subscription_gst_percent?: number
          agent_subscription_price?: number
          agent_trial_days?: number
          agent_trial_free_posts?: number
          created_at?: string
          currency?: string
          free_posts_limit?: number
          free_visits_limit?: number
          id?: string
          pay_per_post_enabled?: boolean
          posting_fee?: number
          posting_gst_percent?: number
          singleton?: boolean
          updated_at?: string
          visit_booking_paid_enabled?: boolean
          visit_fee?: number
          visit_gst_percent?: number
        }
        Relationships: []
      }
      platform_timeline: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          meta: Json
          module_key: string | null
          subject_id: string | null
          subject_type: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          module_key?: string | null
          subject_id?: string | null
          subject_type?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          module_key?: string | null
          subject_id?: string | null
          subject_type?: string | null
        }
        Relationships: []
      }
      preferred_locations: {
        Row: {
          builder_profile_id: string | null
          city: string | null
          created_at: string
          id: string
          is_auto_suggested: boolean
          locality: string | null
          location_name: string
          location_type: string
          pincode: string | null
          property_id: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          builder_profile_id?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_auto_suggested?: boolean
          locality?: string | null
          location_name: string
          location_type: string
          pincode?: string | null
          property_id?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          builder_profile_id?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_auto_suggested?: boolean
          locality?: string | null
          location_name?: string
          location_type?: string
          pincode?: string | null
          property_id?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          banned_at: string | null
          banned_reason: string | null
          city: string | null
          city_id: string | null
          country: string | null
          country_id: string | null
          created_at: string
          district: string | null
          district_id: string | null
          id: string
          is_banned: boolean
          locality_id: string | null
          location_data: Json | null
          state: string | null
          state_id: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          banned_reason?: string | null
          city?: string | null
          city_id?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string
          district?: string | null
          district_id?: string | null
          id?: string
          is_banned?: boolean
          locality_id?: string | null
          location_data?: Json | null
          state?: string | null
          state_id?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          banned_at?: string | null
          banned_reason?: string | null
          city?: string | null
          city_id?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string
          district?: string | null
          district_id?: string | null
          id?: string
          is_banned?: boolean
          locality_id?: string | null
          location_data?: Json | null
          state?: string | null
          state_id?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "loc_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "loc_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "loc_districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "loc_localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "loc_states"
            referencedColumns: ["id"]
          },
        ]
      }
      project_units: {
        Row: {
          area_sqft: number | null
          booked_at: string | null
          booking_amount: number | null
          buyer_id: string | null
          created_at: string
          facing: string | null
          floor_number: number | null
          id: string
          price: number | null
          project_id: string
          sold_at: string | null
          status: string
          type: string | null
          unit_number: string
        }
        Insert: {
          area_sqft?: number | null
          booked_at?: string | null
          booking_amount?: number | null
          buyer_id?: string | null
          created_at?: string
          facing?: string | null
          floor_number?: number | null
          id?: string
          price?: number | null
          project_id: string
          sold_at?: string | null
          status?: string
          type?: string | null
          unit_number: string
        }
        Update: {
          area_sqft?: number | null
          booked_at?: string | null
          booking_amount?: number | null
          buyer_id?: string | null
          created_at?: string
          facing?: string | null
          floor_number?: number | null
          id?: string
          price?: number | null
          project_id?: string
          sold_at?: string | null
          status?: string
          type?: string | null
          unit_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_units_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_stats_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_units_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          amenities: string[] | null
          area_range: string | null
          avg_price: number | null
          bhk_types: string | null
          brochure_url: string | null
          builder_name: string | null
          builder_profile_id: string | null
          city: string | null
          city_id: string | null
          country: string | null
          country_id: string | null
          created_at: string | null
          description: string | null
          district: string | null
          district_admin_id: string | null
          district_id: string | null
          environmental_clearance_url: string | null
          floors: string | null
          floors_per_tower: number | null
          hero_image: string | null
          id: string
          image: string | null
          images: string[] | null
          is_draft: boolean | null
          land_area: string | null
          latitude: number | null
          launch_date: string | null
          layout_plan_url: string | null
          locality: string | null
          locality_id: string | null
          longitude: number | null
          master_plan_url: string | null
          name: string | null
          pincode: string | null
          possession_date: string | null
          price_max: number | null
          price_min: number | null
          price_per_sqft: number | null
          project_type: string | null
          rera_document_url: string | null
          rera_id: string | null
          size_range: string | null
          slug: string | null
          state: string | null
          state_id: string | null
          status: string | null
          submitted_by: string | null
          subtitle: string | null
          total_towers: number | null
          total_units: number | null
          towers: number | null
          trust_score: number | null
          updated_at: string
          verified: boolean | null
          videos: string[] | null
          virtual_tour_url: string | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          area_range?: string | null
          avg_price?: number | null
          bhk_types?: string | null
          brochure_url?: string | null
          builder_name?: string | null
          builder_profile_id?: string | null
          city?: string | null
          city_id?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          district?: string | null
          district_admin_id?: string | null
          district_id?: string | null
          environmental_clearance_url?: string | null
          floors?: string | null
          floors_per_tower?: number | null
          hero_image?: string | null
          id?: string
          image?: string | null
          images?: string[] | null
          is_draft?: boolean | null
          land_area?: string | null
          latitude?: number | null
          launch_date?: string | null
          layout_plan_url?: string | null
          locality?: string | null
          locality_id?: string | null
          longitude?: number | null
          master_plan_url?: string | null
          name?: string | null
          pincode?: string | null
          possession_date?: string | null
          price_max?: number | null
          price_min?: number | null
          price_per_sqft?: number | null
          project_type?: string | null
          rera_document_url?: string | null
          rera_id?: string | null
          size_range?: string | null
          slug?: string | null
          state?: string | null
          state_id?: string | null
          status?: string | null
          submitted_by?: string | null
          subtitle?: string | null
          total_towers?: number | null
          total_units?: number | null
          towers?: number | null
          trust_score?: number | null
          updated_at?: string
          verified?: boolean | null
          videos?: string[] | null
          virtual_tour_url?: string | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          area_range?: string | null
          avg_price?: number | null
          bhk_types?: string | null
          brochure_url?: string | null
          builder_name?: string | null
          builder_profile_id?: string | null
          city?: string | null
          city_id?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          district?: string | null
          district_admin_id?: string | null
          district_id?: string | null
          environmental_clearance_url?: string | null
          floors?: string | null
          floors_per_tower?: number | null
          hero_image?: string | null
          id?: string
          image?: string | null
          images?: string[] | null
          is_draft?: boolean | null
          land_area?: string | null
          latitude?: number | null
          launch_date?: string | null
          layout_plan_url?: string | null
          locality?: string | null
          locality_id?: string | null
          longitude?: number | null
          master_plan_url?: string | null
          name?: string | null
          pincode?: string | null
          possession_date?: string | null
          price_max?: number | null
          price_min?: number | null
          price_per_sqft?: number | null
          project_type?: string | null
          rera_document_url?: string | null
          rera_id?: string | null
          size_range?: string | null
          slug?: string | null
          state?: string | null
          state_id?: string | null
          status?: string | null
          submitted_by?: string | null
          subtitle?: string | null
          total_towers?: number | null
          total_units?: number | null
          towers?: number | null
          trust_score?: number | null
          updated_at?: string
          verified?: boolean | null
          videos?: string[] | null
          virtual_tour_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_builder_profile_id_fkey"
            columns: ["builder_profile_id"]
            isOneToOne: false
            referencedRelation: "builder_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "loc_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "loc_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "loc_districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "loc_localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "loc_states"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          promotion_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          promotion_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          promotion_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_events_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_plans: {
        Row: {
          badge_label: string | null
          benefits: string[] | null
          created_at: string | null
          duration_days: number
          homepage_featured: boolean | null
          id: string
          is_active: boolean | null
          map_highlight: boolean | null
          name: string
          price: number
          search_boost: number | null
          sort_order: number | null
          tier: string
        }
        Insert: {
          badge_label?: string | null
          benefits?: string[] | null
          created_at?: string | null
          duration_days: number
          homepage_featured?: boolean | null
          id?: string
          is_active?: boolean | null
          map_highlight?: boolean | null
          name: string
          price: number
          search_boost?: number | null
          sort_order?: number | null
          tier: string
        }
        Update: {
          badge_label?: string | null
          benefits?: string[] | null
          created_at?: string | null
          duration_days?: number
          homepage_featured?: boolean | null
          id?: string
          is_active?: boolean | null
          map_highlight?: boolean | null
          name?: string
          price?: number
          search_boost?: number | null
          sort_order?: number | null
          tier?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          amount_paid: number
          badge_label: string | null
          builder_id: string
          builder_profile_id: string | null
          clicks_count: number | null
          created_at: string | null
          duration_days: number
          end_date: string
          homepage_featured: boolean | null
          id: string
          leads_at_start: number | null
          leads_count: number | null
          map_highlight: boolean | null
          payment_reference: string | null
          payment_status: string
          plan_id: string | null
          plan_name: string
          project_id: string | null
          property_id: string | null
          search_boost: number | null
          start_date: string
          status: string
          target_type: string
          tier: string
          updated_at: string | null
          views_at_start: number | null
          views_count: number | null
        }
        Insert: {
          amount_paid: number
          badge_label?: string | null
          builder_id: string
          builder_profile_id?: string | null
          clicks_count?: number | null
          created_at?: string | null
          duration_days: number
          end_date: string
          homepage_featured?: boolean | null
          id?: string
          leads_at_start?: number | null
          leads_count?: number | null
          map_highlight?: boolean | null
          payment_reference?: string | null
          payment_status?: string
          plan_id?: string | null
          plan_name: string
          project_id?: string | null
          property_id?: string | null
          search_boost?: number | null
          start_date?: string
          status?: string
          target_type: string
          tier: string
          updated_at?: string | null
          views_at_start?: number | null
          views_count?: number | null
        }
        Update: {
          amount_paid?: number
          badge_label?: string | null
          builder_id?: string
          builder_profile_id?: string | null
          clicks_count?: number | null
          created_at?: string | null
          duration_days?: number
          end_date?: string
          homepage_featured?: boolean | null
          id?: string
          leads_at_start?: number | null
          leads_count?: number | null
          map_highlight?: boolean | null
          payment_reference?: string | null
          payment_status?: string
          plan_id?: string | null
          plan_name?: string
          project_id?: string | null
          property_id?: string | null
          search_boost?: number | null
          start_date?: string
          status?: string
          target_type?: string
          tier?: string
          updated_at?: string | null
          views_at_start?: number | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_builder_profile_id_fkey"
            columns: ["builder_profile_id"]
            isOneToOne: false
            referencedRelation: "builder_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "promotion_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          agent_accepted_at: string | null
          agent_assigned_at: string | null
          agent_assignment_status:
            | Database["public"]["Enums"]["agent_assignment_state"]
            | null
          agent_data: Json | null
          agent_notes: string | null
          agent_rejected_at: string | null
          agent_rejection_reason: string | null
          agent_submitted_at: string | null
          amenities: string[] | null
          area_sqft: number | null
          assigned_agent_id: string | null
          balconies: number | null
          bathrooms: number | null
          bedrooms: number | null
          bhk: number | null
          booking_amount: number | null
          boost_payment_ref: string | null
          builder_id: string | null
          building_area_sqft: number | null
          building_name: string | null
          city: string | null
          city_id: string | null
          completion_stage: string | null
          country: string | null
          country_id: string | null
          created_at: string | null
          description: string | null
          district: string | null
          district_admin_id: string | null
          district_id: string | null
          document_urls: Json | null
          edit_locked: boolean
          elevators: number | null
          expiry_date: string | null
          featured_until: string | null
          field_verification: Json | null
          final_data: Json | null
          floor_number: number | null
          force_verification: boolean
          furnishing: string | null
          has_price_drop_ribbon: boolean | null
          id: string
          images: string[] | null
          is_draft: boolean | null
          is_featured: boolean
          is_live: boolean
          is_premium: boolean
          is_sold: boolean | null
          last_verified_at: string | null
          latitude: number | null
          lifecycle_status:
            | Database["public"]["Enums"]["property_lifecycle_status"]
            | null
          listed_by: string | null
          listed_by_role_snapshot: string | null
          listing_status: string
          listing_type: string | null
          locality: string | null
          locality_id: string | null
          longitude: number | null
          maintenance_charges: number | null
          original_snapshot: Json | null
          pincode: string | null
          previous_price: number | null
          price: number | null
          price_drop_rejection_reason: string | null
          price_drop_requested_at: string | null
          price_drop_requested_price: number | null
          price_drop_reviewed_at: string | null
          price_drop_reviewed_by: string | null
          price_drop_status: string | null
          price_dropped_at: string | null
          price_negotiable: boolean | null
          property_age: string | null
          published_at: string | null
          rejection_reason: string | null
          rera_document_url: string | null
          rera_id: string | null
          reschedule_preferred_date: string | null
          reschedule_preferred_time: string | null
          reschedule_reason: string | null
          reschedule_requested_at: string | null
          responsible_district_admin_id: string | null
          retail_centres: number | null
          sale_type: string | null
          slug: string | null
          sold_at: string | null
          sold_by_agent_id: string | null
          sold_by_user_id: string | null
          sold_price: number | null
          state: string | null
          state_id: string | null
          submitted_by: string | null
          title: string | null
          total_floors: number | null
          total_parking: number | null
          trust_score: number | null
          type: string | null
          updated_at: string | null
          verification_requested: boolean
          verification_status: string
          verified: boolean | null
          video_urls: string[] | null
          visit_confirmed_at: string | null
          visit_scheduled_at: string | null
          visit_scheduled_by: string | null
          visit_scheduled_date: string | null
          visit_scheduled_notes: string | null
          visit_scheduled_time: string | null
          was_ever_rejected: boolean
        }
        Insert: {
          address?: string | null
          agent_accepted_at?: string | null
          agent_assigned_at?: string | null
          agent_assignment_status?:
            | Database["public"]["Enums"]["agent_assignment_state"]
            | null
          agent_data?: Json | null
          agent_notes?: string | null
          agent_rejected_at?: string | null
          agent_rejection_reason?: string | null
          agent_submitted_at?: string | null
          amenities?: string[] | null
          area_sqft?: number | null
          assigned_agent_id?: string | null
          balconies?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          bhk?: number | null
          booking_amount?: number | null
          boost_payment_ref?: string | null
          builder_id?: string | null
          building_area_sqft?: number | null
          building_name?: string | null
          city?: string | null
          city_id?: string | null
          completion_stage?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          district?: string | null
          district_admin_id?: string | null
          district_id?: string | null
          document_urls?: Json | null
          edit_locked?: boolean
          elevators?: number | null
          expiry_date?: string | null
          featured_until?: string | null
          field_verification?: Json | null
          final_data?: Json | null
          floor_number?: number | null
          force_verification?: boolean
          furnishing?: string | null
          has_price_drop_ribbon?: boolean | null
          id?: string
          images?: string[] | null
          is_draft?: boolean | null
          is_featured?: boolean
          is_live?: boolean
          is_premium?: boolean
          is_sold?: boolean | null
          last_verified_at?: string | null
          latitude?: number | null
          lifecycle_status?:
            | Database["public"]["Enums"]["property_lifecycle_status"]
            | null
          listed_by?: string | null
          listed_by_role_snapshot?: string | null
          listing_status?: string
          listing_type?: string | null
          locality?: string | null
          locality_id?: string | null
          longitude?: number | null
          maintenance_charges?: number | null
          original_snapshot?: Json | null
          pincode?: string | null
          previous_price?: number | null
          price?: number | null
          price_drop_rejection_reason?: string | null
          price_drop_requested_at?: string | null
          price_drop_requested_price?: number | null
          price_drop_reviewed_at?: string | null
          price_drop_reviewed_by?: string | null
          price_drop_status?: string | null
          price_dropped_at?: string | null
          price_negotiable?: boolean | null
          property_age?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          rera_document_url?: string | null
          rera_id?: string | null
          reschedule_preferred_date?: string | null
          reschedule_preferred_time?: string | null
          reschedule_reason?: string | null
          reschedule_requested_at?: string | null
          responsible_district_admin_id?: string | null
          retail_centres?: number | null
          sale_type?: string | null
          slug?: string | null
          sold_at?: string | null
          sold_by_agent_id?: string | null
          sold_by_user_id?: string | null
          sold_price?: number | null
          state?: string | null
          state_id?: string | null
          submitted_by?: string | null
          title?: string | null
          total_floors?: number | null
          total_parking?: number | null
          trust_score?: number | null
          type?: string | null
          updated_at?: string | null
          verification_requested?: boolean
          verification_status?: string
          verified?: boolean | null
          video_urls?: string[] | null
          visit_confirmed_at?: string | null
          visit_scheduled_at?: string | null
          visit_scheduled_by?: string | null
          visit_scheduled_date?: string | null
          visit_scheduled_notes?: string | null
          visit_scheduled_time?: string | null
          was_ever_rejected?: boolean
        }
        Update: {
          address?: string | null
          agent_accepted_at?: string | null
          agent_assigned_at?: string | null
          agent_assignment_status?:
            | Database["public"]["Enums"]["agent_assignment_state"]
            | null
          agent_data?: Json | null
          agent_notes?: string | null
          agent_rejected_at?: string | null
          agent_rejection_reason?: string | null
          agent_submitted_at?: string | null
          amenities?: string[] | null
          area_sqft?: number | null
          assigned_agent_id?: string | null
          balconies?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          bhk?: number | null
          booking_amount?: number | null
          boost_payment_ref?: string | null
          builder_id?: string | null
          building_area_sqft?: number | null
          building_name?: string | null
          city?: string | null
          city_id?: string | null
          completion_stage?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          district?: string | null
          district_admin_id?: string | null
          district_id?: string | null
          document_urls?: Json | null
          edit_locked?: boolean
          elevators?: number | null
          expiry_date?: string | null
          featured_until?: string | null
          field_verification?: Json | null
          final_data?: Json | null
          floor_number?: number | null
          force_verification?: boolean
          furnishing?: string | null
          has_price_drop_ribbon?: boolean | null
          id?: string
          images?: string[] | null
          is_draft?: boolean | null
          is_featured?: boolean
          is_live?: boolean
          is_premium?: boolean
          is_sold?: boolean | null
          last_verified_at?: string | null
          latitude?: number | null
          lifecycle_status?:
            | Database["public"]["Enums"]["property_lifecycle_status"]
            | null
          listed_by?: string | null
          listed_by_role_snapshot?: string | null
          listing_status?: string
          listing_type?: string | null
          locality?: string | null
          locality_id?: string | null
          longitude?: number | null
          maintenance_charges?: number | null
          original_snapshot?: Json | null
          pincode?: string | null
          previous_price?: number | null
          price?: number | null
          price_drop_rejection_reason?: string | null
          price_drop_requested_at?: string | null
          price_drop_requested_price?: number | null
          price_drop_reviewed_at?: string | null
          price_drop_reviewed_by?: string | null
          price_drop_status?: string | null
          price_dropped_at?: string | null
          price_negotiable?: boolean | null
          property_age?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          rera_document_url?: string | null
          rera_id?: string | null
          reschedule_preferred_date?: string | null
          reschedule_preferred_time?: string | null
          reschedule_reason?: string | null
          reschedule_requested_at?: string | null
          responsible_district_admin_id?: string | null
          retail_centres?: number | null
          sale_type?: string | null
          slug?: string | null
          sold_at?: string | null
          sold_by_agent_id?: string | null
          sold_by_user_id?: string | null
          sold_price?: number | null
          state?: string | null
          state_id?: string | null
          submitted_by?: string | null
          title?: string | null
          total_floors?: number | null
          total_parking?: number | null
          trust_score?: number | null
          type?: string | null
          updated_at?: string | null
          verification_requested?: boolean
          verification_status?: string
          verified?: boolean | null
          video_urls?: string[] | null
          visit_confirmed_at?: string | null
          visit_scheduled_at?: string | null
          visit_scheduled_by?: string | null
          visit_scheduled_date?: string | null
          visit_scheduled_notes?: string | null
          visit_scheduled_time?: string | null
          was_ever_rejected?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "properties_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "loc_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "loc_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "loc_districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "loc_localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_sold_by_agent_id_fkey"
            columns: ["sold_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "loc_states"
            referencedColumns: ["id"]
          },
        ]
      }
      property_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          field_changes: Json | null
          from_status:
            | Database["public"]["Enums"]["property_lifecycle_status"]
            | null
          id: number
          metadata: Json | null
          property_id: string
          to_status:
            | Database["public"]["Enums"]["property_lifecycle_status"]
            | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          field_changes?: Json | null
          from_status?:
            | Database["public"]["Enums"]["property_lifecycle_status"]
            | null
          id?: number
          metadata?: Json | null
          property_id: string
          to_status?:
            | Database["public"]["Enums"]["property_lifecycle_status"]
            | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          field_changes?: Json | null
          from_status?:
            | Database["public"]["Enums"]["property_lifecycle_status"]
            | null
          id?: number
          metadata?: Json | null
          property_id?: string
          to_status?:
            | Database["public"]["Enums"]["property_lifecycle_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "property_audit_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_chat_messages: {
        Row: {
          agent_user_id: string
          created_at: string
          id: string
          message: string
          property_id: string
          read_at: string | null
          seller_user_id: string
          sender_id: string
        }
        Insert: {
          agent_user_id: string
          created_at?: string
          id?: string
          message: string
          property_id: string
          read_at?: string | null
          seller_user_id: string
          sender_id: string
        }
        Update: {
          agent_user_id?: string
          created_at?: string
          id?: string
          message?: string
          property_id?: string
          read_at?: string | null
          seller_user_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      property_details: {
        Row: {
          created_at: string
          field_key: string
          field_value: Json | null
          id: string
          property_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_key: string
          field_value?: Json | null
          id?: string
          property_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_key?: string
          field_value?: Json | null
          id?: string
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_details_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_documents: {
        Row: {
          admin_notes: string | null
          created_at: string
          document_type: string
          file_name: string | null
          file_url: string
          id: string
          property_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          document_type: string
          file_name?: string | null
          file_url: string
          id?: string
          property_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          document_type?: string
          file_name?: string | null
          file_url?: string
          id?: string
          property_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      property_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          property_id: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          property_id: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          property_id?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      property_leads: {
        Row: {
          assigned_agent_id: string | null
          created_at: string
          id: string
          lead_email: string | null
          lead_name: string | null
          lead_phone: string | null
          lead_user_id: string | null
          notes: string | null
          owner_id: string
          property_id: string
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          created_at?: string
          id?: string
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          lead_user_id?: string | null
          notes?: string | null
          owner_id: string
          property_id: string
          source: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          created_at?: string
          id?: string
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          lead_user_id?: string | null
          notes?: string | null
          owner_id?: string
          property_id?: string
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_posts: {
        Row: {
          created_at: string
          id: string
          is_free_post: boolean
          month_year: string
          property_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_free_post?: boolean
          month_year: string
          property_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_free_post?: boolean
          month_year?: string
          property_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_posts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_reports: {
        Row: {
          admin_notes: string | null
          country: string | null
          created_at: string
          details: string | null
          district: string | null
          district_admin_id: string | null
          id: string
          property_id: string
          reason: string
          reported_by: string
          resolved_at: string | null
          resolved_by: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          country?: string | null
          created_at?: string
          details?: string | null
          district?: string | null
          district_admin_id?: string | null
          id?: string
          property_id: string
          reason: string
          reported_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          country?: string | null
          created_at?: string
          details?: string | null
          district?: string | null
          district_admin_id?: string | null
          id?: string
          property_id?: string
          reason?: string
          reported_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      property_verifications: {
        Row: {
          agent_id: string
          created_at: string
          geo_photos: Json
          id: string
          photos: string[]
          property_id: string
          remarks: string | null
          report_url: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_artifact_status"]
          submitted_at: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          geo_photos?: Json
          id?: string
          photos?: string[]
          property_id: string
          remarks?: string | null
          report_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_artifact_status"]
          submitted_at?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          geo_photos?: Json
          id?: string
          photos?: string[]
          property_id?: string
          remarks?: string | null
          report_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_artifact_status"]
          submitted_at?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_verifications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_programs: {
        Row: {
          builder_profile_id: string | null
          created_at: string | null
          id: string
          max_referrals: number | null
          property_id: string | null
          referral_amount: number
          referral_code: string
          status: string | null
        }
        Insert: {
          builder_profile_id?: string | null
          created_at?: string | null
          id?: string
          max_referrals?: number | null
          property_id?: string | null
          referral_amount: number
          referral_code: string
          status?: string | null
        }
        Update: {
          builder_profile_id?: string | null
          created_at?: string | null
          id?: string
          max_referrals?: number | null
          property_id?: string | null
          referral_amount?: number
          referral_code?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_programs_builder_profile_id_fkey"
            columns: ["builder_profile_id"]
            isOneToOne: false
            referencedRelation: "builder_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_programs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_tracking: {
        Row: {
          commission_amount: number | null
          created_at: string | null
          id: string
          paid_at: string | null
          referral_program_id: string | null
          referrer_id: string | null
          status: string | null
          visit_date: string | null
          visitor_id: string | null
        }
        Insert: {
          commission_amount?: number | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          referral_program_id?: string | null
          referrer_id?: string | null
          status?: string | null
          visit_date?: string | null
          visitor_id?: string | null
        }
        Update: {
          commission_amount?: number | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          referral_program_id?: string | null
          referrer_id?: string | null
          status?: string | null
          visit_date?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_tracking_referral_program_id_fkey"
            columns: ["referral_program_id"]
            isOneToOne: false
            referencedRelation: "referral_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      rera_verifications: {
        Row: {
          admin_notes: string | null
          created_at: string
          document_url: string
          id: string
          property_id: string
          rera_number: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          document_url: string
          id?: string
          property_id: string
          rera_number: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          document_url?: string
          id?: string
          property_id?: string
          rera_number?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          label: string
          legacy_app_role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          label: string
          legacy_app_role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          label?: string
          legacy_app_role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          alerts_enabled: boolean
          created_at: string
          filters: Json
          id: string
          last_checked_at: string | null
          last_count: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alerts_enabled?: boolean
          created_at?: string
          filters?: Json
          id?: string
          last_checked_at?: string | null
          last_count?: number
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alerts_enabled?: boolean
          created_at?: string
          filters?: Json
          id?: string
          last_checked_at?: string | null
          last_count?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      seller_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          plan_type: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_type?: string
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_type?: string
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signup_email_otps: {
        Row: {
          attempt_count: number
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          last_sent_at: string
          metadata: Json | null
          otp_code: string
          password: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          last_sent_at?: string
          metadata?: Json | null
          otp_code: string
          password?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          last_sent_at?: string
          metadata?: Json | null
          otp_code?: string
          password?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      signup_requests: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          district: string | null
          district_admin_id: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          rejection_reason: string | null
          requested_role: string
          reviewed_at: string | null
          reviewed_by: string | null
          state: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          district_admin_id?: string | null
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          rejection_reason?: string | null
          requested_role: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          district_admin_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          rejection_reason?: string | null
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      team_activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          id: string
          metadata: Json | null
          team_member_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          id?: string
          metadata?: Json | null
          team_member_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          id?: string
          metadata?: Json | null
          team_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_activity_log_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_lead_assignments: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          lead_type: string | null
          notes: string | null
          status: string | null
          team_member_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          lead_type?: string | null
          notes?: string | null
          status?: string | null
          team_member_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          lead_type?: string | null
          notes?: string | null
          status?: string | null
          team_member_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_lead_assignments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          builder_profile_id: string | null
          id: string
          joined_at: string | null
          permissions: Json | null
          role: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          builder_profile_id?: string | null
          id?: string
          joined_at?: string | null
          permissions?: Json | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          builder_profile_id?: string | null
          id?: string
          joined_at?: string | null
          permissions?: Json | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_builder_profile_id_fkey"
            columns: ["builder_profile_id"]
            isOneToOne: false
            referencedRelation: "builder_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string | null
          builder_profile_id: string | null
          earned_at: string | null
          id: string
          is_current: boolean | null
        }
        Insert: {
          badge_id?: string | null
          builder_profile_id?: string | null
          earned_at?: string | null
          id?: string
          is_current?: boolean | null
        }
        Update: {
          badge_id?: string | null
          builder_profile_id?: string | null
          earned_at?: string | null
          id?: string
          is_current?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_builder_profile_id_fkey"
            columns: ["builder_profile_id"]
            isOneToOne: false
            referencedRelation: "builder_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          revoked_at: string | null
          role_id: string
          scope: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          role_id: string
          scope?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          role_id?: string
          scope?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
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
      user_settings: {
        Row: {
          active_profile_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_profile_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_profile_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_active_profile_id_fkey"
            columns: ["active_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          plan_type: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          plan_type: string
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          plan_type?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_verification: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean
          trust_score: number
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean
          trust_score?: number
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean
          trust_score?: number
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      visit_bookings: {
        Row: {
          agent_id: string | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_name: string | null
          buyer_phone: string | null
          city: string | null
          city_id: string | null
          country: string | null
          country_id: string | null
          created_at: string
          district: string | null
          district_admin_id: string | null
          district_id: string | null
          id: string
          locality: string | null
          locality_id: string | null
          notes: string | null
          property_id: string | null
          scheduled_at: string | null
          state: string | null
          state_id: string | null
          status: string
          updated_at: string
          visit_date: string
          visit_time: string | null
        }
        Insert: {
          agent_id?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          city?: string | null
          city_id?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string
          district?: string | null
          district_admin_id?: string | null
          district_id?: string | null
          id?: string
          locality?: string | null
          locality_id?: string | null
          notes?: string | null
          property_id?: string | null
          scheduled_at?: string | null
          state?: string | null
          state_id?: string | null
          status?: string
          updated_at?: string
          visit_date: string
          visit_time?: string | null
        }
        Update: {
          agent_id?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          city?: string | null
          city_id?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string
          district?: string | null
          district_admin_id?: string | null
          district_id?: string | null
          id?: string
          locality?: string | null
          locality_id?: string | null
          notes?: string | null
          property_id?: string | null
          scheduled_at?: string | null
          state?: string | null
          state_id?: string | null
          status?: string
          updated_at?: string
          visit_date?: string
          visit_time?: string | null
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
            foreignKeyName: "visit_bookings_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "loc_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_bookings_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "loc_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_bookings_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "loc_districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_bookings_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "loc_localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_bookings_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "loc_states"
            referencedColumns: ["id"]
          },
        ]
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
      wallet_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          error_message: string | null
          id: string
          razorpay_order_id: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number | null
          balance: number | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json
          reference_id: string | null
          status: string
          type: string | null
          user_id: string | null
          wallet_id: string | null
        }
        Insert: {
          amount?: number | null
          balance?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          reference_id?: string | null
          status?: string
          type?: string | null
          user_id?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number | null
          balance?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          reference_id?: string | null
          status?: string
          type?: string | null
          user_id?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          auto_recharge: boolean
          auto_recharge_amount: number | null
          auto_recharge_threshold: number | null
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_recharge?: boolean
          auto_recharge_amount?: number | null
          auto_recharge_threshold?: number | null
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_recharge?: boolean
          auto_recharge_amount?: number | null
          auto_recharge_threshold?: number | null
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekend_booking_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          booking_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          booking_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          booking_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "weekend_booking_activity_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "weekend_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      weekend_booking_itinerary: {
        Row: {
          booking_id: string
          created_at: string
          day_number: number
          end_time: string | null
          id: string
          item_type: string
          location: string | null
          notes: string | null
          property_id: string | null
          sort_order: number | null
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          day_number: number
          end_time?: string | null
          id?: string
          item_type: string
          location?: string | null
          notes?: string | null
          property_id?: string | null
          sort_order?: number | null
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          day_number?: number
          end_time?: string | null
          id?: string
          item_type?: string
          location?: string | null
          notes?: string | null
          property_id?: string | null
          sort_order?: number | null
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekend_booking_itinerary_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "weekend_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      weekend_bookings: {
        Row: {
          admin_qualification_notes: string | null
          admin_qualified_at: string | null
          admin_qualified_by: string | null
          agent_accepted_at: string | null
          agent_assigned_at: string | null
          agent_assigned_by: string | null
          agent_decline_reason: string | null
          agent_declined_at: string | null
          agent_id: string | null
          agent_notes: string | null
          agent_rated_at: string | null
          agent_rating: number | null
          agent_review: string | null
          bhk_preference: string | null
          booking_amount: number | null
          booking_kind: string
          budget_max: number | null
          budget_min: number | null
          buyer_decision: string | null
          buyer_decision_at: string | null
          buyer_decision_notes: string | null
          buyer_email: string
          buyer_id: string
          buyer_name: string
          buyer_notes: string | null
          buyer_phone: string
          city: string | null
          country: string | null
          created_at: string
          deal_amount: number | null
          deal_closed_at: string | null
          deal_property_id: string | null
          district: string | null
          district_admin_id: string | null
          end_date: string
          estimated_total: number | null
          final_paid_at: string | null
          final_payment_amount: number | null
          final_payment_reference: string | null
          final_payment_status: string
          final_total: number | null
          hotel_id: string | null
          hotel_tier: string | null
          id: string
          include_agent_assistance: boolean | null
          include_transport: boolean | null
          interested_property_ids: string[] | null
          paid_at: string | null
          payment_reference: string | null
          payment_status: string
          preferred_locations: string[] | null
          property_type: string | null
          rejection_reason: string | null
          selected_property_ids: string[] | null
          start_date: string
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_qualification_notes?: string | null
          admin_qualified_at?: string | null
          admin_qualified_by?: string | null
          agent_accepted_at?: string | null
          agent_assigned_at?: string | null
          agent_assigned_by?: string | null
          agent_decline_reason?: string | null
          agent_declined_at?: string | null
          agent_id?: string | null
          agent_notes?: string | null
          agent_rated_at?: string | null
          agent_rating?: number | null
          agent_review?: string | null
          bhk_preference?: string | null
          booking_amount?: number | null
          booking_kind?: string
          budget_max?: number | null
          budget_min?: number | null
          buyer_decision?: string | null
          buyer_decision_at?: string | null
          buyer_decision_notes?: string | null
          buyer_email: string
          buyer_id: string
          buyer_name: string
          buyer_notes?: string | null
          buyer_phone: string
          city?: string | null
          country?: string | null
          created_at?: string
          deal_amount?: number | null
          deal_closed_at?: string | null
          deal_property_id?: string | null
          district?: string | null
          district_admin_id?: string | null
          end_date: string
          estimated_total?: number | null
          final_paid_at?: string | null
          final_payment_amount?: number | null
          final_payment_reference?: string | null
          final_payment_status?: string
          final_total?: number | null
          hotel_id?: string | null
          hotel_tier?: string | null
          id?: string
          include_agent_assistance?: boolean | null
          include_transport?: boolean | null
          interested_property_ids?: string[] | null
          paid_at?: string | null
          payment_reference?: string | null
          payment_status?: string
          preferred_locations?: string[] | null
          property_type?: string | null
          rejection_reason?: string | null
          selected_property_ids?: string[] | null
          start_date: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_qualification_notes?: string | null
          admin_qualified_at?: string | null
          admin_qualified_by?: string | null
          agent_accepted_at?: string | null
          agent_assigned_at?: string | null
          agent_assigned_by?: string | null
          agent_decline_reason?: string | null
          agent_declined_at?: string | null
          agent_id?: string | null
          agent_notes?: string | null
          agent_rated_at?: string | null
          agent_rating?: number | null
          agent_review?: string | null
          bhk_preference?: string | null
          booking_amount?: number | null
          booking_kind?: string
          budget_max?: number | null
          budget_min?: number | null
          buyer_decision?: string | null
          buyer_decision_at?: string | null
          buyer_decision_notes?: string | null
          buyer_email?: string
          buyer_id?: string
          buyer_name?: string
          buyer_notes?: string | null
          buyer_phone?: string
          city?: string | null
          country?: string | null
          created_at?: string
          deal_amount?: number | null
          deal_closed_at?: string | null
          deal_property_id?: string | null
          district?: string | null
          district_admin_id?: string | null
          end_date?: string
          estimated_total?: number | null
          final_paid_at?: string | null
          final_payment_amount?: number | null
          final_payment_reference?: string | null
          final_payment_status?: string
          final_total?: number | null
          hotel_id?: string | null
          hotel_tier?: string | null
          id?: string
          include_agent_assistance?: boolean | null
          include_transport?: boolean | null
          interested_property_ids?: string[] | null
          paid_at?: string | null
          payment_reference?: string | null
          payment_status?: string
          preferred_locations?: string[] | null
          property_type?: string | null
          rejection_reason?: string | null
          selected_property_ids?: string[] | null
          start_date?: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      project_stats_view: {
        Row: {
          available_units: number | null
          booked_units: number | null
          builder_name: string | null
          project_id: string | null
          project_name: string | null
          project_status: string | null
          revenue_generated: number | null
          sold_units: number | null
          total_units: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_to_wallet: {
        Args: {
          _amount: number
          _description?: string
          _reference?: string
          _user_id: string
        }
        Returns: number
      }
      admin_ban_user: {
        Args: { _reason: string; _user_id: string }
        Returns: undefined
      }
      admin_block_property: {
        Args: { _property_id: string; _reason: string }
        Returns: undefined
      }
      admin_can_view: {
        Args: { _country: string; _district: string; _state: string }
        Returns: boolean
      }
      admin_can_view_scope: {
        Args: {
          _country: string
          _district: string
          _state: string
          _user_id: string
        }
        Returns: boolean
      }
      admin_temp_approve_no_agent: {
        Args: { _property_id: string }
        Returns: undefined
      }
      approve_profile: { Args: { _profile_id: string }; Returns: undefined }
      assign_user_role: {
        Args: { _role: string; _user_id: string }
        Returns: undefined
      }
      can_remind_admin: { Args: { _target_user_id: string }; Returns: boolean }
      can_review_scope: {
        Args: {
          _assigned_admin_id: string
          _country: string
          _district: string
          _state: string
          _uid: string
        }
        Returns: boolean
      }
      charge_property_posting: {
        Args: { _property_id: string; _user_id: string }
        Returns: Json
      }
      charge_visit_booking: {
        Args: { _booking_id: string; _user_id: string }
        Returns: Json
      }
      check_and_consume_posting_quota: {
        Args: { _user_id: string }
        Returns: Json
      }
      check_financial_kyc: { Args: { _user_id: string }; Returns: boolean }
      check_room_availability: {
        Args: { _check_in: string; _check_out: string; _room_id: string }
        Returns: number
      }
      create_wallet_for_user: { Args: { _user_id: string }; Returns: string }
      credit_wallet_from_razorpay: {
        Args: {
          _amount: number
          _order_id: string
          _payment_id: string
          _signature: string
          _user_id: string
        }
        Returns: number
      }
      debit_from_wallet: {
        Args: {
          _amount: number
          _description?: string
          _reference?: string
          _user_id: string
        }
        Returns: number
      }
      decrement_balance: {
        Args: { _amount: number; _wallet_id: string }
        Returns: number
      }
      decrement_wallet_balance: {
        Args: {
          _amount: number
          _description?: string
          _reference?: string
          _user_id: string
        }
        Returns: number
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      drop_property_price: {
        Args: { _new_price: number; _property_id: string }
        Returns: undefined
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_due_property_listings: {
        Args: never
        Returns: {
          expired_count: number
          warned_count: number
        }[]
      }
      expire_featured_boosts: { Args: never; Returns: number }
      find_user_id_by_email: { Args: { _email: string }; Returns: string }
      generate_unique_builder_slug: {
        Args: { _id: string; _name: string }
        Returns: string
      }
      generate_unique_project_slug: {
        Args: { _id: string; _name: string }
        Returns: string
      }
      generate_unique_property_slug: {
        Args: { _id?: string; _title: string }
        Returns: string
      }
      get_active_profile_type: { Args: { _user_id: string }; Returns: string }
      get_admin_role: { Args: { _user_id: string }; Returns: string }
      get_district_admin_for: {
        Args: { _country: string; _district: string; _state: string }
        Returns: string
      }
      get_hotel_application_status: {
        Args: { _id: string }
        Returns: {
          approved_hotel_id: string
          city: string
          created_at: string
          hotel_name: string
          id: string
          locality: string
          rejection_reason: string
          reviewed_at: string
          status: string
        }[]
      }
      get_land_approver: {
        Args: { _country: string; _district: string; _state: string }
        Returns: {
          role: string
          user_id: string
        }[]
      }
      get_nearby_agents_for_property: {
        Args: { _limit?: number; _property_id: string; _radius_km?: number }
        Returns: {
          active_tasks: number
          agent_city: string
          agent_id: string
          agent_name: string
          agent_phone: string
          avg_rating: number
          completed_verifications: number
          distance_km: number
          pending_tasks: number
        }[]
      }
      get_or_create_referral_code: { Args: never; Returns: string }
      get_posting_entitlement: { Args: { _user_id: string }; Returns: Json }
      get_posting_quota_status: { Args: { _user_id: string }; Returns: Json }
      get_seller_contacts: {
        Args: { _user_ids: string[] }
        Returns: {
          email: string
          full_name: string
          phone: string
          user_id: string
        }[]
      }
      get_visit_entitlement: { Args: { _user_id: string }; Returns: Json }
      get_wallet_balance: { Args: { _user_id: string }; Returns: number }
      has_permission: {
        Args: { _action: string; _resource: string; _user_id: string }
        Returns: boolean
      }
      increment_balance: {
        Args: { _amount: number; _wallet_id: string }
        Returns: number
      }
      increment_posting_count: {
        Args: { _user_id: string }
        Returns: undefined
      }
      increment_wallet_balance: {
        Args: {
          _amount: number
          _description?: string
          _reference?: string
          _user_id: string
        }
        Returns: number
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_financial_buyer: {
        Args: { _application_id: string }
        Returns: boolean
      }
      is_financial_owner: {
        Args: { _application_id: string }
        Returns: boolean
      }
      is_property_operator: {
        Args: {
          _country: string
          _district: string
          _state: string
          _user_id: string
        }
        Returns: boolean
      }
      is_valid_property_transition: {
        Args: {
          _from: Database["public"]["Enums"]["property_lifecycle_status"]
          _to: Database["public"]["Enums"]["property_lifecycle_status"]
        }
        Returns: boolean
      }
      list_reminder_targets: {
        Args: never
        Returns: {
          country: string
          district: string
          email: string
          role: string
          state: string
          user_id: string
        }[]
      }
      mark_property_featured: {
        Args: { _days?: number; _payment_ref?: string; _property_id: string }
        Returns: undefined
      }
      mark_property_sold:
        | { Args: { _property_id: string }; Returns: undefined }
        | {
            Args: {
              _property_id: string
              _sale_type?: string
              _sold_price?: number
            }
            Returns: undefined
          }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      nl_can_manage_farm: {
        Args: { _farm_id: string; _user_id: string }
        Returns: boolean
      }
      owner_request_verification: {
        Args: { _property_id: string }
        Returns: undefined
      }
      purchase_agent_subscription: { Args: { _user_id: string }; Returns: Json }
      purchase_financial_lead: { Args: { _lead_id: string }; Returns: Json }
      purchase_financial_promotion: {
        Args: { _amount: number; _duration_days: number; _package_type: string }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      redeem_cashback: { Args: { _user_id: string }; Returns: number }
      reject_profile: {
        Args: { _profile_id: string; _reason?: string }
        Returns: undefined
      }
      renew_property_listing: {
        Args: { _property_id: string }
        Returns: undefined
      }
      renew_property_listing_v2: {
        Args: { _property_id: string }
        Returns: Database["public"]["Enums"]["property_lifecycle_status"]
      }
      resolve_approver: {
        Args: { _country: string; _district: string; _state: string }
        Returns: {
          level: number
          role: string
          user_id: string
        }[]
      }
      resolve_district_admin: {
        Args: { _country: string; _district: string; _state: string }
        Returns: string
      }
      resolve_district_admin_by_id: {
        Args: { _district_id: string }
        Returns: string
      }
      resolve_location_hierarchy: {
        Args: { _city: string }
        Returns: {
          country: string
          district: string
          state: string
        }[]
      }
      resolve_location_ids: {
        Args: {
          _city: string
          _country: string
          _district: string
          _locality: string
          _state: string
        }
        Returns: {
          city_id: string
          country_id: string
          district_id: string
          locality_id: string
          state_id: string
        }[]
      }
      resolve_roles: { Args: { _user_id: string }; Returns: string[] }
      review_agent_application: {
        Args: { _app_id: string; _approve: boolean; _remarks?: string }
        Returns: Json
      }
      review_kyc: {
        Args: { _decision: string; _reason?: string; _user_id: string }
        Returns: undefined
      }
      review_land_registration: {
        Args: { _decision: string; _reason?: string; _registration_id: string }
        Returns: undefined
      }
      review_nl_kyc: {
        Args: { _decision: string; _kyc_id: string; _reason?: string }
        Returns: undefined
      }
      review_price_drop: {
        Args: { _decision: string; _property_id: string; _reason?: string }
        Returns: undefined
      }
      review_signup_request: {
        Args: {
          _decision: string
          _rejection_reason?: string
          _request_id: string
        }
        Returns: undefined
      }
      search_properties_in_bounds: {
        Args: {
          _limit?: number
          _ne_lat: number
          _ne_lng: number
          _sw_lat: number
          _sw_lng: number
        }
        Returns: {
          area_sqft: number
          bhk: number
          city: string
          id: string
          images: string[]
          is_live: boolean
          latitude: number
          listing_type: string
          locality: string
          longitude: number
          price: number
          title: string
          type: string
          verified: boolean
        }[]
      }
      search_properties_nearby: {
        Args: {
          _lat: number
          _limit?: number
          _lng: number
          _page?: number
          _radius_km?: number
        }
        Returns: {
          address: string
          area_sqft: number
          bathrooms: number
          bedrooms: number
          bhk: number
          city: string
          created_at: string
          description: string
          distance_km: number
          furnishing: string
          id: string
          images: string[]
          is_live: boolean
          latitude: number
          listing_type: string
          locality: string
          longitude: number
          price: number
          title: string
          total_count: number
          trust_score: number
          type: string
          verified: boolean
        }[]
      }
      send_admin_reminder: {
        Args: {
          _entity_id?: string
          _entity_type?: string
          _message: string
          _to_admin_id: string
        }
        Returns: string
      }
      slugify: { Args: { _input: string }; Returns: string }
      submit_kyc: {
        Args: { _aadhaar: string; _pan: string; _selfie: string }
        Returns: undefined
      }
      submit_signup_request: {
        Args: {
          _city: string
          _email: string
          _full_name: string
          _requested_role: string
          _user_id: string
        }
        Returns: undefined
      }
      update_financial_loan_document_status: {
        Args: { _document_id: string; _notes?: string; _status: string }
        Returns: undefined
      }
      user_has_hotel_access: {
        Args: { _hotel_id: string; _min_role?: string }
        Returns: boolean
      }
      user_has_scope: {
        Args: { _level: string; _location_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_hotel: { Args: { _hotel_id: string }; Returns: boolean }
      user_owns_profile: {
        Args: { _profile_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      agent_assignment_state: "pending" | "accepted" | "rejected"
      lead_source: "call" | "whatsapp" | "inquiry"
      lead_status: "new" | "contacted" | "closed"
      nl_kyc_status: "pending" | "approved" | "rejected"
      nl_role: "customer" | "farmer" | "land_owner" | "admin"
      property_lifecycle_status:
        | "draft"
        | "submitted"
        | "pending_admin_review"
        | "agent_assigned"
        | "agent_accepted"
        | "agent_rejected"
        | "visit_scheduled"
        | "under_verification"
        | "verification_submitted"
        | "pending_final_approval"
        | "live"
        | "live_verified"
        | "expired"
        | "renewed"
        | "rejected"
        | "cancelled_by_owner"
        | "visit_confirmed"
        | "visit_reschedule_requested"
      verification_artifact_status:
        | "in_progress"
        | "submitted"
        | "approved"
        | "rejected"
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
      agent_assignment_state: ["pending", "accepted", "rejected"],
      lead_source: ["call", "whatsapp", "inquiry"],
      lead_status: ["new", "contacted", "closed"],
      nl_kyc_status: ["pending", "approved", "rejected"],
      nl_role: ["customer", "farmer", "land_owner", "admin"],
      property_lifecycle_status: [
        "draft",
        "submitted",
        "pending_admin_review",
        "agent_assigned",
        "agent_accepted",
        "agent_rejected",
        "visit_scheduled",
        "under_verification",
        "verification_submitted",
        "pending_final_approval",
        "live",
        "live_verified",
        "expired",
        "renewed",
        "rejected",
        "cancelled_by_owner",
        "visit_confirmed",
        "visit_reschedule_requested",
      ],
      verification_artifact_status: [
        "in_progress",
        "submitted",
        "approved",
        "rejected",
      ],
    },
  },
} as const
