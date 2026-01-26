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
      analyses: {
        Row: {
          analysis_text: string | null
          chart_15m_url: string | null
          chart_4h_url: string | null
          cost: number
          created_at: string
          duration: string | null
          entry_price: string | null
          id: string
          is_saved: boolean
          risk_warning: string | null
          rr_ratio: string | null
          stop_loss: string | null
          strength: string | null
          symbol: string
          take_profit: string | null
          timeframe: string | null
          trade_focus: Database["public"]["Enums"]["trade_focus"]
          trade_idea: Database["public"]["Enums"]["trade_idea"] | null
          trend: Database["public"]["Enums"]["analysis_trend"] | null
          user_id: string
        }
        Insert: {
          analysis_text?: string | null
          chart_15m_url?: string | null
          chart_4h_url?: string | null
          cost?: number
          created_at?: string
          duration?: string | null
          entry_price?: string | null
          id?: string
          is_saved?: boolean
          risk_warning?: string | null
          rr_ratio?: string | null
          stop_loss?: string | null
          strength?: string | null
          symbol: string
          take_profit?: string | null
          timeframe?: string | null
          trade_focus?: Database["public"]["Enums"]["trade_focus"]
          trade_idea?: Database["public"]["Enums"]["trade_idea"] | null
          trend?: Database["public"]["Enums"]["analysis_trend"] | null
          user_id: string
        }
        Update: {
          analysis_text?: string | null
          chart_15m_url?: string | null
          chart_4h_url?: string | null
          cost?: number
          created_at?: string
          duration?: string | null
          entry_price?: string | null
          id?: string
          is_saved?: boolean
          risk_warning?: string | null
          rr_ratio?: string | null
          stop_loss?: string | null
          strength?: string | null
          symbol?: string
          take_profit?: string | null
          timeframe?: string | null
          trade_focus?: Database["public"]["Enums"]["trade_focus"]
          trade_idea?: Database["public"]["Enums"]["trade_idea"] | null
          trend?: Database["public"]["Enums"]["analysis_trend"] | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      daily_signals: {
        Row: {
          created_at: string
          entry_price: string
          id: string
          is_active: boolean
          notes: string | null
          risk_reward: string | null
          status: string
          stop_loss: string
          symbol: string
          take_profit: string
          trade_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_price: string
          id?: string
          is_active?: boolean
          notes?: string | null
          risk_reward?: string | null
          status?: string
          stop_loss: string
          symbol: string
          take_profit: string
          trade_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_price?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          risk_reward?: string | null
          status?: string
          stop_loss?: string
          symbol?: string
          take_profit?: string
          trade_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_streak_settings: {
        Row: {
          created_at: string
          features: Json
          highlight_text: string | null
          id: string
          is_active: boolean
          subtitle: string
          title: string
          unlock_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json
          highlight_text?: string | null
          id?: string
          is_active?: boolean
          subtitle?: string
          title?: string
          unlock_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json
          highlight_text?: string | null
          id?: string
          is_active?: boolean
          subtitle?: string
          title?: string
          unlock_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      deposit_methods: {
        Row: {
          created_at: string
          details: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          details: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          deposit_method_id: string | null
          id: string
          screenshot_url: string
          status: Database["public"]["Enums"]["deposit_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          deposit_method_id?: string | null
          id?: string
          screenshot_url: string
          status?: Database["public"]["Enums"]["deposit_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          deposit_method_id?: string | null
          id?: string
          screenshot_url?: string
          status?: Database["public"]["Enums"]["deposit_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_deposit_method_id_fkey"
            columns: ["deposit_method_id"]
            isOneToOne: false
            referencedRelation: "deposit_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      market_news: {
        Row: {
          content: string
          created_at: string
          id: string
          importance: string | null
          is_active: boolean
          news_type: string
          published_at: string
          source: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          importance?: string | null
          is_active?: boolean
          news_type?: string
          published_at?: string
          source?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          importance?: string | null
          is_active?: boolean
          news_type?: string
          published_at?: string
          source?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pro_content: {
        Row: {
          content: string
          content_type: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content: string
          content_type?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_id: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      recommended_tools: {
        Row: {
          created_at: string
          description: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          redirect_url: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          redirect_url: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          redirect_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      screenshot_guide_content: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon_name: string | null
          id: string
          image_url: string | null
          is_active: boolean
          section_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          section_type: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          section_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          discount_text: string | null
          display_order: number
          id: string
          is_active: boolean
          is_featured: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_text?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_text?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price?: number
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_unlocks: {
        Row: {
          expires_at: string | null
          id: string
          unlock_type: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          unlock_type?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          unlock_type?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
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
      credit_user_wallet: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      deduct_user_wallet: {
        Args: { p_amount: number; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      analysis_trend: "bullish" | "bearish" | "neutral"
      app_role: "admin" | "user"
      deposit_status: "pending" | "approved" | "rejected"
      trade_focus: "scalp" | "swing"
      trade_idea: "buy" | "sell" | "hold"
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
      analysis_trend: ["bullish", "bearish", "neutral"],
      app_role: ["admin", "user"],
      deposit_status: ["pending", "approved", "rejected"],
      trade_focus: ["scalp", "swing"],
      trade_idea: ["buy", "sell", "hold"],
    },
  },
} as const
