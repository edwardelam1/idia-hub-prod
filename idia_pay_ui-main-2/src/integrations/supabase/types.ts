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
      bank_settings: {
        Row: {
          account_holder: string | null
          account_number: string | null
          account_type: string | null
          bank_name: string | null
          business_id: string
          created_at: string | null
          deposit_split_pct: number | null
          direct_deposit_enabled: boolean | null
          id: string
          is_primary: boolean | null
          label: string | null
          plaid_access_token: string | null
          plaid_account_id: string | null
          plaid_institution_id: string | null
          plaid_item_id: string | null
          routing_number: string | null
          updated_at: string | null
          verification_status: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          business_id: string
          created_at?: string | null
          deposit_split_pct?: number | null
          direct_deposit_enabled?: boolean | null
          id?: string
          is_primary?: boolean | null
          label?: string | null
          plaid_access_token?: string | null
          plaid_account_id?: string | null
          plaid_institution_id?: string | null
          plaid_item_id?: string | null
          routing_number?: string | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          business_id?: string
          created_at?: string | null
          deposit_split_pct?: number | null
          direct_deposit_enabled?: boolean | null
          id?: string
          is_primary?: boolean | null
          label?: string | null
          plaid_access_token?: string | null
          plaid_account_id?: string | null
          plaid_institution_id?: string | null
          plaid_item_id?: string | null
          routing_number?: string | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      bank_settings_history: {
        Row: {
          action: string
          bank_setting_id: string | null
          business_id: string
          created_at: string | null
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          performed_by: string | null
        }
        Insert: {
          action?: string
          bank_setting_id?: string | null
          business_id: string
          created_at?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          bank_setting_id?: string | null
          business_id?: string
          created_at?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          business_id: string
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          open_time: string
        }
        Insert: {
          business_id: string
          close_time?: string
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          open_time?: string
        }
        Update: {
          business_id?: string
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          open_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_locations: {
        Row: {
          address: string | null
          business_id: string
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          state: string | null
          street: string | null
          street2: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          state?: string | null
          street?: string | null
          street2?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          state?: string | null
          street?: string | null
          street2?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_locations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_users: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          role: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      financial_report_uploads: {
        Row: {
          business_id: string
          created_at: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          period_end: string | null
          period_start: string | null
          status: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          status?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          status?: string | null
        }
        Relationships: []
      }
      gl_journal_entries: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          credit_account: string
          debit_account: string
          description: string
          id: string
          product_id: string | null
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          credit_account: string
          debit_account: string
          description?: string
          id?: string
          product_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          credit_account?: string
          debit_account?: string
          description?: string
          id?: string
          product_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gl_journal_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_history: {
        Row: {
          action: string
          business_id: string
          created_at: string
          id: string
          inventory_item_id: string | null
          item_name: string
          note: string | null
          quantity: number
          unit: string
        }
        Insert: {
          action?: string
          business_id: string
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          item_name: string
          note?: string | null
          quantity?: number
          unit?: string
        }
        Update: {
          action?: string
          business_id?: string
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          item_name?: string
          note?: string | null
          quantity?: number
          unit?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          business_id: string
          category: string
          created_at: string
          current_cost: number | null
          current_stock: number
          description: string | null
          gtin: string | null
          id: string
          individual_unit_size: number | null
          individual_unit_uom: string | null
          inventory_state: string
          is_active: boolean
          minimum_shelf_life_days: number | null
          name: string
          par_level: number | null
          requires_batch_tracking: boolean
          requires_serialization: boolean
          sku: string | null
          supplier_id: string | null
          tolerance_variance_pct: number | null
          total_unit_count: number | null
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          business_id: string
          category?: string
          created_at?: string
          current_cost?: number | null
          current_stock?: number
          description?: string | null
          gtin?: string | null
          id?: string
          individual_unit_size?: number | null
          individual_unit_uom?: string | null
          inventory_state?: string
          is_active?: boolean
          minimum_shelf_life_days?: number | null
          name: string
          par_level?: number | null
          requires_batch_tracking?: boolean
          requires_serialization?: boolean
          sku?: string | null
          supplier_id?: string | null
          tolerance_variance_pct?: number | null
          total_unit_count?: number | null
          unit_of_measure?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string
          created_at?: string
          current_cost?: number | null
          current_stock?: number
          description?: string | null
          gtin?: string | null
          id?: string
          individual_unit_size?: number | null
          individual_unit_uom?: string | null
          inventory_state?: string
          is_active?: boolean
          minimum_shelf_life_days?: number | null
          name?: string
          par_level?: number | null
          requires_batch_tracking?: boolean
          requires_serialization?: boolean
          sku?: string | null
          supplier_id?: string | null
          tolerance_variance_pct?: number | null
          total_unit_count?: number | null
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_history: {
        Row: {
          action: string
          business_id: string
          created_at: string
          id: string
          item_name: string
          menu_item_id: string | null
          performed_by: string | null
        }
        Insert: {
          action?: string
          business_id: string
          created_at?: string
          id?: string
          item_name: string
          menu_item_id?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          business_id?: string
          created_at?: string
          id?: string
          item_name?: string
          menu_item_id?: string | null
          performed_by?: string | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          allergen_info: string[] | null
          base_price: number
          business_id: string
          category: string
          cost_price: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_locked: boolean
          menu_status: string
          name: string
          preparation_time: number | null
          recipe_id: string | null
          updated_at: string
        }
        Insert: {
          allergen_info?: string[] | null
          base_price?: number
          business_id: string
          category?: string
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_locked?: boolean
          menu_status?: string
          name: string
          preparation_time?: number | null
          recipe_id?: string | null
          updated_at?: string
        }
        Update: {
          allergen_info?: string[] | null
          base_price?: number
          business_id?: string
          category?: string
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_locked?: boolean
          menu_status?: string
          name?: string
          preparation_time?: number | null
          recipe_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_payment_configs: {
        Row: {
          active_provider: string
          business_id: string
          business_name: string | null
          created_at: string | null
          external_api_key: string | null
          id: string
          idia_merchant_id: string | null
          idia_terminal_id: string | null
          is_default: boolean | null
          square_terminal_id: string | null
          stripe_terminal_id: string | null
          updated_at: string | null
        }
        Insert: {
          active_provider?: string
          business_id: string
          business_name?: string | null
          created_at?: string | null
          external_api_key?: string | null
          id?: string
          idia_merchant_id?: string | null
          idia_terminal_id?: string | null
          is_default?: boolean | null
          square_terminal_id?: string | null
          stripe_terminal_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active_provider?: string
          business_id?: string
          business_name?: string | null
          created_at?: string | null
          external_api_key?: string | null
          id?: string
          idia_merchant_id?: string | null
          idia_terminal_id?: string | null
          is_default?: boolean | null
          square_terminal_id?: string | null
          stripe_terminal_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      permission_templates: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transactions: {
        Row: {
          business_id: string
          created_at: string
          customer_email: string | null
          customer_name: string | null
          id: string
          items: Json
          location_id: string | null
          payment_method: string
          payment_status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total_amount: number
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          items?: Json
          location_id?: string | null
          payment_method?: string
          payment_status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          items?: Json
          location_id?: string | null
          payment_method?: string
          payment_status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
        }
        Relationships: []
      }
      product_density_coefficients: {
        Row: {
          coefficient_value: number
          created_at: string
          from_dimension_id: string
          id: string
          product_id: string
          to_dimension_id: string
        }
        Insert: {
          coefficient_value: number
          created_at?: string
          from_dimension_id: string
          id?: string
          product_id: string
          to_dimension_id: string
        }
        Update: {
          coefficient_value?: number
          created_at?: string
          from_dimension_id?: string
          id?: string
          product_id?: string
          to_dimension_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_density_coefficients_from_dimension_id_fkey"
            columns: ["from_dimension_id"]
            isOneToOne: false
            referencedRelation: "uom_dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_density_coefficients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_density_coefficients_to_dimension_id_fkey"
            columns: ["to_dimension_id"]
            isOneToOne: false
            referencedRelation: "uom_dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_line_items: {
        Row: {
          created_at: string
          expiration_date: string | null
          gtin: string | null
          id: string
          inventory_item_id: string | null
          invoice_unit_cost: number | null
          item_name: string
          lot_number: string | null
          ordered_quantity: number
          ppv_amount: number | null
          purchase_order_id: string
          received_quantity: number
          received_uom: string | null
          sku: string | null
          status: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          expiration_date?: string | null
          gtin?: string | null
          id?: string
          inventory_item_id?: string | null
          invoice_unit_cost?: number | null
          item_name?: string
          lot_number?: string | null
          ordered_quantity?: number
          ppv_amount?: number | null
          purchase_order_id: string
          received_quantity?: number
          received_uom?: string | null
          sku?: string | null
          status?: string
          unit_cost?: number
        }
        Update: {
          created_at?: string
          expiration_date?: string | null
          gtin?: string | null
          id?: string
          inventory_item_id?: string | null
          invoice_unit_cost?: number | null
          item_name?: string
          lot_number?: string | null
          ordered_quantity?: number
          ppv_amount?: number | null
          purchase_order_id?: string
          received_quantity?: number
          received_uom?: string | null
          sku?: string | null
          status?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_line_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_line_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          business_id: string
          created_at: string
          expected_delivery_date: string | null
          id: string
          invoice_amount: number | null
          invoice_status: string
          location_id: string | null
          notes: string | null
          po_number: string
          status: string
          supplier_id: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_status?: string
          location_id?: string | null
          notes?: string | null
          po_number?: string
          status?: string
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_status?: string
          location_id?: string | null
          notes?: string | null
          po_number?: string
          status?: string
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_discrepancies: {
        Row: {
          cost_variance: number | null
          created_at: string
          created_by: string | null
          description: string | null
          discrepancy_type: string
          id: string
          purchase_order_id: string | null
          purchase_order_line_item_id: string | null
          quantity_variance: number | null
          resolution_status: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          cost_variance?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discrepancy_type?: string
          id?: string
          purchase_order_id?: string | null
          purchase_order_line_item_id?: string | null
          quantity_variance?: number | null
          resolution_status?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          cost_variance?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discrepancy_type?: string
          id?: string
          purchase_order_id?: string | null
          purchase_order_line_item_id?: string | null
          quantity_variance?: number | null
          resolution_status?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receiving_discrepancies_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_discrepancies_purchase_order_line_item_id_fkey"
            columns: ["purchase_order_line_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_line_items"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_sessions: {
        Row: {
          business_id: string
          completed_at: string | null
          gl_accrual_posted: boolean
          id: string
          location_id: string | null
          purchase_order_id: string
          received_by: string | null
          receiving_mode: string
          started_at: string
          status: string
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          gl_accrual_posted?: boolean
          id?: string
          location_id?: string | null
          purchase_order_id: string
          received_by?: string | null
          receiving_mode?: string
          started_at?: string
          status?: string
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          gl_accrual_posted?: boolean
          id?: string
          location_id?: string | null
          purchase_order_id?: string
          received_by?: string | null
          receiving_mode?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "receiving_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_sessions_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_hierarchy: {
        Row: {
          child_recipe_id: string
          created_at: string
          depth_level: number
          id: string
          parent_recipe_id: string
          quantity: number
        }
        Insert: {
          child_recipe_id: string
          created_at?: string
          depth_level?: number
          id?: string
          parent_recipe_id: string
          quantity?: number
        }
        Update: {
          child_recipe_id?: string
          created_at?: string
          depth_level?: number
          id?: string
          parent_recipe_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_hierarchy_child_recipe_id_fkey"
            columns: ["child_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_hierarchy_parent_recipe_id_fkey"
            columns: ["parent_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_history: {
        Row: {
          action: string
          business_id: string
          created_at: string
          id: string
          note: string | null
          recipe_id: string | null
          recipe_name: string
        }
        Insert: {
          action?: string
          business_id: string
          created_at?: string
          id?: string
          note?: string | null
          recipe_id?: string | null
          recipe_name: string
        }
        Update: {
          action?: string
          business_id?: string
          created_at?: string
          id?: string
          note?: string | null
          recipe_id?: string | null
          recipe_name?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          gross_quantity: number | null
          id: string
          inventory_item_id: string | null
          quantity: number
          recipe_id: string
          unit: string | null
          yield_percentage: number | null
        }
        Insert: {
          gross_quantity?: number | null
          id?: string
          inventory_item_id?: string | null
          quantity?: number
          recipe_id: string
          unit?: string | null
          yield_percentage?: number | null
        }
        Update: {
          gross_quantity?: number | null
          id?: string
          inventory_item_id?: string | null
          quantity?: number
          recipe_id?: string
          unit?: string | null
          yield_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          allergens: string[] | null
          base_price: number | null
          business_id: string
          category: string | null
          cook_time: number | null
          created_at: string
          description: string | null
          difficulty: string | null
          id: string
          image_url: string | null
          instructions: string | null
          name: string
          prep_time: number | null
          servings: number | null
        }
        Insert: {
          allergens?: string[] | null
          base_price?: number | null
          business_id: string
          category?: string | null
          cook_time?: number | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          name: string
          prep_time?: number | null
          servings?: number | null
        }
        Update: {
          allergens?: string[] | null
          base_price?: number | null
          business_id?: string
          category?: string | null
          cook_time?: number | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          name?: string
          prep_time?: number | null
          servings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          business_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          address?: string | null
          business_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          address?: string | null
          business_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          address: string | null
          assigned_locations: string[]
          business_id: string
          city: string | null
          created_at: string
          direct_deposit_enabled: boolean
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          last_login: string | null
          name: string
          notes: string | null
          overtime_rate: number | null
          pay_frequency: string
          permission_template_id: string | null
          permissions: Json
          phone: string | null
          role: string
          salary_type: string
          state: string | null
          status: string
          tax_filing_status: string | null
          updated_at: string
          user_id: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          assigned_locations?: string[]
          business_id: string
          city?: string | null
          created_at?: string
          direct_deposit_enabled?: boolean
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          last_login?: string | null
          name: string
          notes?: string | null
          overtime_rate?: number | null
          pay_frequency?: string
          permission_template_id?: string | null
          permissions?: Json
          phone?: string | null
          role?: string
          salary_type?: string
          state?: string | null
          status?: string
          tax_filing_status?: string | null
          updated_at?: string
          user_id?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          assigned_locations?: string[]
          business_id?: string
          city?: string | null
          created_at?: string
          direct_deposit_enabled?: boolean
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          last_login?: string | null
          name?: string
          notes?: string | null
          overtime_rate?: number | null
          pay_frequency?: string
          permission_template_id?: string | null
          permissions?: Json
          phone?: string | null
          role?: string
          salary_type?: string
          state?: string | null
          status?: string
          tax_filing_status?: string | null
          updated_at?: string
          user_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      team_schedules: {
        Row: {
          break_minutes: number
          business_id: string
          created_at: string
          end_time: string
          id: string
          location: string | null
          notes: string | null
          schedule_date: string
          start_time: string
          status: string
          team_member_id: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number
          business_id: string
          created_at?: string
          end_time: string
          id?: string
          location?: string | null
          notes?: string | null
          schedule_date: string
          start_time: string
          status?: string
          team_member_id: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number
          business_id?: string
          created_at?: string
          end_time?: string
          id?: string
          location?: string | null
          notes?: string | null
          schedule_date?: string
          start_time?: string
          status?: string
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          break_minutes: number
          business_id: string
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          location: string | null
          notes: string | null
          overtime_hours: number | null
          status: string
          team_member_id: string
          total_hours: number | null
        }
        Insert: {
          break_minutes?: number
          business_id: string
          clock_in: string
          clock_out?: string | null
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          overtime_hours?: number | null
          status?: string
          team_member_id: string
          total_hours?: number | null
        }
        Update: {
          break_minutes?: number
          business_id?: string
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          overtime_hours?: number | null
          status?: string
          team_member_id?: string
          total_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      uom_conversions: {
        Row: {
          from_uom_id: string
          id: string
          multiplier: number
          to_uom_id: string
        }
        Insert: {
          from_uom_id: string
          id?: string
          multiplier: number
          to_uom_id: string
        }
        Update: {
          from_uom_id?: string
          id?: string
          multiplier?: number
          to_uom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uom_conversions_from_uom_id_fkey"
            columns: ["from_uom_id"]
            isOneToOne: false
            referencedRelation: "uom_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uom_conversions_to_uom_id_fkey"
            columns: ["to_uom_id"]
            isOneToOne: false
            referencedRelation: "uom_master"
            referencedColumns: ["id"]
          },
        ]
      }
      uom_dimensions: {
        Row: {
          dimension_name: string
          id: string
        }
        Insert: {
          dimension_name: string
          id?: string
        }
        Update: {
          dimension_name?: string
          id?: string
        }
        Relationships: []
      }
      uom_master: {
        Row: {
          dimension_id: string
          id: string
          is_base_unit: boolean
          unit_abbrev: string
          unit_name: string
        }
        Insert: {
          dimension_id: string
          id?: string
          is_base_unit?: boolean
          unit_abbrev: string
          unit_name: string
        }
        Update: {
          dimension_id?: string
          id?: string
          is_base_unit?: boolean
          unit_abbrev?: string
          unit_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "uom_master_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "uom_dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      yield_records: {
        Row: {
          actual_output: number
          business_id: string
          created_at: string
          expected_output: number
          id: string
          notes: string | null
          recipe_id: string
          yield_percentage: number | null
        }
        Insert: {
          actual_output: number
          business_id: string
          created_at?: string
          expected_output: number
          id?: string
          notes?: string | null
          recipe_id: string
          yield_percentage?: number | null
        }
        Update: {
          actual_output?: number
          business_id?: string
          created_at?: string
          expected_output?: number
          id?: string
          notes?: string | null
          recipe_id?: string
          yield_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "yield_records_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
