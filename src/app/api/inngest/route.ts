import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { processChatMessage } from '@/inngest/functions/process-chat-message';
import { generateInsights } from '@/inngest/functions/generate-insights';
import { broadcastCron } from '@/inngest/functions/broadcast-cron';
import { sendManualWhatsApp, sendManualTelegram } from '@/inngest/functions/send-manual-message';
import { vectorizeKnowledge } from '@/inngest/functions/vectorize-knowledge';
import { orderStatusUpdated } from '@/inngest/functions/order-status-updated';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processChatMessage, generateInsights, broadcastCron, sendManualWhatsApp, sendManualTelegram, vectorizeKnowledge, orderStatusUpdated],
});


