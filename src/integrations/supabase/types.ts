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
      apilayer_api_track: {
        Row: {
          API: string | null
          count: number | null
          created_at: string
          id: string
        }
        Insert: {
          API?: string | null
          count?: number | null
          created_at?: string
          id?: string
        }
        Update: {
          API?: string | null
          count?: number | null
          created_at?: string
          id?: string
        }
        Relationships: []
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
      cohere_api_keys: {
        Row: {
          api_key: string | null
          api_key_name: string
          request_count: number
          uuid: string
        }
        Insert: {
          api_key?: string | null
          api_key_name: string
          request_count?: number
          uuid?: string
        }
        Update: {
          api_key?: string | null
          api_key_name?: string
          request_count?: number
          uuid?: string
        }
        Relationships: []
      }
      cohere_daily_quota: {
        Row: {
          quota_date: string
          request_count: number
        }
        Insert: {
          quota_date?: string
          request_count?: number
        }
        Update: {
          quota_date?: string
          request_count?: number
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
          started_at: string | null
          updated_at: string
        }
        Insert: {
          base_currency: string
          fetched_at?: string
          id?: string
          rates?: Json
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          base_currency?: string
          fetched_at?: string
          id?: string
          rates?: Json
          started_at?: string | null
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
          request_id?: string
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
          purged_at: string | null
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
          purged_at?: string | null
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
          purged_at?: string | null
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
      notification_versions: {
        Row: {
          created_at: string
          edited_by: string | null
          id: string
          message: string
          notification_id: string
          title: string
          user_id: string | null
          version: number
        }
        Insert: {
          created_at?: string
          edited_by?: string | null
          id?: string
          message: string
          notification_id: string
          title: string
          user_id?: string | null
          version: number
        }
        Update: {
          created_at?: string
          edited_by?: string | null
          id?: string
          message?: string
          notification_id?: string
          title?: string
          user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_versions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_versions_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          current_version: number
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
          current_version?: number
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
          current_version?: number
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
      payment_credentials: {
        Row: {
          account_holder: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string
          iban: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_records: {
        Row: {
          amount: number
          created_at: string
          id: string
          month: number
          notes: string | null
          paid_amount: number
          paid_at: string | null
          payment_method: string | null
          proof_reference: string | null
          proof_url: string | null
          reference_number: string | null
          rejection_reason: string | null
          status: string
          submitted_at: string | null
          teacher_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          year: number
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          paid_amount?: number
          paid_at?: string | null
          payment_method?: string | null
          proof_reference?: string | null
          proof_url?: string | null
          reference_number?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          teacher_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          year: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          paid_amount?: number
          paid_at?: string | null
          payment_method?: string | null
          proof_reference?: string | null
          proof_url?: string | null
          reference_number?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          teacher_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          code: string
          commission: number
          created_at: string
          id: string
          max_price: number
          min_price: number
          updated_at: string
        }
        Insert: {
          code?: string
          commission?: number
          created_at?: string
          id?: string
          max_price?: number
          min_price?: number
          updated_at?: string
        }
        Update: {
          code?: string
          commission?: number
          created_at?: string
          id?: string
          max_price?: number
          min_price?: number
          updated_at?: string
        }
        Relationships: []
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
          is_verified: boolean
          phone: string | null
          school_name: string | null
          updated_at: string
          verified_at: string | null
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
          is_verified?: boolean
          phone?: string | null
          school_name?: string | null
          updated_at?: string
          verified_at?: string | null
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
          is_verified?: boolean
          phone?: string | null
          school_name?: string | null
          updated_at?: string
          verified_at?: string | null
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
      teacher_verification_requests: {
        Row: {
          created_at: string
          details: string | null
          document_name: string | null
          document_type: string | null
          document_url: string | null
          id: string
          institution_name: string | null
          method: string
          review_feedback: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subjects_taught: string | null
          teacher_id: string
          teaching_mode: string | null
          updated_at: string
          years_experience: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          document_name?: string | null
          document_type?: string | null
          document_url?: string | null
          id?: string
          institution_name?: string | null
          method?: string
          review_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subjects_taught?: string | null
          teacher_id: string
          teaching_mode?: string | null
          updated_at?: string
          years_experience?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          document_name?: string | null
          document_type?: string | null
          document_url?: string | null
          id?: string
          institution_name?: string | null
          method?: string
          review_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subjects_taught?: string | null
          teacher_id?: string
          teaching_mode?: string | null
          updated_at?: string
          years_experience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_verification_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          settings_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          settings_id?: string
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          settings_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: false
            referencedRelation: "platform_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          appearence: string
          autoselect_currency: boolean
          cohere_api_keys: Json
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
          cohere_api_keys?: Json
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
          cohere_api_keys?: Json
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
      [_ in never]: never
    }
    Functions: {
      adjust_cohere_usage: {
        Args: { p_delta: number; p_key_uuid: string; p_quota_date?: string }
        Returns: {
          daily_after: number
          daily_before: number
          key_after: number
          key_before: number
          key_name: string
        }[]
      }
      cancel_student_request: {
        Args: { p_request_id: string }
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
      dearmor: { Args: { "": string }; Returns: string }
      delete_old_purged_rows: { Args: never; Returns: undefined }
      expire_teacher_verification: {
        Args: { p_request_id: string }
        Returns: {
          created_at: string
          details: string | null
          document_name: string | null
          document_type: string | null
          document_url: string | null
          id: string
          institution_name: string | null
          method: string
          review_feedback: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subjects_taught: string | null
          teacher_id: string
          teaching_mode: string | null
          updated_at: string
          years_experience: string | null
        }
        SetofOptions: {
          from: "*"
          to: "teacher_verification_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gen_random_uuid: { Args: never; Returns: string }
      gen_salt: { Args: { "": string }; Returns: string }
      generate_monthly_payment_record: {
        Args: { p_month: number; p_teacher_id: string; p_year: number }
        Returns: string
      }
      get_free_note_file_url: { Args: { p_note_id: string }; Returns: string }
      get_my_note_file_url: { Args: { p_note_id: string }; Returns: string }
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
      get_user_role_by_email: {
        Args: { p_email: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_user_cohere_key: {
        Args: { p_key_label: string }
        Returns: Json
      }
      is_category_in_use: { Args: { category_id: string }; Returns: boolean }
      is_subcategory_in_use: {
        Args: { subcategory_id: string }
        Returns: boolean
      }
      is_valid_teacher: { Args: { teacher_uuid: string }; Returns: boolean }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      record_teacher_payment: {
        Args: {
          p_amount: number
          p_method?: string
          p_month: number
          p_notes?: string
          p_reference?: string
          p_teacher_id: string
          p_year: number
        }
        Returns: string
      }
      reject_payment_proof: {
        Args: { p_reason: string; p_record_id: string }
        Returns: undefined
      }
      reset_apilayer_api_track_counts: { Args: never; Returns: undefined }
      reset_user_cohere_key_counts: { Args: never; Returns: undefined }
      review_teacher_verification: {
        Args: { p_approve: boolean; p_feedback?: string; p_request_id: string }
        Returns: {
          created_at: string
          details: string | null
          document_name: string | null
          document_type: string | null
          document_url: string | null
          id: string
          institution_name: string | null
          method: string
          review_feedback: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subjects_taught: string | null
          teacher_id: string
          teaching_mode: string | null
          updated_at: string
          years_experience: string | null
        }
        SetofOptions: {
          from: "*"
          to: "teacher_verification_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      session_at_aal2: { Args: never; Returns: boolean }
      submit_payment_proof: {
        Args: {
          p_month: number
          p_proof_reference?: string
          p_proof_url?: string
          p_teacher_id: string
          p_year: number
        }
        Returns: string
      }
      submit_teacher_verification:
        | {
            Args: {
              p_details?: string
              p_document_name?: string
              p_document_type?: string
              p_document_url?: string
              p_institution_name?: string
              p_method?: string
              p_subjects_taught?: string
              p_teaching_mode?: string
              p_years_experience?: string
            }
            Returns: {
              created_at: string
              details: string | null
              document_name: string | null
              document_type: string | null
              document_url: string | null
              id: string
              institution_name: string | null
              method: string
              review_feedback: string | null
              reviewed_at: string | null
              reviewed_by: string | null
              status: string
              subjects_taught: string | null
              teacher_id: string
              teaching_mode: string | null
              updated_at: string
              years_experience: string | null
            }
            SetofOptions: {
              from: "*"
              to: "teacher_verification_requests"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_document_name?: string
              p_document_type: string
              p_document_url: string
            }
            Returns: {
              created_at: string
              details: string | null
              document_name: string | null
              document_type: string | null
              document_url: string | null
              id: string
              institution_name: string | null
              method: string
              review_feedback: string | null
              reviewed_at: string | null
              reviewed_by: string | null
              status: string
              subjects_taught: string | null
              teacher_id: string
              teaching_mode: string | null
              updated_at: string
              years_experience: string | null
            }
            SetofOptions: {
              from: "*"
              to: "teacher_verification_requests"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      verify_teacher_payment: {
        Args: {
          p_notes?: string
          p_paid_amount?: number
          p_record_id: string
          p_reference_number?: string
          p_verified_by: string
        }
        Returns: undefined
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
        | "coadmin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
        "coadmin",
      ],
    },
  },
} as const
