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
      access_invocations: {
        Row: {
          admin_id: string
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          paid_at: string | null
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id: string
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          paid_at?: string | null
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      access_payments: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          invocation_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          invocation_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          invocation_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_payments_invocation_id_fkey"
            columns: ["invocation_id"]
            isOneToOne: false
            referencedRelation: "access_invocations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_bot_purchases: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          plan_key: string
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          plan_key: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          plan_key?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_signals: {
        Row: {
          analysis: string | null
          confidence: number
          created_at: string
          entry_price: number | null
          expires_at: string
          id: string
          signal_type: string
          stop_loss: number | null
          symbol: string
          take_profit: number | null
        }
        Insert: {
          analysis?: string | null
          confidence: number
          created_at?: string
          entry_price?: number | null
          expires_at: string
          id?: string
          signal_type: string
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
        }
        Update: {
          analysis?: string | null
          confidence?: number
          created_at?: string
          entry_price?: number | null
          expires_at?: string
          id?: string
          signal_type?: string
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
        }
        Relationships: []
      }
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
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at: string
          id: string
          is_verified: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at?: string
          id?: string
          is_verified?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string
          bank_name?: string
          created_at?: string
          id?: string
          is_verified?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          message_type: string
          room_id: string
          signal_data: Json | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          room_id: string
          signal_data?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          room_id?: string
          signal_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_blocked_users: {
        Row: {
          blocked_at: string
          blocked_by: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          blocked_at?: string
          blocked_by: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          blocked_at?: string
          blocked_by?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_blocked_users_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_members: {
        Row: {
          id: string
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          avatar_url: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          is_premium: boolean
          join_price: number
          members_count: number
          name: string
          requires_approval: boolean
        }
        Insert: {
          avatar_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          join_price?: number
          members_count?: number
          name: string
          requires_approval?: boolean
        }
        Update: {
          avatar_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          join_price?: number
          members_count?: number
          name?: string
          requires_approval?: boolean
        }
        Relationships: []
      }
      coin_flip_games: {
        Row: {
          created_at: string
          creator_choice: string
          creator_id: string
          id: string
          opponent_id: string | null
          resolved_at: string | null
          result: string | null
          room_id: string
          stake_amount: number
          status: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          creator_choice?: string
          creator_id: string
          id?: string
          opponent_id?: string | null
          resolved_at?: string | null
          result?: string | null
          room_id: string
          stake_amount: number
          status?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          creator_choice?: string
          creator_id?: string
          id?: string
          opponent_id?: string | null
          resolved_at?: string | null
          result?: string | null
          room_id?: string
          stake_amount?: number
          status?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coin_flip_games_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      copy_follows: {
        Row: {
          created_at: string
          fixed_amount: number
          follower_id: string
          id: string
          is_active: boolean
          leader_id: string
        }
        Insert: {
          created_at?: string
          fixed_amount: number
          follower_id: string
          id?: string
          is_active?: boolean
          leader_id: string
        }
        Update: {
          created_at?: string
          fixed_amount?: number
          follower_id?: string
          id?: string
          is_active?: boolean
          leader_id?: string
        }
        Relationships: []
      }
      copy_leaders: {
        Row: {
          avatar_url: string | null
          display_id: string | null
          full_name: string | null
          id: string
          total_pnl: number
          total_trades: number
          updated_at: string
          user_id: string
          win_rate: number
          winning_trades: number
        }
        Insert: {
          avatar_url?: string | null
          display_id?: string | null
          full_name?: string | null
          id?: string
          total_pnl?: number
          total_trades?: number
          updated_at?: string
          user_id: string
          win_rate?: number
          winning_trades?: number
        }
        Update: {
          avatar_url?: string | null
          display_id?: string | null
          full_name?: string | null
          id?: string
          total_pnl?: number
          total_trades?: number
          updated_at?: string
          user_id?: string
          win_rate?: number
          winning_trades?: number
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
      demo_positions: {
        Row: {
          account_type: string
          amount: number
          close_reason: string | null
          closed_at: string | null
          created_at: string
          current_price: number
          entry_price: number
          id: string
          leverage: number
          opened_at: string
          pnl: number
          pnl_percent: number
          status: string
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          trade_type: string
          user_id: string
        }
        Insert: {
          account_type?: string
          amount: number
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string
          current_price: number
          entry_price: number
          id?: string
          leverage?: number
          opened_at?: string
          pnl?: number
          pnl_percent?: number
          status?: string
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          trade_type: string
          user_id: string
        }
        Update: {
          account_type?: string
          amount?: number
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string
          current_price?: number
          entry_price?: number
          id?: string
          leverage?: number
          opened_at?: string
          pnl?: number
          pnl_percent?: number
          status?: string
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          trade_type?: string
          user_id?: string
        }
        Relationships: []
      }
      demo_trade_history: {
        Row: {
          account_type: string
          amount: number
          close_reason: string | null
          closed_at: string
          duration_seconds: number | null
          entry_price: number
          exit_price: number
          id: string
          leverage: number
          opened_at: string
          pnl: number
          pnl_percent: number
          position_id: string | null
          symbol: string
          trade_type: string
          user_id: string
        }
        Insert: {
          account_type?: string
          amount: number
          close_reason?: string | null
          closed_at?: string
          duration_seconds?: number | null
          entry_price: number
          exit_price: number
          id?: string
          leverage?: number
          opened_at: string
          pnl: number
          pnl_percent: number
          position_id?: string | null
          symbol: string
          trade_type: string
          user_id: string
        }
        Update: {
          account_type?: string
          amount?: number
          close_reason?: string | null
          closed_at?: string
          duration_seconds?: number | null
          entry_price?: number
          exit_price?: number
          id?: string
          leverage?: number
          opened_at?: string
          pnl?: number
          pnl_percent?: number
          position_id?: string | null
          symbol?: string
          trade_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_trade_history_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "demo_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_pnl: number
          total_trades: number
          updated_at: string
          user_id: string
          winning_trades: number
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_pnl?: number
          total_trades?: number
          updated_at?: string
          user_id: string
          winning_trades?: number
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_pnl?: number
          total_trades?: number
          updated_at?: string
          user_id?: string
          winning_trades?: number
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
      email_send_log: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          payload: Json | null
          provider_message_id: string | null
          recipient_email: string
          status: string
          subject: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          provider_message_id?: string | null
          recipient_email: string
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          provider_message_id?: string | null
          recipient_email?: string
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      fund_transfers: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          receiver_id: string
          sender_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          receiver_id: string
          sender_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      jackpot_entries: {
        Row: {
          amount: number
          created_at: string
          game_id: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          game_id: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          game_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_entries_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "jackpot_games"
            referencedColumns: ["id"]
          },
        ]
      }
      jackpot_games: {
        Row: {
          created_at: string
          created_by: string
          id: string
          max_players: number
          min_entry: number
          resolved_at: string | null
          room_id: string
          status: string
          total_pot: number
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          max_players?: number
          min_entry?: number
          resolved_at?: string | null
          room_id: string
          status?: string
          total_pot?: number
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          max_players?: number
          min_entry?: number
          resolved_at?: string | null
          room_id?: string
          status?: string
          total_pot?: number
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_games_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verifications: {
        Row: {
          admin_notes: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          id: string
          id_document_url: string | null
          id_number: string | null
          selfie_url: string | null
          status: string
          updated_at: string
          user_id: string
          verification_type: string
          verified_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          id_document_url?: string | null
          id_number?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verification_type?: string
          verified_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          id_document_url?: string | null
          id_number?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verification_type?: string
          verified_at?: string | null
        }
        Relationships: []
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
      money_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          requester_id: string
          resolved_at: string | null
          room_id: string | null
          status: string
          target_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          requester_id: string
          resolved_at?: string | null
          room_id?: string | null
          status?: string
          target_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          requester_id?: string
          resolved_at?: string | null
          room_id?: string | null
          status?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "money_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          evening_recap: boolean
          id: string
          midday_opportunities: boolean
          morning_brief: boolean
          preferred_pairs: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          evening_recap?: boolean
          id?: string
          midday_opportunities?: boolean
          morning_brief?: boolean
          preferred_pairs?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          evening_recap?: boolean
          id?: string
          midday_opportunities?: boolean
          morning_brief?: boolean
          preferred_pairs?: string[]
          updated_at?: string
          user_id?: string
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
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes_count: number
          tagged_trade_ids: string[] | null
          tagged_user_ids: string[] | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          tagged_trade_ids?: string[] | null
          tagged_user_ids?: string[] | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          tagged_trade_ids?: string[] | null
          tagged_user_ids?: string[] | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
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
          bg_image_url: string | null
          created_at: string
          display_id: string | null
          email: string | null
          full_name: string | null
          id: string
          phone_number: string | null
          transaction_pin_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bg_image_url?: string | null
          created_at?: string
          display_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          transaction_pin_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bg_image_url?: string | null
          created_at?: string
          display_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          transaction_pin_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_delivery_logs: {
        Row: {
          broadcast_id: string
          created_at: string
          endpoint_host: string | null
          error: string | null
          id: string
          is_auth_error: boolean
          is_gone: boolean
          message: string | null
          status_code: number | null
          subscription_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          broadcast_id: string
          created_at?: string
          endpoint_host?: string | null
          error?: string | null
          id?: string
          is_auth_error?: boolean
          is_gone?: boolean
          message?: string | null
          status_code?: number | null
          subscription_id?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          broadcast_id?: string
          created_at?: string
          endpoint_host?: string | null
          error?: string | null
          id?: string
          is_auth_error?: boolean
          is_gone?: boolean
          message?: string | null
          status_code?: number | null
          subscription_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_resubscribe_flags: {
        Row: {
          created_at: string
          last_error: string | null
          last_status_code: number | null
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_error?: string | null
          last_status_code?: number | null
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_error?: string | null
          last_status_code?: number | null
          reason?: string | null
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
      room_join_requests: {
        Row: {
          created_at: string
          id: string
          reviewed_at: string | null
          room_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          room_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          room_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_join_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      school_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
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
      user_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          resolved_at?: string | null
          status?: string
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
      withdrawal_challenges: {
        Row: {
          admin_assigned: boolean
          completed_at: string | null
          created_at: string
          deadline: string
          duration_minutes: number
          id: string
          losses_count: number
          no_loss_required: boolean
          required_volume: number
          started_at: string
          status: string
          tier: string
          updated_at: string
          user_id: string
          volume_traded: number
        }
        Insert: {
          admin_assigned?: boolean
          completed_at?: string | null
          created_at?: string
          deadline: string
          duration_minutes: number
          id?: string
          losses_count?: number
          no_loss_required?: boolean
          required_volume: number
          started_at?: string
          status?: string
          tier: string
          updated_at?: string
          user_id: string
          volume_traded?: number
        }
        Update: {
          admin_assigned?: boolean
          completed_at?: string | null
          created_at?: string
          deadline?: string
          duration_minutes?: number
          id?: string
          losses_count?: number
          no_loss_required?: boolean
          required_volume?: number
          started_at?: string
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
          volume_traded?: number
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_notes: string | null
          amount: number
          bank_account_id: string | null
          created_at: string
          id: string
          processed_at: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          bank_account_id?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_assign_withdrawal_challenge: {
        Args: {
          p_duration_minutes: number
          p_no_loss?: boolean
          p_required_volume: number
          p_user_id: string
        }
        Returns: Json
      }
      approve_access_invocation: {
        Args: { p_invocation_id: string; p_notes?: string }
        Returns: Json
      }
      approve_access_payment: {
        Args: { p_notes?: string; p_payment_id: string }
        Returns: Json
      }
      approve_ai_bot_purchase: {
        Args: { p_notes?: string; p_purchase_id: string }
        Returns: Json
      }
      credit_user_wallet: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      credit_user_wallet_internal: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      credit_user_wallet_service: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      credit_wallet_bypass_rls: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      decline_access_invocation: {
        Args: { p_invocation_id: string; p_notes?: string }
        Returns: Json
      }
      decline_access_payment: {
        Args: { p_notes?: string; p_payment_id: string }
        Returns: Json
      }
      decline_ai_bot_purchase: {
        Args: { p_notes?: string; p_purchase_id: string }
        Returns: Json
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
      pay_access_invocation: {
        Args: { p_invocation_id: string }
        Returns: Json
      }
      refresh_copy_leaders: { Args: never; Returns: undefined }
      set_transaction_pin: { Args: { p_pin: string }; Returns: boolean }
      settle_binary_position: {
        Args: {
          p_close_reason?: string
          p_exit_price: number
          p_position_id: string
        }
        Returns: Json
      }
      start_withdrawal_challenge: { Args: { p_tier: string }; Returns: Json }
      verify_transaction_pin: { Args: { p_pin: string }; Returns: boolean }
    }
    Enums: {
      analysis_trend: "bullish" | "bearish" | "neutral"
      app_role: "admin" | "user"
      deposit_status: "pending" | "approved" | "rejected"
      trade_focus: "scalp" | "swing"
      trade_idea: "buy" | "sell" | "hold"
      withdrawal_status: "pending" | "processing" | "completed" | "rejected"
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
      withdrawal_status: ["pending", "processing", "completed", "rejected"],
    },
  },
} as const
