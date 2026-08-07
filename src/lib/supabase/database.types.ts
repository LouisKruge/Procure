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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_history: {
        Row: {
          changed_by: string | null
          cost_type: Database["public"]["Enums"]["cost_type"]
          created_at: string
          id: string
          item_id: string
          new_cost: number
          old_cost: number | null
          qty_at_change: number | null
          reason: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          changed_by?: string | null
          cost_type?: Database["public"]["Enums"]["cost_type"]
          created_at?: string
          id?: string
          item_id: string
          new_cost: number
          old_cost?: number | null
          qty_at_change?: number | null
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          changed_by?: string | null
          cost_type?: Database["public"]["Enums"]["cost_type"]
          created_at?: string
          id?: string
          item_id?: string
          new_cost?: number
          old_cost?: number | null
          qty_at_change?: number | null
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_lines: {
        Row: {
          created_at: string
          dispatch_id: string
          id: string
          item_id: string
          qty: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          dispatch_id: string
          id?: string
          item_id: string
          qty: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          dispatch_id?: string
          id?: string
          item_id?: string
          qty?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_lines_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatches: {
        Row: {
          authorized_by: string | null
          cost_center: string | null
          created_at: string
          created_by: string | null
          customer: string | null
          dispatch_number: string
          id: string
          issued_at: string | null
          issued_by: string | null
          job_reference: string | null
          notes: string | null
          site_id: string
          status: Database["public"]["Enums"]["dispatch_status"]
          updated_at: string
        }
        Insert: {
          authorized_by?: string | null
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          customer?: string | null
          dispatch_number?: string
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          job_reference?: string | null
          notes?: string | null
          site_id: string
          status?: Database["public"]["Enums"]["dispatch_status"]
          updated_at?: string
        }
        Update: {
          authorized_by?: string | null
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          customer?: string | null
          dispatch_number?: string
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          job_reference?: string | null
          notes?: string | null
          site_id?: string
          status?: Database["public"]["Enums"]["dispatch_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      import_stock_feed: {
        Row: {
          area: string | null
          bin: string | null
          description: string | null
          id: number
          location: string | null
          price: number | null
          qty: number | null
          reorder_point: number | null
          reorder_qty: number | null
          sku: string | null
          supplier: string | null
          type_name: string | null
          uom: string | null
        }
        Insert: {
          area?: string | null
          bin?: string | null
          description?: string | null
          id?: number
          location?: string | null
          price?: number | null
          qty?: number | null
          reorder_point?: number | null
          reorder_qty?: number | null
          sku?: string | null
          supplier?: string | null
          type_name?: string | null
          uom?: string | null
        }
        Update: {
          area?: string | null
          bin?: string | null
          description?: string | null
          id?: number
          location?: string | null
          price?: number | null
          qty?: number | null
          reorder_point?: number | null
          reorder_qty?: number | null
          sku?: string | null
          supplier?: string | null
          type_name?: string | null
          uom?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          home_site_id: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          home_site_id?: string | null
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          home_site_id?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_home_site_id_fkey"
            columns: ["home_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          created_at: string
          id: string
          item_id: string
          line_no: number
          purchase_order_id: string
          qty_ordered: number
          qty_received: number
          supplier_part_no: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          line_no?: number
          purchase_order_id: string
          qty_ordered: number
          qty_received?: number
          supplier_part_no?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          line_no?: number
          purchase_order_id?: string
          qty_ordered?: number
          qty_received?: number
          supplier_part_no?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "v_purchase_order_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_date: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          sent_at: string | null
          site_id: string
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          actual_date?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          sent_at?: string | null
          site_id: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          actual_date?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          sent_at?: string | null
          site_id?: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
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
      sites: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_items: {
        Row: {
          avg_cost: number
          barcode: string | null
          category_id: string | null
          created_at: string
          default_bin: string | null
          default_location: string | null
          default_supplier_id: string | null
          description: string
          id: string
          is_active: boolean
          long_description: string | null
          reorder_point: number
          reorder_qty: number
          sku: string
          standard_cost: number
          uom: string
          updated_at: string
        }
        Insert: {
          avg_cost?: number
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          default_bin?: string | null
          default_location?: string | null
          default_supplier_id?: string | null
          description: string
          id?: string
          is_active?: boolean
          long_description?: string | null
          reorder_point?: number
          reorder_qty?: number
          sku: string
          standard_cost?: number
          uom?: string
          updated_at?: string
        }
        Update: {
          avg_cost?: number
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          default_bin?: string | null
          default_location?: string | null
          default_supplier_id?: string | null
          description?: string
          id?: string
          is_active?: boolean
          long_description?: string | null
          reorder_point?: number
          reorder_qty?: number
          sku?: string
          standard_cost?: number
          uom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_default_supplier_id_fkey"
            columns: ["default_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          bin_location: string | null
          created_at: string
          id: string
          item_id: string
          last_movement_at: string | null
          location: string | null
          qty_in_transit: number
          qty_on_hand: number
          qty_on_order: number
          site_id: string
          updated_at: string
        }
        Insert: {
          bin_location?: string | null
          created_at?: string
          id?: string
          item_id: string
          last_movement_at?: string | null
          location?: string | null
          qty_in_transit?: number
          qty_on_hand?: number
          qty_on_order?: number
          site_id: string
          updated_at?: string
        }
        Update: {
          bin_location?: string | null
          created_at?: string
          id?: string
          item_id?: string
          last_movement_at?: string | null
          location?: string | null
          qty_in_transit?: number
          qty_on_hand?: number
          qty_on_order?: number
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["movement_direction"]
          id: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          qty: number
          qty_after: number | null
          reason: string | null
          reference_id: string | null
          reference_no: string | null
          reference_type: string | null
          site_id: string
          unit_cost: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          direction: Database["public"]["Enums"]["movement_direction"]
          id?: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          qty: number
          qty_after?: number | null
          reason?: string | null
          reference_id?: string | null
          reference_no?: string | null
          reference_type?: string | null
          site_id: string
          unit_cost?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["movement_direction"]
          id?: string
          item_id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          qty?: number
          qty_after?: number | null
          reason?: string | null
          reference_id?: string | null
          reference_no?: string | null
          reference_type?: string | null
          site_id?: string
          unit_cost?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_take_lines: {
        Row: {
          bin_location: string | null
          counted_at: string | null
          counted_by: string | null
          counted_qty: number | null
          expected_qty: number
          id: string
          item_id: string
          note: string | null
          stock_take_id: string
          unit_cost: number
          variance: number | null
        }
        Insert: {
          bin_location?: string | null
          counted_at?: string | null
          counted_by?: string | null
          counted_qty?: number | null
          expected_qty?: number
          id?: string
          item_id: string
          note?: string | null
          stock_take_id: string
          unit_cost?: number
          variance?: number | null
        }
        Update: {
          bin_location?: string | null
          counted_at?: string | null
          counted_by?: string | null
          counted_qty?: number | null
          expected_qty?: number
          id?: string
          item_id?: string
          note?: string | null
          stock_take_id?: string
          unit_cost?: number
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_take_lines_counted_by_fkey"
            columns: ["counted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_take_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_take_lines_stock_take_id_fkey"
            columns: ["stock_take_id"]
            isOneToOne: false
            referencedRelation: "stock_takes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_take_lines_stock_take_id_fkey"
            columns: ["stock_take_id"]
            isOneToOne: false
            referencedRelation: "v_stock_take_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_takes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bin_from: string | null
          bin_to: string | null
          category_id: string | null
          created_at: string
          id: string
          notes: string | null
          reference: string
          scope: Database["public"]["Enums"]["stock_take_scope"]
          site_id: string
          started_at: string
          started_by: string | null
          status: Database["public"]["Enums"]["stock_take_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bin_from?: string | null
          bin_to?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reference?: string
          scope?: Database["public"]["Enums"]["stock_take_scope"]
          site_id: string
          started_at?: string
          started_by?: string | null
          status?: Database["public"]["Enums"]["stock_take_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bin_from?: string | null
          bin_to?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reference?: string
          scope?: Database["public"]["Enums"]["stock_take_scope"]
          site_id?: string
          started_at?: string
          started_by?: string | null
          status?: Database["public"]["Enums"]["stock_take_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_takes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_takes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_takes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_takes_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_items: {
        Row: {
          created_at: string
          id: string
          is_preferred: boolean
          item_id: string
          last_price: number | null
          last_price_at: string | null
          lead_time_days: number | null
          supplier_id: string
          supplier_part_no: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_preferred?: boolean
          item_id: string
          last_price?: number | null
          last_price_at?: string | null
          lead_time_days?: number | null
          supplier_id: string
          supplier_part_no?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_preferred?: boolean
          item_id?: string
          last_price?: number | null
          last_price_at?: string | null
          lead_time_days?: number | null
          supplier_id?: string
          supplier_part_no?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          code: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          lead_time_days: number
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transfer_lines: {
        Row: {
          created_at: string
          id: string
          item_id: string
          qty_received: number
          qty_sent: number
          transfer_id: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          qty_received?: number
          qty_sent: number
          transfer_id: string
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          qty_received?: number
          qty_sent?: number
          transfer_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "transfer_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_lines_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          created_at: string
          created_by: string | null
          from_site_id: string
          id: string
          notes: string | null
          received_at: string | null
          received_by: string | null
          sent_at: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          to_site_id: string
          transfer_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_site_id: string
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_site_id: string
          transfer_number?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_site_id?: string
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_site_id?: string
          transfer_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_site_id_fkey"
            columns: ["from_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_site_id_fkey"
            columns: ["to_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sites: {
        Row: {
          site_id: string
          user_id: string
        }
        Insert: {
          site_id: string
          user_id: string
        }
        Update: {
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_movement_log: {
        Row: {
          created_at: string | null
          description: string | null
          direction: Database["public"]["Enums"]["movement_direction"] | null
          id: string | null
          item_id: string | null
          movement_type: Database["public"]["Enums"]["movement_type"] | null
          movement_value: number | null
          qty: number | null
          qty_after: number | null
          reason: string | null
          reference_id: string | null
          reference_no: string | null
          reference_type: string | null
          site_code: string | null
          site_id: string | null
          site_name: string | null
          sku: string | null
          unit_cost: number | null
          uom: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_purchase_order_summary: {
        Row: {
          actual_date: string | null
          created_at: string | null
          expected_date: string | null
          id: string | null
          is_overdue: boolean | null
          lead_time_days: number | null
          line_count: number | null
          notes: string | null
          order_date: string | null
          outstanding_qty: number | null
          po_number: string | null
          site_code: string | null
          site_id: string | null
          site_name: string | null
          status: Database["public"]["Enums"]["po_status"] | null
          supplier_id: string | null
          supplier_name: string | null
          total_ordered: number | null
          total_received: number | null
          total_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
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
      v_reorder_suggestions: {
        Row: {
          bin_location: string | null
          category_name: string | null
          description: string | null
          item_id: string | null
          lead_time_days: number | null
          location: string | null
          qty_on_hand: number | null
          qty_on_order: number | null
          reorder_point: number | null
          reorder_qty: number | null
          site_code: string | null
          site_id: string | null
          site_name: string | null
          sku: string | null
          stock_status: string | null
          suggested_qty: number | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_part_no: string | null
          unit_price: number | null
          uom: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stock_status: {
        Row: {
          avg_cost: number | null
          barcode: string | null
          bin_location: string | null
          category_id: string | null
          category_name: string | null
          default_supplier_id: string | null
          default_supplier_name: string | null
          description: string | null
          group_name: string | null
          item_id: string | null
          last_movement_at: string | null
          level_id: string | null
          location: string | null
          qty_in_transit: number | null
          qty_on_hand: number | null
          qty_on_order: number | null
          reorder_point: number | null
          reorder_qty: number | null
          site_code: string | null
          site_id: string | null
          site_name: string | null
          sku: string | null
          standard_cost: number | null
          stock_status: string | null
          stock_value: number | null
          uom: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_default_supplier_id_fkey"
            columns: ["default_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stock_take_summary: {
        Row: {
          approved_at: string | null
          approved_by_name: string | null
          bin_from: string | null
          bin_to: string | null
          category_name: string | null
          counted_count: number | null
          id: string | null
          line_count: number | null
          notes: string | null
          reference: string | null
          scope: Database["public"]["Enums"]["stock_take_scope"] | null
          site_code: string | null
          site_id: string | null
          site_name: string | null
          started_at: string | null
          started_by_name: string | null
          status: Database["public"]["Enums"]["stock_take_status"] | null
          submitted_at: string | null
          variance_lines: number | null
          variance_qty: number | null
          variance_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_takes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stock_valuation: {
        Row: {
          lines_total: number | null
          lines_with_stock: number | null
          site_code: string | null
          site_id: string | null
          site_name: string | null
          total_qty: number | null
          total_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accessible_site_ids: { Args: never; Returns: string[] }
      adjust_stock: {
        Args: {
          p_item_id: string
          p_new_qty: number
          p_reason: string
          p_site_id: string
        }
        Returns: {
          created_at: string
          direction: Database["public"]["Enums"]["movement_direction"]
          id: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          qty: number
          qty_after: number | null
          reason: string | null
          reference_id: string | null
          reference_no: string | null
          reference_type: string | null
          site_id: string
          unit_cost: number
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_stock_take: {
        Args: { p_stock_take_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          bin_from: string | null
          bin_to: string | null
          category_id: string | null
          created_at: string
          id: string
          notes: string | null
          reference: string
          scope: Database["public"]["Enums"]["stock_take_scope"]
          site_id: string
          started_at: string
          started_by: string | null
          status: Database["public"]["Enums"]["stock_take_status"]
          submitted_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stock_takes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      counter_post: {
        Args: {
          p_direction: Database["public"]["Enums"]["movement_direction"]
          p_item_id: string
          p_qty: number
          p_reason?: string | null
          p_reference?: string | null
          p_site_id: string
        }
        Returns: {
          created_at: string
          direction: Database["public"]["Enums"]["movement_direction"]
          id: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          qty: number
          qty_after: number | null
          reason: string | null
          reference_id: string | null
          reference_no: string | null
          reference_type: string | null
          site_id: string
          unit_cost: number
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      counter_search: {
        Args: { p_limit?: number; p_query: string; p_site_id: string }
        Returns: {
          avg_cost: number
          barcode: string | null
          bin_location: string | null
          category_name: string | null
          description: string
          item_id: string
          location: string | null
          qty_on_hand: number
          reorder_point: number
          score: number
          sku: string
          stock_status: string
          uom: string
        }[]
      }
      create_purchase_orders_from_suggestions: {
        Args: { p_items: Json; p_notes?: string; p_site_id: string }
        Returns: {
          actual_date: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          sent_at: string | null
          site_id: string
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "purchase_orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      dead_stock: {
        Args: { p_days?: number; p_site_id?: string }
        Returns: {
          avg_cost: number
          bin_location: string
          category_name: string
          days_since_movement: number
          description: string
          item_id: string
          last_movement_at: string
          qty_on_hand: number
          site_code: string
          site_id: string
          sku: string
          stock_value: number
        }[]
      }
      has_site_access: { Args: { p_site_id: string }; Returns: boolean }
      import_stock_rows: {
        Args: { p_adjust_quantities?: boolean; p_rows: Json; p_site_id: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      issue_dispatch: {
        Args: { p_dispatch_id: string }
        Returns: {
          authorized_by: string | null
          cost_center: string | null
          created_at: string
          created_by: string | null
          customer: string | null
          dispatch_number: string
          id: string
          issued_at: string | null
          issued_by: string | null
          job_reference: string | null
          notes: string | null
          site_id: string
          status: Database["public"]["Enums"]["dispatch_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "dispatches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      item_usage_stats: {
        Args: { p_days?: number; p_limit?: number; p_site_id?: string }
        Returns: {
          avg_cost: number
          avg_per_month: number
          avg_per_week: number
          bin_location: string
          category_name: string
          days_cover: number
          description: string
          group_name: string
          issue_events: number
          issued_value: number
          item_id: string
          last_issued_at: string
          location: string
          qty_issued: number
          qty_on_hand: number
          qty_received: number
          reorder_point: number
          sku: string
          stock_value: number
          turnover_rate: number
          uom: string
        }[]
      }
      ordered_vs_used: {
        Args: { p_days?: number; p_limit?: number; p_site_id?: string }
        Returns: {
          balance: number
          description: string
          item_id: string
          order_count: number
          qty_issued: number
          qty_on_hand: number
          qty_ordered: number
          qty_received: number
          sku: string
          uom: string
        }[]
      }
      post_movement: {
        Args: {
          p_allow_negative?: boolean
          p_direction: Database["public"]["Enums"]["movement_direction"]
          p_item_id: string
          p_movement_type: Database["public"]["Enums"]["movement_type"]
          p_qty: number
          p_reason?: string
          p_reference_id?: string
          p_reference_no?: string
          p_reference_type?: string
          p_site_id: string
          p_unit_cost?: number
        }
        Returns: {
          created_at: string
          direction: Database["public"]["Enums"]["movement_direction"]
          id: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          qty: number
          qty_after: number | null
          reason: string | null
          reference_id: string | null
          reference_no: string | null
          reference_type: string | null
          site_id: string
          unit_cost: number
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      receive_adhoc: {
        Args: {
          p_item_id: string
          p_qty: number
          p_reason: string
          p_site_id: string
          p_unit_cost: number
        }
        Returns: {
          created_at: string
          direction: Database["public"]["Enums"]["movement_direction"]
          id: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          qty: number
          qty_after: number | null
          reason: string | null
          reference_id: string | null
          reference_no: string | null
          reference_type: string | null
          site_id: string
          unit_cost: number
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      receive_purchase_order: {
        Args: { p_lines: Json; p_notes?: string; p_po_id: string }
        Returns: {
          actual_date: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          sent_at: string | null
          site_id: string
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "purchase_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      receive_transfer: {
        Args: { p_lines?: Json; p_transfer_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          from_site_id: string
          id: string
          notes: string | null
          received_at: string | null
          received_by: string | null
          sent_at: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          to_site_id: string
          transfer_number: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "transfers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_stock_items: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avg_cost: number
          barcode: string
          category_name: string
          description: string
          id: string
          reorder_point: number
          score: number
          sku: string
          total_on_hand: number
          uom: string
        }[]
      }
      send_purchase_order: {
        Args: { p_po_id: string }
        Returns: {
          actual_date: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          sent_at: string | null
          site_id: string
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "purchase_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      send_transfer: {
        Args: { p_transfer_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          from_site_id: string
          id: string
          notes: string | null
          received_at: string | null
          received_by: string | null
          sent_at: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          to_site_id: string
          transfer_number: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "transfers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_standard_cost: {
        Args: { p_cost: number; p_item_id: string; p_reason?: string }
        Returns: {
          avg_cost: number
          barcode: string | null
          category_id: string | null
          created_at: string
          default_bin: string | null
          default_location: string | null
          default_supplier_id: string | null
          description: string
          id: string
          is_active: boolean
          long_description: string | null
          reorder_point: number
          reorder_qty: number
          sku: string
          standard_cost: number
          uom: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stock_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_stock_take: {
        Args: {
          p_bin_from?: string
          p_bin_to?: string
          p_category_id?: string
          p_notes?: string
          p_scope?: Database["public"]["Enums"]["stock_take_scope"]
          p_site_id: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          bin_from: string | null
          bin_to: string | null
          category_id: string | null
          created_at: string
          id: string
          notes: string | null
          reference: string
          scope: Database["public"]["Enums"]["stock_take_scope"]
          site_id: string
          started_at: string
          started_by: string | null
          status: Database["public"]["Enums"]["stock_take_status"]
          submitted_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stock_takes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_stock_take: {
        Args: { p_stock_take_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          bin_from: string | null
          bin_to: string | null
          category_id: string | null
          created_at: string
          id: string
          notes: string | null
          reference: string
          scope: Database["public"]["Enums"]["stock_take_scope"]
          site_id: string
          started_at: string
          started_by: string | null
          status: Database["public"]["Enums"]["stock_take_status"]
          submitted_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stock_takes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      usage_by_category: {
        Args: { p_days?: number; p_site_id?: string }
        Returns: {
          category_id: string
          category_name: string
          group_name: string
          issued_value: number
          lines: number
          lines_dead: number
          lines_moving: number
          qty_issued: number
          qty_on_hand: number
          stock_value: number
        }[]
      }
      usage_by_period: {
        Args: { p_bucket?: string; p_periods?: number; p_site_id?: string }
        Returns: {
          issue_events: number
          issued_value: number
          items_touched: number
          period_label: string
          period_start: string
          qty_issued: number
          qty_received: number
          receipt_events: number
          received_value: number
        }[]
      }
    }
    Enums: {
      cost_type: "standard" | "average"
      dispatch_status: "draft" | "issued" | "cancelled"
      movement_direction: "in" | "out"
      movement_type:
        | "receipt"
        | "dispatch"
        | "transfer_out"
        | "transfer_in"
        | "adjustment"
        | "stock_take"
      po_status:
        | "draft"
        | "sent"
        | "partially_received"
        | "received"
        | "closed"
        | "cancelled"
      stock_take_scope: "full" | "category" | "bin_range"
      stock_take_status:
        | "draft"
        | "counting"
        | "pending_approval"
        | "approved"
        | "cancelled"
      transfer_status: "draft" | "in_transit" | "received" | "cancelled"
      user_role: "admin" | "site_supervisor" | "staff"
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
      cost_type: ["standard", "average"],
      dispatch_status: ["draft", "issued", "cancelled"],
      movement_direction: ["in", "out"],
      movement_type: [
        "receipt",
        "dispatch",
        "transfer_out",
        "transfer_in",
        "adjustment",
        "stock_take",
      ],
      po_status: [
        "draft",
        "sent",
        "partially_received",
        "received",
        "closed",
        "cancelled",
      ],
      stock_take_scope: ["full", "category", "bin_range"],
      stock_take_status: [
        "draft",
        "counting",
        "pending_approval",
        "approved",
        "cancelled",
      ],
      transfer_status: ["draft", "in_transit", "received", "cancelled"],
      user_role: ["admin", "site_supervisor", "staff"],
    },
  },
} as const
