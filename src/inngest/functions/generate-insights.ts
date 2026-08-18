import { inngest } from '../client';
import { createServerClient } from '@supabase/ssr';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';

function getDb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! });

/**
 * Background function to generate AI business insights from a tenant's recent messages.
 * Triggered manually or on a schedule via Inngest.
 */
export const generateInsights = inngest.createFunction(
  {
    id: 'generate-business-insights',
    retries: 2,
    triggers: [{ event: 'insights/generate' }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { tenantId } = event.data;

    // STEP 1: Fetch recent messages for the tenant
    const messagesData = await step.run('fetch-messages', async () => {
      const db = getDb();

      // Get conversations for this tenant
      const { data: conversations } = await db
        .from('conversations')
        .select('id, platform, contact_name, status, outcome')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (!conversations || conversations.length === 0) {
        return { messages: [], conversationCount: 0 };
      }

      const conversationIds = conversations.map((c: any) => c.id);

      // Get recent messages from these conversations
      const { data: messages } = await db
        .from('messages')
        .select('conversation_id, sender_type, content, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
        .limit(200);

      return {
        messages: messages ?? [],
        conversations: conversations ?? [],
        conversationCount: conversations.length,
      };
    });

    if (messagesData.conversationCount === 0) {
      return { status: 'skipped', reason: 'no_conversations' };
    }

    // STEP 2: Generate insights via LLM
    const report = await step.run('generate-report', async () => {
      const messageLogs = messagesData.messages
        .slice(0, 100)
        .map((m: any) => `[${m.sender_type}] ${m.content}`)
        .join('\n');

      const conversationSummary = (messagesData.conversations ?? [])
        .map((c: any) => `${c.contact_name ?? 'Unknown'} (${c.platform}) — Status: ${c.status}, Outcome: ${c.outcome ?? 'none'}`)
        .join('\n');

      const prompt = `You are a business intelligence analyst. Analyze the following customer support chat logs and conversation data from a business's AI chatbot.

CONVERSATION SUMMARY (${messagesData.conversationCount} conversations):
${conversationSummary}

RECENT MESSAGE LOGS:
${messageLogs}

Generate a JSON report with EXACTLY this structure (no markdown, just raw JSON):
{
  "summary": "A 2-3 sentence overview of the business's customer interaction trends",
  "total_conversations": <number>,
  "sentiment_breakdown": {
    "positive": <percentage 0-100>,
    "neutral": <percentage 0-100>,
    "negative": <percentage 0-100>
  },
  "top_topics": [
    {"topic": "<topic name>", "count": <number>, "sentiment": "positive|neutral|negative"}
  ],
  "unhandled_faqs": [
    {"question": "<common unaddressed question>", "frequency": <number>}
  ],
  "lead_friction_points": [
    {"issue": "<description of where customers drop off or get frustrated>", "severity": "high|medium|low"}
  ],
  "recommendations": [
    "<actionable recommendation>"
  ]
}`;

      const result = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        prompt,
        temperature: 0.1,
      });

      // Try to parse the JSON response
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch {
        // If parsing fails, return raw text wrapped in a report structure
      }

      return {
        summary: result.text,
        total_conversations: messagesData.conversationCount,
        sentiment_breakdown: { positive: 0, neutral: 100, negative: 0 },
        top_topics: [],
        unhandled_faqs: [],
        lead_friction_points: [],
        recommendations: ['Unable to parse structured insights. Review raw data.'],
      };
    });

    // STEP 3: Store the report
    await step.run('store-report', async () => {
      const db = getDb();
      const { error } = await db.from('tenant_insights').upsert({
        tenant_id: tenantId,
        report,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' });
      if (error) throw error;
    });

    return {
      status: 'success',
      tenantId,
      report,
      generatedAt: new Date().toISOString(),
    };
  }
);
