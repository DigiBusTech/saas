 // TypeScript types mirroring the Supabase schema

export type PlanType = 'trial' | 'basic' | 'pro' | 'unlimited';
export type TenantStatus = 'active' | 'expired' | 'suspended';
export type UserRole = 'super_admin' | 'tenant_admin' | 'agent';
export type Platform = 'telegram' | 'whatsapp' | 'web';
export type ConversationStatus = 'ai_active' | 'human_handoff' | 'resolved';
export type SenderType = 'user' | 'bot' | 'human';
export type ConversationOutcome = 'sale' | 'inquiry' | 'complaint' | null;
export type AgentMode = 'autopilot' | 'copilot' | 'manual';
export type BotPersona = 'Professional English' | 'Casual English' | 'Nigerian Pidgin' | 'Yoruba-Infused English' | 'Hausa-Infused English' | 'Custom Prompt';
export type CRMSubscriptionStatus = 'lead' | 'non_subscriber' | 'subscriber' | 'expired';
export type AIStatus = 'active' | 'paused';
export type ChatDirection = 'inbound' | 'outbound';
export type ChatSenderType = 'user' | 'ai_agent' | 'human_agent';

export type AutomationTrigger = 'new_lead' | 'subscription_expiring' | 'post_purchase' | 'broadcast' | 'subscription_renewal' | 'product_flash_sale';
export type MessageApprovalStatus = 'sent' | 'pending_approval' | 'discarded';

