'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { MessageSquare, Users, ShoppingCart, AlertTriangle } from 'lucide-react';

interface NotificationProviderProps {
  userId: string;
  workspaceId?: string;
}

export function NotificationProvider({ userId, workspaceId }: NotificationProviderProps) {
  useEffect(() => {
    const supabase = createClient();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as any;
          
          // Show toast based on notification type
          switch (notification.notification_type) {
            case 'new_message':
              toast(notification.title, {
                description: notification.message,
                icon: <MessageSquare className="h-4 w-4" />,
                action: {
                  label: 'View',
                  onClick: () => {
                    if (workspaceId) {
                      window.location.href = `/dashboard/${workspaceId}/inbox`;
                    }
                  },
                },
              });
              break;
            case 'new_lead':
              toast(notification.title, {
                description: notification.message,
                icon: <Users className="h-4 w-4" />,
                action: {
                  label: 'View CRM',
                  onClick: () => {
                    if (workspaceId) {
                      window.location.href = `/dashboard/${workspaceId}/crm`;
                    }
                  },
                },
              });
              break;
            case 'new_order':
              toast(notification.title, {
                description: notification.message,
                icon: <ShoppingCart className="h-4 w-4" />,
                action: {
                  label: 'View Order',
                  onClick: () => {
                    if (workspaceId) {
                      window.location.href = `/dashboard/${workspaceId}/orders`;
                    }
                  },
                },
              });
              break;
            case 'ai_escalation':
              toast.warning(notification.title, {
                description: notification.message,
                icon: <AlertTriangle className="h-4 w-4" />,
                action: {
                  label: 'View',
                  onClick: () => {
                    if (workspaceId) {
                      window.location.href = `/dashboard/${workspaceId}/inbox`;
                    }
                  },
                },
              });
              break;
            default:
              toast(notification.title, {
                description: notification.message,
              });
          }

          // Mark as read after showing
          supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notification.id)
            .then(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, workspaceId]);

  return null;
}
