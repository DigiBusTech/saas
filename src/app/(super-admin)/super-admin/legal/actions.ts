'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

type ContentType = 'terms_of_service' | 'privacy_policy' | 'disclaimer' | 'cookie_policy';

const GENERATION_PROMPTS: Record<ContentType, string> = {
  terms_of_service: `Generate comprehensive Terms of Service for a SaaS platform that provides:
- AI-powered customer service automation
- Multi-channel chat (WhatsApp, Telegram, Web)
- CRM and lead management
- E-commerce and service booking capabilities
- Subscription-based billing tiers
- Knowledge base and RAG AI

Include sections on: acceptance of terms, service description, user obligations, prohibited conduct, intellectual property, limitation of liability, termination, governing law, and dispute resolution. Use professional legal language but keep it accessible. Format in Markdown.`,

  privacy_policy: `Generate a GDPR and CCPA compliant Privacy Policy for a SaaS platform that collects:
- User account information (email, name, business details)
- Chat conversation data for AI training
- Usage analytics and telemetry
- Payment information (processed via third-party)
- IP addresses and session data for web chat

Include sections on: data collection, usage purposes, data sharing, security measures, user rights (access, correction, deletion), cookies, data retention, international transfers, and contact information. Format in Markdown.`,

  disclaimer: `Generate a Legal Disclaimer for an AI-powered customer service platform emphasizing:
- AI-generated responses may contain inaccuracies
- Content should not be considered professional advice
- Service availability and uptime disclaimers
- Third-party integrations and dependencies
- No guarantee of business outcomes
- Limitation of warranties and indemnification clauses

Use clear, protective language suitable for mitigating liability in an MVP/startup context. Format in Markdown.`,

  cookie_policy: `Generate a Cookie Policy for a web platform that uses:
- Essential cookies for authentication and session management
- Analytics cookies for usage tracking (Google Analytics)
- Preference cookies for UI customization
- Third-party cookies from payment processors and infrastructure providers

Include sections on: what cookies are, types used (essential, analytics, preference), cookie duration, third-party cookies, managing preferences, and data collected. Format in Markdown.`,
};

/**
 * PHASE 1: AI Legal Template Auto-Generation
 * Uses OpenAI to draft legal documents based on platform features
 */
export async function generateLegalContent(contentType: ContentType) {
  try {
    if (!openai) {
      return { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables.' };
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a legal expert specializing in SaaS platform compliance. Generate comprehensive, professional legal documents that protect the business while remaining user-friendly. Use Markdown formatting with clear section headers.',
        },
        {
          role: 'user',
          content: GENERATION_PROMPTS[contentType],
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const generatedContent = completion.choices[0]?.message?.content;

    if (!generatedContent) {
      return { error: 'Failed to generate content. Please try again.' };
    }

    return { content: generatedContent };
  } catch (error: any) {
    console.error('OpenAI generation error:', error);
    return { error: error?.message ?? 'Failed to generate legal content' };
  }
}

/**
 * Save legal content to database
 */
export async function saveLegalContent(formData: FormData) {
  try {
    const db = createServiceClient();

    // Super Admin authorization check
    const { data: { user } } = await db.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await db.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'super_admin') return { error: 'Insufficient permissions' };

    const id = formData.get('id') as string | null;
    const content_type = formData.get('content_type') as string;
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const version = formData.get('version') as string;
    const is_active = formData.get('is_active') === 'true';

    if (!content_type || !title || !content || !version) {
      return { error: 'Missing required fields' };
    }

    // If setting as active, deactivate other versions of same content_type
    if (is_active) {
      await db
        .from('global_legal_content')
        .update({ is_active: false })
        .eq('content_type', content_type);
    }

    if (id) {
      // Update existing
      const { error } = await db
        .from('global_legal_content')
        .update({ title, content, version, is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) return { error: error.message };
    } else {
      // Create new
      const { error } = await db
        .from('global_legal_content')
        .insert({ content_type, title, content, version, is_active });

      if (error) return { error: error.message };
    }

    revalidatePath('/super-admin/legal');
    return { success: true };
  } catch (error: any) {
    console.error('Save legal content error:', error);
    return { error: error?.message ?? 'Failed to save content' };
  }
}

/**
 * Delete legal document
 */
export async function deleteLegalContent(docId: string) {
  try {
    const db = createServiceClient();

    const { data: { user } } = await db.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await db.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'super_admin') return { error: 'Insufficient permissions' };

    const { error } = await db.from('global_legal_content').delete().eq('id', docId);

    if (error) return { error: error.message };

    revalidatePath('/super-admin/legal');
    return { success: true };
  } catch (error: any) {
    return { error: error?.message ?? 'Failed to delete content' };
  }
}
