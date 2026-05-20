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
      admin_push_tokens: {
        Row: {
          created_at: string
          device_label: string | null
          id: string
          tenant_id: string
          token: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          id?: string
          tenant_id: string
          token: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          id?: string
          tenant_id?: string
          token?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }   
      atendimentos: {
        Row: {
          created_at: string
          customer_name: string
          event_id: string
          final_price: number
          id: string
          order_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          quantity: number
          status: Database["public"]["Enums"]["atendimento_status"]
          tenant_id: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          customer_name?: string
          event_id: string
          final_price?: number
          id?: string
          order_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          quantity?: number
          status?: Database["public"]["Enums"]["atendimento_status"]
          tenant_id: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          event_id?: string
          final_price?: number
          id?: string
          order_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          quantity?: number
          status?: Database["public"]["Enums"]["atendimento_status"]
          tenant_id?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "selections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photos: {
        Row: {
          captured_at: string | null
          created_at: string
          event_id: string
          filename: string | null
          id: string
          photo_code: string
          preview_path: string
          sort_order: number
          storage_path: string
          tenant_id: string
          thumbnail_path: string
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          event_id: string
          filename?: string | null
          id?: string
          photo_code: string
          preview_path: string
          sort_order?: number
          storage_path: string
          tenant_id: string
          thumbnail_path: string
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          event_id?: string
          filename?: string | null
          id?: string
          photo_code?: string
          preview_path?: string
          sort_order?: number
          storage_path?: string
          tenant_id?: string
          thumbnail_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_photos_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_visits: {
        Row: {
          created_at: string
          event_id: string
          id: string
          ip_hash: string | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          ip_hash?: string | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          ip_hash?: string | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_visits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_visits_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_photo_id: string | null
          created_at: string
          event_date: string | null
          id: string
          location: string | null
          name: string
          payment_mode: string
          price_per_photo: number
          slug: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cover_photo_id?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          location?: string | null
          name: string
          payment_mode?: string
          price_per_photo?: number
          slug: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cover_photo_id?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          location?: string | null
          name?: string
          payment_mode?: string
          price_per_photo?: number
          slug?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_cover_photo_id_fkey"
            columns: ["cover_photo_id"]
            isOneToOne: false
            referencedRelation: "event_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_edit_history: {
        Row: {
          created_at: string
          edited_by: string | null
          id: string
          new_payment_method: string | null
          new_price: number | null
          new_quantity: number | null
          new_status: string | null
          order_id: string
          previous_payment_method: string | null
          previous_price: number | null
          previous_quantity: number | null
          previous_status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          edited_by?: string | null
          id?: string
          new_payment_method?: string | null
          new_price?: number | null
          new_quantity?: number | null
          new_status?: string | null
          order_id: string
          previous_payment_method?: string | null
          previous_price?: number | null
          previous_quantity?: number | null
          previous_status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          edited_by?: string | null
          id?: string
          new_payment_method?: string | null
          new_price?: number | null
          new_quantity?: number | null
          new_status?: string | null
          order_id?: string
          previous_payment_method?: string | null
          previous_price?: number | null
          previous_quantity?: number | null
          previous_status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_edit_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_edit_history_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_proofs: {
        Row: {
          created_at: string
          file_path: string
          id: string
          original_filename: string | null
          selection_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          original_filename?: string | null
          selection_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          original_filename?: string | null
          selection_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: []
      }
      photographer_settings: {
        Row: {
          created_at: string
          default_price_per_photo: number
          id: string
          photographer_name: string
          pix_key: string
          pix_qrcode_url: string
          pix_recipient_name: string
          tenant_id: string
          updated_at: string
          watermark_text: string
          whatsapp_number: string
        }
        Insert: {
          created_at?: string
          default_price_per_photo?: number
          id?: string
          photographer_name?: string
          pix_key?: string
          pix_qrcode_url?: string
          pix_recipient_name?: string
          tenant_id: string
          updated_at?: string
          watermark_text?: string
          whatsapp_number?: string
        }
        Update: {
          created_at?: string
          default_price_per_photo?: number
          id?: string
          photographer_name?: string
          pix_key?: string
          pix_qrcode_url?: string
          pix_recipient_name?: string
          tenant_id?: string
          updated_at?: string
          watermark_text?: string
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "photographer_settings_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      selection_photos: {
        Row: {
          id: string
          photo_id: string
          selection_id: string
          tenant_id: string
        }
        Insert: {
          id?: string
          photo_id: string
          selection_id: string
          tenant_id: string
        }
        Update: {
          id?: string
          photo_id?: string
          selection_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selection_photos_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "event_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selection_photos_selection_id_fkey"
            columns: ["selection_id"]
            isOneToOne: false
            referencedRelation: "selections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selection_photos_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      selections: {
        Row: {
          created_at: string
          customer_name: string
          download_enabled: boolean
          download_expires_at: string | null
          event_id: string
          id: string
          payment_approved_at: string | null
          payment_method: string
          payment_status: string
          public_token: string
          status: string
          tenant_id: string
          total_photos: number
          total_price: number
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          customer_name?: string
          download_enabled?: boolean
          download_expires_at?: string | null
          event_id: string
          id?: string
          payment_approved_at?: string | null
          payment_method?: string
          payment_status?: string
          public_token?: string
          status?: string
          tenant_id: string
          total_photos?: number
          total_price?: number
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          download_enabled?: boolean
          download_expires_at?: string | null
          event_id?: string
          id?: string
          payment_approved_at?: string | null
          payment_method?: string
          payment_status?: string
          public_token?: string
          status?: string
          tenant_id?: string
          total_photos?: number
          total_price?: number
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "selections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selections_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          company_name: string | null
          created_at: string
          id: string
          name: string
          plan: string
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          id?: string
          name: string
          plan?: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          id?: string
          name?: string
          plan?: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _notify_admin_push: {
        Args: {
          p_body: string
          p_tag: string
          p_tenant: string
          p_title: string
          p_url: string
        }
        Returns: undefined
      }
      get_my_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_tenant_admin: { Args: { _tenant_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      atendimento_status: "novo" | "em_atendimento" | "pago" | "entregue"
      payment_method: "pix" | "dinheiro" | "cartao" | "outro"
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
      app_role: ["admin", "user"],
      atendimento_status: ["novo", "em_atendimento", "pago", "entregue"],
      payment_method: ["pix", "dinheiro", "cartao", "outro"],
    },
  },
} as const