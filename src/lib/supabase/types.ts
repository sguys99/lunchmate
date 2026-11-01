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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      avoid_rules: {
        Row: {
          created_at: string
          id: string
          kind: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          user_id?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      blocklist: {
        Row: {
          created_at: string
          place_id: string
          place_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          place_id: string
          place_url?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          place_id?: string
          place_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          place_id: string
          place_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          place_id: string
          place_url?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          place_id?: string
          place_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      offices: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          lat: number
          lng: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          lat: number
          lng: number
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          lat?: number
          lng?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      place_deal_checks: {
        Row: {
          answer: string
          created_at: string
          deal_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          deal_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          answer?: string
          created_at?: string
          deal_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_deal_checks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "place_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      place_deals: {
        Row: {
          content: string
          created_at: string
          days: number
          ends_on: string
          hidden_at: string | null
          hidden_reason: string | null
          id: string
          place_id: string
          place_url: string | null
          slots: string[]
          source: string
          starts_on: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          days?: number
          ends_on: string
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          place_id: string
          place_url?: string | null
          slots?: string[]
          source?: string
          starts_on: string
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          days?: number
          ends_on?: string
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          place_id?: string
          place_url?: string | null
          slots?: string[]
          source?: string
          starts_on?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      place_reports: {
        Row: {
          created_at: string
          detail: Json
          id: string
          kind: string
          kst_day: string
          place_id: string
          place_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          kind: string
          kst_day?: string
          place_id: string
          place_url?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          kind?: string
          kst_day?: string
          place_id?: string
          place_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      preferences: {
        Row: {
          craving_categories: string[]
          craving_until: string | null
          created_at: string
          dinner_budget: number
          lunch_budget: number
          updated_at: string
          user_id: string
          walk_minutes: number
        }
        Insert: {
          craving_categories?: string[]
          craving_until?: string | null
          created_at?: string
          dinner_budget?: number
          lunch_budget?: number
          updated_at?: string
          user_id: string
          walk_minutes?: number
        }
        Update: {
          craving_categories?: string[]
          craving_until?: string | null
          created_at?: string
          dinner_budget?: number
          lunch_budget?: number
          updated_at?: string
          user_id?: string
          walk_minutes?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_confirmed_at: string | null
          created_at: string
          nickname: string | null
          provider: string | null
          role: string
          status: string
          terms_agreed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_confirmed_at?: string | null
          created_at?: string
          nickname?: string | null
          provider?: string | null
          role?: string
          status?: string
          terms_agreed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_confirmed_at?: string | null
          created_at?: string
          nickname?: string | null
          provider?: string | null
          role?: string
          status?: string
          terms_agreed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      review_reports: {
        Row: {
          created_at: string
          deal_id: string | null
          id: string
          note: string | null
          reason: string
          review_id: string | null
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          id?: string
          note?: string | null
          reason: string
          review_id?: string | null
          target_type: string
          user_id?: string
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          id?: string
          note?: string | null
          reason?: string
          review_id?: string | null
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "place_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          hidden_at: string | null
          hidden_reason: string | null
          id: string
          is_public: boolean
          place_id: string
          price_krw: number | null
          rating: string
          tags: string[]
          updated_at: string
          user_id: string
          visit_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          is_public?: boolean
          place_id: string
          price_krw?: number | null
          rating: string
          tags?: string[]
          updated_at?: string
          user_id?: string
          visit_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          is_public?: boolean
          place_id?: string
          price_krw?: number | null
          rating?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          created_at: string
          feedback_requested_at: string | null
          id: string
          meal: string
          place_id: string
          place_url: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
          visited_on: string
        }
        Insert: {
          created_at?: string
          feedback_requested_at?: string | null
          id?: string
          meal: string
          place_id: string
          place_url?: string | null
          source: string
          status?: string
          updated_at?: string
          user_id?: string
          visited_on?: string
        }
        Update: {
          created_at?: string
          feedback_requested_at?: string | null
          id?: string
          meal?: string
          place_id?: string
          place_url?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
          visited_on?: string
        }
        Relationships: []
      }
      wait_reports: {
        Row: {
          created_at: string
          id: string
          level: string
          place_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          place_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          place_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          nickname: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      account_residue: {
        Args: { p_user_id: string }
        Returns: {
          column_name: string
          on_delete: string
          remaining: number
          table_name: string
          table_schema: string
        }[]
      }
      my_daily_limits: {
        Args: never
        Returns: {
          bucket: string
          limit_count: number
          remaining: number
          used: number
        }[]
      }
      place_deals_list: {
        Args: { p_place_id: string }
        Returns: {
          content: string
          created_at: string
          days: number
          ended_count: number
          ends_on: string
          id: string
          is_mine: boolean
          my_answer: string
          slots: string[]
          source: string
          starts_on: string
          still_count: number
          type: string
        }[]
      }
      place_reviews: {
        Args: { p_limit?: number; p_offset?: number; p_place_id: string }
        Returns: {
          avatar_url: string
          body: string
          id: string
          is_mine: boolean
          nickname: string
          price_krw: number
          rating: string
          reported_by_me: boolean
          tags: string[]
          visit_month: number
        }[]
      }
      place_stats: {
        Args: { p_place_ids: string[] }
        Returns: {
          closed: boolean
          closed_reports: number
          deal_count: number
          place_id: string
          price_count: number
          price_median: number
          price_points: number[]
          thumbs_down: number
          thumbs_up: number
          top_tags: Json
          wait_level: string
          wait_minutes_ago: number
          wait_reported_at: string
        }[]
      }
      register_deal: {
        Args: {
          p_content: string
          p_days?: number
          p_ends_on?: string
          p_place_id: string
          p_place_url?: string
          p_replace?: boolean
          p_slots?: string[]
          p_type: string
        }
        Returns: {
          deal_id: string
          ends_on: string
          merged_with: string
        }[]
      }
      report_wait: {
        Args: { p_level: string; p_place_id: string }
        Returns: {
          accepted: boolean
          report_id: string
          reported_at: string
          retry_at: string
        }[]
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
    Enums: {},
  },
} as const
