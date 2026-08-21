/**
 * Tenant Dashboard Navigation Structure
 * Organized into 5 clear, functional categories
 * Icons use lucide-react component names
 */

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide-react icon name (e.g., 'LayoutDashboard', 'MessageSquare')
  badge?: string;
  description?: string;
}

export interface NavGroup {
  id: string;
  title: string;
  emoji: string;
  description: string;
  items: NavItem[];
}

export function getWorkspaceNavGroups(wsPrefix: string): NavGroup[] {
  return [
    {
      id: 'communications',
      title: 'Communications & Support',
      emoji: '💬',
      description: 'Manage conversations across all channels',
      items: [
        {
          href: `${wsPrefix}/inbox`,
          label: 'Unified Inbox',
          icon: 'Inbox',
          description: 'Live chat, WhatsApp, Telegram in one place',
        },
        {
          href: `${wsPrefix}/crm`,
          label: 'Contacts & Leads',
          icon: 'Users',
          description: 'Track leads and customer relationships',
        },
        {
          href: `${wsPrefix}/conversations`,
          label: 'Conversation History',
          icon: 'MessageSquare',
          description: 'View chat history and manage threads',
        },
      ],
    },
    {
      id: 'sales',
      title: 'Sales & Commerce',
      emoji: '🛒',
      description: 'Products, services, and order management',
      items: [
        {
          href: `${wsPrefix}/orders`,
          label: 'Orders & Fulfillment',
          icon: 'ShoppingCart',
          description: 'View, track, and update orders',
        },
        {
          href: `${wsPrefix}/products`,
          label: 'Products Catalog',
          icon: 'Package',
          description: 'Create and manage products with pricing',
        },
        {
          href: `${wsPrefix}/services`,
          label: 'Services Catalog',
          icon: 'Briefcase',
          description: 'Manage services and bookings',
        },
        {
          href: `${wsPrefix}/payments`,
          label: 'Payment Settings',
          icon: 'Wallet',
          description: 'Configure Stripe and Flutterwave',
        },
      ],
    },
    {
      id: 'marketing',
      title: 'Marketing & SabiBio',
      emoji: '🚀',
      description: 'Campaigns, broadcasts, and your SabiBio page',
      items: [
        {
          href: `${wsPrefix}/sabibio`,
          label: 'SabiBio Page Builder',
          icon: 'Link',
          description: 'Create your link-in-bio landing page',
        },
        {
          href: `${wsPrefix}/widget`,
          label: 'Web Chat Widget',
          icon: 'Code',
          description: 'Embed chat on your website',
        },
        {
          href: `${wsPrefix}/automations`,
          label: 'Flash Sales & Broadcasts',
          icon: 'Megaphone',
          description: 'Schedule announcements and promotions',
        },
      ],
    },
    {
      id: 'ai',
      title: 'AI & Knowledge Base',
      emoji: '🧠',
      description: 'AI assistant, knowledge, and RAG settings',
      items: [
        {
          href: `${wsPrefix}/knowledge`,
          label: 'Knowledge Base',
          icon: 'Library',
          description: 'Upload documents for AI grounding',
        },
        {
          href: `${wsPrefix}/articles`,
          label: 'Articles & FAQs',
          icon: 'FileText',
          description: 'Publish content for customers',
        },
        {
          href: `${wsPrefix}/integrations`,
          label: 'AI & Integrations',
          icon: 'Puzzle',
          description: 'Configure LLM providers and webhooks',
        },
      ],
    },
    {
      id: 'analytics',
      title: 'Analytics & Settings',
      emoji: '📊',
      description: 'Business insights, billing, and workspace config',
      items: [
        {
          href: `${wsPrefix}/analytics`,
          label: 'Business Insights',
          icon: 'BarChart3',
          description: 'Revenue, conversions, and engagement metrics',
        },
        {
          href: `/dashboard/billing`,
          label: 'Billing & Subscription',
          icon: 'CreditCard',
          description: 'Manage plan and payment settings',
        },
        {
          href: `${wsPrefix}/settings`,
          label: 'Workspace Settings',
          icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
          description: 'Configure workspace & API keys',
        },
      ],
    },
  ];
}
