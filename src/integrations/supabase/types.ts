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
      box_fixed_flavors: {
        Row: {
          box_id: string
          flavor_id: string
          id: string
          quantity: number
        }
        Insert: {
          box_id: string
          flavor_id: string
          id?: string
          quantity: number
        }
        Update: {
          box_id?: string
          flavor_id?: string
          id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "box_fixed_flavors_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "box_fixed_flavors_flavor_id_fkey"
            columns: ["flavor_id"]
            isOneToOne: false
            referencedRelation: "flavors"
            referencedColumns: ["id"]
          },
        ]
      }
      boxes: {
        Row: {
          cookie_count: number
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_best_seller: boolean
          name_ar: string | null
          name_en: string
          price: number
          slug: string
          sort_order: number
          type: Database["public"]["Enums"]["box_type"]
          updated_at: string
        }
        Insert: {
          cookie_count: number
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_best_seller?: boolean
          name_ar?: string | null
          name_en: string
          price: number
          slug: string
          sort_order?: number
          type?: Database["public"]["Enums"]["box_type"]
          updated_at?: string
        }
        Update: {
          cookie_count?: number
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_best_seller?: boolean
          name_ar?: string | null
          name_en?: string
          price?: number
          slug?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["box_type"]
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          expires_at: string | null
          id: string
          min_subtotal: number
          type: Database["public"]["Enums"]["coupon_type"]
          value: number
          usage_limit: number | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          min_subtotal?: number
          type: Database["public"]["Enums"]["coupon_type"]
          value: number
          usage_limit?: number | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          min_subtotal?: number
          type?: Database["public"]["Enums"]["coupon_type"]
          value?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer_ar: string | null
          answer_en: string
          created_at: string
          id: string
          is_published: boolean
          question_ar: string | null
          question_en: string
          sort_order: number
        }
        Insert: {
          answer_ar?: string | null
          answer_en: string
          created_at?: string
          id?: string
          is_published?: boolean
          question_ar?: string | null
          question_en: string
          sort_order?: number
        }
        Update: {
          answer_ar?: string | null
          answer_en?: string
          created_at?: string
          id?: string
          is_published?: boolean
          question_ar?: string | null
          question_en?: string
          sort_order?: number
        }
        Relationships: []
      }
      flavors: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          image_url: string | null
          is_available: boolean
          is_limited_edition: boolean
          is_out_of_stock: boolean
          name_ar: string | null
          name_en: string
          price: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_limited_edition?: boolean
          is_out_of_stock?: boolean
          name_ar?: string | null
          name_en: string
          price?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_limited_edition?: boolean
          is_out_of_stock?: boolean
          name_ar?: string | null
          name_en?: string
          price?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      flavor_box_prices: {
        Row: {
          id: string
          flavor_id: string
          box_id: string
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          flavor_id: string
          box_id: string
          price: number
          created_at?: string
        }
        Update: {
          id?: string
          flavor_id?: string
          box_id?: string
          price?: number
          created_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          box_id: string | null
          box_name: string
          cookie_count: number
          id: string
          order_id: string
          quantity: number
          selected_flavors: Json
          unit_price: number
        }
        Insert: {
          box_id?: string | null
          box_name: string
          cookie_count: number
          id?: string
          order_id: string
          quantity?: number
          selected_flavors?: Json
          unit_price: number
        }
        Update: {
          box_id?: string | null
          box_name?: string
          cookie_count?: number
          id?: string
          order_id?: string
          quantity?: number
          selected_flavors?: Json
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          delivery_fee: number
          discount: number
          id: string
          meta_event_id: string | null
          notes: string | null
          order_number: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          customer_address: string
          customer_name: string
          customer_phone: string
          delivery_fee?: number
          discount?: number
          id?: string
          meta_event_id?: string | null
          notes?: string | null
          order_number?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          customer_address?: string
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          discount?: number
          id?: string
          meta_event_id?: string | null
          notes?: string | null
          order_number?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          is_published: boolean
          name: string
          rating: number
          sort_order: number
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          name: string
          rating: number
          sort_order?: number
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          name?: string
          rating?: number
          sort_order?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          delivery_fee: number
          hero_eyebrow_ar: string | null
          hero_eyebrow_en: string | null
          hero_subtitle_ar: string | null
          hero_subtitle_en: string | null
          hero_title_ar: string | null
          hero_title_en: string | null
          id: number
          logo_url: string | null
          meta_capi_token: string | null
          meta_pixel_id: string | null
          meta_test_event_code: string | null
          store_name: string
          store_tagline_ar: string | null
          store_tagline_en: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          delivery_fee?: number
          hero_eyebrow_ar?: string | null
          hero_eyebrow_en?: string | null
          hero_subtitle_ar?: string | null
          hero_subtitle_en?: string | null
          hero_title_ar?: string | null
          hero_title_en?: string | null
          id?: number
          logo_url?: string | null
          meta_capi_token?: string | null
          meta_pixel_id?: string | null
          meta_test_event_code?: string | null
          store_name?: string
          store_tagline_ar?: string | null
          store_tagline_en?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          delivery_fee?: number
          hero_eyebrow_ar?: string | null
          hero_eyebrow_en?: string | null
          hero_subtitle_ar?: string | null
          hero_subtitle_en?: string | null
          hero_title_ar?: string | null
          hero_title_en?: string | null
          id?: number
          logo_url?: string | null
          meta_capi_token?: string | null
          meta_pixel_id?: string | null
          meta_test_event_code?: string | null
          store_name?: string
          store_tagline_ar?: string | null
          store_tagline_en?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      box_type: "fixed" | "byo"
      coupon_type: "percent" | "fixed"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
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
      app_role: ["admin", "staff"],
      box_type: ["fixed", "byo"],
      coupon_type: ["percent", "fixed"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
