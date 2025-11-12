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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      contracts: {
        Row: {
          award_date: string | null
          contract_number: string | null
          contract_title: string
          contract_value: number | null
          created_at: string | null
          currency: string | null
          id: string
          notice_id: string | null
          raw_data: Json | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          award_date?: string | null
          contract_number?: string | null
          contract_title: string
          contract_value?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          notice_id?: string | null
          raw_data?: Json | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          award_date?: string | null
          contract_number?: string | null
          contract_title?: string
          contract_value?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          notice_id?: string | null
          raw_data?: Json | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          ca_notice_id: number
          contract_title: string
          contracting_authority: string
          cpv_code: string | null
          created_at: string | null
          estimated_value: number | null
          finalization_date: string | null
          id: string
          notice_no: string
          procedure_type: string | null
          publication_date: string | null
          raw_data: Json | null
          risk_factors: Json | null
          risk_score: number | null
          ron_contract_value: number | null
          short_description: string | null
          updated_at: string | null
        }
        Insert: {
          ca_notice_id: number
          contract_title: string
          contracting_authority: string
          cpv_code?: string | null
          created_at?: string | null
          estimated_value?: number | null
          finalization_date?: string | null
          id?: string
          notice_no: string
          procedure_type?: string | null
          publication_date?: string | null
          raw_data?: Json | null
          risk_factors?: Json | null
          risk_score?: number | null
          ron_contract_value?: number | null
          short_description?: string | null
          updated_at?: string | null
        }
        Update: {
          ca_notice_id?: number
          contract_title?: string
          contracting_authority?: string
          cpv_code?: string | null
          created_at?: string | null
          estimated_value?: number | null
          finalization_date?: string | null
          id?: string
          notice_no?: string
          procedure_type?: string | null
          publication_date?: string | null
          raw_data?: Json | null
          risk_factors?: Json | null
          risk_score?: number | null
          ron_contract_value?: number | null
          short_description?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      risk_history: {
        Row: {
          id: string
          notice_id: string | null
          recorded_at: string | null
          risk_factors: Json | null
          risk_score: number
        }
        Insert: {
          id?: string
          notice_id?: string | null
          recorded_at?: string | null
          risk_factors?: Json | null
          risk_score: number
        }
        Update: {
          id?: string
          notice_id?: string | null
          recorded_at?: string | null
          risk_factors?: Json | null
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_history_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          average_contract_value: number | null
          created_at: string | null
          first_seen_at: string | null
          fiscal_code: string | null
          high_risk_count: number | null
          id: string
          last_seen_at: string | null
          total_contracts: number | null
          total_value: number | null
          updated_at: string | null
          vendor_name: string
          win_rate: number | null
        }
        Insert: {
          average_contract_value?: number | null
          created_at?: string | null
          first_seen_at?: string | null
          fiscal_code?: string | null
          high_risk_count?: number | null
          id?: string
          last_seen_at?: string | null
          total_contracts?: number | null
          total_value?: number | null
          updated_at?: string | null
          vendor_name: string
          win_rate?: number | null
        }
        Update: {
          average_contract_value?: number | null
          created_at?: string | null
          first_seen_at?: string | null
          fiscal_code?: string | null
          high_risk_count?: number | null
          id?: string
          last_seen_at?: string | null
          total_contracts?: number | null
          total_value?: number | null
          updated_at?: string | null
          vendor_name?: string
          win_rate?: number | null
        }
        Relationships: []
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
