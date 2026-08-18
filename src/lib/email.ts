import nodemailer from 'nodemailer';
import { createServerClient } from '@supabase/ssr';
import { decrypt } from './encryption';

/**
 * Get a system config value from the database, decrypting if it's a secret.
 */
async function getConfigValue(key: string): Promise<string> {
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data, error } = await db
    .from('system_configs')
    .select('config_value, is_secret')
    .eq('config_key', key)
    .single();

  if (error || !data || !data.config_value) {
    throw new Error(`System config "${key}" not found or empty`);
  }

  return data.is_secret ? decrypt(data.config_value) : data.config_value;
}

/**
 * Build a Nodemailer transport using encrypted SMTP credentials from system_configs.
 */
async function getTransport() {
  const [host, port, user, pass] = await Promise.all([
    getConfigValue('SMTP_HOST'),
    getConfigValue('SMTP_PORT'),
    getConfigValue('SMTP_USER'),
    getConfigValue('SMTP_PASS'),
  ]);

  return nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: parseInt(port, 10) === 465,
    auth: { user, pass },
  });
}

/**
 * Interpolate {{variable}} placeholders in a template string.
 */
function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

/**
 * Send an email using a database-driven template.
 *
 * @param templateSlug - The slug of the email template (e.g. 'welcome_tenant')
 * @param to - Recipient email address
 * @param variables - Key-value pairs to replace {{placeholders}} in subject and body
 */
export async function sendEmail(
  templateSlug: string,
  to: string,
  variables: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const db = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    // Fetch the template
    const { data: template, error: tplError } = await db
      .from('email_templates')
      .select('subject, html_body')
      .eq('template_slug', templateSlug)
      .single();

    if (tplError || !template) {
      return { success: false, error: `Template "${templateSlug}" not found` };
    }

    // Get sender info
    const [fromName, fromEmail] = await Promise.all([
      getConfigValue('SMTP_FROM_NAME').catch(() => 'sabibio'),
      getConfigValue('SMTP_FROM_EMAIL').catch(() => 'noreply@sabibio.com'),
    ]);

    const transport = await getTransport();

    const info = await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: interpolate(template.subject, variables),
      html: interpolate(template.html_body, variables),
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('[sendEmail] Error:', err.message);
    return { success: false, error: err.message };
  }
}
