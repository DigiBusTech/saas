import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'saas-ai-chat',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
