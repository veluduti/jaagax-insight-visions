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
      agent_ratings: {
        Row: {
          agent_id: string
          booking_id: string
          buyer_id: string
          created_at: string
          id: string
          property_id: string | null
          rating: number
          review: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          booking_id: string
          buyer_id: string
          created_at?: string
          id?: string
          property_id?: string | null
          rating: number
          review?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          booking_id?: string
          buyer_id?: string
          created_at?: string
          id?: string
          property_id?: string | null
          rating?: number
          review?: string | null
          updated_at?: string
        }
        Relationships: []
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
      hotel_partner_applications: {
        Row: {
          address: string | null
          amenities: string[] | null
          approved_hotel_id: string | null
          business_registration_url: string | null
          business_type: string
          check_in_time: string | null
          check_out_time: string | null
          city: string
          created_at: string
          email: string
          gst_certificate_url: string | null
          hotel_name: string
          id: string
          id_proof_url: string | null
          latitude: number | null
          locality: string
          longitude: number | null
          owner_name: string
          phone: string
          photos: string[] | null
          pincode: string | null
          price_max: number | null
          price_min: number | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          room_types: string[] | null
          status: string
          total_rooms: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          approved_hotel_id?: string | null
          business_registration_url?: string | null
          business_type?: string
          check_in_time?: string | null
          check_out_time?: string | null
          city: string
          created_at?: string
          email: string
          gst_certificate_url?: string | null
          hotel_name: string
          id?: string
          id_proof_url?: string | null
          latitude?: number | null
          locality: string
          longitude?: number | null
          owner_name: string
          phone: string
          photos?: string[] | null
          pincode?: string | null
          price_max?: number | null
          price_min?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_types?: string[] | null
          status?: string
          total_rooms?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          approved_hotel_id?: string | null
          business_registration_url?: string | null
          business_type?: string
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string
          created_at?: string
          email?: string
          gst_certificate_url?: string | null
          hotel_name?: string
          id?: string
          id_proof_url?: string | null
          latitude?: number | null
          locality?: string
          longitude?: number | null
          owner_name?: string
          phone?: string
          photos?: string[] | null
          pincode?: string | null
          price_max?: number | null
          price_min?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_types?: string[] | null
          status?: string
          total_rooms?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
          address: string | null
          amenities: string[] | null
          area_range: string | null
          avg_price: number | null
          bhk_types: string | null
          brochure_url: string | null
          builder_name: string | null
          city: string | null
          created_at: string | null
          description: string | null
          environmental_clearance_url: string | null
          floors_per_tower: number | null
          id: string
          image: string | null
          images: string[] | null
          is_draft: boolean | null
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
          status: string | null
          submitted_by: string | null
          total_towers: number | null
          total_units: number | null
          trust_score: number | null
          verified: boolean | null
          videos: string[] | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          area_range?: string | null
          avg_price?: number | null
          bhk_types?: string | null
          brochure_url?: string | null
          builder_name?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          environmental_clearance_url?: string | null
          floors_per_tower?: number | null
          id?: string
          image?: string | null
          images?: string[] | null
          is_draft?: boolean | null
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
          status?: string | null
          submitted_by?: string | null
          total_towers?: number | null
          total_units?: number | null
          trust_score?: number | null
          verified?: boolean | null
          videos?: string[] | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          area_range?: string | null
          avg_price?: number | null
          bhk_types?: string | null
          brochure_url?: string | null
          builder_name?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          environmental_clearance_url?: string | null
          floors_per_tower?: number | null
          id?: string
          image?: string | null
          images?: string[] | null
          is_draft?: boolean | null
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
          status?: string | null
          submitted_by?: string | null
          total_towers?: number | null
          total_units?: number | null
          trust_score?: number | null
          verified?: boolean | null
          videos?: string[] | null
        }
        Relationships: []
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
          rera_document_url: string | null
          rera_id: string | null
          retail_centres: number | null
          submitted_by: string | null
          title: string
          total_floors: number | null
          total_parking: number | null
          trust_score: number | null
          type: string | null
          updated_at: string | null
          verification_status: string
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
          rera_document_url?: string | null
          rera_id?: string | null
          retail_centres?: number | null
          submitted_by?: string | null
          title: string
          total_floors?: number | null
          total_parking?: number | null
          trust_score?: number | null
          type?: string | null
          updated_at?: string | null
          verification_status?: string
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
          rera_document_url?: string | null
          rera_id?: string | null
          retail_centres?: number | null
          submitted_by?: string | null
          title?: string
          total_floors?: number | null
          total_parking?: number | null
          trust_score?: number | null
          type?: string | null
          updated_at?: string | null
          verification_status?: string
          verified?: boolean | null
          video_urls?: string[] | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_user_role: {
        Args: { _role: string; _user_id: string }
        Returns: undefined
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      review_signup_request: {
        Args: {
          _decision: string
          _rejection_reason?: string
          _request_id: string
        }
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
