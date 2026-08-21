'use client';

import { useEffect } from 'react';

interface AnalyticsTrackerProps {
  workspaceId: string;
}

export function AnalyticsTracker({ workspaceId }: AnalyticsTrackerProps) {
  useEffect(() => {
    // Track page view on mount
    trackPageView(workspaceId);
  }, [workspaceId]);

  return null;
}

export function trackPageView(workspaceId: string) {
  trackEvent(workspaceId, 'page_view');
}

export function trackLinkClick(workspaceId: string, linkUrl: string, linkTitle: string) {
  trackEvent(workspaceId, 'link_click', { link_url: linkUrl, link_title: linkTitle });
}

export function trackProductView(workspaceId: string, productId: string, productName: string) {
  trackEvent(workspaceId, 'product_view', { product_id: productId, product_name: productName });
}

export function trackChannelClick(workspaceId: string, channelType: string) {
  trackEvent(workspaceId, 'channel_click', { channel_type: channelType });
}

function trackEvent(workspaceId: string, eventType: string, eventData?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  
  const sessionId = window.localStorage.getItem(`sabibio_session_${workspaceId}`) 
    || (() => {
      const id = crypto.randomUUID();
      window.localStorage.setItem(`sabibio_session_${workspaceId}`, id);
      return id;
    })();

  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspaceId,
      eventType,
      eventData: eventData || {},
      sessionId,
    }),
  }).catch(() => {}); // Silent fail - don't block user experience
}
