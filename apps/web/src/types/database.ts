export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          plan_tier: string;
          trial_ends_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          plan_tier?: string;
          trial_ends_at?: string | null;
          created_at?: string;
        };
        Update: {
          display_name?: string | null;
          plan_tier?: string;
          trial_ends_at?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          tier: string;
          status: string;
          requirements_json: Json | null;
          payment_intent_id: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          tier?: string;
          status?: string;
          requirements_json?: Json | null;
          payment_intent_id?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          tier?: string;
          status?: string;
          requirements_json?: Json | null;
          payment_intent_id?: string | null;
          paid_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          project_id: string;
          role: string;
          content: string;
          phase: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          role: string;
          content: string;
          phase?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          }
        ];
      };
      user_integrations: {
        Row: {
          id: string;
          user_id: string;
          service: string;
          encrypted_token: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          service: string;
          encrypted_token: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          encrypted_token?: string;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_integrations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Project = Database['public']['Tables']['projects']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
