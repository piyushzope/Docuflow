import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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

    // Get default storage config
    const { data: storageConfigs } = await supabase
      .from('storage_configs')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .limit(1);

    const defaultStorageId = storageConfigs?.[0]?.id || null;

    if (!defaultStorageId) {
      return NextResponse.json(
        {
          error: 'No storage configuration found. Please configure storage first.',
        },
        { status: 400 }
      );
    }

    // Check if default rules already exist
    const { data: existingRules } = await supabase
      .from('routing_rules')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .limit(1);

    if (existingRules && existingRules.length > 0) {
      return NextResponse.json(
        { error: 'Rules already exist for this organization' },
        { status: 400 }
      );
    }

    // Default rules to create
    const defaultRules = [
      {
        name: 'Employee Documents',
        priority: 110,
        conditions: {},
        actions: {
          storage_id: defaultStorageId,
          folder_path: 'documents/employees/{employee_name}/{date}',
        },
        is_active: true,
      },
      {
        name: 'PDF Documents',
        priority: 100,
        conditions: {
          file_types: ['pdf'],
        },
        actions: {
          storage_id: defaultStorageId,
          folder_path: 'documents/pdf/{date}',
        },
        is_active: true,
      },
      {
        name: 'Word Documents',
        priority: 90,
        conditions: {
          file_types: ['doc', 'docx'],
        },
        actions: {
          storage_id: defaultStorageId,
          folder_path: 'documents/word/{date}',
        },
        is_active: true,
      },
      {
        name: 'Excel Spreadsheets',
        priority: 80,
        conditions: {
          file_types: ['xls', 'xlsx'],
        },
        actions: {
          storage_id: defaultStorageId,
          folder_path: 'documents/spreadsheets/{date}',
        },
        is_active: true,
      },
      {
        name: 'Invoice Documents',
        priority: 70,
        conditions: {
          subject_pattern: '.*(?:invoice|bill|payment).*',
        },
        actions: {
          storage_id: defaultStorageId,
          folder_path: 'documents/invoices/{year}/{month}',
        },
        is_active: true,
      },
      {
        name: 'Contract Documents',
        priority: 60,
        conditions: {
          subject_pattern: '.*(?:contract|agreement|legal).*',
        },
        actions: {
          storage_id: defaultStorageId,
          folder_path: 'documents/contracts/{year}',
        },
        is_active: true,
      },
      {
        name: 'Default Catch-All',
        priority: 0,
        conditions: {},
        actions: {
          storage_id: defaultStorageId,
          folder_path: 'documents/{date}',
        },
        is_active: true,
      },
    ];

    // Insert default rules
    const rulesToInsert = defaultRules.map((rule) => ({
      organization_id: profile.organization_id,
      ...rule,
    }));

    const { error: insertError } = await supabase
      .from('routing_rules')
      .insert(rulesToInsert);

    if (insertError) {
      throw insertError;
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action: 'create',
      resource_type: 'routing_rule',
      details: {
        type: 'default_rules',
        count: defaultRules.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Created ${defaultRules.length} default routing rules`,
      count: defaultRules.length,
    });
  } catch (error: any) {
    console.error('Error creating default rules:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create default rules' },
      { status: 500 }
    );
  }
}

