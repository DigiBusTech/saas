import nodemailer from 'nodemailer';
import { createServerClient } from '@supabase/ssr';
import { decrypt } from './encryption';

// ============================================
// RESEND INTEGRATION FOR BROADCAST EMAILS
// ============================================
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface SendBroadcastEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  fromName?: string;
  fromEmail?: string;
}

interface SendBatchEmailsParams {
  emails: Array<{ to: string; subject: string; htmlBody: string }>;
  fromName?: string;
  fromEmail?: string;
}

/**
 * Send single broadcast email via Resend (for automation engine)
 */
export async function sendBroadcastEmail({
  to,
  subject,
  htmlBody,
  fromName = 'SabiBio',
  fromEmail = 'noreply@sabibio.com',
}: SendBroadcastEmailParams): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!resend) {
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html: htmlBody,
    });

    if (error) {
      console.error('[Resend Error]', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error('[sendBroadcastEmail Exception]', err);
    return { success: false, error: err.message || 'Unknown email error' };
  }
}

/**
 * Send batch broadcast emails via Resend (rate-limited: 100/batch, 10 req/sec)
 */
export async function sendBatchEmails({
  emails,
  fromName = 'SabiBio',
  fromEmail = 'noreply@sabibio.com',
}: SendBatchEmailsParams): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}> {
  if (!resend) {
    return {
      success: false,
      sent: 0,
      failed: emails.length,
      errors: emails.map((e) => ({ email: e.to, error: 'Resend API key not configured' })),
    };
  }

  const results = {
    success: true,
    sent: 0,
    failed: 0,
    errors: [] as Array<{ email: string; error: string }>,
  };

  const BATCH_SIZE = 100;
  const chunks = [];
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    chunks.push(emails.slice(i, i + BATCH_SIZE));
  }

  for (const [index, chunk] of chunks.entries()) {
    try {
      const batchPayload = chunk.map((email) => ({
        from: `${fromName} <${fromEmail}>`,
        to: [email.to],
        subject: email.subject,
        html: email.htmlBody,
      }));

      const { data, error } = await resend.batch.send(batchPayload);

      if (error) {
        console.error(`[Resend Batch Error - Chunk ${index + 1}]`, error);
        chunk.forEach((email) => {
          results.errors.push({ email: email.to, error: error.message });
          results.failed++;
        });
      } else {
        results.sent += chunk.length;
      }

      // Rate limit: 100ms between batches (10 req/sec)
      if (index < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (err: any) {
      console.error(`[sendBatchEmails Exception - Chunk ${index + 1}]`, err);
      chunk.forEach((email) => {
        results.errors.push({ email: email.to, error: err.message || 'Unknown error' });
        results.failed++;
      });
    }
  }

  if (results.failed > 0) {
    results.success = false;
  }

  return results;
}

/**
 * Convert markdown-style formatting to HTML
 */
export function convertMarkdownToHtml(text: string): string {
  return text
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/**
 * Replace automation variables in template
 */
export function replaceVariables(
  template: string,
  variables: {
    customer_name?: string;
    business_name?: string;
    lead_email?: string;
    product_name?: string;
    expiry_date?: string;
    order_id?: string;
    [key: string]: string | undefined;
  }
): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    if (value) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
  });
  return result;
}

// ============================================
// EXISTING NODEMAILER FUNCTIONS (UNCHANGED)
// ============================================

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
