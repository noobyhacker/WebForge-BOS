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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          industry: string | null
          name: string
          owner_id: string
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          industry?: string | null
          name: string
          owner_id: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          industry?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      action_logs: {
        Row: {
          action_type: string
          created_at: string | null
          details: string | null
          entity_data: string | null
          entity_id: string | null
          entity_name: string
          entity_type: string
          id: string
          user_email: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: string | null
          entity_data?: string | null
          entity_id?: string | null
          entity_name: string
          entity_type: string
          id?: string
          user_email: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: string | null
          entity_data?: string | null
          entity_id?: string | null
          entity_name?: string
          entity_type?: string
          id?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          owner_id: string
          status: Database["public"]["Enums"]["activity_status"]
          subject: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          owner_id: string
          status?: Database["public"]["Enums"]["activity_status"]
          subject: string
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["activity_status"]
          subject?: string
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Relationships: []
      }
      ai_suggestions: {
        Row: {
          accepted_by: string | null
          content: Json
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          resolved_at: string | null
          status: string
          suggestion_type: string
        }
        Insert: {
          accepted_by?: string | null
          content?: Json
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          resolved_at?: string | null
          status?: string
          suggestion_type: string
        }
        Update: {
          accepted_by?: string | null
          content?: Json
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          resolved_at?: string | null
          status?: string
          suggestion_type?: string
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          action_config: Json | null
          action_type: string
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          name: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action_config?: Json | null
          action_type?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          name: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_shares: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          id: string
          permission: string | null
          shared_with_user_id: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          permission?: string | null
          shared_with_user_id: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          permission?: string | null
          shared_with_user_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_shares_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          last_contact: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          account_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          owner_id: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["contact_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name?: string
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          entity_id: string
          field_id: string
          id: string
          value: string | null
        }
        Insert: {
          entity_id: string
          field_id: string
          id?: string
          value?: string | null
        }
        Update: {
          entity_id?: string
          field_id?: string
          id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string
          entity_type: string
          field_type: string
          id: string
          is_required: boolean | null
          label: string
          name: string
          options: Json | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          label: string
          name: string
          options?: Json | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          label?: string
          name?: string
          options?: Json | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      deal_stage_history: {
        Row: {
          changed_by: string | null
          created_at: string
          deal_id: string
          from_stage: string
          id: string
          note: string | null
          to_stage: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          deal_id: string
          from_stage: string
          id?: string
          note?: string | null
          to_stage: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          deal_id?: string
          from_stage?: string
          id?: string
          note?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          account_id: string | null
          contact_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          name: string
          owner_id: string
          probability: number | null
          stage: Database["public"]["Enums"]["deal_stage"]
          updated_at: string
          value: number | null
        }
        Insert: {
          account_id?: string | null
          contact_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          name: string
          owner_id: string
          probability?: number | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          updated_at?: string
          value?: number | null
        }
        Update: {
          account_id?: string | null
          contact_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          name?: string
          owner_id?: string
          probability?: number | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          name: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          name: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          name?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      domain_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          metadata: Json | null
          payload: Json | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json | null
          payload?: Json | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          payload?: Json | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      entity_comments: {
        Row: {
          content: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      entity_shares: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          permission?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          key: string
          label: string
          scope: string
          scope_config: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          key: string
          label: string
          scope?: string
          scope_config?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          key?: string
          label?: string
          scope?: string
          scope_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      field_permissions: {
        Row: {
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string
          entity_type: string
          field_name: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          entity_type: string
          field_name: string
          id?: string
          role?: string
          updated_at?: string
        }
        Update: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          entity_type?: string
          field_name?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      follow_up_sequence_enrollments: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          current_step_index: number
          enrolled_at: string
          enrolled_by: string | null
          entity_id: string
          entity_type: string
          id: string
          last_step_executed_at: string | null
          sequence_id: string
          status: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          current_step_index?: number
          enrolled_at?: string
          enrolled_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          last_step_executed_at?: string | null
          sequence_id: string
          status?: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          current_step_index?: number
          enrolled_at?: string
          enrolled_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          last_step_executed_at?: string | null
          sequence_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "follow_up_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_sequence_steps: {
        Row: {
          content: string | null
          created_at: string
          delay_days: number
          delay_minutes: number
          id: string
          sequence_id: string
          step_order: number
          subject: string | null
          type: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          delay_days?: number
          delay_minutes?: number
          id?: string
          sequence_id: string
          step_order?: number
          subject?: string | null
          type?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          delay_days?: number
          delay_minutes?: number
          id?: string
          sequence_id?: string
          step_order?: number
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "follow_up_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_sequences: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          client_id: string
          created_at: string | null
          date: string
          id: string
          notes: string | null
          status: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          status?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          status?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string
          field_key: string
          field_type: string
          form_id: string
          id: string
          is_required: boolean
          label: string
          sort_order: number
          target_entity: string
          target_field: string
        }
        Insert: {
          created_at?: string
          field_key: string
          field_type?: string
          form_id: string
          id?: string
          is_required?: boolean
          label: string
          sort_order?: number
          target_entity?: string
          target_field?: string
        }
        Update: {
          created_at?: string
          field_key?: string
          field_type?: string
          form_id?: string
          id?: string
          is_required?: boolean
          label?: string
          sort_order?: number
          target_entity?: string
          target_field?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          form_id: string
          id: string
          ip_hash: string | null
          lead_id: string | null
          page_url: string | null
          source: string | null
          submitted_at: string
        }
        Insert: {
          form_id: string
          id?: string
          ip_hash?: string | null
          lead_id?: string | null
          page_url?: string | null
          source?: string | null
          submitted_at?: string
        }
        Update: {
          form_id?: string
          id?: string
          ip_hash?: string | null
          lead_id?: string | null
          page_url?: string | null
          source?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          description: string | null
          discount: number | null
          id: string
          invoice_id: string
          product_id: string | null
          product_name: string
          quantity: number
          tax: number | null
          total: number
          unit_price: number
        }
        Insert: {
          description?: string | null
          discount?: number | null
          id?: string
          invoice_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          tax?: number | null
          total?: number
          unit_price?: number
        }
        Update: {
          description?: string | null
          discount?: number | null
          id?: string
          invoice_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          tax?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          account_name: string | null
          contact_name: string | null
          created_at: string
          deal_id: string | null
          deal_name: string | null
          deleted_at: string | null
          deleted_by: string | null
          due_date: string | null
          grand_total: number | null
          id: string
          invoice_number: string
          issue_date: string | null
          notes: string | null
          owner_id: string
          paid_amount: number | null
          quote_id: string | null
          status: string
          subtotal: number | null
          total_tax: number | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          contact_name?: string | null
          created_at?: string
          deal_id?: string | null
          deal_name?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_date?: string | null
          grand_total?: number | null
          id?: string
          invoice_number?: string
          issue_date?: string | null
          notes?: string | null
          owner_id: string
          paid_amount?: number | null
          quote_id?: string | null
          status?: string
          subtotal?: number | null
          total_tax?: number | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          contact_name?: string | null
          created_at?: string
          deal_id?: string | null
          deal_name?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_date?: string | null
          grand_total?: number | null
          id?: string
          invoice_number?: string
          issue_date?: string | null
          notes?: string | null
          owner_id?: string
          paid_amount?: number | null
          quote_id?: string | null
          status?: string
          subtotal?: number | null
          total_tax?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      job_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          job_type: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          payload: Json
          priority: number
          scheduled_for: string
          status: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          job_type: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          scheduled_for?: string
          status?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          job_type?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          scheduled_for?: string
          status?: string
        }
        Relationships: []
      }
      lead_scoring_rules: {
        Row: {
          created_at: string
          entity_type: string
          field: string
          id: string
          is_active: boolean | null
          name: string
          operator: string
          points: number
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          entity_type?: string
          field: string
          id?: string
          is_active?: boolean | null
          name: string
          operator?: string
          points?: number
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          entity_type?: string
          field?: string
          id?: string
          is_active?: boolean | null
          name?: string
          operator?: string
          points?: number
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean
          is_lost: boolean
          is_won: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          is_lost?: boolean
          is_won?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          is_lost?: boolean
          is_won?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          sku: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          sku?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          sku?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_approved: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_approved?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_approved?: boolean | null
        }
        Relationships: []
      }
      quote_line_items: {
        Row: {
          description: string | null
          discount: number | null
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          quote_id: string
          tax: number | null
          total: number
          unit_price: number
        }
        Insert: {
          description?: string | null
          discount?: number | null
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          quote_id: string
          tax?: number | null
          total?: number
          unit_price?: number
        }
        Update: {
          description?: string | null
          discount?: number | null
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          quote_id?: string
          tax?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          account_name: string | null
          contact_name: string | null
          created_at: string
          deal_id: string | null
          deal_name: string | null
          deleted_at: string | null
          deleted_by: string | null
          grand_total: number | null
          id: string
          notes: string | null
          owner_id: string
          quote_number: string
          status: string
          subtotal: number | null
          total_discount: number | null
          total_tax: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          account_name?: string | null
          contact_name?: string | null
          created_at?: string
          deal_id?: string | null
          deal_name?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          grand_total?: number | null
          id?: string
          notes?: string | null
          owner_id: string
          quote_number?: string
          status?: string
          subtotal?: number | null
          total_discount?: number | null
          total_tax?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          account_name?: string | null
          contact_name?: string | null
          created_at?: string
          deal_id?: string | null
          deal_name?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          grand_total?: number | null
          id?: string
          notes?: string | null
          owner_id?: string
          quote_number?: string
          status?: string
          subtotal?: number | null
          total_discount?: number | null
          total_tax?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sharing_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          member_ids: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          member_ids?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          member_ids?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sla_breaches: {
        Row: {
          actual_minutes: number | null
          breached_at: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          owner_id: string
          resolved_at: string | null
          sla_config_id: string
          threshold_minutes: number
        }
        Insert: {
          actual_minutes?: number | null
          breached_at?: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          owner_id: string
          resolved_at?: string | null
          sla_config_id: string
          threshold_minutes: number
        }
        Update: {
          actual_minutes?: number | null
          breached_at?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          owner_id?: string
          resolved_at?: string | null
          sla_config_id?: string
          threshold_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "sla_breaches_sla_config_id_fkey"
            columns: ["sla_config_id"]
            isOneToOne: false
            referencedRelation: "sla_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_configs: {
        Row: {
          created_at: string
          entity_type: string
          id: string
          is_active: boolean
          metric: string
          threshold_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type?: string
          id?: string
          is_active?: boolean
          metric?: string
          threshold_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          id?: string
          is_active?: boolean
          metric?: string
          threshold_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      system_health_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          message: string | null
          metrics: Json | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          metrics?: Json | null
          source: string
          status?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          metrics?: Json | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string
          completed_at: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          related_entity_id: string | null
          related_entity_type: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_api_keys: {
        Row: {
          api_key: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
        }
        Insert: {
          api_key: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
        }
        Update: {
          api_key?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      has_client_access:
        | { Args: { _client_id: string }; Returns: boolean }
        | { Args: { _client_id: string; _user_id: string }; Returns: boolean }
      has_client_edit_access: { Args: { client_id: string }; Returns: boolean }
      has_entity_access: {
        Args: { _entity_id: string; _entity_type: string }
        Returns: boolean
      }
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      is_client_owner: { Args: { client_id: string }; Returns: boolean }
      is_owner: { Args: { _owner_id: string }; Returns: boolean }
    }
    Enums: {
      action_type: "create" | "update" | "delete"
      activity_status: "pending" | "completed" | "cancelled"
      activity_type: "call" | "email" | "meeting" | "task"
      app_role:
        | "admin"
        | "user"
        | "sales"
        | "sales_manager"
        | "finance"
        | "viewer"
      contact_status: "active" | "inactive" | "prospect"
      deal_stage:
        | "prospecting"
        | "qualification"
        | "proposal"
        | "negotiation"
        | "closed_won"
        | "closed_lost"
      entity_type: "client" | "follow_up"
      permission_level: "view" | "edit"
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
      action_type: ["create", "update", "delete"],
      activity_status: ["pending", "completed", "cancelled"],
      activity_type: ["call", "email", "meeting", "task"],
      app_role: [
        "admin",
        "user",
        "sales",
        "sales_manager",
        "finance",
        "viewer",
      ],
      contact_status: ["active", "inactive", "prospect"],
      deal_stage: [
        "prospecting",
        "qualification",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
      ],
      entity_type: ["client", "follow_up"],
      permission_level: ["view", "edit"],
    },
  },
} as const
