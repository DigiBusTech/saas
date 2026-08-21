import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/automations/[id]/enroll
 * 
 * Enroll eligible leads into a drip sequence.
 * Only works for automation_type = 'drip'.
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
        automation_type,
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

    // Verify automation is drip type
    if (automation.automation_type !== 'drip') {
      return NextResponse.json(
        { error: 'This endpoint only works for drip sequences' },
        { status: 400 }
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

    // Enroll leads using RPC function
    const { data: result, error: enrollError } = await supabase.rpc(
      'enroll_leads_in_drip',
      {
        p_automation_id: automationId,
        p_workspace_id: automation.workspace_id,
      }
    );

    if (enrollError) {
      console.error('Error enrolling leads in drip:', enrollError);
      return NextResponse.json(
        { error: 'Failed to enroll leads' },
        { status: 500 }
      );
    }

    const enrolled = result?.[0]?.enrolled_count || 0;
    const alreadyEnrolled = result?.[0]?.already_enrolled || 0;

    // Update automation status to active
    await supabase
      .from('workspace_automations')
      .update({ 
        status: 'active',
        lead_count: enrolled + alreadyEnrolled,
      })
      .eq('id', automationId);

    return NextResponse.json({
      success: true,
      message: `Enrolled ${enrolled} new leads. ${alreadyEnrolled} already enrolled.`,
      enrolled,
      alreadyEnrolled,
      total: enrolled + alreadyEnrolled,
    });

  } catch (error) {
    console.error('Error enrolling in drip:', error);
    return NextResponse.json(
      { error: 'Failed to enroll leads in drip' },
      { status: 500 }
    );
  }
}
