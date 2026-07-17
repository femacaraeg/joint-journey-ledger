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
      categories: {
        Row: {
          base_budget_amount: number
          created_at: string
          household_id: string
          id: string
          name: string
          owner: Database["public"]["Enums"]["owner_kind"]
          rollover_setting: Database["public"]["Enums"]["rollover_setting"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_budget_amount?: number
          created_at?: string
          household_id: string
          id?: string
          name: string
          owner?: Database["public"]["Enums"]["owner_kind"]
          rollover_setting?: Database["public"]["Enums"]["rollover_setting"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_budget_amount?: number
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          owner?: Database["public"]["Enums"]["owner_kind"]
          rollover_setting?: Database["public"]["Enums"]["rollover_setting"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      category_cycles: {
        Row: {
          actual_spend: number
          category_id: string
          created_at: string
          cycle_month: string
          household_id: string
          id: string
          updated_at: string
        }
        Insert: {
          actual_spend?: number
          category_id: string
          created_at?: string
          cycle_month: string
          household_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          actual_spend?: number
          category_id?: string
          created_at?: string
          cycle_month?: string
          household_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_cycles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_cycles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          created_at: string
          cutoff_day: number
          due_day: number
          household_id: string
          id: string
          linked_category_id: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cutoff_day: number
          due_day: number
          household_id: string
          id?: string
          linked_category_id?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cutoff_day?: number
          due_day?: number
          household_id?: string
          id?: string
          linked_category_id?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_cards_linked_category_id_fkey"
            columns: ["linked_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string
          currency: string
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          invite_code: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          invite_code?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      income_sources: {
        Row: {
          amount: number
          created_at: string
          household_id: string
          id: string
          label: string
          pay_frequency: Database["public"]["Enums"]["pay_frequency"]
          payday_days: number[]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          household_id: string
          id?: string
          label?: string
          pay_frequency?: Database["public"]["Enums"]["pay_frequency"]
          payday_days?: number[]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          household_id?: string
          id?: string
          label?: string
          pay_frequency?: Database["public"]["Enums"]["pay_frequency"]
          payday_days?: number[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_sources_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      other_income: {
        Row: {
          allocated_category_id: string | null
          amount: number
          created_at: string
          household_id: string
          id: string
          note: string | null
          received_on: string
          source_label: string
          user_id: string
        }
        Insert: {
          allocated_category_id?: string | null
          amount: number
          created_at?: string
          household_id: string
          id?: string
          note?: string | null
          received_on?: string
          source_label: string
          user_id: string
        }
        Update: {
          allocated_category_id?: string | null
          amount?: number
          created_at?: string
          household_id?: string
          id?: string
          note?: string | null
          received_on?: string
          source_label?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "other_income_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string | null
          household_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email?: string | null
          household_id?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string | null
          household_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      soa_entries: {
        Row: {
          amount: number
          created_at: string
          credit_card_id: string
          cycle_month: string
          due_date: string
          household_id: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["soa_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_card_id: string
          cycle_month: string
          due_date: string
          household_id: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["soa_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_card_id?: string
          cycle_month?: string
          due_date?: string
          household_id?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["soa_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "soa_entries_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soa_entries_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_household: { Args: { _name: string }; Returns: string }
      current_household_id: { Args: never; Returns: string }
      is_household_member: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
      join_household: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      owner_kind: "partner_a" | "partner_b" | "shared"
      pay_frequency: "monthly" | "semi_monthly" | "biweekly" | "weekly"
      rollover_setting: "rollover" | "restart"
      soa_status: "unpaid" | "paid"
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
      owner_kind: ["partner_a", "partner_b", "shared"],
      pay_frequency: ["monthly", "semi_monthly", "biweekly", "weekly"],
      rollover_setting: ["rollover", "restart"],
      soa_status: ["unpaid", "paid"],
    },
  },
} as const
