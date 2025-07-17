export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      calibrations: {
        Row: {
          created_at: string
          id: string
          reference_db_500_values: number[] | null
          reference_db_1000_values: number[] | null
          reference_db_2000_values: number[] | null
          reference_db_4000_values: number[] | null
          applied_db_500: number | null
          applied_db_1000: number | null
          applied_db_2000: number | null
          applied_db_4000: number | null
          is_calibrated_500: boolean
          is_calibrated_1000: boolean
          is_calibrated_2000: boolean
          is_calibrated_4000: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reference_db_500_values?: number[] | null
          reference_db_1000_values?: number[] | null
          reference_db_2000_values?: number[] | null
          reference_db_4000_values?: number[] | null
          applied_db_500?: number | null
          applied_db_1000?: number | null
          applied_db_2000?: number | null
          applied_db_4000?: number | null
          is_calibrated_500?: boolean
          is_calibrated_1000?: boolean
          is_calibrated_2000?: boolean
          is_calibrated_4000?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reference_db_500_values?: number[] | null
          reference_db_1000_values?: number[] | null
          reference_db_2000_values?: number[] | null
          reference_db_4000_values?: number[] | null
          applied_db_500?: number | null
          applied_db_1000?: number | null
          applied_db_2000?: number | null
          applied_db_4000?: number | null
          is_calibrated_500?: boolean
          is_calibrated_1000?: boolean
          is_calibrated_2000?: boolean
          is_calibrated_4000?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          age: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          patient_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          patient_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          patient_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      test_results: {
        Row: {
          created_at: string
          duration_seconds: number | null
          environment_noise_level: number | null
          id: string
          notes: string | null
          overall_result: string
          patient_id: string
          remarks: string | null
          test_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          environment_noise_level?: number | null
          id?: string
          notes?: string | null
          overall_result: string
          patient_id: string
          remarks?: string | null
          test_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          environment_noise_level?: number | null
          id?: string
          notes?: string | null
          overall_result?: string
          patient_id?: string
          remarks?: string | null
          test_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      threshold_results: {
        Row: {
          created_at: string
          ear: string
          frequency: number
          id: string
          passed: boolean
          test_result_id: string
          threshold: number
        }
        Insert: {
          created_at?: string
          ear: string
          frequency: number
          id?: string
          passed: boolean
          test_result_id: string
          threshold: number
        }
        Update: {
          created_at?: string
          ear?: string
          frequency?: number
          id?: string
          passed?: boolean
          test_result_id?: string
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "threshold_results_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
