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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _edge_one_shots: {
        Row: {
          fired_at: string | null
          job_name: string
          payload: Json
          run_at: string
        }
        Insert: {
          fired_at?: string | null
          job_name: string
          payload?: Json
          run_at: string
        }
        Update: {
          fired_at?: string | null
          job_name?: string
          payload?: Json
          run_at?: string
        }
        Relationships: []
      }
      access_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          teacher_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          teacher_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_codes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          category: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          category?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_banks: {
        Row: {
          bank_name: string
          country_code: string
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          bank_name: string
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          bank_name?: string
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      bank_creds: {
        Row: {
          account_holder_name: string
          account_number_or_iban: string
          approved_bank_id: string
          bank_id: string
          created_at: string
          is_preferred: boolean
          teacher_id: string
          updated_at: string
        }
        Insert: {
          account_holder_name: string
          account_number_or_iban: string
          approved_bank_id: string
          bank_id?: string
          created_at?: string
          is_preferred?: boolean
          teacher_id: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string
          account_number_or_iban?: string
          approved_bank_id?: string
          bank_id?: string
          created_at?: string
          is_preferred?: boolean
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_creds_approved_bank_id_fkey"
            columns: ["approved_bank_id"]
            isOneToOne: false
            referencedRelation: "approved_banks"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_clients: {
        Row: {
          blocked_by: string | null
          blocked_until: string | null
          created_at: string
          fingerprint_hash: string | null
          id: string
          ip_hash: string | null
          reason: string
        }
        Insert: {
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_hash?: string | null
          reason?: string
        }
        Update: {
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_hash?: string | null
          reason?: string
        }
        Relationships: []
      }
      build_reports: {
        Row: {
          changelog: string
          created_at: string
          created_by: string | null
          html: string | null
          id: string
          sent_at: string | null
          subject: string | null
          version: string
        }
        Insert: {
          changelog: string
          created_at?: string
          created_by?: string | null
          html?: string | null
          id?: string
          sent_at?: string | null
          subject?: string | null
          version: string
        }
        Update: {
          changelog?: string
          created_at?: string
          created_by?: string | null
          html?: string | null
          id?: string
          sent_at?: string | null
          subject?: string | null
          version?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      deleted_avatars: {
        Row: {
          avatar_url: string
          created_at: string
          crop_data: Json | null
          id: string
          is_active: boolean
          storage_path: string
          user_id: string
        }
        Insert: {
          avatar_url: string
          created_at?: string
          crop_data?: Json | null
          id?: string
          is_active?: boolean
          storage_path: string
          user_id: string
        }
        Update: {
          avatar_url?: string
          created_at?: string
          crop_data?: Json | null
          id?: string
          is_active?: boolean
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          message: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          base_currency: string
          fetched_at: string
          id: string
          rates: Json
          updated_at: string
        }
        Insert: {
          base_currency: string
          fetched_at?: string
          id?: string
          rates?: Json
          updated_at?: string
        }
        Update: {
          base_currency?: string
          fetched_at?: string
          id?: string
          rates?: Json
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      note_access_codes: {
        Row: {
          access_code_id: string
          id: string
          note_id: string
        }
        Insert: {
          access_code_id: string
          id?: string
          note_id: string
        }
        Update: {
          access_code_id?: string
          id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_access_codes_access_code_id_fkey"
            columns: ["access_code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_access_codes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_access_codes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes_public"
            referencedColumns: ["id"]
          },
        ]
      }
      note_reports: {
        Row: {
          admin_notes: string | null
          appeal_date: string | null
          appeal_text: string | null
          created_at: string
          description: string | null
          id: string
          note_id: string
          reason: string
          reporter_email: string | null
          reviewed_at: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          appeal_date?: string | null
          appeal_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          note_id: string
          reason: string
          reporter_email?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          appeal_date?: string | null
          appeal_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          note_id?: string
          reason?: string
          reporter_email?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_reports_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_reports_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes_public"
            referencedColumns: ["id"]
          },
        ]
      }
      note_requests: {
        Row: {
          contact_type: string
          created_at: string
          download_code: string | null
          download_code_used_at: string | null
          download_code_used_ip: string | null
          id: string
          receipt_image_url: string
          refund_screenshot_url: string | null
          rejection_reason: string | null
          request_id: string
          request_token: string
          status: string
          student_contact: string
          teacher_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          contact_type: string
          created_at?: string
          download_code?: string | null
          download_code_used_at?: string | null
          download_code_used_ip?: string | null
          id?: string
          receipt_image_url: string
          refund_screenshot_url?: string | null
          rejection_reason?: string | null
          request_id: string
          request_token?: string
          status?: string
          student_contact: string
          teacher_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          contact_type?: string
          created_at?: string
          download_code?: string | null
          download_code_used_at?: string | null
          download_code_used_ip?: string | null
          id?: string
          receipt_image_url?: string
          refund_screenshot_url?: string | null
          rejection_reason?: string | null
          request_id?: string
          request_token?: string
          status?: string
          student_contact?: string
          teacher_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          file_url: string
          id: string
          is_free: boolean
          preview_image_url: string | null
          price: number | null
          school_name: string | null
          subcategory_id: string
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          file_url: string
          id?: string
          is_free?: boolean
          preview_image_url?: string | null
          price?: number | null
          school_name?: string | null
          subcategory_id: string
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          file_url?: string
          id?: string
          is_free?: boolean
          preview_image_url?: string | null
          price?: number | null
          school_name?: string | null
          subcategory_id?: string
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          message: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_blocked: boolean
          phone: string | null
          school_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_blocked?: boolean
          phone?: string | null
          school_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_blocked?: boolean
          phone?: string | null
          school_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      request_audit: {
        Row: {
          action: string
          created_at: string
          fingerprint_hash: string | null
          id: string
          ip_hash: string | null
        }
        Insert: {
          action: string
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_hash?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_hash?: string | null
        }
        Relationships: []
      }
      request_notes: {
        Row: {
          id: string
          note_id: string
          request_id: string
        }
        Insert: {
          id?: string
          note_id: string
          request_id: string
        }
        Update: {
          id?: string
          note_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_notes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_notes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_notes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "note_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_features: {
        Row: {
          category: string
          created_at: string
          description: Json
          icon_name: string
          id: string
          sort_order: number
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: Json
          icon_name?: string
          id?: string
          sort_order?: number
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: Json
          icon_name?: string
          id?: string
          sort_order?: number
          status?: string
          target_date?: string | null
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
      user_settings: {
        Row: {
          appearence: string
          autoselect_currency: boolean
          colorblind_mode: boolean
          colorblind_type: string
          created_at: string
          currency: string
          dyslexia_friendly: boolean
          font_size: string
          high_contrast: boolean
          show_dropdown: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          appearence?: string
          autoselect_currency?: boolean
          colorblind_mode?: boolean
          colorblind_type?: string
          created_at?: string
          currency?: string
          dyslexia_friendly?: boolean
          font_size?: string
          high_contrast?: boolean
          show_dropdown?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          appearence?: string
          autoselect_currency?: boolean
          colorblind_mode?: boolean
          colorblind_type?: string
          created_at?: string
          currency?: string
          dyslexia_friendly?: boolean
          font_size?: string
          high_contrast?: boolean
          show_dropdown?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      note_reports_admin: {
        Row: {
          admin_notes: string | null
          appeal_date: string | null
          appeal_text: string | null
          created_at: string | null
          description: string | null
          id: string | null
          note_id: string | null
          reason: string | null
          reporter_email: string | null
          reviewed_at: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          appeal_date?: string | null
          appeal_text?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          note_id?: string | null
          reason?: string | null
          reporter_email?: string | null
          reviewed_at?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          appeal_date?: string | null
          appeal_text?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          note_id?: string | null
          reason?: string | null
          reporter_email?: string | null
          reviewed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_reports_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_reports_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes_public"
            referencedColumns: ["id"]
          },
        ]
      }
      note_reports_for_teacher: {
        Row: {
          admin_notes: string | null
          appeal_date: string | null
          appeal_text: string | null
          created_at: string | null
          description: string | null
          id: string | null
          note_id: string | null
          reason: string | null
          reviewed_at: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          appeal_date?: string | null
          appeal_text?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          note_id?: string | null
          reason?: string | null
          reviewed_at?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          appeal_date?: string | null
          appeal_text?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          note_id?: string | null
          reason?: string | null
          reviewed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_reports_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_reports_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notes_public: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          file_url: string | null
          id: string | null
          is_free: boolean | null
          preview_image_url: string | null
          price: number | null
          school_name: string | null
          subcategory_id: string | null
          teacher_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          file_url?: never
          id?: string | null
          is_free?: boolean | null
          preview_image_url?: string | null
          price?: number | null
          school_name?: string | null
          subcategory_id?: string | null
          teacher_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          file_url?: never
          id?: string | null
          is_free?: boolean | null
          preview_image_url?: string | null
          price?: number | null
          school_name?: string | null
          subcategory_id?: string | null
          teacher_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _fire_edge_one_shot: { Args: { p_job_name: string }; Returns: undefined }
      cancel_student_request: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      cancel_student_request_by_token: {
        Args: { p_request_token: string }
        Returns: boolean
      }
      create_app_bucket: {
        Args: { bucket_name: string; is_public?: boolean }
        Returns: undefined
      }
      create_note_request: {
        Args: {
          p_contact_type: string
          p_receipt_image_url: string
          p_student_contact: string
          p_teacher_id: string
          p_total_amount: number
        }
        Returns: {
          contact_type: string
          created_at: string
          download_code: string | null
          download_code_used_at: string | null
          download_code_used_ip: string | null
          id: string
          receipt_image_url: string
          refund_screenshot_url: string | null
          rejection_reason: string | null
          request_id: string
          request_token: string
          status: string
          student_contact: string
          teacher_id: string
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "note_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_free_note_file_url: { Args: { p_note_id: string }; Returns: string }
      get_my_note_file_url: { Args: { p_note_id: string }; Returns: string }
      get_public_profile: {
        Args: { _id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          school_name: string
        }[]
      }
      get_student_request_notes: {
        Args: { p_request_db_ids: string[] }
        Returns: {
          id: string
          note_id: string
          note_price: number
          note_title: string
          request_id: string
        }[]
      }
      get_student_requests: {
        Args: { p_request_ids: string[] }
        Returns: {
          contact_type: string
          created_at: string
          download_code: string
          download_code_used_at: string
          id: string
          receipt_image_url: string
          refund_screenshot_url: string
          rejection_reason: string
          request_id: string
          status: string
          student_contact: string
          teacher_email: string
          teacher_full_name: string
          teacher_id: string
          teacher_phone: string
          total_amount: number
          updated_at: string
        }[]
      }
      get_student_requests_by_token: {
        Args: { p_request_tokens: string[] }
        Returns: {
          contact_type: string
          created_at: string
          download_code: string
          download_code_used_at: string
          id: string
          receipt_image_url: string
          refund_screenshot_url: string
          rejection_reason: string
          request_id: string
          request_token: string
          status: string
          student_contact: string
          teacher_email: string
          teacher_full_name: string
          teacher_id: string
          teacher_phone: string
          total_amount: number
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_category_in_use: { Args: { category_id: string }; Returns: boolean }
      is_client_blocked: {
        Args: { p_fp_hash: string; p_ip_hash: string }
        Returns: {
          blocked: boolean
          reason: string
        }[]
      }
      is_subcategory_in_use: {
        Args: { subcategory_id: string }
        Returns: boolean
      }
      is_valid_teacher: { Args: { teacher_uuid: string }; Returns: boolean }
      list_protected_teachers: {
        Args: never
        Returns: {
          teacher_id: string
        }[]
      }
      list_public_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          school_name: string
        }[]
      }
      log_activity: {
        Args: {
          p_action: string
          p_category?: string
          p_details?: Json
          p_ip_address?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      record_client_hit: {
        Args: { p_action: string; p_fp_hash: string; p_ip_hash: string }
        Returns: undefined
      }
      validate_access_code: {
        Args: { p_code: string }
        Returns: {
          teacher_id: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "teacher"
        | "pending"
        | "deleted"
        | "blocked"
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
      app_role: [
        "admin",
        "teacher",
        "pending",
        "deleted",
        "blocked",
        "rejected",
      ],
    },
  },
} as const
