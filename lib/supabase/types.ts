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
type OrganizationType =
  "partner_school" | "advising_agency" | "sponsor" | "operating_unit";
type OrganizationStatus = "active" | "archived";
type OrganizationAdvisorRole = "primary" | "support" | "manager";
type OrganizationStudentMembership =
  "client" | "sponsored" | "referred" | "managed";
type OrganizationStudentStatus = "active" | "ended";

export interface Database {
  crm: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          organization_type: OrganizationType;
          status: OrganizationStatus;
          email: string | null;
          phone: string | null;
          website: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          organization_type: OrganizationType;
          status?: OrganizationStatus;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          organization_type?: OrganizationType;
          status?: OrganizationStatus;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      organization_advisors: {
        Row: {
          id: string;
          organization_id: string;
          advisor_profile_id: string;
          assignment_role: OrganizationAdvisorRole;
          starts_at: string;
          ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          advisor_profile_id: string;
          assignment_role?: OrganizationAdvisorRole;
          starts_at?: string;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          advisor_profile_id?: string;
          assignment_role?: OrganizationAdvisorRole;
          starts_at?: string;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_advisors_organization_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_advisors_profile_fkey";
            columns: ["advisor_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_students: {
        Row: {
          id: string;
          organization_id: string;
          student_profile_id: string;
          membership_type: OrganizationStudentMembership;
          status: OrganizationStudentStatus;
          is_primary: boolean;
          external_student_reference: string | null;
          starts_at: string;
          ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_profile_id: string;
          membership_type?: OrganizationStudentMembership;
          status?: OrganizationStudentStatus;
          is_primary?: boolean;
          external_student_reference?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          student_profile_id?: string;
          membership_type?: OrganizationStudentMembership;
          status?: OrganizationStudentStatus;
          is_primary?: boolean;
          external_student_reference?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_students_organization_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_students_profile_fkey";
            columns: ["student_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
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
      student_profiles: {
        Row: {
          profile_id: string;
          phone: string | null;
          date_of_birth: string | null;
          nationality: string | null;
          current_country: string | null;
          passport_number: string | null;
          highest_qualification: string | null;
          institution: string | null;
          gpa: number | null;
          graduation_year: number | null;
          english_test_type: string | null;
          english_test_score: number | null;
          preferred_destination_country: string | null;
          preferred_degree: string | null;
          preferred_program: string | null;
          intended_intake: string | null;
          budget: number | null;
          budget_currency: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          profile_id: string;
          phone?: string | null;
          date_of_birth?: string | null;
          nationality?: string | null;
          current_country?: string | null;
          passport_number?: string | null;
          highest_qualification?: string | null;
          institution?: string | null;
          gpa?: number | null;
          graduation_year?: number | null;
          english_test_type?: string | null;
          english_test_score?: number | null;
          preferred_destination_country?: string | null;
          preferred_degree?: string | null;
          preferred_program?: string | null;
          intended_intake?: string | null;
          budget?: number | null;
          budget_currency?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          phone?: string | null;
          date_of_birth?: string | null;
          nationality?: string | null;
          current_country?: string | null;
          passport_number?: string | null;
          highest_qualification?: string | null;
          institution?: string | null;
          gpa?: number | null;
          graduation_year?: number | null;
          english_test_type?: string | null;
          english_test_score?: number | null;
          preferred_destination_country?: string | null;
          preferred_degree?: string | null;
          preferred_program?: string | null;
          intended_intake?: string | null;
          budget?: number | null;
          budget_currency?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "student_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      student_documents: {
        Row: {
          id: string;
          profile_id: string;
          document_type: string;
          custom_document_name: string | null;
          original_filename: string;
          storage_bucket: string;
          storage_path: string;
          mime_type: string;
          file_size_bytes: number;
          status: string;
          review_notes: string | null;
          uploaded_by_profile_id: string;
          reviewed_by_profile_id: string | null;
          reviewed_at: string | null;
          expires_at: string | null;
          replaces_document_id: string | null;
          revision_number: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          document_type: string;
          custom_document_name?: string | null;
          original_filename: string;
          storage_bucket?: string;
          storage_path: string;
          mime_type: string;
          file_size_bytes: number;
          status?: string;
          review_notes?: string | null;
          uploaded_by_profile_id: string;
          reviewed_by_profile_id?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          replaces_document_id?: string | null;
          revision_number?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          status?: string;
          review_notes?: string | null;
          reviewed_by_profile_id?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "student_documents_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_documents_uploader_fkey";
            columns: ["uploaded_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_documents_reviewer_fkey";
            columns: ["reviewed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_documents_replaces_fkey";
            columns: ["replaces_document_id"];
            isOneToOne: false;
            referencedRelation: "student_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      student_tasks: {
        Row: {
          id: string;
          student_profile_id: string;
          title: string;
          description: string | null;
          status: string;
          priority: string;
          visibility: string;
          assigned_to_profile_id: string;
          created_by_profile_id: string;
          completed_by_profile_id: string | null;
          document_id: string | null;
          due_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      student_notes: {
        Row: {
          id: string;
          student_profile_id: string;
          created_by_profile_id: string;
          title: string;
          body: string;
          note_type: string;
          is_pinned: boolean;
          pinned_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "student_notes_student_fkey";
            columns: ["student_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_notes_creator_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      domain_events: {
        Row: {
          id: string;
          event_type: string;
          aggregate_type: string;
          aggregate_id: string;
          student_profile_id: string | null;
          actor_profile_id: string | null;
          occurred_at: string;
          payload: Json;
          correlation_id: string;
          causation_id: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      timeline_events: {
        Row: {
          id: string;
          domain_event_id: string;
          student_profile_id: string;
          event_type: string;
          subject_type: string;
          subject_id: string;
          actor_profile_id: string | null;
          occurred_at: string;
          metadata: Json;
          created_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      document_requirements: {
        Row: {
          id: string;
          parent_requirement_id: string | null;
          scope_type: string;
          country_code: string;
          university_key: string | null;
          program_key: string | null;
          document_type: string;
          custom_document_name: string | null;
          requirement_level: string;
          condition_definition: Json | null;
          guidance: string | null;
          created_by_profile_id: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      student_readiness: {
        Row: {
          student_profile_id: string;
          total_score: number;
          profile_score: number;
          document_score: number;
          task_score: number;
          application_score: number;
          components: Json;
          calculated_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          profile_id: string;
          in_app_enabled: boolean;
          event_preferences: Json;
          future_channels: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_profile_id: string;
          actor_profile_id: string | null;
          domain_event_id: string;
          notification_type: string;
          title: string;
          body: string;
          severity: string;
          data: Json;
          read_at: string | null;
          dismissed_at: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      activity_feed_entries: {
        Row: {
          id: string;
          domain_event_id: string;
          event_type: string;
          aggregate_type: string;
          aggregate_id: string;
          student_profile_id: string | null;
          actor_profile_id: string | null;
          occurred_at: string;
          details: Json;
          created_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      workflow_definitions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          event_pattern: string;
          conditions: Json;
          actions: Json;
          priority: number;
          is_enabled: boolean;
          created_by_profile_id: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      workflow_runs: {
        Row: {
          id: string;
          workflow_definition_id: string;
          domain_event_id: string;
          status: string;
          scheduled_for: string;
          started_at: string | null;
          completed_at: string | null;
          attempt_count: number;
          result: Json | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      scheduled_work: {
        Row: {
          id: string;
          workflow_run_id: string;
          student_profile_id: string | null;
          work_type: string;
          payload: Json;
          scheduled_for: string;
          status: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          domain_event_id: string;
          actor_profile_id: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          previous_values: Json | null;
          new_values: Json | null;
          occurred_at: string;
          correlation_id: string;
          causation_id: string | null;
          ip_address: string | null;
          device_metadata: Json | null;
          created_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      analytics_snapshots: {
        Row: {
          id: string;
          period_start: string;
          period_end: string;
          metrics: Json;
          source_event_count: number;
          calculated_by_profile_id: string;
          calculated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      student_applications: {
        Row: {
          id: string;
          student_profile_id: string;
          intake_id: string;
          advisor_profile_id: string | null;
          status: string;
          external_reference: string | null;
          submitted_at: string | null;
          closed_at: string | null;
          withdrawn_at: string | null;
          archived_at: string | null;
          created_by_profile_id: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      visa_cases: {
        Row: {
          id: string;
          student_profile_id: string;
          application_id: string | null;
          destination_country_id: string;
          embassy_id: string | null;
          advisor_profile_id: string | null;
          visa_type: string;
          stage: string;
          external_reference: string | null;
          target_submission_date: string | null;
          submitted_at: string | null;
          closed_at: string | null;
          created_by_profile_id: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      visa_case_readiness: {
        Row: {
          visa_case_id: string;
          total_score: number;
          checklist_score: number;
          document_score: number;
          interview_score: number;
          passport_score: number;
          travel_score: number;
          components: Json;
          calculated_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      ai_invocations: {
        Row: {
          id: string;
          requester_profile_id: string;
          student_profile_id: string;
          capability: string;
          requester_role: ProfileRole;
          model: string;
          status: string;
          request_metadata: Json;
          citations: Json;
          usage_metadata: Json;
          latency_ms: number | null;
          error_code: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      operational_rate_limits: {
        Row: {
          scope: string;
          key_hash: string;
          window_started_at: string;
          request_count: number;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      ai_daily_usage: {
        Row: {
          profile_id: string;
          usage_date: string;
          request_count: number;
          input_tokens: number;
          output_tokens: number;
          failed_count: number;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
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
      operational_readiness: {
        Args: Record<PropertyKey, never>;
        Returns: {
          database: boolean;
          checked_at: string;
        };
      };
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
      can_access_student: {
        Args: { target_student_profile_id: string };
        Returns: boolean;
      };
      can_manage_student: {
        Args: { target_student_profile_id: string };
        Returns: boolean;
      };
      is_organization_advisor: {
        Args: { target_organization_id: string };
        Returns: boolean;
      };
      is_organization_student: {
        Args: { target_organization_id: string };
        Returns: boolean;
      };
      can_access_organization: {
        Args: { target_organization_id: string };
        Returns: boolean;
      };
      can_access_document: {
        Args: { target_document_id: string };
        Returns: boolean;
      };
      can_access_task: {
        Args: { target_task_id: string };
        Returns: boolean;
      };
      can_access_note: {
        Args: { target_note_id: string };
        Returns: boolean;
      };
      can_access_application: {
        Args: { target_application_id: string };
        Returns: boolean;
      };
      can_manage_application: {
        Args: { target_application_id: string };
        Returns: boolean;
      };
      can_access_visa_case: {
        Args: { target_visa_case_id: string };
        Returns: boolean;
      };
      can_manage_visa_case: {
        Args: { target_visa_case_id: string };
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
      create_student_conversation: {
        Args: { conversation_subject?: string };
        Returns: Database["crm"]["Tables"]["conversations"]["Row"];
      };
      review_student_document: {
        Args: {
          target_document_id: string;
          new_status: string;
          new_review_notes?: string | null;
        };
        Returns: Database["crm"]["Tables"]["student_documents"]["Row"];
      };
      create_student_task: {
        Args: {
          target_student_profile_id: string;
          task_title: string;
          task_description: string;
          task_priority: string;
          task_visibility: string;
          target_assigned_to_profile_id: string;
          task_due_at?: string | null;
          target_document_id?: string | null;
        };
        Returns: Database["crm"]["Tables"]["student_tasks"]["Row"];
      };
      update_student_task_status: {
        Args: { target_task_id: string; new_status: string };
        Returns: Database["crm"]["Tables"]["student_tasks"]["Row"];
      };
      update_student_task: {
        Args: {
          target_task_id: string;
          task_title: string;
          task_description: string;
          task_priority: string;
          task_visibility: string;
          target_assigned_to_profile_id: string;
          task_due_at?: string | null;
          target_document_id?: string | null;
        };
        Returns: Database["crm"]["Tables"]["student_tasks"]["Row"];
      };
      soft_delete_student_task: {
        Args: { target_task_id: string };
        Returns: Database["crm"]["Tables"]["student_tasks"]["Row"];
      };
      create_student_note: {
        Args: {
          target_student_profile_id: string;
          note_title: string;
          note_body: string;
          new_note_type?: string;
        };
        Returns: Database["crm"]["Tables"]["student_notes"]["Row"];
      };
      update_student_note: {
        Args: {
          target_note_id: string;
          note_title: string;
          note_body: string;
          new_note_type: string;
        };
        Returns: Database["crm"]["Tables"]["student_notes"]["Row"];
      };
      pin_student_note: {
        Args: { target_note_id: string; new_is_pinned: boolean };
        Returns: Database["crm"]["Tables"]["student_notes"]["Row"];
      };
      soft_delete_student_note: {
        Args: { target_note_id: string };
        Returns: Database["crm"]["Tables"]["student_notes"]["Row"];
      };
      get_effective_document_requirements: {
        Args: {
          target_student_profile_id: string;
          target_country_code?: string | null;
          target_university_key?: string | null;
          target_program_key?: string | null;
        };
        Returns: Database["crm"]["Tables"]["document_requirements"]["Row"][];
      };
      get_missing_document_requirements: {
        Args: {
          target_student_profile_id: string;
          target_country_code?: string | null;
          target_university_key?: string | null;
          target_program_key?: string | null;
        };
        Returns: Database["crm"]["Tables"]["document_requirements"]["Row"][];
      };
      document_requirement_applies: {
        Args: {
          target_requirement_id: string;
          target_student_profile_id: string;
        };
        Returns: boolean;
      };
      calculate_student_readiness: {
        Args: { target_student_profile_id: string };
        Returns: Database["crm"]["Tables"]["student_readiness"]["Row"];
      };
      upsert_notification_preferences: {
        Args: {
          target_profile_id: string;
          new_in_app_enabled: boolean;
          new_event_preferences: Json;
        };
        Returns: Database["crm"]["Tables"]["notification_preferences"]["Row"];
      };
      mark_notification_read: {
        Args: { target_notification_id: string; new_is_read?: boolean };
        Returns: Database["crm"]["Tables"]["notifications"]["Row"];
      };
      dismiss_notification: {
        Args: { target_notification_id: string };
        Returns: Database["crm"]["Tables"]["notifications"]["Row"];
      };
      process_workflow_run: {
        Args: { target_workflow_run_id: string };
        Returns: Database["crm"]["Tables"]["workflow_runs"]["Row"];
      };
      global_search: {
        Args: {
          search_query: string;
          result_limit?: number;
          result_offset?: number;
        };
        Returns: Array<{
          result_type: string;
          result_id: string;
          student_profile_id: string | null;
          title: string;
          summary: string;
          rank: number;
          metadata: Json;
        }>;
      };
      calculate_platform_analytics: {
        Args: {
          target_period_start: string;
          target_period_end: string;
        };
        Returns: Database["crm"]["Tables"]["analytics_snapshots"]["Row"];
      };
      create_student_application: {
        Args: {
          target_student_profile_id: string;
          target_intake_id: string;
          target_advisor_profile_id?: string | null;
        };
        Returns: Database["crm"]["Tables"]["student_applications"]["Row"];
      };
      update_application_status: {
        Args: {
          target_application_id: string;
          new_status: string;
          transition_reason?: string | null;
        };
        Returns: Database["crm"]["Tables"]["student_applications"]["Row"];
      };
      submit_student_application: {
        Args: { target_application_id: string };
        Returns: Database["crm"]["Tables"]["student_applications"]["Row"];
      };
      archive_student_application: {
        Args: { target_application_id: string };
        Returns: Database["crm"]["Tables"]["student_applications"]["Row"];
      };
      record_application_decision: {
        Args: {
          target_application_id: string;
          new_decision_type: string;
          new_conditions: string;
          new_decision_date: string;
          new_offer_expires_at?: string | null;
        };
        Returns: Json;
      };
      record_application_deposit: {
        Args: {
          target_application_id: string;
          new_amount: number;
          new_currency: string;
          new_status: string;
          new_due_date?: string | null;
          new_paid_at?: string | null;
          new_reference?: string | null;
        };
        Returns: Json;
      };
      link_application_note: {
        Args: {
          target_application_id: string;
          target_note_id: string;
        };
        Returns: Json;
      };
      create_visa_case: {
        Args: {
          target_student_profile_id: string;
          target_destination_country_id: string;
          new_visa_type: string;
          target_application_id?: string | null;
          target_embassy_id?: string | null;
          target_advisor_profile_id?: string | null;
          new_target_submission_date?: string | null;
          initial_checklist?: Json;
        };
        Returns: Database["crm"]["Tables"]["visa_cases"]["Row"];
      };
      update_visa_stage: {
        Args: {
          target_visa_case_id: string;
          new_stage: string;
          transition_reason?: string | null;
        };
        Returns: Database["crm"]["Tables"]["visa_cases"]["Row"];
      };
      calculate_visa_readiness: {
        Args: { target_visa_case_id: string };
        Returns: Database["crm"]["Tables"]["visa_case_readiness"]["Row"];
      };
      close_visa_case: {
        Args: { target_visa_case_id: string; closure_reason: string };
        Returns: Database["crm"]["Tables"]["visa_cases"]["Row"];
      };
      begin_ai_invocation: {
        Args: {
          target_student_profile_id: string;
          requested_capability: string;
          requested_model: string;
          safe_request_metadata?: Json;
        };
        Returns: Database["crm"]["Tables"]["ai_invocations"]["Row"];
      };
      complete_ai_invocation: {
        Args: {
          target_invocation_id: string;
          completion_status: string;
          validated_citations?: Json;
          safe_usage_metadata?: Json;
          measured_latency_ms?: number | null;
          completion_error_code?: string | null;
        };
        Returns: Database["crm"]["Tables"]["ai_invocations"]["Row"];
      };
      calculate_ai_analytics: {
        Args: {
          target_period_start: string;
          target_period_end: string;
        };
        Returns: Json;
      };
      consume_operational_rate_limit: {
        Args: {
          rate_scope: string;
          rate_key_hash: string;
          request_limit: number;
          window_seconds: number;
        };
        Returns: Json;
      };
      consume_ai_daily_quota: {
        Args: {
          daily_request_limit: number;
          daily_token_limit: number;
          circuit_failure_threshold: number;
          circuit_window_minutes: number;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