export interface SystemConfig {
  id: string;
  config_key: string;
  config_value: string;
  description: string | null;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  template_slug: string;
  subject: string;
  html_body: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  price_usd: number;
  price_ngn: number;
  stripe_price_id: string | null;
  features: Record<string, boolean>;
  allow_telegram: boolean;
  allow_whatsapp: boolean;
  telegram_message_limit: number;
  whatsapp_message_limit: number;
  monthly_token_limit: number;
  max_workspaces: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  plan_type: PlanType;
  plan_id: string | null;
  token_usage: number;
  message_usage: number;
  telegram_message_usage: number;
  whatsapp_message_usage: number;
  setup_fee_paid: boolean;
  status: TenantStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id: string | null;
  role: UserRole;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  tenant_id: string;
  platform: Platform;
  bot_token: string | null;
  phone_number_id: string | null;
  verify_secret: string | null;
  access_token: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  bot_persona: string;
  agent_mode: AgentMode;
  telegram_bot_token: string | null;
  whatsapp_phone_number_id: string | null;
  whatsapp_access_token: string | null;
  whatsapp_verify_token: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceProduct {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  payment_link: string | null;
  code: string | null;
  checkout_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface WorkspaceService {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  image_url: string | null;
  payment_link: string | null;
  code: string | null;
  checkout_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface WorkspaceOrderItem {
  id: string;
  order_id: string;
  item_type: 'product' | 'service';
  item_id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency: string;
}

export type WorkspaceOrderStatus = 'pending_review' | 'approved' | 'rejected' | 'paid' | 'processing' | 'shipped' | 'completed' | 'cancelled';

export interface WorkspaceOrder {
  id: string;
  workspace_id: string;
  customer_name: string;
  customer_email: string;
  customer_location: string | null;
  custom_fields: Record<string, unknown>;
  payment_method: string;
  receipt_url: string | null;
  status: WorkspaceOrderStatus;
  total: number;
  currency: string;
  order_code: string | null;
  channel: 'whatsapp' | 'telegram' | 'web' | null;
  lead_id: string | null;
  updated_by: 'ai' | 'human';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  workspace_order_items?: WorkspaceOrderItem[];
}

export interface WorkspaceCRM {
  id: string;
  workspace_id: string;
  platform: Platform;
  channel_type: Platform;
  platform_user_id: string;
  customer_name: string | null;
  phone_number: string | null;
  email: string | null;
  category: string | null;
  lead_score: number;
  lead_status: 'new' | 'contacted' | 'active_chat' | 'qualified' | 'converted' | 'lost';
  tags: string[];
  subscription_status: CRMSubscriptionStatus;
  subscription_expiry: string | null;
  last_interaction: string;
  ai_status: AIStatus;
  // PHASE 2: Identity Resolution & Session Tracking
  ip_address: string | null;
  session_id: string | null;
  last_seen_at: string | null;
  first_message_at: string | null;
  user_agent: string | null;
  conversation_count: number;
}

export interface ChatMessage {
  id: string;
  workspace_id: string;
  crm_id: string;
  direction: ChatDirection;
  sender_type: ChatSenderType;
  content: string;
  platform: Platform;
  created_at: string;
}


export interface WorkspaceCategory {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface WorkspaceAutomation {
  id: string;
  workspace_id: string;
  title: string;
  trigger_type: AutomationTrigger;
  trigger_days_before: number;
  message_template: string;
  media_url: string | null;
  cta_button_text: string | null;
  cta_link: string | null;
  is_active: boolean;
  created_at: string;
}

export interface KnowledgeBase {
  id: string;
  tenant_id: string;
  workspace_id: string | null;
  title: string;
  content: string;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  workspace_id: string | null;
  integration_id: string | null;
  platform: Platform;
  platform_chat_id: string;
  contact_name: string | null;
  status: ConversationStatus;
  outcome: ConversationOutcome;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  sender_name: string | null;
  content: string;
  tokens_used: number | null;
  approval_status: MessageApprovalStatus;
  created_at: string;
}

// Supabase Database type helper — matches @supabase/supabase-js codegen format
export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: Tenant;
        Insert: Partial<Tenant> & { name: string };
        Update: Partial<Tenant>;
        Relationships: [];
      };
      users: {
        Row: User;
        Insert: { id: string; email: string } & Partial<Omit<User, 'id' | 'email'>>;
        Update: Partial<User>;
        Relationships: [
          {
            foreignKeyName: 'users_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          }
        ];
      };
      integrations: {
        Row: Integration;
        Insert: Partial<Integration> & { tenant_id: string; platform: Platform };
        Update: Partial<Integration>;
        Relationships: [
          {
            foreignKeyName: 'integrations_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          }
        ];
      };
      workspaces: {
        Row: Workspace;
        Insert: Partial<Workspace> & { tenant_id: string; name: string; slug: string };
        Update: Partial<Workspace>;
        Relationships: [
          {
            foreignKeyName: 'workspaces_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          }
        ];
      };
      workspace_products: {
        Row: WorkspaceProduct;
        Insert: Partial<WorkspaceProduct> & { workspace_id: string; name: string; price: number };
        Update: Partial<WorkspaceProduct>;
        Relationships: [
          {
            foreignKeyName: 'workspace_products_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          }
        ];
      };
      workspace_crm: {
        Row: WorkspaceCRM;
        Insert: Partial<WorkspaceCRM> & { workspace_id: string; platform: Platform; platform_user_id: string };
        Update: Partial<WorkspaceCRM>;
        Relationships: [
          {
            foreignKeyName: 'workspace_crm_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          }
        ];
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Partial<ChatMessage> & { workspace_id: string; crm_id: string; direction: ChatDirection; sender_type: ChatSenderType; content: string; platform: Platform };
        Update: Partial<ChatMessage>;
        Relationships: [
          {
            foreignKeyName: 'chat_messages_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_messages_crm_id_fkey';
            columns: ['crm_id'];
            isOneToOne: false;
            referencedRelation: 'workspace_crm';
            referencedColumns: ['id'];
          }
        ];
      };
      workspace_categories: {
        Row: WorkspaceCategory;
        Insert: Partial<WorkspaceCategory> & { workspace_id: string; name: string };

        Update: Partial<WorkspaceCategory>;
        Relationships: [
          {
            foreignKeyName: 'workspace_categories_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          }
        ];
      };
      workspace_automations: {
        Row: WorkspaceAutomation;
        Insert: Partial<WorkspaceAutomation> & { workspace_id: string; title: string; trigger_type: string; message_template: string };
        Update: Partial<WorkspaceAutomation>;
        Relationships: [
          {
            foreignKeyName: 'workspace_automations_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          }
        ];
      };
      knowledge_bases: {
        Row: KnowledgeBase;
        Insert: Partial<KnowledgeBase> & { tenant_id: string; title: string; content: string };
        Update: Partial<KnowledgeBase>;
        Relationships: [
          {
            foreignKeyName: 'knowledge_bases_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          }
        ];
      };
      conversations: {
        Row: Conversation;
        Insert: Partial<Conversation> & { tenant_id: string; platform: Platform; platform_chat_id: string };
        Update: Partial<Conversation>;
        Relationships: [
          {
            foreignKeyName: 'conversations_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          }
        ];
      };
      messages: {
        Row: Message;
        Insert: Partial<Message> & { conversation_id: string; sender_type: SenderType; content: string };
        Update: Partial<Message>;
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          }
        ];
      };
      system_configs: {
        Row: SystemConfig;
        Insert: Partial<SystemConfig> & { config_key: string; config_value: string };
        Update: Partial<SystemConfig>;
        Relationships: [];
      };
      email_templates: {
        Row: EmailTemplate;
        Insert: Partial<EmailTemplate> & { template_slug: string; subject: string; html_body: string };
        Update: Partial<EmailTemplate>;
        Relationships: [];
      };
      subscription_plans: {
        Row: SubscriptionPlan;
        Insert: Partial<SubscriptionPlan> & { name: string; slug: string };
        Update: Partial<SubscriptionPlan>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_knowledge: {
        Args: {
          query_embedding: number[];
          match_tenant_id: string;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: {
          id: string;
          title: string;
          content: string;
          similarity: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
