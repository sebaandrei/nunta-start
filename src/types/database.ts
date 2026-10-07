
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "allowed_emails": {
                  Row: {
                    "created_at": string,"email": string,"note": string | null
                  }
                  Insert: {
                    "created_at"?: string,"email": string,"note"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"note"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"budget_lines": {
                  Row: {
                    "created_at": string,"currency": Database["public"]['Enums']["currency"],"id": string,"name": string,"note": string,"paid": number | null,"position": number,"qty_count": number | null,"qty_kind": string,"unit_price": number | null,"updated_at": string,"updated_by": string | null,"vendor_id": string | null,"wedding_id": string
                  }
                  Insert: {
                    "created_at"?: string,"currency"?: Database["public"]['Enums']["currency"],"id"?: string,"name": string,"note"?: string,"paid"?: number | null,"position"?: number,"qty_count"?: number | null,"qty_kind"?: string,"unit_price"?: number | null,"updated_at"?: string,"updated_by"?: string | null,"vendor_id"?: string | null,"wedding_id": string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: Database["public"]['Enums']["currency"],"id"?: string,"name"?: string,"note"?: string,"paid"?: number | null,"position"?: number,"qty_count"?: number | null,"qty_kind"?: string,"unit_price"?: number | null,"updated_at"?: string,"updated_by"?: string | null,"vendor_id"?: string | null,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "budget_lines_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"budget_scenarios": {
                  Row: {
                    "created_at": string,"guests": number,"id": string,"position": number,"updated_at": string,"updated_by": string | null,"wedding_id": string
                  }
                  Insert: {
                    "created_at"?: string,"guests": number,"id"?: string,"position"?: number,"updated_at"?: string,"updated_by"?: string | null,"wedding_id": string
                  }
                  Update: {
                    "created_at"?: string,"guests"?: number,"id"?: string,"position"?: number,"updated_at"?: string,"updated_by"?: string | null,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "budget_scenarios_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"budget_settings": {
                  Row: {
                    "created_at": string,"family_gift": number | null,"family_gift_currency": Database["public"]['Enums']["currency"],"gift_per_guest": number | null,"gift_per_guest_currency": Database["public"]['Enums']["currency"],"selected_scenario_id": string | null,"updated_at": string,"updated_by": string | null,"wedding_id": string
                  }
                  Insert: {
                    "created_at"?: string,"family_gift"?: number | null,"family_gift_currency"?: Database["public"]['Enums']["currency"],"gift_per_guest"?: number | null,"gift_per_guest_currency"?: Database["public"]['Enums']["currency"],"selected_scenario_id"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"wedding_id": string
                  }
                  Update: {
                    "created_at"?: string,"family_gift"?: number | null,"family_gift_currency"?: Database["public"]['Enums']["currency"],"gift_per_guest"?: number | null,"gift_per_guest_currency"?: Database["public"]['Enums']["currency"],"selected_scenario_id"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "budget_settings_selected_scenario_id_wedding_id_fkey"
      columns: ["selected_scenario_id","wedding_id"]
isOneToOne: false
      referencedRelation: "budget_scenarios"
      referencedColumns: ["id","wedding_id"]
    },{
      foreignKeyName: "budget_settings_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: true
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"invitations": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"created_at": string,"declined_at": string | null,"email": string,"expires_at": string,"id": string,"invited_by": string | null,"role": Database["public"]['Enums']["member_role"],"token_hash": string,"wedding_id": string
                  }
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"declined_at"?: string | null,"email": string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"role": Database["public"]['Enums']["member_role"],"token_hash": string,"wedding_id": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"declined_at"?: string | null,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"token_hash"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitations_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"email_digest": boolean,"id": string,"locale": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"display_name"?: string,"email_digest"?: boolean,"id": string,"locale"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"email_digest"?: boolean,"id"?: string,"locale"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tasks": {
                  Row: {
                    "assignee": string,"category": string,"created_at": string,"days_before": number | null,"details": string,"id": string,"manual_date": string | null,"note": string,"position": number,"status": string,"template_key": string | null,"title": string,"updated_at": string,"updated_by": string | null,"wedding_id": string
                  }
                  Insert: {
                    "assignee"?: string,"category": string,"created_at"?: string,"days_before"?: number | null,"details"?: string,"id"?: string,"manual_date"?: string | null,"note"?: string,"position"?: number,"status"?: string,"template_key"?: string | null,"title": string,"updated_at"?: string,"updated_by"?: string | null,"wedding_id": string
                  }
                  Update: {
                    "assignee"?: string,"category"?: string,"created_at"?: string,"days_before"?: number | null,"details"?: string,"id"?: string,"manual_date"?: string | null,"note"?: string,"position"?: number,"status"?: string,"template_key"?: string | null,"title"?: string,"updated_at"?: string,"updated_by"?: string | null,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"wedding_members": {
                  Row: {
                    "created_at": string,"id": string,"role": Database["public"]['Enums']["member_role"],"updated_at": string,"updated_by": string | null,"user_id": string,"wedding_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"role": Database["public"]['Enums']["member_role"],"updated_at"?: string,"updated_by"?: string | null,"user_id": string,"wedding_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"role"?: Database["public"]['Enums']["member_role"],"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string,"wedding_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wedding_members_wedding_id_fkey"
      columns: ["wedding_id"]
isOneToOne: false
      referencedRelation: "weddings"
      referencedColumns: ["id"]
    }
                  ]
                },"weddings": {
                  Row: {
                    "city": string | null,"created_at": string,"deleted_at": string | null,"display_currency": Database["public"]['Enums']["currency"],"eur_rate": number,"godparents": NonNullable<Json>,"id": string,"name": string,"partner1_name": string,"partner2_name": string,"updated_at": string,"updated_by": string | null,"wedding_date": string | null
                  }
                  Insert: {
                    "city"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"display_currency"?: Database["public"]['Enums']["currency"],"eur_rate"?: number,"godparents"?: NonNullable<Json>,"id"?: string,"name": string,"partner1_name"?: string,"partner2_name"?: string,"updated_at"?: string,"updated_by"?: string | null,"wedding_date"?: string | null
                  }
                  Update: {
                    "city"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"display_currency"?: Database["public"]['Enums']["currency"],"eur_rate"?: number,"godparents"?: NonNullable<Json>,"id"?: string,"name"?: string,"partner1_name"?: string,"partner2_name"?: string,"updated_at"?: string,"updated_by"?: string | null,"wedding_date"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invitation":
{ Args: { "p_token": string }; Returns: string
                           },
"clear_budget_amounts":
{ Args: { "p_wedding_id": string }; Returns: undefined
                           },
"create_invitation":
{ Args: { "p_email": string,"p_role": Database["public"]['Enums']["member_role"],"p_wedding_id": string }; Returns: Json
                           },
"create_wedding":
{ Args: { "budget_template": Json,"input": Json,"tasks_template": Json }; Returns: string
                           },
"decline_invitation":
{ Args: { "p_token": string }; Returns: undefined
                           },
"inspect_invitation":
{ Args: { "p_token": string }; Returns: Json
                           },
"list_wedding_members":
{ Args: { "p_wedding_id": string }; Returns: {
              "email": string,"id": string,"is_self": boolean,"name": string,"role": Database["public"]['Enums']["member_role"]
            }[]
                           }
          }
          Enums: {
            "currency": "EUR"|"RON","member_role": "owner"|"partner"|"planner"|"helper"|"viewer"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "currency": ["EUR", "RON"],"member_role": ["owner", "partner", "planner", "helper", "viewer"]
          }
        }
} as const
