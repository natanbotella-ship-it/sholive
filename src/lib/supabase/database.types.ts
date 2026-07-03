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
      challenges: {
        Row: {
          brief: Json | null
          created_at: string
          description: string
          id: string
          merchant_id: string
          payment_status: string
          prize_distribution: Json
          prize_pool: number
          status: string
          stripe_checkout_session_id: string | null
          submission_deadline: string
          title: string
          vote_deadline: string
        }
        Insert: {
          brief?: Json | null
          created_at?: string
          description: string
          id?: string
          merchant_id: string
          payment_status?: string
          prize_distribution?: Json
          prize_pool: number
          status?: string
          stripe_checkout_session_id?: string | null
          submission_deadline: string
          title: string
          vote_deadline: string
        }
        Update: {
          brief?: Json | null
          created_at?: string
          description?: string
          id?: string
          merchant_id?: string
          payment_status?: string
          prize_distribution?: Json
          prize_pool?: number
          status?: string
          stripe_checkout_session_id?: string | null
          submission_deadline?: string
          title?: string
          vote_deadline?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchant_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          level: string
          stripe_account_id: string | null
          stripe_onboarding_status: string
          user_id: string
          username: string
          wins: number
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          level?: string
          stripe_account_id?: string | null
          stripe_onboarding_status?: string
          user_id: string
          username: string
          wins?: number
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          level?: string
          stripe_account_id?: string | null
          stripe_onboarding_status?: string
          user_id?: string
          username?: string
          wins?: number
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_contacts: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_contacts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchant_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_profiles: {
        Row: {
          business_name: string
          city: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          business_name: string
          city?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          business_name?: string
          city?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          challenge_id: string
          created_at: string
          creator_id: string
          id: string
          rank: number
          status: string
          stripe_transfer_id: string | null
        }
        Insert: {
          amount: number
          challenge_id: string
          created_at?: string
          creator_id: string
          id?: string
          rank: number
          status?: string
          stripe_transfer_id?: string | null
        }
        Update: {
          amount?: number
          challenge_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          rank?: number
          status?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_confirmed_at: string | null
          created_at: string
          email: string
          id: string
          role: string
        }
        Insert: {
          age_confirmed_at?: string | null
          created_at?: string
          email: string
          id: string
          role: string
        }
        Update: {
          age_confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          challenge_id: string
          created_at: string
          creator_id: string
          declared_likes: number
          declared_saves: number
          declared_shares: number
          declared_views: number
          id: string
          merchant_score: number
          metric_score: number | null
          rank: number | null
          reels_url: string | null
          shorts_url: string | null
          tiktok_url: string | null
          total_score: number | null
        }
        Insert: {
          challenge_id: string
          created_at?: string
          creator_id: string
          declared_likes?: number
          declared_saves?: number
          declared_shares?: number
          declared_views?: number
          id?: string
          merchant_score?: number
          metric_score?: number | null
          rank?: number | null
          reels_url?: string | null
          shorts_url?: string | null
          tiktok_url?: string | null
          total_score?: number | null
        }
        Update: {
          challenge_id?: string
          created_at?: string
          creator_id?: string
          declared_likes?: number
          declared_saves?: number
          declared_shares?: number
          declared_views?: number
          id?: string
          merchant_score?: number
          metric_score?: number | null
          rank?: number | null
          reels_url?: string | null
          shorts_url?: string | null
          tiktok_url?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          merchant_id: string
          submission_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          merchant_id: string
          submission_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          merchant_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchant_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
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
