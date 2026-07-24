export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type ProfileRole = "student" | "advisor" | "admin";
type ConversationStatus = "open" | "resolved" | "archived";
type MessageType = "text" | "file" | "system";

export interface Database {
  crm: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          clerk_user_id: string;
          email: string | null;
          display_name: string;
          role: ProfileRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          email?: string | null;
          display_name: string;
          role: ProfileRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          email?: string | null;
          display_name?: string;
          role?: ProfileRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          created_by_profile_id: string;
          subject: string;
          status: ConversationStatus;
          last_message_at: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          created_by_profile_id: string;
          subject?: string;
          status?: ConversationStatus;
          last_message_at?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          created_by_profile_id?: string;
          subject?: string;
          status?: ConversationStatus;
          last_message_at?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          profile_id: string;
          participant_role: ProfileRole;
          joined_at: string;
          last_read_at: string | null;
          muted_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          profile_id: string;
          participant_role: ProfileRole;
          joined_at?: string;
          last_read_at?: string | null;
          muted_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          profile_id?: string;
          participant_role?: ProfileRole;
          joined_at?: string;
          last_read_at?: string | null;
          muted_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_participants_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_profile_id: string;
          reply_to_message_id: string | null;
          body: string | null;
          message_type: MessageType;
          edited_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_profile_id: string;
          reply_to_message_id?: string | null;
          body?: string | null;
          message_type?: MessageType;
          edited_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_profile_id?: string;
          reply_to_message_id?: string | null;
          body?: string | null;
          message_type?: MessageType;
          edited_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_profile_id_fkey";
            columns: ["sender_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_reply_to_message_id_fkey";
            columns: ["reply_to_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          id: string;
          message_id: string;
          uploaded_by_profile_id: string;
          storage_bucket: string;
          storage_path: string;
          filename: string;
          mime_type: string;
          byte_size: number;
          checksum_sha256: string | null;
          width: number | null;
          height: number | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          message_id: string;
          uploaded_by_profile_id: string;
          storage_bucket?: string;
          storage_path: string;
          filename: string;
          mime_type: string;
          byte_size: number;
          checksum_sha256?: string | null;
          width?: number | null;
          height?: number | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          message_id?: string;
          uploaded_by_profile_id?: string;
          storage_bucket?: string;
          storage_path?: string;
          filename?: string;
          mime_type?: string;
          byte_size?: number;
          checksum_sha256?: string | null;
          width?: number | null;
          height?: number | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_uploaded_by_profile_id_fkey";
            columns: ["uploaded_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_clerk_user_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      current_profile_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      current_profile_role: {
        Args: Record<PropertyKey, never>;
        Returns: ProfileRole | null;
      };
      is_current_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_conversation_participant: {
        Args: { target_conversation_id: string };
        Returns: boolean;
      };
      is_conversation_creator: {
        Args: { target_conversation_id: string };
        Returns: boolean;
      };
      can_manage_conversation: {
        Args: { target_conversation_id: string };
        Returns: boolean;
      };
      shares_conversation_with: {
        Args: { target_profile_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
