import { createClient } from '@/lib/supabase/server';
import { executeLLMRequest } from '@/lib/ai/router';
import { logTelemetry, normalizeError } from '@/lib/telemetry';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages } = await request.json();

    // Fetch CMS documentation to inject as context
    const { data: docs } = await supabase
      .from('docs')
      .select('title, content')
      .eq('published_status', 'published')
      .order('sort_order')
      .limit(20);

    const docsContext =
      (docs ?? []).length > 0
        ? '\n\nPLATFORM DOCUMENTATION:\n' +
          (docs ?? []).map((d: any) => `### ${d.title}\n${d.content}`).join('\n\n')
        : '';

    const systemPrompt = `You are an AI onboarding assistant for the SabiBio multi-tenant SaaS platform. You help new tenants set up their account step by step.

Your job is to guide them through:
1. **Business Profile**: Ask about their business name, industry, and target audience. Help them understand how the platform works.
2. **Knowledge Base**: Explain how to upload documents that train their AI chatbot. Suggest what content to include (FAQs, product info, pricing, policies).
3. **Integration Setup**: Guide them through connecting their messaging platforms:
   - **Telegram**: Explain how to create a bot via @BotFather, get the bot token, and set a webhook secret.
   - **WhatsApp**: Explain how to set up a Meta Business account, get the Phone Number ID and permanent access token from the Meta Developer Console.
4. **Testing**: Suggest they send a test message to verify everything works.

Rules:
- Be conversational, encouraging, and concise.
- Use numbered steps and bullet points for clarity.
- If the user seems confused, break down the steps further.
- Reference the platform documentation below when providing setup instructions.
- Never ask for more than 2 pieces of information at once.
- Celebrate their progress at each step.
${docsContext}`;

    // Flatten the message history into a single prompt for the router.
    const conversation = (messages ?? [])
      .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');
    const prompt = `${conversation}\n\nAssistant:`;

    let result;
    try {
      result = await executeLLMRequest({
        prompt,
        systemInstruction: systemPrompt,
        temperature: 0.3,
        maxTokens: 1200,
      });
    } catch (err) {
      const { message, stack } = normalizeError(err);
      await logTelemetry({
        severity: 'error',
        source: 'llm_router',
        endpoint: '/api/chat/onboarding',
        message: `Onboarding chat failed across all providers: ${message}`,
        stackTrace: stack,
        tenantId: user.id,
      });

      // Return a graceful fallback message so the UI never shows a blank bubble.
      const fallback =
        "I'm having trouble reaching the AI service right now. Please try again in a moment. " +
        'In the meantime, you can start by adding your business details in Settings and uploading documents to the Knowledge Base.';
      return new Response(fallback, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Stream the completed text back in small chunks for a typing effect.
    const text = result.text;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const words = text.split(/(\s+)/);
        for (const word of words) {
          controller.enqueue(encoder.encode(word));
          // Small delay for a natural streaming feel.
          await new Promise((r) => setTimeout(r, 10));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-LLM-Provider': result.provider,
      },
    });
  } catch (err) {
    const { message, stack } = normalizeError(err);
    await logTelemetry({
      severity: 'critical',
      source: 'llm_router',
      endpoint: '/api/chat/onboarding',
      message: `Unhandled error in onboarding chat handler: ${message}`,
      stackTrace: stack,
    });
    return new Response(
      "Something went wrong. Please refresh and try again.",
      { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }
}
