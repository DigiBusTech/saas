/**
 * Tenant Dashboard Navigation Structure
 * Organized into 5 clear, functional categories
 */

export interface NavItem {
  href: string;
  label: string;
  icon: string;
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
          icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
          description: 'Live chat, WhatsApp, Telegram in one place',
        },
        {
          href: `${wsPrefix}/crm`,
          label: 'Contacts & Leads',
          icon: 'M12 4.354a4 4 0 110 8.646 4 4 0 010-8.646M12 14a9 9 0 00-9 9v1h18v-1a9 9 0 00-9-9z',
          description: 'Track leads and customer relationships',
        },
        {
          href: `${wsPrefix}/conversations`,
          label: 'All Conversations',
          icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
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
          icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm0 5c-2.76 0-5.07 1.29-6.63 3.29.98 1.47 2.45 2.57 4.13 3.13 1 .31 2.05.48 3.13.48s2.13-.17 3.13-.48c1.68-.56 3.15-1.66 4.13-3.13-1.56-2-3.87-3.29-6.63-3.29zM9 5C7.34 5 6 6.34 6 8s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 9c-2.33 0-4 1.34-4 3s1.67 3 4 3 4-1.34 4-3-1.67-3-4-3z',
          description: 'View, track, and update orders',
        },
        {
          href: `${wsPrefix}/products`,
          label: 'Products Catalog',
          icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
          description: 'Create and manage products with pricing',
        },
        {
          href: `${wsPrefix}/services`,
          label: 'Services Catalog',
          icon: 'M13 10V3L4 14h7v7l9-11h-7z',
          description: 'Manage services and bookings',
        },
        {
          href: `${wsPrefix}/payments`,
          label: 'Payment Settings',
          icon: 'M2 7h20M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm3 9h3',
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
          icon: 'M12 3v18m9-9H3m14.5-6.5L6.5 17.5m0-11l11 11',
          description: 'Create your link-in-bio landing page',
        },
        {
          href: `${wsPrefix}/widget`,
          label: 'Web Chat Widget',
          icon: 'M19 13h-6v6h6v-6zm0-6h-6v6h6V7zM9 13H3v6h6v-6zm0-6H3v6h6V7z',
          description: 'Embed chat on your website',
        },
        {
          href: `${wsPrefix}/automations`,
          label: 'Flash Sales & Broadcasts',
          icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
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
          icon: 'M4 19.5A2.5 2.5 0 016.5 17H20V2H6.5A2.5 2.5 0 004 4.5v15z',
          description: 'Upload documents for AI grounding',
        },
        {
          href: `${wsPrefix}/articles`,
          label: 'Articles & FAQs',
          icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
          description: 'Publish content for customers',
        },
        {
          href: `${wsPrefix}/integrations`,
          label: 'AI & Integrations',
          icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
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
          icon: 'M3 13h2v8H3zm4-8h2v16H7zm4-2h2v18h-2zm4-1h2v19h-2zm4 4h2v15h-2z',
          description: 'Revenue, conversions, and engagement metrics',
        },
        {
          href: `/dashboard/billing`,
          label: 'Billing & Subscription',
          icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
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
