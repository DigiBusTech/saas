'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

export interface GlobalSiteSettings {
  id: string;
  site_title: string;
  meta_description: string;
  seo_keywords: string[];
  og_image_url: string | null;
  universal_logo_url: string | null;
  universal_favicon_url: string | null;
  social_preview_links: Record<string, string>;
  updated_at: string;
  updated_by: string | null;
}

const GlobalSettingsSchema = z.object({
  site_title: z.string().min(1).max(200),
  meta_description: z.string().min(1).max(300),
  seo_keywords: z.array(z.string()).max(20),
  og_image_url: z.string().url().nullable(),
  universal_logo_url: z.string().url().nullable(),
  universal_favicon_url: z.string().url().nullable(),
  social_preview_links: z.record(z.string(), z.string()).optional(),
});

type GlobalSettingsInput = z.infer<typeof GlobalSettingsSchema>;

async function assertSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required');

  const db = createServiceClient();
  const { data: profile } = await db
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') throw new Error('Super admin access required');
  return user.id;
}

/**
 * Fetch the global site settings (public read)
 */
export async function getGlobalSiteSettings(): Promise<GlobalSiteSettings | null> {
  try {
    const db = createServiceClient();
    const { data, error } = await db
      .from('global_site_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('[getGlobalSiteSettings] Error:', error);
      return null;
    }

    return data as GlobalSiteSettings;
  } catch (error) {
    console.error('[getGlobalSiteSettings] Exception:', error);
    return null;
  }
}

/**
 * Update global site settings (super_admin only)
 */
export async function updateGlobalSiteSettings(input: GlobalSettingsInput): Promise<{
  success: boolean;
  data?: GlobalSiteSettings;
  error?: string;
}> {
  try {
    const userId = await assertSuperAdmin();
    // Validate input
    const validated = GlobalSettingsSchema.parse(input);

    const db = createServiceClient();

    // Fetch current settings to get ID
    const { data: current, error: fetchError } = await db
      .from('global_site_settings')
      .select('id')
      .limit(1)
      .single();

    if (fetchError || !current) {
      // If no settings exist, create default
      const { data: newSettings, error: createError } = await db
        .from('global_site_settings')
        .insert([{ ...validated, updated_by: userId }])
        .select()
        .single();

      if (createError) {
        return {
          success: false,
          error: `Failed to create settings: ${createError.message}`,
        };
      }

      return {
        success: true,
        data: newSettings as GlobalSiteSettings,
      };
    }

    // Update existing settings
    const { data: updated, error: updateError } = await db
      .from('global_site_settings')
      .update({
        ...validated,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.id)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Failed to update settings: ${updateError.message}`,
      };
    }

    return {
      success: true,
      data: updated as GlobalSiteSettings,
    };
  } catch (error) {
    const message = error instanceof z.ZodError
        ? `Validation error: ${error.issues[0]?.message ?? 'Invalid input'}`
      : `Error updating settings: ${String(error)}`;

    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Update only SEO-related fields
 */
export async function updateSEOSettings(input: {
  site_title: string;
  meta_description: string;
  seo_keywords: string[];
}): Promise<{
  success: boolean;
  data?: GlobalSiteSettings;
  error?: string;
}> {
  try {
    const userId = await assertSuperAdmin();
    const db = createServiceClient();

    const { data: current, error: fetchError } = await db
      .from('global_site_settings')
      .select('id, og_image_url, universal_logo_url, universal_favicon_url, social_preview_links')
      .limit(1)
      .single();

    if (fetchError || !current) {
      return {
        success: false,
        error: 'Settings not found',
      };
    }

    const { data: updated, error: updateError } = await db
      .from('global_site_settings')
      .update({
        site_title: input.site_title,
        meta_description: input.meta_description,
        seo_keywords: input.seo_keywords,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.id)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
      };
    }

    return {
      success: true,
      data: updated as GlobalSiteSettings,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Update only branding/asset fields
 */
export async function updateBrandingAssets(input: {
  universal_logo_url?: string | null;
  universal_favicon_url?: string | null;
  og_image_url?: string | null;
}): Promise<{
  success: boolean;
  data?: GlobalSiteSettings;
  error?: string;
}> {
  try {
    const userId = await assertSuperAdmin();
    const db = createServiceClient();

    const { data: current, error: fetchError } = await db
      .from('global_site_settings')
      .select('id')
      .limit(1)
      .single();

    if (fetchError || !current) {
      return {
        success: false,
        error: 'Settings not found',
      };
    }

    const updates: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };
    if (input.universal_logo_url !== undefined) updates.universal_logo_url = input.universal_logo_url;
    if (input.universal_favicon_url !== undefined) updates.universal_favicon_url = input.universal_favicon_url;
    if (input.og_image_url !== undefined) updates.og_image_url = input.og_image_url;

    const { data: updated, error: updateError } = await db
      .from('global_site_settings')
      .update(updates)
      .eq('id', current.id)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
      };
    }

    return {
      success: true,
      data: updated as GlobalSiteSettings,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}
