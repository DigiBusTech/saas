import { z } from 'zod';

// ============================================================
// Auth
// ============================================================
export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Enter your full name'),
  tenantName: z.string().min(2, 'Enter your business name'),
  acceptedTerms: z.literal('true', { error: 'You must accept the Terms and Privacy Policy' }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

// ============================================================
// Integrations (Phase 3)
// ============================================================
export const telegramIntegrationSchema = z.object({
  platform: z.literal('telegram'),
  bot_token: z
    .string()
    .regex(/^\d+:[A-Za-z0-9_-]{30,}$/, 'Invalid Telegram bot token format'),
  verify_secret: z.string().min(16, 'Secret must be at least 16 characters'),
});

export const whatsappIntegrationSchema = z.object({
  platform: z.literal('whatsapp'),
  phone_number_id: z.string().regex(/^\d+$/, 'Phone Number ID must be numeric'),
  access_token: z.string().min(20, 'Access token looks too short'),
  verify_secret: z.string().min(16, 'Secret must be at least 16 characters'),
});

export const integrationSchema = z.discriminatedUnion('platform', [
  telegramIntegrationSchema,
  whatsappIntegrationSchema,
]);

// ============================================================
// Knowledge Base (Phase 3)
// ============================================================
export const knowledgeBaseSchema = z.object({
  title: z.string().min(2).max(200),
  content: z.string().min(10).max(50000),
});

// ============================================================
// Telegram Webhook Payload (Phase 4)
// ============================================================
export const telegramUpdateSchema = z.object({
  update_id: z.number(),
  message: z
    .object({
      message_id: z.number(),
      from: z
        .object({
          id: z.number(),
          first_name: z.string().optional(),
          last_name: z.string().optional(),
          username: z.string().optional(),
        })
        .optional(),
      chat: z.object({
        id: z.number(),
        type: z.string(),
      }),
      date: z.number(),
      text: z.string().optional(),
    })
    .optional(),
});

// ============================================================
// WhatsApp Webhook Payload (Phase 4)
// ============================================================
export const whatsappWebhookSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          value: z.object({
            messaging_product: z.string(),
            metadata: z.object({
              display_phone_number: z.string(),
              phone_number_id: z.string(),
            }),
            contacts: z
              .array(
                z.object({
                  profile: z.object({ name: z.string() }),
                  wa_id: z.string(),
                })
              )
              .optional(),
            messages: z
              .array(
                z.object({
                  from: z.string(),
                  id: z.string(),
                  timestamp: z.string(),
                  type: z.string(),
                  text: z.object({ body: z.string() }).optional(),
                })
              )
              .optional(),
          }),
          field: z.string(),
        })
      ),
    })
  ),
});

// ============================================================
// Conversations / Messages (Phase 5)
// ============================================================
export const sendReplySchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1).max(4096),
});

export const setConversationStatusSchema = z.object({
  conversation_id: z.string().uuid(),
  status: z.enum(['ai_active', 'human_handoff', 'resolved']),
});
