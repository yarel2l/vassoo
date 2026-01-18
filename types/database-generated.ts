/**
 * Database types for Supabase
 * 
 * This file provides TypeScript types for the database schema.
 * Regenerate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          birth_date: string | null
          age_verified: boolean | null
          age_verified_at: string | null
          current_address: Json | null
          current_coordinates: unknown | null
          preferred_language: string | null
          notification_preferences: Json | null
          role: 'customer' | 'driver' | 'store_staff' | 'delivery_staff' | 'platform_admin' | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          age_verified?: boolean | null
          age_verified_at?: string | null
          current_address?: Json | null
          current_coordinates?: unknown | null
          preferred_language?: string | null
          notification_preferences?: Json | null
          role?: 'customer' | 'driver' | 'store_staff' | 'delivery_staff' | 'platform_admin' | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          age_verified?: boolean | null
          age_verified_at?: string | null
          current_address?: Json | null
          current_coordinates?: unknown | null
          preferred_language?: string | null
          notification_preferences?: Json | null
          role?: 'customer' | 'driver' | 'store_staff' | 'delivery_staff' | 'platform_admin' | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      platform_admins: {
        Row: {
          id: string
          user_id: string
          role: 'super_admin' | 'admin' | 'support' | 'finance'
          permissions: Json | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role: 'super_admin' | 'admin' | 'support' | 'finance'
          permissions?: Json | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'super_admin' | 'admin' | 'support' | 'finance'
          permissions?: Json | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          type: 'owner_store' | 'delivery_company'
          status: 'pending' | 'active' | 'suspended' | 'inactive'
          stripe_account_id: string | null
          stripe_account_status: 'pending' | 'onboarding' | 'active' | 'restricted' | 'disabled' | null
          stripe_onboarding_complete: boolean | null
          email: string
          phone: string | null
          settings: Json | null
          metadata: Json | null
          onboarding_step: number | null
          onboarding_complete: boolean | null
          onboarding_completed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          type: 'owner_store' | 'delivery_company'
          status?: 'pending' | 'active' | 'suspended' | 'inactive'
          email: string
          phone?: string | null
          settings?: Json | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          type?: 'owner_store' | 'delivery_company'
          status?: 'pending' | 'active' | 'suspended' | 'inactive'
          email?: string
          phone?: string | null
          settings?: Json | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      tenant_memberships: {
        Row: {
          id: string
          user_id: string
          tenant_id: string
          role: 'owner' | 'admin' | 'manager' | 'employee'
          permissions: Json | null
          is_active: boolean | null
          invited_by: string | null
          invited_at: string | null
          accepted_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id: string
          role: 'owner' | 'admin' | 'manager' | 'employee'
          permissions?: Json | null
          is_active?: boolean | null
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string
          role?: 'owner' | 'admin' | 'manager' | 'employee'
          permissions?: Json | null
          is_active?: boolean | null
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      delivery_companies: {
        Row: {
          id: string
          tenant_id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          email: string | null
          phone: string | null
          settings: Json | null
          service_areas: unknown | null
          operating_hours: Json | null
          is_active: boolean | null
          average_rating: number | null
          total_deliveries: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          email?: string | null
          phone?: string | null
          settings?: Json | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          email?: string | null
          phone?: string | null
          settings?: Json | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      delivery_drivers: {
        Row: {
          id: string
          delivery_company_id: string
          user_id: string
          vehicle_type: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_color: string | null
          vehicle_plate: string | null
          drivers_license_number: string | null
          drivers_license_expiry: string | null
          drivers_license_state: string | null
          insurance_policy_number: string | null
          insurance_expiry: string | null
          is_active: boolean | null
          is_available: boolean | null
          is_on_delivery: boolean | null
          current_location: unknown | null
          current_heading: number | null
          last_location_update: string | null
          total_deliveries: number | null
          average_rating: number | null
          total_distance_miles: number | null
          phone: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          delivery_company_id: string
          user_id: string
          vehicle_type?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_color?: string | null
          vehicle_plate?: string | null
          drivers_license_number?: string | null
          drivers_license_expiry?: string | null
          drivers_license_state?: string | null
          insurance_policy_number?: string | null
          insurance_expiry?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          is_on_delivery?: boolean | null
          phone?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          delivery_company_id?: string
          user_id?: string
          vehicle_type?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          is_on_delivery?: boolean | null
          phone?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      deliveries: {
        Row: {
          id: string
          order_id: string
          delivery_company_id: string
          driver_id: string | null
          status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'cancelled'
          pickup_location: unknown | null
          pickup_address: string | null
          dropoff_location: unknown | null
          dropoff_address: string | null
          estimated_distance_miles: number | null
          actual_distance_miles: number | null
          delivery_fee: number | null
          driver_payout: number | null
          estimated_pickup_at: string | null
          actual_pickup_at: string | null
          estimated_delivery_at: string | null
          actual_delivery_at: string | null
          delivery_notes: string | null
          proof_of_delivery_url: string | null
          customer_rating: number | null
          customer_feedback: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          delivery_company_id: string
          driver_id?: string | null
          status?: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'cancelled'
          pickup_address?: string | null
          dropoff_address?: string | null
          delivery_fee?: number | null
          driver_payout?: number | null
          delivery_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          delivery_company_id?: string
          driver_id?: string | null
          status?: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'cancelled'
          pickup_address?: string | null
          dropoff_address?: string | null
          delivery_fee?: number | null
          driver_payout?: number | null
          delivery_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      stores: {
        Row: {
          id: string
          tenant_id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          banner_url: string | null
          email: string | null
          phone: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          coordinates: unknown | null
          settings: Json | null
          is_active: boolean | null
          average_rating: number | null
          total_reviews: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          slug: string
          description?: string | null
          email?: string | null
          phone?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          slug?: string
          description?: string | null
          email?: string | null
          phone?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          store_id: string
          user_id: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          status: 'pending' | 'confirmed' | 'processing' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'refunded'
          fulfillment_type: 'delivery' | 'pickup'
          subtotal: number
          tax_amount: number
          delivery_fee: number | null
          discount_amount: number | null
          total: number
          delivery_address: Json | null
          delivery_instructions: string | null
          scheduled_for: string | null
          notes: string | null
          payment_intent_id: string | null
          payment_status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          order_number: string
          store_id: string
          user_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          status?: 'pending' | 'confirmed' | 'processing' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'refunded'
          fulfillment_type: 'delivery' | 'pickup'
          subtotal: number
          tax_amount: number
          delivery_fee?: number | null
          discount_amount?: number | null
          total: number
          delivery_address?: Json | null
          delivery_instructions?: string | null
          scheduled_for?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          order_number?: string
          store_id?: string
          user_id?: string | null
          status?: 'pending' | 'confirmed' | 'processing' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'refunded'
          fulfillment_type?: 'delivery' | 'pickup'
          subtotal?: number
          tax_amount?: number
          delivery_fee?: number | null
          discount_amount?: number | null
          total?: number
          delivery_address?: Json | null
          delivery_instructions?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      user_addresses: {
        Row: {
          id: string
          user_id: string
          label: string
          address_line1: string
          address_line2: string | null
          city: string
          state: string
          zip_code: string
          country: string | null
          coordinates: unknown | null
          is_default: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          label: string
          address_line1: string
          address_line2?: string | null
          city: string
          state: string
          zip_code: string
          country?: string | null
          is_default?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          label?: string
          address_line1?: string
          address_line2?: string | null
          city?: string
          state?: string
          zip_code?: string
          country?: string | null
          is_default?: boolean | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      admin_role: 'super_admin' | 'admin' | 'support' | 'finance'
      delivery_status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'cancelled'
      fulfillment_type: 'delivery' | 'pickup'
      membership_role: 'owner' | 'admin' | 'manager' | 'employee'
      order_status: 'pending' | 'confirmed' | 'processing' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'refunded'
      tenant_status: 'pending' | 'active' | 'suspended' | 'inactive'
      tenant_type: 'owner_store' | 'delivery_company'
      user_role: 'customer' | 'driver' | 'store_staff' | 'delivery_staff' | 'platform_admin'
    }
  }
}
