export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: any }
  | any[];

export type OrganizationRole = "owner" | "admin" | "manager" | "member" | "viewer";

// Funnel Domain Enums & Types
export type FunnelType =
  | "Lead Generation"
  | "Webinar"
  | "Coaching"
  | "Course"
  | "Product"
  | "Service"
  | "Appointment"
  | "Consultation"
  | "Lead Magnet"
  | "E-commerce"
  | "Affiliate"
  | "SaaS"
  | (string & {});

export type FunnelStatus = "draft" | "active" | "paused" | "archived";

export interface FunnelBusinessContext {
  business_goal?: string;
  funnel_goal?: string;
  target_audience?: string;
  offer?: string;
  problem?: string;
  desired_outcome?: string;
  traffic_source?: string;
  conversion_goal?: string;
  customer_journey?: string;
  primary_cta?: string;
  business_model?: string;
  funnel_type?: string;
  current_status?: string;
  [key: string]: unknown;
}

export type StepType =
  | "landing page"
  | "opt-in"
  | "thank-you"
  | "sales page"
  | "checkout"
  | "webinar registration"
  | "webinar"
  | "booking"
  | "confirmation"
  | "upsell"
  | "downsell"
  | (string & {});

export type PageType =
  | "landing"
  | "opt-in"
  | "sales"
  | "thank-you"
  | "checkout"
  | "webinar"
  | "booking"
  | "upsell"
  | "downsell"
  | "custom"
  | (string & {});

export type PageStatus = "draft" | "published" | "archived";

export type SectionType =
  | "hero"
  | "problem"
  | "solution"
  | "benefits"
  | "features"
  | "testimonials"
  | "social proof"
  | "pricing"
  | "FAQ"
  | "CTA"
  | "text"
  | "image"
  | "video"
  | "form"
  | "countdown"
  | "comparison"
  | "guarantee"
  | "footer"
  | (string & {});

export type ContactStatus = "lead" | "customer" | "subscriber" | "unsubscribed" | "archived";

export type EmailTemplateStatus = "draft" | "published" | "archived";
export type EmailSequenceStatus = "draft" | "active" | "paused" | "archived";
export type DelayUnit = "minutes" | "hours" | "days" | "weeks";

export type AutomationStatus = "draft" | "active" | "paused" | "archived";

export type AnalyticsEventType =
  | "page_view"
  | "funnel_visit"
  | "form_view"
  | "form_submission"
  | "cta_click"
  | "email_sent"
  | "email_delivered"
  | "email_opened"
  | "email_clicked"
  | "checkout"
  | "purchase"
  | "booking"
  | "conversion"
  | (string & {});

export type MemoryScope = "organization" | "agent_private" | "task_context" | "user" | "customer";
export type MemoryCategory =
  | "business"
  | "funnel"
  | "decision"
  | "goal"
  | "customer"
  | "preference"
  | "user_profile"
  | "person"
  | "project"
  | "strategy"
  | "task"
  | "important_fact"
  | "conversation"
  | "experience"
  | "learning"
  | "routine"
  | "relationship";

export type MemoryStatus = "active" | "superseded" | "archived" | "expired" | "deleted";
export type MemoryConfidenceLevel = "low" | "medium" | "high" | "confirmed";
export type MemorySource = "conversation" | "explicit_command" | "tool_execution" | "user_input";

