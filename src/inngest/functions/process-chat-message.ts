import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { executeLLMRequest } from '@/lib/ai/router';
import { logTelemetry, normalizeError } from '@/lib/telemetry';
import { sendEmail } from '@/lib/email';
import { CHAT_TOOL_DEFINITIONS, executeChatTool, type ChatToolContext } from '@/lib/ai/tools';
import { generateEmbedding } from './vectorize-knowledge';
import { analyzeSentiment } from '@/lib/ai/sentiment';

// Multi-Agent Orchestration Pipeline with Copilot Support
export const processChatMessage = inngest.createFunction(
  {
    id: 'process-chat-message',
    triggers: [{ event: 'chat/message.received' }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const {
      tenantId, workspaceId, platform, chatId, contactName,
      messageText, integrationId, botPersona, agentMode, externalMessageId, visitorEmail,
    } = event.data;

    const db = createServiceClient();

    try {
    // Step 0: Idempotency guard — webhook providers retry deliveries, and a
    // duplicate would otherwise create a second AI reply for the same message.
    if (externalMessageId) {
      const alreadyProcessed = await step.run('idempotency-check', async () => {
        let lookup = db
          .from('conversations')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('platform_chat_id', chatId)
          .eq('platform', platform);
        lookup = workspaceId ? lookup.eq('workspace_id', workspaceId) : lookup.is('workspace_id', null);
        const { data: existing } = await lookup.single();
        if (!existing) return false;
        const { data: dup } = await db
          .from('messages')
          .select('id')
          .eq('conversation_id', existing.id)
          .eq('external_message_id', externalMessageId)
          .maybeSingle();
        return !!dup;
      });
      if (alreadyProcessed) {
        return { status: 'duplicate_skipped', externalMessageId };
      }
    }

    // Step 0.5: Enforce monthly usage limits before spending AI tokens.
    // PHASE 4: Check WORKSPACE-LEVEL limits in addition to tenant-level limits
    const usageBlocked = await step.run('check-usage-limits', async () => {
      // Check tenant-level limits (legacy)
      const { data: tenant } = await db
        .from('tenants')
        .select('token_usage, monthly_token_limit, message_usage, monthly_message_limit, status')
        .eq('id', tenantId)
        .single();
      if (!tenant) return false;
      if (tenant.status !== 'active' && tenant.status !== 'trial') return true;
      if (tenant.monthly_token_limit && tenant.token_usage >= tenant.monthly_token_limit) return true;
      if (tenant.monthly_message_limit && tenant.message_usage >= tenant.monthly_message_limit) return true;
      
      // PHASE 4: Check workspace-level limits (NEW 4-TIER SYSTEM)
      if (workspaceId) {
        const { data: workspace } = await db
          .from('workspaces')
          .select('messages_used, message_limit, trial_ends_at, subscription_tier')
          .eq('id', workspaceId)
          .single();
        
        if (workspace) {
          // Check if trial has expired
          if (workspace.subscription_tier === 'free_trial' && workspace.trial_ends_at) {
            const trialEnd = new Date(workspace.trial_ends_at);
            if (trialEnd < new Date()) {
              return true; // Trial expired
            }
          }
          
          // Check if AI message limit exceeded
          if (workspace.messages_used >= workspace.message_limit) {
            return true; // Message cap reached
          }
        }
      }
      
      return false;
    });

    // Step 1: Upsert conversation record
    const conversation = await step.run('upsert-conversation', async () => {
      let conversationLookup = db
        .from('conversations')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('platform_chat_id', chatId)
        .eq('platform', platform);
      conversationLookup = workspaceId ? conversationLookup.eq('workspace_id', workspaceId) : conversationLookup.is('workspace_id', null);
      const { data: existing } = await conversationLookup.single();

      if (existing) {
        await db.from('conversations').update({
          contact_name: contactName,
          updated_at: new Date().toISOString(),
          workspace_id: workspaceId || null,
        }).eq('id', existing.id);
        return existing;
      }

      const { data: created, error } = await db
        .from('conversations')
        .insert({
          tenant_id: tenantId,
          workspace_id: workspaceId || null,
          integration_id: integrationId || null,
          platform,
          platform_chat_id: chatId,
          contact_name: contactName,
          status: 'ai_active',
        })
        .select('id')
        .single();

      if (error) throw new Error(`Failed to create conversation: ${error.message} (${error.code ?? 'unknown'})`);
      if (!created) throw new Error('Failed to create conversation: database returned no record');
      return created;
    });

    // Step 2: Save incoming user message
    const inboundMessageSaved = await step.run('save-user-message', async () => {
      const { error } = await db.from('messages').insert({
        conversation_id: conversation.id,
        sender_type: 'user',
        sender_name: contactName,
        content: messageText,
        approval_status: 'sent',
        external_message_id: externalMessageId ?? null,
      });
      if (error) {
        if (error.code === '23505') return false; // duplicate webhook delivery, already recorded
        throw new Error(`Failed to save inbound message: ${error.message} (${error.code ?? 'unknown'})`);
      }
      return true;
    });
    if (!inboundMessageSaved && externalMessageId) return { status: 'duplicate_skipped', externalMessageId };

    // If usage limits are exhausted, notify the customer once and stop before calling the LLM.
    if (usageBlocked) {
      await step.run('save-limit-notice', async () => {
        const notice = 'Our AI assistant is temporarily offline. A human team member will follow up with you shortly. Thank you for your patience.';
        await db.from('messages').insert({
          conversation_id: conversation.id,
          sender_type: 'bot',
          sender_name: 'AI Assistant',
          content: notice,
          approval_status: 'sent',
        });
        await db.from('conversations').update({ status: 'escalated' }).eq('id', conversation.id);
      });
      return { status: 'usage_limit_reached', conversationId: conversation.id };
    }

    // Step 3: Upsert CRM record (workspace-scoped) and capture id + ai_status
    let crmRecord: { id: string; ai_status: string; customer_name: string | null; email: string | null } | null = null;
    if (workspaceId) {
      crmRecord = await step.run('upsert-crm-record', async () => {
        const { data: existingCrm } = await db
          .from('workspace_crm')
          .select('id, lead_score, ai_status, customer_name, email')
          .eq('workspace_id', workspaceId)
          .eq('platform', platform)
          .eq('platform_user_id', chatId)
          .single();

        if (existingCrm) {
          const updatePayload: any = {
            last_interaction: new Date().toISOString(),
          };
          // For web chat, inject the pre-chat metadata immediately
          if (platform === 'web') {
            if (contactName) updatePayload.customer_name = contactName;
            if (visitorEmail) updatePayload.email = visitorEmail;
          } else if (contactName && (!existingCrm.customer_name || existingCrm.customer_name === chatId)) {
            // For social channels, update name if it was previously missing
            updatePayload.customer_name = contactName;
          }

          const updateResult = await db.from('workspace_crm').update(updatePayload).eq('id', existingCrm.id);
          if (updateResult.error?.code === 'PGRST204') {
            await db.from('workspace_crm').update({
              last_interaction: updatePayload.last_interaction,
            }).eq('id', existingCrm.id);
          } else if (updateResult.error) {
            throw new Error(`Failed to update CRM record: ${updateResult.error.message} (${updateResult.error.code ?? 'unknown'})`);
          }
          
          // Re-fetch updated data
          const { data: updated } = await db
            .from('workspace_crm')
            .select('id, ai_status, customer_name, email')
            .eq('id', existingCrm.id)
            .single();
          
          return updated ? { 
            id: updated.id, 
            ai_status: updated.ai_status ?? 'active',
            customer_name: updated.customer_name,
            email: updated.email,
          } : { 
            id: existingCrm.id, 
            ai_status: existingCrm.ai_status ?? 'active',
            customer_name: existingCrm.customer_name,
            email: existingCrm.email,
          };
        }

        const crmPayload: any = {
          workspace_id: workspaceId,
          platform,
          platform_user_id: chatId,
          customer_name: contactName,
          lead_score: 10,
          tags: ['New Lead'],
        };
        // Web chat: inject email immediately
        if (platform === 'web' && visitorEmail) {
          crmPayload.email = visitorEmail;
        }

        let { data: created, error } = await db.from('workspace_crm').insert(crmPayload).select('id, ai_status, customer_name, email').single();
        if (error?.code === 'PGRST204') {
          ({ data: created, error } = await db.from('workspace_crm').insert({
            workspace_id: workspaceId,
            platform,
            platform_user_id: chatId,
            customer_name: contactName,
            lead_score: 10,
            tags: ['New Lead'],
          }).select('id, ai_status, customer_name, email').single());
        }

        if (error) throw new Error(`Failed to create CRM record: ${error.message} (${error.code ?? 'unknown'})`);
        if (!created) throw new Error('Failed to create CRM record: database returned no record');
        return { 
          id: created.id, 
          ai_status: created.ai_status ?? 'active',
          customer_name: created.customer_name,
          email: created.email,
        };
      });

      // Log the inbound user message to chat_messages (for the Unified Inbox)
      if (crmRecord) {
        await step.run('log-inbound-chat-message', async () => {
          const { error } = await db.from('chat_messages').insert({
            workspace_id: workspaceId,
            crm_id: crmRecord!.id,
            direction: 'inbound',
            sender_type: 'user',
            content: messageText,
            platform,
          });
          if (error) throw new Error(`Failed to log inbound inbox message: ${error.message} (${error.code ?? 'unknown'})`);
        });
      }
    }

    // Step 3.5: MUTE CHECK — if a human has taken over (ai_status = 'paused'), halt the AI.
    if (crmRecord && crmRecord.ai_status === 'paused') {
      return { success: true, reason: 'human_override', conversationId: conversation.id };
    }

    const escalationRequested = /urgent|emergency|scam|fraud|stolen|refund|angry|complaint|speak to (a )?(human|person|agent)|manager/i.test(messageText);
    if (escalationRequested) {
      await step.run('escalate-to-tenant', async () => {
        await db.from('conversations').update({ status: 'human_handoff' }).eq('id', conversation.id);
        const { data: owner } = await db.from('users').select('email, full_name').eq('tenant_id', tenantId).in('role', ['tenant_admin', 'super_admin']).limit(1).maybeSingle();
        if (owner?.email) {
          await sendEmail('human_handoff_alert', owner.email, { tenant_name: owner.full_name ?? 'Tenant team', customer_name: contactName, message: messageText });
        }
      });
      return { status: 'escalated', conversationId: conversation.id };
    }

    // Step 4: If manual mode, skip AI entirely

    if (agentMode === 'manual') {
      await step.run('manual-mode-skip', async () => {
        await db.from('conversations').update({ status: 'human_handoff' }).eq('id', conversation.id);
      });
      return { status: 'manual_mode', conversationId: conversation.id };
    }

    // Step 4.5: Reputation guardrail — score sentiment, log it, and proactively
    // hand off to a human on negative/angry messages (empathetic reply still sent).
    const sentiment = analyzeSentiment(messageText);
    const toolContext: ChatToolContext | null = workspaceId
      ? { db, workspaceId, tenantId, platform, chatId, contactName, conversationId: conversation.id, crmId: crmRecord?.id ?? null }
      : null;

    if (workspaceId) {
      await step.run('log-reputation', async () => {
        await db.from('workspace_reputation_logs').insert({
          workspace_id: workspaceId,
          chat_session_id: chatId,
          sentiment_score: sentiment.score,
          sentiment_label: sentiment.label,
          escalated: sentiment.label === 'negative' || sentiment.label === 'angry',
          escalation_reason: sentiment.label === 'negative' || sentiment.label === 'angry' ? 'Automated sentiment guardrail' : null,
        });
      });

      if ((sentiment.label === 'negative' || sentiment.label === 'angry') && toolContext) {
        await step.run('sentiment-escalation', async () => {
          await executeChatTool('escalate_to_human', JSON.stringify({ reason: `Negative customer sentiment detected (${sentiment.label}, score ${sentiment.score}).`, priority_level: sentiment.label === 'angry' ? 'high' : 'medium' }), toolContext);
        });
      }
    }

    // Step 5: Supervisor Router — classify intent
    const intent = await step.run('supervisor-router', async () => {
      const lowerMsg = messageText.toLowerCase();

      if (lowerMsg.includes('buy') || lowerMsg.includes('price') || lowerMsg.includes('order') || lowerMsg.includes('pay') || lowerMsg.includes('product')) {
        return 'sales_intent';
      }
      if (lowerMsg.includes('subscri') || lowerMsg.includes('plan') || lowerMsg.includes('renew') || lowerMsg.includes('expire')) {
        return 'subscription_query';
      }
      return 'support_faq';
    });

    // Step 6: Generate AI response based on intent
    const aiResponse = await step.run('generate-ai-response', async () => {
      let contextInfo = '';

      // PHASE 1: Pre-chat identity context injection for web chat
      let identityContext = '';
      if (crmRecord) {
        const hasName = crmRecord.customer_name && crmRecord.customer_name !== chatId;
        const hasEmail = crmRecord.email && crmRecord.email.includes('@');
        
        if (platform === 'web' && hasName && hasEmail) {
          // Web chat: user already provided name and email in pre-chat form
          identityContext = `\n\nCURRENT CUSTOMER CONTEXT:\nName: ${crmRecord.customer_name}\nEmail: ${crmRecord.email}\nPlatform: Web Chat\n\nIMPORTANT: Do NOT ask the customer for their name or email. You already have this information.`;
        } else if (platform !== 'web' && (!hasName || !hasEmail)) {
          // Social channels: prompt for missing details naturally
          const missing: string[] = [];
          if (!hasName) missing.push('name');
          if (!hasEmail) missing.push('email');
          
          identityContext = `\n\nLEAD ONBOARDING REQUIRED:\nMissing customer information: ${missing.join(', ')}\n\nIf this is the customer's first message or they haven't provided their ${missing.join(' and ')}, politely ask for it in a natural, friendly way (e.g., "Welcome! To better assist you, may I have your name and email?"). Once provided, use the update_lead_profile tool to save it, then immediately address their inquiry without repeating the question.`;
        }
      }

      // Sales Agent: fetch products for product recommendations
      if (intent === 'sales_intent' && workspaceId) {
        const { data: products } = await db
          .from('workspace_products')
          .select('name, description, price, currency, payment_link')
          .eq('workspace_id', workspaceId)
          .limit(5);

        if (products && products.length > 0) {
          contextInfo = '\n\nAvailable products:\n' + products.map((p) =>
            `- ${p.name}: ${p.currency} ${p.price}${p.payment_link ? ` (Buy: ${p.payment_link})` : ''}`
          ).join('\n');

          // Auto-tag CRM as potential buyer
          if (workspaceId) {
            await db.from('workspace_crm')
              .update({ lead_score: 50, tags: ['Hot Lead', 'Sales Interest'] })
              .eq('workspace_id', workspaceId)
              .eq('platform_user_id', chatId);
          }
        }
      }

      // PHASE 2: Enhanced RAG grounding via pgvector semantic search with intelligent synthesis
      let kbMatched = false;
      if (intent === 'support_faq') {
        let kbResults: Array<{ title: string; content: string }> | null = null;
        try {
          const queryEmbedding = await generateEmbedding(messageText);
          if (queryEmbedding) {
            const { data } = workspaceId
              ? await db.rpc('match_knowledge_workspace', { query_embedding: queryEmbedding, match_tenant_id: tenantId, match_workspace_id: workspaceId, match_threshold: 0.72, match_count: 3 })
              : await db.rpc('match_knowledge', { query_embedding: queryEmbedding, match_tenant_id: tenantId, match_threshold: 0.72, match_count: 3 });
            if (data) kbResults = data;
          }
        } catch {
          // Embedding or RPC unavailable (e.g. migration not yet applied) — fall back below.
        }

        if (!kbResults) {
          const { data } = await db
            .from('knowledge_bases')
            .select('title, content')
            .eq('tenant_id', tenantId)
            .or(workspaceId ? `workspace_id.eq.${workspaceId},workspace_id.is.null` : 'workspace_id.is.null')
            .limit(3);
          kbResults = data;
        }

        if (kbResults && kbResults.length > 0) {
          kbMatched = true;
          // PHASE 2: Improved RAG formatting with clear synthesis instructions
          contextInfo = '\n\n=== GROUNDING KNOWLEDGE BASE DOCUMENTS ===\n' + 
            kbResults.map((k, idx) =>
              `\n[Document ${idx + 1}: ${k.title}]\n${k.content.substring(0, 400)}\n`
            ).join('\n---\n') +
            '\n=== END KNOWLEDGE BASE ===\n';
        }
      }

      // Inject business-defined categories so the LLM only uses approved tags
      let categoryInstructions = '';
      if (workspaceId) {
        const { data: categories } = await db
          .from('workspace_categories')
          .select('name')
          .eq('workspace_id', workspaceId);

        if (categories && categories.length > 0) {
          const list = categories.map((c: { name: string }) => c.name).join(', ');
          categoryInstructions = `\n\nYou may categorize this lead using ONLY these business-defined categories: [${list}]. Do not invent new categories.`;
        }
      }

      // PHASE 2: Enhanced persona adaptation instructions
      const personaInstructions = botPersona === 'Custom Prompt'
        ? await getCustomPersonaInstructions(db, workspaceId)
        : getPersonaInstructions(botPersona || 'Professional English');

      // Use the centrally configured provider order and failover policy.
      const ragGroundingInstructions = intent === 'support_faq'
        ? (kbMatched
            ? '\n\n📋 INSTRUCTIONS: Synthesize the knowledge base documents above intelligently. Answer the customer\'s question using these facts while maintaining a natural, conversational tone. Do NOT copy text verbatim if it sounds robotic. Adapt the information to fit the customer\'s specific question. If the documents don\'t fully answer their question, acknowledge what you can confirm and what you cannot.'
            : '\n\n⚠️ IMPORTANT: No matching information was found in this business\'s knowledge base for this question. Politely inform the customer that you don\'t have that specific information on hand. Offer to connect them with a team member who can provide detailed answers, or take their contact details for a callback. Do not guess, speculate, or fabricate an answer.')
        : '';
      
      const sentimentInstructions = (sentiment.label === 'negative' || sentiment.label === 'angry')
        ? `\n\n🚨 EMPATHY REQUIRED: This customer's message shows ${sentiment.label} sentiment (score: ${sentiment.score}). Lead with empathy and acknowledge their frustration FIRST before anything else. Use phrases like "I understand this has been frustrating for you" or "I sincerely apologize for the inconvenience." Do not argue, defend company policies, or make unverified claims. Keep your tone calm, apologetic, and solution-focused. A human team member has been notified and will follow up personally.`
        : '';

      const systemPrompt = `You are an AI-powered customer service agent for this business.${personaInstructions}

Intent classification: ${intent}
${contextInfo}${identityContext}${categoryInstructions}${ragGroundingInstructions}${sentimentInstructions}

Core Guidelines:
- Respond helpfully, concisely, and professionally to the customer's message.
- If products or services are available and relevant to their inquiry, recommend them with direct purchase/booking links.
- Use the available tools when: (1) customer asks about order status, (2) wants to browse offerings, (3) shows clear buying/booking intent, (4) provides identity information that needs saving, or (5) needs human escalation.
- For service bookings, ask for their preferred appointment date/time and any special requirements.
- Maintain the business persona across all interactions, whether this is a consulting firm, salon, e-commerce store, or service provider.`;


      try {
        const result = await executeLLMRequest({
          prompt: messageText,
          systemInstruction: systemPrompt,
          maxTokens: 500,
          temperature: 0.7,
          ...(workspaceId ? { tools: CHAT_TOOL_DEFINITIONS } : {}),
        });

        let reply = result.text;
        let tokensUsed = result.tokensUsed;

        if (workspaceId && toolContext && result.toolCalls?.length) {
          const toolResultMessages = [];
          for (const call of result.toolCalls) {
            const toolResult = await executeChatTool(call.name, call.arguments, toolContext);
            toolResultMessages.push({ role: 'tool' as const, tool_call_id: call.id, name: call.name, content: JSON.stringify(toolResult) });
          }

          const followUp = await executeLLMRequest({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: messageText },
              { role: 'assistant', content: (result.rawMessage?.content as string) ?? '', tool_calls: result.rawMessage?.tool_calls as unknown[] },
              ...toolResultMessages,
            ],
            maxTokens: 500,
            temperature: 0.7,
          });
          if (followUp.text) reply = followUp.text;
          tokensUsed += followUp.tokensUsed;
        }

        // Update tenant token + message usage so plan limits are enforced.
        try { await db.rpc('increment_token_usage', { tenant_id_input: tenantId, tokens: tokensUsed }); } catch {}
        try { await db.rpc('increment_message_usage', { tenant_id_input: tenantId, amount: 1 }); } catch {}
        
        // PHASE 4: Update workspace-level message usage
        if (workspaceId) {
          try { await db.rpc('increment_workspace_message_usage', { workspace_id_input: workspaceId }); } catch {}
        }

        return { reply, tokensUsed };
      } catch (err) {
        const normalized = normalizeError(err);
        await logTelemetry({
          severity: 'error',
          source: 'llm_router',
          endpoint: 'process-chat-message/generate-ai-response',
          message: normalized.message,
          stackTrace: normalized.stack,
          workspaceId,
          tenantId,
          metadata: { platform, chatId, intent },
        });
        return { reply: 'I apologize, I am experiencing technical difficulties. Please try again shortly.', tokensUsed: 0 };
      }
    });

    // Step 7: Copilot check — if copilot mode, save as draft for approval
    if (agentMode === 'copilot') {
      await step.run('copilot-save-draft', async () => {
        await db.from('messages').insert({
          conversation_id: conversation.id,
          sender_type: 'bot',
          sender_name: 'AI Assistant',
          content: aiResponse.reply,
          tokens_used: aiResponse.tokensUsed,
          approval_status: 'pending_approval',
        });
      });
      return { status: 'copilot_pending', conversationId: conversation.id };
    }

    // Step 8: Autopilot — send response directly
    await step.run('save-and-send-response', async () => {
      // Save bot message
      await db.from('messages').insert({
        conversation_id: conversation.id,
        sender_type: 'bot',
        sender_name: 'AI Assistant',
        content: aiResponse.reply,
        tokens_used: aiResponse.tokensUsed,
        approval_status: 'sent',
      });

      // Log the AI agent response to chat_messages (for the Unified Inbox)
      if (crmRecord) {
        const { error } = await db.from('chat_messages').insert({
          workspace_id: workspaceId,
          crm_id: crmRecord.id,
          direction: 'outbound',
          sender_type: 'ai_agent',
          content: aiResponse.reply,
          platform,
        });
        if (error) throw new Error(`Failed to log outbound inbox message: ${error.message} (${error.code ?? 'unknown'})`);
      }

      // Send via platform API
      if (platform === 'telegram' && workspaceId) {
        await sendTelegramMessage(db, workspaceId, chatId.replace('tg_', ''), aiResponse.reply);
      } else if (platform === 'whatsapp' && workspaceId) {
        await sendWhatsAppMessage(db, workspaceId, chatId, aiResponse.reply);
      }
    });

    return { status: 'sent', conversationId: conversation.id, intent };
    } catch (error) {
      const normalized = normalizeError(error);
      await logTelemetry({
        severity: 'error',
        source: 'inngest_job',
        endpoint: 'process-chat-message',
        message: normalized.message,
        stackTrace: normalized.stack,
        workspaceId,
        tenantId,
        metadata: { platform, chatId, externalMessageId },
      });
      throw error;
    }
  }
);

