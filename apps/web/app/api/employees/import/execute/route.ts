import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { validateImportData, IMPORTABLE_FIELDS } from '@/lib/utils/employee-import';

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
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Check permissions (admin/owner for import)
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can import employees' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      rows, // Array of validated row data
      fieldMapping, // Field mapping object
      createNewUsers = false, // Whether to create auth users for new employees
    } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows to import' },
        { status: 400 }
      );
    }

    if (!fieldMapping || typeof fieldMapping !== 'object') {
      return NextResponse.json(
        { error: 'Invalid field mapping' },
        { status: 400 }
      );
    }

    // Create admin client if needed for user creation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminSupabase =
      supabaseUrl && supabaseServiceKey
        ? createAdminClient(supabaseUrl, supabaseServiceKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          })
        : null;

    // Get existing employees for duplicate detection
    const { data: existingEmployees } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('organization_id', profile.organization_id);

    const emailToIdMap = new Map(
      (existingEmployees || []).map((e) => [e.email.toLowerCase(), e.id])
    );

    // Process imports
    const results = {
      created: 0,
      updated: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    // Process in batches to avoid overwhelming the database
    const BATCH_SIZE = 10;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (row: any) => {
          try {
            const email = row.email?.toLowerCase();
            if (!email) {
              results.errors.push({
                row: row.rowIndex || i + 1,
                error: 'Missing email',
              });
              return;
            }

            const existingId = emailToIdMap.get(email);

            if (existingId) {
              // Update existing employee
              const updateData: Record<string, any> = {
                updated_at: new Date().toISOString(),
              };

              // Map fields
              Object.entries(fieldMapping).forEach(([csvField, dbField]) => {
                if (IMPORTABLE_FIELDS.includes(dbField as any) && row[dbField] !== undefined) {
                  updateData[dbField] = row[dbField] || null;
                }
              });

              // Handle skills array
              if (updateData.skills && Array.isArray(updateData.skills)) {
                updateData.skills = updateData.skills.length > 0 ? updateData.skills : null;
              }

              const { error: updateError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', existingId);

              if (updateError) {
                throw updateError;
              }

              results.updated++;
            } else {
              // Create new employee
              if (!createNewUsers) {
                // Just create profile without auth user
                const insertData: Record<string, any> = {
                  email: row.email,
                  organization_id: profile.organization_id,
                  full_name: row.full_name || null,
                  role: row.role || 'member',
                  job_title: row.job_title || null,
                  department: row.department || null,
                  team: row.team || null,
                  phone: row.phone || null,
                  location: row.location || null,
                  bio: row.bio || null,
                  avatar_url: row.avatar_url || null,
                  skills: row.skills && Array.isArray(row.skills) && row.skills.length > 0
                    ? row.skills
                    : null,
                };

                const { data: newProfile, error: insertError } = await supabase
                  .from('profiles')
                  .insert(insertData)
                  .select('id')
                  .single();

                if (insertError) {
                  throw insertError;
                }

                results.created++;
              } else {
                // Create auth user + profile
                if (!adminSupabase) {
                  throw new Error('Admin client not available for user creation');
                }

                // Generate a random password (user will need to reset)
                const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

                const { data: newUser, error: userError } = await adminSupabase.auth.admin.createUser({
                  email: row.email,
                  password: randomPassword,
                  email_confirm: false,
                });

                if (userError || !newUser.user) {
                  throw userError || new Error('Failed to create user');
                }

                // Update profile with employee data
                const updateData: Record<string, any> = {
                  email: row.email,
                  organization_id: profile.organization_id,
                  full_name: row.full_name || null,
                  role: row.role || 'member',
                  job_title: row.job_title || null,
                  department: row.department || null,
                  team: row.team || null,
                  phone: row.phone || null,
                  location: row.location || null,
                  bio: row.bio || null,
                  avatar_url: row.avatar_url || null,
                  skills: row.skills && Array.isArray(row.skills) && row.skills.length > 0
                    ? row.skills
                    : null,
                };

                const { error: updateError } = await supabase
                  .from('profiles')
                  .update(updateData)
                  .eq('id', newUser.user.id);

                if (updateError) {
                  // Clean up: delete the auth user if profile update fails
                  await adminSupabase.auth.admin.deleteUser(newUser.user.id);
                  throw updateError;
                }

                results.created++;
              }
            }
          } catch (error: any) {
            results.errors.push({
              row: row.rowIndex || i + 1,
              error: error?.message || 'Unknown error',
            });
          }
        })
      );
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action: 'import',
      resource_type: 'employees',
      details: {
        created: results.created,
        updated: results.updated,
        errors: results.errors.length,
      },
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Import execute error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to execute import' },
      { status: 500 }
    );
  }
}