export interface Database {
  public: {
    Tables: {
      company_memories: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          scope: MemoryScope;
          category: MemoryCategory;
          title: string | null;
          content: string;
          normalized_content: string | null;
          metadata: Json;
          importance_score: number;
          confidence: number;
          confidence_level?: MemoryConfidenceLevel;
          status: MemoryStatus;
          source: MemorySource;
          source_reference: string | null;
          entity_type: string | null;
          entity_id: string | null;
          valid_from: string;
          valid_until: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
          last_accessed_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          scope?: MemoryScope;
          category?: MemoryCategory;
          title?: string | null;
          content: string;
          normalized_content?: string | null;
          metadata?: Json;
          importance_score?: number;
          confidence?: number;
          confidence_level?: MemoryConfidenceLevel;
          status?: MemoryStatus;
          source?: MemorySource;
          source_reference?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          valid_from?: string;
          valid_until?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
          last_accessed_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string | null;
          scope?: MemoryScope;
          category?: MemoryCategory;
          title?: string | null;
          content?: string;
          normalized_content?: string | null;
          metadata?: Json;
          importance_score?: number;
          confidence?: number;
          confidence_level?: MemoryConfidenceLevel;
          status?: MemoryStatus;
          source?: MemorySource;
          source_reference?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          valid_from?: string;
          valid_until?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
          last_accessed_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrganizationRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: OrganizationRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: OrganizationRole;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          title?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          organization_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          organization_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          organization_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      voice_sessions: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number;
          detected_language: string;
          user_turns_count: number;
          assistant_turns_count: number;
          interruption_count: number;
          status: "active" | "completed" | "interrupted" | "failed";
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          user_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number;
          detected_language?: string;
          user_turns_count?: number;
          assistant_turns_count?: number;
          interruption_count?: number;
          status?: "active" | "completed" | "interrupted" | "failed";
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number;
          detected_language?: string;
          user_turns_count?: number;
          assistant_turns_count?: number;
          interruption_count?: number;
          status?: "active" | "completed" | "interrupted" | "failed";
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      funnels: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          goal: string | null;
          funnel_type: FunnelType;
          target_audience: string | null;
          offer: string | null;
          primary_conversion_goal: string | null;
          status: FunnelStatus;
          business_context: Json;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          goal?: string | null;
          funnel_type?: FunnelType;
          target_audience?: string | null;
          offer?: string | null;
          primary_conversion_goal?: string | null;
          status?: FunnelStatus;
          business_context?: Json;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          goal?: string | null;
          funnel_type?: FunnelType;
          target_audience?: string | null;
          offer?: string | null;
          primary_conversion_goal?: string | null;
          status?: FunnelStatus;
          business_context?: Json;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      pages: {
        Row: {
          id: string;
          organization_id: string;
          funnel_id: string | null;
          name: string;
          slug: string;
          page_type: PageType;
          status: PageStatus;
          title: string | null;
          settings: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          funnel_id?: string | null;
          name: string;
          slug: string;
          page_type?: PageType;
          status?: PageStatus;
          title?: string | null;
          settings?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          funnel_id?: string | null;
          name?: string;
          slug?: string;
          page_type?: PageType;
          status?: PageStatus;
          title?: string | null;
          settings?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      funnel_steps: {
        Row: {
          id: string;
          funnel_id: string;
          step_order: number;
          step_type: StepType;
          name: string;
          page_id: string | null;
          goal: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          step_order?: number;
          step_type: StepType;
          name: string;
          page_id?: string | null;
          goal?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          funnel_id?: string;
          step_order?: number;
          step_type?: StepType;
          name?: string;
          page_id?: string | null;
          goal?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      page_sections: {
        Row: {
          id: string;
          page_id: string;
          section_type: SectionType;
          order_index: number;
          content: Json;
          layout: Json;
          styles: Json;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          page_id: string;
          section_type: SectionType;
          order_index?: number;
          content?: Json;
          layout?: Json;
          styles?: Json;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          page_id?: string;
          section_type?: SectionType;
          order_index?: number;
          content?: Json;
          layout?: Json;
          styles?: Json;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          organization_id: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
          phone: string | null;
          status: ContactStatus;
          source: string | null;
          custom_fields: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          first_name?: string | null;
          last_name?: string | null;
          email: string;
          phone?: string | null;
          status?: ContactStatus;
          source?: string | null;
          custom_fields?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string;
          phone?: string | null;
          status?: ContactStatus;
          source?: string | null;
          custom_fields?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      contact_tags: {
        Row: {
          contact_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          contact_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          contact_id?: string;
          tag_id?: string;
          created_at?: string;
        };
      };
      contact_events: {
        Row: {
          id: string;
          organization_id: string;
          contact_id: string;
          event_type: string;
          funnel_id: string | null;
          page_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          contact_id: string;
          event_type: string;
          funnel_id?: string | null;
          page_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          contact_id?: string;
          event_type?: string;
          funnel_id?: string | null;
          page_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      forms: {
        Row: {
          id: string;
          organization_id: string;
          page_id: string | null;
          name: string;
          fields: Json;
          settings: Json;
          submit_action: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          page_id?: string | null;
          name: string;
          fields?: Json;
          settings?: Json;
          submit_action?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          page_id?: string | null;
          name?: string;
          fields?: Json;
          settings?: Json;
          submit_action?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      form_submissions: {
        Row: {
          id: string;
          organization_id: string;
          form_id: string;
          contact_id: string | null;
          submission_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          form_id: string;
          contact_id?: string | null;
          submission_data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          form_id?: string;
          contact_id?: string | null;
          submission_data?: Json;
          created_at?: string;
        };
      };
      email_templates: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          subject: string;
          body: string;
          variables: Json;
          status: EmailTemplateStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          subject: string;
          body: string;
          variables?: Json;
          status?: EmailTemplateStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          subject?: string;
          body?: string;
          variables?: Json;
          status?: EmailTemplateStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_sequences: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          status: EmailSequenceStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          status?: EmailSequenceStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          status?: EmailSequenceStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_sequence_steps: {
        Row: {
          id: string;
          sequence_id: string;
          step_order: number;
          delay_value: number;
          delay_unit: DelayUnit;
          subject: string;
          body: string;
          template_id: string | null;
          status: "active" | "inactive";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sequence_id: string;
          step_order?: number;
          delay_value?: number;
          delay_unit?: DelayUnit;
          subject: string;
          body: string;
          template_id?: string | null;
          status?: "active" | "inactive";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sequence_id?: string;
          step_order?: number;
          delay_value?: number;
          delay_unit?: DelayUnit;
          subject?: string;
          body?: string;
          template_id?: string | null;
          status?: "active" | "inactive";
          created_at?: string;
          updated_at?: string;
        };
      };
      automations: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          status: AutomationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          status?: AutomationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          status?: AutomationStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      automation_triggers: {
        Row: {
          id: string;
          automation_id: string;
          trigger_type: string;
          config: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          automation_id: string;
          trigger_type: string;
          config?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          automation_id?: string;
          trigger_type?: string;
          config?: Json;
          created_at?: string;
        };
      };
      automation_conditions: {
        Row: {
          id: string;
          automation_id: string;
          condition_type: string;
          config: Json;
          step_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          automation_id: string;
          condition_type: string;
          config?: Json;
          step_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          automation_id?: string;
          condition_type?: string;
          config?: Json;
          step_order?: number;
          created_at?: string;
        };
      };
      automation_actions: {
        Row: {
          id: string;
          automation_id: string;
          action_type: string;
          config: Json;
          step_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          automation_id: string;
          action_type: string;
          config?: Json;
          step_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          automation_id?: string;
          action_type?: string;
          config?: Json;
          step_order?: number;
          created_at?: string;
        };
      };
      analytics_events: {
        Row: {
          id: string;
          organization_id: string;
          event_type: AnalyticsEventType;
          funnel_id: string | null;
          page_id: string | null;
          contact_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_type: AnalyticsEventType;
          funnel_id?: string | null;
          page_id?: string | null;
          contact_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          event_type?: AnalyticsEventType;
          funnel_id?: string | null;
          page_id?: string | null;
          contact_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      agent_executions: {
        Row: {
          id: string;
          execution_id: string;
          organization_id: string;
          user_id: string | null;
          request_id: string | null;
          goal: string;
          selected_agents: Json;
          status: string;
          plan: Json | null;
          tool_calls: Json;
          results: Json;
          verification: Json | null;
          retries: number;
          failures: Json;
          duration_ms: number | null;
          started_at: string;
          completed_at: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          execution_id: string;
          organization_id: string;
          user_id?: string | null;
          request_id?: string | null;
          goal: string;
          selected_agents?: Json;
          status?: string;
          plan?: Json | null;
          tool_calls?: Json;
          results?: Json;
          verification?: Json | null;
          retries?: number;
          failures?: Json;
          duration_ms?: number | null;
          started_at?: string;
          completed_at?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          execution_id?: string;
          organization_id?: string;
          user_id?: string | null;
          request_id?: string | null;
          goal?: string;
          selected_agents?: Json;
          status?: string;
          plan?: Json | null;
          tool_calls?: Json;
          results?: Json;
          verification?: Json | null;
          retries?: number;
          failures?: Json;
          duration_ms?: number | null;
          started_at?: string;
          completed_at?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Functions: {
      is_org_member: {
        Args: { target_org_id: string };
        Returns: boolean;
      };
      get_org_role: {
        Args: { target_org_id: string };
        Returns: OrganizationRole | null;
      };
    };
  };
}

export type CompanyMemoryRow = Database["public"]["Tables"]["company_memories"]["Row"];
export type CompanyMemoryInsert = Database["public"]["Tables"]["company_memories"]["Insert"];
export type CompanyMemoryUpdate = Database["public"]["Tables"]["company_memories"]["Update"];
export type AgentExecutionRow = Database["public"]["Tables"]["agent_executions"]["Row"];
export type AgentExecutionInsert = Database["public"]["Tables"]["agent_executions"]["Insert"];
export type AgentExecutionUpdate = Database["public"]["Tables"]["agent_executions"]["Update"];
