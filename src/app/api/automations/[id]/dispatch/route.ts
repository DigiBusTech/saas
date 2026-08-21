import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendInngestEvent } from '@/lib/inngest/dynamic';

/**
 * POST /api/automations/[id]/dispatch
 * 
 * Manually trigger an automation to send immediately.
 * Returns the count of eligible leads and dispatches the automation.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const automationId = params.id;
    
    if (!automationId) {
      return NextResponse.json(
        { error: 'Automation ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch the automation and verify ownership
    const { data: automation, error: fetchError } = await supabase
      .from('workspace_automations')
      .select(`
        id,
        workspace_id,
        name,
        message_template,
        channel_filter,
        email_subject,
        batch_size,
        rate_limit_delay_ms,
        workspaces!inner(tenant_id)
      `)
      .eq('id', automationId)
      .single();

    if (fetchError || !automation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      );
    }

    // Verify user owns this workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', automation.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this workspace' },
        { status: 403 }
      );
    }

    // Get count of eligible leads using the RPC function
    const { data: leads, error: leadsError } = await supabase.rpc(
      'get_automation_eligible_leads',
      {
        p_workspace_id: automation.workspace_id,
        p_channel_filter: automation.channel_filter || ['whatsapp', 'telegram', 'email']
      }
    );

    if (leadsError) {
      console.error('Error fetching eligible leads:', leadsError);
      return NextResponse.json(
        { error: 'Failed to fetch eligible leads' },
        { status: 500 }
      );
    }

    const leadCount = leads?.length || 0;

    if (leadCount === 0) {
      return NextResponse.json(
        { 
          success: true,
          message: 'No eligible leads to send to',
          leadCount: 0,
          dispatched: false
        },
        { status: 200 }
      );
    }

    // Update automation status to processing
    await supabase
      .from('workspace_automations')
      .update({ 
        status: 'processing',
        lead_count: leadCount,
        last_executed_at: new Date().toISOString()
      })
      .eq('id', automationId);

    // Dispatch to Inngest for background processing
    await sendInngestEvent({
      name: 'automation/dispatch',
      data: {
        automationId: automation.id,
        workspaceId: automation.workspace_id,
        stepNumber: 1,
        isManualDispatch: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Dispatched to ${leadCount} leads`,
      leadCount,
      dispatched: true,
      automationId: automation.id,
    });

  } catch (error) {
    console.error('Error dispatching automation:', error);
    return NextResponse.json(
      { error: 'Failed to dispatch automation' },
      { status: 500 }
    );
  }
}
