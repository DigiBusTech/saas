import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/server-service';
import { sendInngestEvent } from '../client';

/**
 * Scheduled Automation Processor
 * 
 * Runs every 5 minutes to check for automations scheduled to execute.
 * Updates status to 'processing' and dispatches to the existing dispatch-automation function.
 */
export const processScheduledAutomations = inngest.createFunction(
  { 
    id: 'process-scheduled-automations',
    name: 'Process Scheduled Automations',
  },
  { cron: '*/5 * * * *' }, // Every 5 minutes
  async ({ step, logger }) => {
    
    // Step 1: Fetch automations ready to execute
    const automations = await step.run('fetch-scheduled-automations', async () => {
      const supabase = createServiceClient();
      
      const { data, error } = await supabase.rpc('get_scheduled_automations_ready');
      
      if (error) {
        logger.error('Failed to fetch scheduled automations:', error);
        throw error;
      }

      logger.info(`Found ${data?.length || 0} scheduled automations ready to execute`);
      return data || [];
    });

    if (!automations || automations.length === 0) {
      logger.info('No scheduled automations to process');
      return { processed: 0 };
    }

    // Step 2: Process each automation
    let processedCount = 0;
    
    for (const automation of automations) {
      await step.run(`process-automation-${automation.id}`, async () => {
        const supabase = createServiceClient();
        
        try {
          // Update status to processing
          const { error: updateError } = await supabase
            .from('workspace_automations')
            .update({ 
              status: 'processing',
              last_executed_at: new Date().toISOString()
            })
            .eq('id', automation.id);

          if (updateError) {
            logger.error(`Failed to update status for automation ${automation.id}:`, updateError);
            return;
          }

          // Dispatch to the existing dispatch-automation function
          await sendInngestEvent({
            name: 'automation/dispatch',
            data: {
              automationId: automation.id,
              workspaceId: automation.workspace_id,
              stepNumber: 1,
              isScheduledExecution: true,
            },
          });

          logger.info(`Dispatched scheduled automation: ${automation.name} (${automation.id})`);
          processedCount++;

        } catch (error) {
          logger.error(`Error processing automation ${automation.id}:`, error);
          
          // Mark as failed
          await supabase
            .from('workspace_automations')
            .update({ status: 'active' })
            .eq('id', automation.id);
        }
      });
    }

    logger.info(`Processed ${processedCount} scheduled automations`);
    
    return { 
      processed: processedCount,
      total: automations.length
    };
  }
);
