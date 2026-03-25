// Auto-generated Supabase type definitions for Northstar.
// Regenerate with: npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      team_members: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_url: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          avatar_url?: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          avatar_url?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      timeline_items: {
        Row: {
          id: string;
          title: string;
          description: string;
          type: 'project' | 'milestone' | 'task';
          parent_id: string | null;
          status: 'not_started' | 'in_progress' | 'at_risk' | 'complete';
          priority: 'p0' | 'p1' | 'p2' | 'p3';
          owner_id: string | null;
          start_date: string;
          end_date: string;
          progress: number;
          dependencies: string[];
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          type?: 'project' | 'milestone' | 'task';
          parent_id?: string | null;
          status?: 'not_started' | 'in_progress' | 'at_risk' | 'complete';
          priority?: 'p0' | 'p1' | 'p2' | 'p3';
          owner_id?: string | null;
          start_date: string;
          end_date: string;
          progress?: number;
          dependencies?: string[];
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          type?: 'project' | 'milestone' | 'task';
          parent_id?: string | null;
          status?: 'not_started' | 'in_progress' | 'at_risk' | 'complete';
          priority?: 'p0' | 'p1' | 'p2' | 'p3';
          owner_id?: string | null;
          start_date?: string;
          end_date?: string;
          progress?: number;
          dependencies?: string[];
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      objectives: {
        Row: {
          id: string;
          title: string;
          description: string;
          owner_id: string | null;
          period: string;
          status: 'on_track' | 'at_risk' | 'off_track';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          owner_id?: string | null;
          period: string;
          status?: 'on_track' | 'at_risk' | 'off_track';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          owner_id?: string | null;
          period?: string;
          status?: 'on_track' | 'at_risk' | 'off_track';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      key_results: {
        Row: {
          id: string;
          objective_id: string;
          title: string;
          owner_id: string | null;
          metric_type: 'number' | 'percentage' | 'currency' | 'binary';
          start_value: number;
          current_value: number;
          target_value: number;
          confidence: 'on_track' | 'at_risk' | 'off_track';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          objective_id: string;
          title: string;
          owner_id?: string | null;
          metric_type?: 'number' | 'percentage' | 'currency' | 'binary';
          start_value?: number;
          current_value?: number;
          target_value?: number;
          confidence?: 'on_track' | 'at_risk' | 'off_track';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          objective_id?: string;
          title?: string;
          owner_id?: string | null;
          metric_type?: 'number' | 'percentage' | 'currency' | 'binary';
          start_value?: number;
          current_value?: number;
          target_value?: number;
          confidence?: 'on_track' | 'at_risk' | 'off_track';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      check_ins: {
        Row: {
          id: string;
          key_result_id: string;
          value: number;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          key_result_id: string;
          value: number;
          note?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          key_result_id?: string;
          value?: number;
          note?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      activity_events: {
        Row: {
          id: string;
          text: string;
          type: 'status_change' | 'progress' | 'created' | 'checkin';
          created_at: string;
        };
        Insert: {
          id?: string;
          text: string;
          type?: 'status_change' | 'progress' | 'created' | 'checkin';
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
