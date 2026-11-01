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
      poll_candidates: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          place_id: string
          place_url: string | null
          poll_id: string
          position: number
          status: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          place_id: string
          place_url?: string | null
          poll_id: string
          position: number
          status?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          place_id?: string
          place_url?: string | null
          poll_id?: string
          position?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_candidates_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_members: {
        Row: {
          id: string
          is_host: boolean
          joined_at: string
          poll_id: string
          user_id: string | null
          voted_at: string | null
        }
        Insert: {
          id?: string
          is_host?: boolean
          joined_at?: string
          poll_id: string
          user_id?: string | null
          voted_at?: string | null
        }
        Update: {
          id?: string
          is_host?: boolean
          joined_at?: string
          poll_id?: string
          user_id?: string | null
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_members_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          candidate_id: string
          created_at: string
          member_id: string
          poll_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          member_id: string
          poll_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          member_id?: string
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "poll_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "poll_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          anchor_lat: number
          anchor_lng: number
          closed_at: string | null
          closed_reason: string | null
          closes_at: string
          created_at: string
          host_id: string | null
          id: string
          invite_code: string
          kind: string
          multi: boolean
          radius_m: number
          shared_at: string | null
          status: string
          tie_resolved_by: string | null
          tie_until: string | null
          title: string
          updated_at: string
          winner_place_id: string | null
          winner_place_url: string | null
        }
        Insert: {
          anchor_lat: number
          anchor_lng: number
          closed_at?: string | null
          closed_reason?: string | null
          closes_at: string
          created_at?: string
          host_id?: string | null
          id?: string
          invite_code: string
          kind: string
          multi?: boolean
          radius_m: number
          shared_at?: string | null
          status?: string
          tie_resolved_by?: string | null
          tie_until?: string | null
          title: string
          updated_at?: string
          winner_place_id?: string | null
          winner_place_url?: string | null
        }
        Update: {
          anchor_lat?: number
          anchor_lng?: number
          closed_at?: string | null
          closed_reason?: string | null
          closes_at?: string
          created_at?: string
          host_id?: string | null
          id?: string
          invite_code?: string
          kind?: string
          multi?: boolean
          radius_m?: number
          shared_at?: string | null
          status?: string
          tie_resolved_by?: string | null
          tie_until?: string | null
          title?: string
          updated_at?: string
          winner_place_id?: string | null
          winner_place_url?: string | null
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
      add_poll_candidate: {
        Args: { p_place_id: string; p_place_url?: string; p_poll_id: string }
        Returns: string
      }
      cancel_poll: { Args: { p_poll_id: string }; Returns: undefined }
      cancel_unsent_poll: { Args: { p_poll_id: string }; Returns: boolean }
      cast_vote: {
        Args: { p_candidate_ids: string[]; p_poll_id: string }
        Returns: boolean
      }
      close_poll_now: { Args: { p_poll_id: string }; Returns: undefined }
      create_poll: {
        Args: {
          p_anchor_lat: number
          p_anchor_lng: number
          p_closes_at: string
          p_kind: string
          p_multi: boolean
          p_place_ids: string[]
          p_place_urls: string[]
          p_radius_m: number
          p_title: string
        }
        Returns: {
          invite_code: string
          poll_id: string
        }[]
      }
      get_poll: { Args: { p_poll_id: string }; Returns: Json }
      join_poll: { Args: { p_code: string }; Returns: string }
      mark_poll_shared: { Args: { p_poll_id: string }; Returns: undefined }
      my_daily_limits: {
        Args: never
        Returns: {
          bucket: string
          limit_count: number
          remaining: number
          used: number
        }[]
      }
      my_polls: {
        Args: never
        Returns: {
          candidate_count: number
          closed_at: string
          closes_at: string
          created_at: string
          has_voted: boolean
          invite_code: string
          is_host: boolean
          kind: string
          member_count: number
          poll_id: string
          status: string
          tie_until: string
          title: string
          winner_place_id: string
          winner_place_url: string
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
      poll_avoid_flags: {
        Args: { p_places: Json; p_poll_id: string }
        Returns: {
          flagged: boolean
          place_id: string
          too_few: boolean
        }[]
      }
      poll_preview: { Args: { p_code: string }; Returns: Json }
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
      remove_poll_candidate: {
        Args: { p_candidate_id: string }
        Returns: undefined
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
      resolve_poll_tie: {
        Args: { p_candidate_id?: string; p_poll_id: string }
        Returns: undefined
      }
      review_poll_suggestion: {
        Args: { p_approve: boolean; p_candidate_id: string }
        Returns: undefined
      }
      update_poll: {
        Args: {
          p_closes_at?: string
          p_multi?: boolean
          p_poll_id: string
          p_title?: string
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
