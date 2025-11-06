import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Handle async params (Next.js 15)
    const resolvedParams = await Promise.resolve(params);
    const ruleId = resolvedParams.id;

    // Verify the rule belongs to the user's organization
    const { data: rule, error: fetchError } = await supabase
      .from('routing_rules')
      .select('id, name, organization_id')
      .eq('id', ruleId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (fetchError || !rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Delete the rule
    const { error: deleteError } = await supabase
      .from('routing_rules')
      .delete()
      .eq('id', ruleId)
      .eq('organization_id', profile.organization_id);

    if (deleteError) {
      throw deleteError;
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action: 'delete',
      resource_type: 'routing_rule',
      details: {
        name: rule.name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting rule:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete rule' },
      { status: 500 }
    );
  }
}