// Helper: persona instructions
function getPersonaInstructions(persona: string): string {
  const map: Record<string, string> = {
    'Professional English': '\nSpeak in formal, professional English. Be polished and business-appropriate.',
    'Casual English': '\nSpeak in a friendly, casual tone. Be warm and approachable.',
    'Nigerian Pidgin': '\nRespond in Nigerian Pidgin English. Be warm and relatable, e.g. "How far! Wetin you wan buy today?"',
    'Yoruba-Infused English': '\nMix English with common Yoruba expressions. E.g. "Ẹ kú àárọ̀! How can I help you today?"',
    'Hausa-Infused English': '\nMix English with common Hausa expressions. E.g. "Sannu! How can I assist you?"',
    'Custom Prompt': '',
  };
  return map[persona] ?? '';
}

// Helper: fetch the workspace's business-defined custom persona instructions
async function getCustomPersonaInstructions(db: any, workspaceId?: string): Promise<string> {
  if (!workspaceId) return '';
  const { data } = await db.from('workspaces').select('custom_prompt').eq('id', workspaceId).single();
  return data?.custom_prompt ? `\n${data.custom_prompt}` : '';
}

// Helper: send Telegram message using workspace token
async function sendTelegramMessage(db: any, workspaceId: string, chatId: string, text: string) {
  const { data: ws } = await db.from('workspaces').select('telegram_bot_token').eq('id', workspaceId).single();
  if (!ws?.telegram_bot_token) return;

  let token: string;
  try { token = decrypt(ws.telegram_bot_token); } catch { token = ws.telegram_bot_token; }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  }).catch((err) => { console.error(err); return null; });

  if (!res || !res.ok) {
    await logTelemetry({
      severity: 'error',
      source: 'webhook_telegram',
      endpoint: 'sendTelegramMessage',
      message: `Failed to deliver Telegram reply for workspace ${workspaceId}`,
      workspaceId,
    });
  }
}

// Helper: send WhatsApp message using workspace credentials
async function sendWhatsAppMessage(db: any, workspaceId: string, to: string, text: string) {
  const { data: ws } = await db.from('workspaces')
    .select('whatsapp_phone_number_id, whatsapp_access_token')
    .eq('id', workspaceId).single();

  if (!ws?.whatsapp_access_token || !ws?.whatsapp_phone_number_id) return;

  let accessToken: string;
  let phoneId: string;
  try { accessToken = decrypt(ws.whatsapp_access_token); } catch { accessToken = ws.whatsapp_access_token; }
  try { phoneId = decrypt(ws.whatsapp_phone_number_id); } catch { phoneId = ws.whatsapp_phone_number_id; }

  await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  }).then(async (res) => {
    if (!res.ok) {
      await logTelemetry({
        severity: 'error',
        source: 'webhook_whatsapp',
        endpoint: 'sendWhatsAppMessage',
        message: `Failed to deliver WhatsApp reply for workspace ${workspaceId}`,
        workspaceId,
      });
    }
  }).catch(console.error);
}
