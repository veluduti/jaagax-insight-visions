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
          created_at: string
          email: string | null
          experience_years: number | null
          id: string
          languages: string | null
          localities_served: string | null
          name: string
          phone: string
          photo_url: string | null
          sales_count: number | null
          specializations: string[] | null
          total_ratings: number | null
          trust_score: number | null
          updated_at: string
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          agency_name?: string | null
          avg_rating?: number | null
          bio?: string | null
          cities_served?: string | null
          created_at?: string
          email?: string | null
          experience_years?: number | null
          id?: string
          languages?: string | null
          localities_served?: string | null
          name: string
          phone: string
          photo_url?: string | null
          sales_count?: number | null
          specializations?: string[] | null
          total_ratings?: number | null
          trust_score?: number | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          agency_name?: string | null
          avg_rating?: number | null
          bio?: string | null
          cities_served?: string | null
          created_at?: string
          email?: string | null
          experience_years?: number | null
          id?: string
          languages?: string | null
          localities_served?: string | null
          name?: string
          phone?: string
          photo_url?: string | null
          sales_count?: number | null
          specializations?: string[] | null
          total_ratings?: number | null
          trust_score?: number | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean | null
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
          clubhouse_description: string | null
          clubhouse_images: string[] | null
          company_registration_number: string | null
          completed_projects_count: number | null
          created_at: string
          customer_rating: number | null
          description: string | null
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
          clubhouse_description?: string | null
          clubhouse_images?: string[] | null
          company_registration_number?: string | null
          completed_projects_count?: number | null
          created_at?: string
          customer_rating?: number | null
          description?: string | null
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
          clubhouse_description?: string | null
          clubhouse_images?: string[] | null
          company_registration_number?: string | null
          completed_projects_count?: number | null
          created_at?: string
          customer_rating?: number | null
          description?: string | null
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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "financial_branches_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "financial_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_enquiries: {
        Row: {
          advisor_contact: string | null
          advisor_id: string | null
          advisor_name: string | null
          advisor_notes: string | null
          amount_requested: number | null
          builder_profile_id: string | null
          contact_date: string | null
          created_at: string
          deactivated_reason: string | null
          documents: Json
          enquiry_type: string | null
          follow_up_date: string | null
          id: string
          interest_rate_offered: number | null
          loan_amount: number | null
          loan_tenure_years: number | null
          loan_type: string
          monthly_emi: number | null
          notes: string | null
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
          contact_date?: string | null
          created_at?: string
          deactivated_reason?: string | null
          documents?: Json
          enquiry_type?: string | null
          follow_up_date?: string | null
          id?: string
          interest_rate_offered?: number | null
          loan_amount?: number | null
          loan_tenure_years?: number | null
          loan_type: string
          monthly_emi?: number | null
          notes?: string | null
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
          contact_date?: string | null
          created_at?: string
          deactivated_reason?: string | null
          documents?: Json
          enquiry_type?: string | null
          follow_up_date?: string | null
          id?: string
          interest_rate_offered?: number | null
          loan_amount?: number | null
          loan_tenure_years?: number | null
          loan_type?: string
          monthly_emi?: number | null
          notes?: string | null
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
          created_at: string
          customer_name: string
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
        }
        Insert: {
          budget?: number | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_name: string
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
        }
        Update: {
          budget?: number | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_name?: string
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
        }
        Relationships: [
          {
            foreignKeyName: "financial_leads_purchased_by_provider_id_fkey"
            columns: ["purchased_by_provider_id"]
            isOneToOne: false
            referencedRelation: "financial_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_loan_applications: {
        Row: {
          approved_at: string | null
          assigned_rm_id: string | null
          assigned_rm_name: string | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string
          disbursed_amount: number | null
          disbursed_at: string | null
          employment_type: string | null
          id: string
          loan_amount: number
          monthly_income: number | null
          property_id: string | null
          property_title: string | null
          property_value: number | null
          provider_id: string
          rejected_at: string | null
          rejection_reason: string | null
          sanction_letter_url: string | null
          status: string
          tenure_months: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          assigned_rm_id?: string | null
          assigned_rm_name?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          disbursed_amount?: number | null
          disbursed_at?: string | null
          employment_type?: string | null
          id?: string
          loan_amount: number
          monthly_income?: number | null
          property_id?: string | null
          property_title?: string | null
          property_value?: number | null
          provider_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          sanction_letter_url?: string | null
          status?: string
          tenure_months?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          assigned_rm_id?: string | null
          assigned_rm_name?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          disbursed_amount?: number | null
          disbursed_at?: string | null
          employment_type?: string | null
          id?: string
          loan_amount?: number
          monthly_income?: number | null
          property_id?: string | null
          property_title?: string | null
          property_value?: number | null
          provider_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          sanction_letter_url?: string | null
          status?: string
          tenure_months?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_loan_applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
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
          file_path: string | null
          id: string
          notes: string | null
          updated_at: string
          uploaded_at: string
          verified_by: string | null
          verified_status: string
        }
        Insert: {
          application_id: string
          document_type: string
          file_path?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          uploaded_at?: string
          verified_by?: string | null
          verified_status?: string
        }
        Update: {
          application_id?: string
          document_type?: string
          file_path?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          uploaded_at?: string
          verified_by?: string | null
          verified_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_loan_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "financial_loan_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_notifications: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          provider_id: string
          title: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          provider_id: string
          title: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          provider_id?: string
          title?: string
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
        Relationships: [
          {
            foreignKeyName: "financial_promotions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "financial_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_providers: {
        Row: {
          company_name: string | null
          company_reg_cert_url: string | null
          created_at: string
          entity_type: string | null
          featured_until: string | null
          gst_url: string | null
          id: string
          is_featured: boolean | null
          kyc_rejection_reason: string | null
          kyc_status: string
          logo_url: string | null
          notification_preferences: Json
          pan_url: string | null
          rating: number | null
          rbi_registration: string | null
          services_offered: string[] | null
          signatory_id_url: string | null
          subscription_expires_at: string | null
          subscription_status: string
          total_reviews: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          company_reg_cert_url?: string | null
          created_at?: string
          entity_type?: string | null
          featured_until?: string | null
          gst_url?: string | null
          id?: string
          is_featured?: boolean | null
          kyc_rejection_reason?: string | null
          kyc_status?: string
          logo_url?: string | null
          notification_preferences?: Json
          pan_url?: string | null
          rating?: number | null
          rbi_registration?: string | null
          services_offered?: string[] | null
          signatory_id_url?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          total_reviews?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          company_reg_cert_url?: string | null
          created_at?: string
          entity_type?: string | null
          featured_until?: string | null
          gst_url?: string | null
          id?: string
          is_featured?: boolean | null
          kyc_rejection_reason?: string | null
          kyc_status?: string
          logo_url?: string | null
          notification_preferences?: Json
          pan_url?: string | null
          rating?: number | null
          rbi_registration?: string | null
          services_offered?: string[] | null
          signatory_id_url?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_team_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          member_user_id: string | null
          name: string
          performance: Json | null
          phone: string | null
          provider_id: string
          team_role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          member_user_id?: string | null
          name: string
          performance?: Json | null
          phone?: string | null
          provider_id: string
          team_role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          member_user_id?: string | null
          name?: string
          performance?: Json | null
          phone?: string | null
          provider_id?: string
          team_role?: string
          updated_at?: string
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
          booking_reference: string | null
          booking_type: string | null
          builder_profile_id: string | null
          cancellation_reason: string | null
          check_in: string
          check_out: string
          created_at: string | null
          currency: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          hotel_address: string | null
          hotel_id: string
          hotel_name: string | null
          id: string
          invoice_url: string | null
          num_guests: number | null
          num_rooms: number | null
          package_id: string | null
          payment_method: string | null
          payment_status: string
          property_id: string | null
          room_type: string | null
          special_requests: string | null
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          booking_reference?: string | null
          booking_type?: string | null
          builder_profile_id?: string | null
          cancellation_reason?: string | null
          check_in: string
          check_out: string
          created_at?: string | null
          currency?: string
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          hotel_address?: string | null
          hotel_id: string
          hotel_name?: string | null
          id?: string
          invoice_url?: string | null
          num_guests?: number | null
          num_rooms?: number | null
          package_id?: string | null
          payment_method?: string | null
          payment_status?: string
          property_id?: string | null
          room_type?: string | null
          special_requests?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          booking_reference?: string | null
          booking_type?: string | null
          builder_profile_id?: string | null
          cancellation_reason?: string | null
          check_in?: string
          check_out?: string
          created_at?: string | null
          currency?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          hotel_address?: string | null
          hotel_id?: string
          hotel_name?: string | null
          id?: string
          invoice_url?: string | null
          num_guests?: number | null
          num_rooms?: number | null
          package_id?: string | null
          payment_method?: string | null
          payment_status?: string
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
      hotel_rooms: {
        Row: {
          amenities: Json | null
          base_price: number
          bed_type: string | null
          breakfast_included: boolean
          cancellation_policy: string | null
          category: string | null
          created_at: string
          description: string | null
          extra_bed_allowed: boolean
          extra_bed_price: number | null
          hotel_id: string
          id: string
          is_active: boolean
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
          created_at?: string
          description?: string | null
          extra_bed_allowed?: boolean
          extra_bed_price?: number | null
          hotel_id: string
          id?: string
          is_active?: boolean
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
          created_at?: string
          description?: string | null
          extra_bed_allowed?: boolean
          extra_bed_price?: number | null
          hotel_id?: string
          id?: string
          is_active?: boolean
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
          created_at: string | null
          description: string | null
          discount_percentage: number | null
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
          total_rooms?: number | null
          updated_at?: string | null
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
          created_at: string
          id: string
          is_banned: boolean
          location_data: Json | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          id?: string
          is_banned?: boolean
          location_data?: Json | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          id?: string
          is_banned?: boolean
          location_data?: Json | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          created_at: string | null
          description: string | null
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
          status: string | null
          submitted_by: string | null
          subtitle: string | null
          total_towers: number | null
          total_units: number | null
          towers: number | null
          trust_score: number | null
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
          created_at?: string | null
          description?: string | null
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
          status?: string | null
          submitted_by?: string | null
          subtitle?: string | null
          total_towers?: number | null
          total_units?: number | null
          towers?: number | null
          trust_score?: number | null
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
          created_at?: string | null
          description?: string | null
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
          status?: string | null
          submitted_by?: string | null
          subtitle?: string | null
          total_towers?: number | null
          total_units?: number | null
          towers?: number | null
          trust_score?: number | null
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
          completion_stage: string | null
          created_at: string | null
          description: string | null
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
          retail_centres: number | null
          slug: string | null
          sold_at: string | null
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
          completion_stage?: string | null
          created_at?: string | null
          description?: string | null
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
          retail_centres?: number | null
          slug?: string | null
          sold_at?: string | null
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
          completion_stage?: string | null
          created_at?: string | null
          description?: string | null
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
          retail_centres?: number | null
          slug?: string | null
          sold_at?: string | null
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
          created_at: string
          details: string | null
          id: string
          property_id: string
          reason: string
          reported_by: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          property_id: string
          reason: string
          reported_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          property_id?: string
          reason?: string
          reported_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
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
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          rejection_reason: string | null
          requested_role: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          rejection_reason?: string | null
          requested_role: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          rejection_reason?: string | null
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
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
          created_at: string
          id: string
          locality: string | null
          notes: string | null
          property_id: string | null
          scheduled_at: string | null
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
          created_at?: string
          id?: string
          locality?: string | null
          notes?: string | null
          property_id?: string | null
          scheduled_at?: string | null
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
          created_at?: string
          id?: string
          locality?: string | null
          notes?: string | null
          property_id?: string | null
          scheduled_at?: string | null
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
            foreignKeyName: "visit_bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
      wallet_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          reference: string | null
          reference_id: string | null
          status: string
          type: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference?: string | null
          reference_id?: string | null
          status?: string
          type: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference?: string | null
          reference_id?: string | null
          status?: string
          type?: string
          user_id?: string
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
          created_at: string
          deal_amount: number | null
          deal_closed_at: string | null
          deal_property_id: string | null
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
          created_at?: string
          deal_amount?: number | null
          deal_closed_at?: string | null
          deal_property_id?: string | null
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
          created_at?: string
          deal_amount?: number | null
          deal_closed_at?: string | null
          deal_property_id?: string | null
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
      admin_temp_approve_no_agent: {
        Args: { _property_id: string }
        Returns: undefined
      }
      approve_profile: { Args: { _profile_id: string }; Returns: undefined }
      assign_user_role: {
        Args: { _role: string; _user_id: string }
        Returns: undefined
      }
      check_and_consume_posting_quota: {
        Args: { _user_id: string }
        Returns: Json
      }
      check_financial_kyc: { Args: { _user_id: string }; Returns: boolean }
      create_wallet_for_user: { Args: { _user_id: string }; Returns: string }
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
      generate_unique_builder_slug: {
        Args: { _id: string; _name: string }
        Returns: string
      }
      generate_unique_project_slug: {
        Args: { _id: string; _name: string }
        Returns: string
      }
      generate_unique_property_slug: {
        Args: { _id: string; _title: string }
        Returns: string
      }
      get_active_profile_type: { Args: { _user_id: string }; Returns: string }
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
      get_wallet_balance: { Args: { _user_id: string }; Returns: number }
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
      is_valid_property_transition: {
        Args: {
          _from: Database["public"]["Enums"]["property_lifecycle_status"]
          _to: Database["public"]["Enums"]["property_lifecycle_status"]
        }
        Returns: boolean
      }
      mark_property_featured: {
        Args: { _days?: number; _payment_ref?: string; _property_id: string }
        Returns: undefined
      }
      mark_property_sold: { Args: { _property_id: string }; Returns: undefined }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      owner_request_verification: {
        Args: { _property_id: string }
        Returns: undefined
      }
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
      review_kyc: {
        Args: { _decision: string; _reason?: string; _user_id: string }
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
