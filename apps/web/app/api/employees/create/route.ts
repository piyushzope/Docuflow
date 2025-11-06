import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create admin client for user creation (if needed)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminSupabase = supabaseUrl && supabaseServiceKey
      ? createAdminClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      : null;

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

    // Check if user has permission (admin or owner)
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can add employees' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      email,
      full_name,
      job_title,
      department,
      team,
      phone,
      avatar_url,
      location,
      bio,
      skills,
      role,
    } = body;

    if (!email || !full_name) {
      return NextResponse.json(
        { error: 'Email and full name are required' },
        { status: 400 }
      );
    }

    // Check if profile already exists in this organization (by email match)
    const { data: existingProfileInOrg } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .eq('organization_id', profile.organization_id)
      .maybeSingle();

    if (existingProfileInOrg) {
      return NextResponse.json(
        { error: 'An employee with this email is already in your organization' },
        { status: 400 }
      );
    }

    // IMPORTANT: Check if user exists in auth.users FIRST (before creating)
    // This prevents the "already registered" error
    let existingAuthUser = null;
    if (adminSupabase) {
      try {
        const { data: userList, error: listError } = await adminSupabase.auth.admin.listUsers();
        if (!listError && userList?.users) {
          existingAuthUser = userList.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        }
      } catch (listError) {
        console.warn('Error listing users (will try to create):', listError);
        // Continue to try creating user
      }
    }

    // If user exists in auth, handle it immediately
    if (existingAuthUser) {
      // Check if profile exists for this auth user
      const { data: existingProfileForAuthUser } = await supabase
        .from('profiles')
        .select('id, organization_id')
        .eq('id', existingAuthUser.id)
        .maybeSingle();

      if (existingProfileForAuthUser) {
        // Profile exists - check if already in this organization
        if (existingProfileForAuthUser.organization_id === profile.organization_id) {
          return NextResponse.json(
            {
              error: 'An employee with this email is already in your organization',
            },
            { status: 400 }
          );
        }

        // Get full profile data to preserve existing values
        const { data: fullProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', existingAuthUser.id)
          .single();

        // Profile exists but in different/no org - update it to add to this organization
        // Try to get full_name from auth.users if not provided and profile doesn't have it
        let fullNameToUpdate = full_name;
        if (!fullNameToUpdate && !fullProfile?.full_name && adminSupabase) {
          try {
            const { data: authUser } = await adminSupabase.auth.admin.getUserById(existingAuthUser.id);
            if (authUser?.user?.user_metadata?.full_name) {
              fullNameToUpdate = authUser.user.user_metadata.full_name;
            }
          } catch (authError) {
            console.warn(`Could not fetch auth user metadata for ${existingAuthUser.id}:`, authError);
          }
        }
        // Only update full_name if we have a value, otherwise keep existing or null
        fullNameToUpdate = fullNameToUpdate || fullProfile?.full_name || null;

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            email,
            organization_id: profile.organization_id,
            full_name: fullNameToUpdate,
            job_title: job_title || fullProfile?.job_title || null,
            department: department || fullProfile?.department || null,
            team: team || fullProfile?.team || null,
            phone: phone || fullProfile?.phone || null,
            avatar_url: avatar_url || fullProfile?.avatar_url || null,
            location: location || fullProfile?.location || null,
            bio: bio || fullProfile?.bio || null,
            skills: skills || fullProfile?.skills || null,
            role: role || fullProfile?.role || 'member',
          })
          .eq('id', existingAuthUser.id);

        if (updateError) {
          throw updateError;
        }

        // Log activity
        await supabase.from('activity_logs').insert({
          organization_id: profile.organization_id,
          user_id: user.id,
          action: 'update',
          resource_type: 'profile',
          resource_id: existingAuthUser.id,
          details: {
            email,
            full_name,
            action: 'added_existing_user_to_organization',
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Employee added to organization',
          employeeId: existingAuthUser.id,
        });
      } else {
        // Auth user exists but no profile - create profile for them
        const { error: insertError } = await supabase.from('profiles').insert({
          id: existingAuthUser.id,
          email,
          organization_id: profile.organization_id,
          full_name: full_name || null,
          job_title: job_title || null,
          department: department || null,
          team: team || null,
          phone: phone || null,
          avatar_url: avatar_url || null,
          location: location || null,
          bio: bio || null,
          skills: skills || null,
          role: role || 'member',
        });

        if (insertError) {
          // If duplicate key, profile was just created (trigger), update instead
          if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                email,
                organization_id: profile.organization_id,
                full_name: full_name || null,
                job_title: job_title || null,
                department: department || null,
                team: team || null,
                phone: phone || null,
                avatar_url: avatar_url || null,
                location: location || null,
                bio: bio || null,
                skills: skills || null,
                role: role || 'member',
              })
              .eq('id', existingAuthUser.id);

            if (updateError) {
              throw updateError;
            }
          } else {
            throw insertError;
          }
        }

        // Log activity
        await supabase.from('activity_logs').insert({
          organization_id: profile.organization_id,
          user_id: user.id,
          action: 'create',
          resource_type: 'profile',
          resource_id: existingAuthUser.id,
          details: {
            email,
            full_name,
            action: 'created_profile_for_existing_auth_user',
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Employee added to organization',
          employeeId: existingAuthUser.id,
        });
      }
    }

    // User doesn't exist in auth - proceed to create new user
    if (!adminSupabase) {
      return NextResponse.json(
        {
          error:
            'Service role key not configured. Cannot create new user accounts. Please configure SUPABASE_SERVICE_ROLE_KEY in environment variables. Employee must sign up first at /signup.',
        },
        { status: 500 }
      );
    }

    // Validate service role key by checking if we can access admin API
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          error:
            'Supabase configuration missing. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in environment variables.',
        },
        { status: 500 }
      );
    }

    // Create new user account via Admin API
    // This will send them an email to set their password
    const { data: newUser, error: createUserError } = await adminSupabase.auth.admin.createUser({
      email,
      email_confirm: true, // Auto-confirm email so they can login
      user_metadata: {
        full_name: full_name,
      },
    });

    if (createUserError || !newUser.user) {
      // Better error handling for API key issues
      if (createUserError?.message?.toLowerCase().includes('invalid api key') || 
          createUserError?.message?.toLowerCase().includes('api key')) {
        return NextResponse.json(
          {
            error:
              'Invalid service role key. Please verify SUPABASE_SERVICE_ROLE_KEY is correct in your environment variables. Employee must sign up first at /signup.',
          },
          { status: 500 }
        );
      }
      // Check if user already exists (case-insensitive matching for various error messages)
      const errorMsg = createUserError?.message?.toLowerCase() || '';
      if (errorMsg.includes('already registered') || 
          errorMsg.includes('user already registered') ||
          errorMsg.includes('email address has already been registered') ||
          errorMsg.includes('already exists')) {
        // Try to find the existing user (race condition - user was created between our check and create attempt)
        const { data: existingAuthUser, error: listError } = await adminSupabase.auth.admin.listUsers();
        
        if (listError) {
          console.error('Error listing users after create failure:', listError);
          // Fall through to generic error
        } else {
          const justFoundUser = existingAuthUser?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          
          if (justFoundUser) {
            // User exists in auth, check if profile exists
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id, organization_id')
              .eq('id', justFoundUser.id)
              .maybeSingle();

            if (existingProfile) {
              // Profile exists - check if already in this organization
              if (existingProfile.organization_id === profile.organization_id) {
                return NextResponse.json(
                  {
                    error: 'An employee with this email is already in your organization',
                  },
                  { status: 400 }
                );
              }

              // Profile exists but in different/no org - update it
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  email,
                  organization_id: profile.organization_id,
                  full_name: full_name || null,
                  job_title: job_title || null,
                  department: department || null,
                  team: team || null,
                  phone: phone || null,
                  avatar_url: avatar_url || null,
                  location: location || null,
                  bio: bio || null,
                  skills: skills || null,
                  role: role || 'member',
                })
                .eq('id', justFoundUser.id);

              if (updateError) {
                throw updateError;
              }

              // Log activity
              await supabase.from('activity_logs').insert({
                organization_id: profile.organization_id,
                user_id: user.id,
                action: 'update',
                resource_type: 'profile',
                resource_id: justFoundUser.id,
                details: {
                  email,
                  full_name,
                  action: 'added_existing_user_to_organization',
                },
              });

              return NextResponse.json({
                success: true,
                message: 'Employee added to organization',
                employeeId: justFoundUser.id,
              });
            } else {
              // Profile doesn't exist, create it for the existing auth user
              const { error: insertError } = await supabase.from('profiles').insert({
                id: justFoundUser.id,
                email,
                organization_id: profile.organization_id,
                full_name: full_name || null,
                job_title: job_title || null,
                department: department || null,
                team: team || null,
                phone: phone || null,
                avatar_url: avatar_url || null,
                location: location || null,
                bio: bio || null,
                skills: skills || null,
                role: role || 'member',
              });

              if (insertError) {
                // If duplicate key, profile was just created (trigger), update instead
                if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
                  const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                      email,
                      organization_id: profile.organization_id,
                      full_name: full_name || null,
                      job_title: job_title || null,
                      department: department || null,
                      team: team || null,
                      phone: phone || null,
                      avatar_url: avatar_url || null,
                      location: location || null,
                      bio: bio || null,
                      skills: skills || null,
                      role: role || 'member',
                    })
                    .eq('id', justFoundUser.id);

                  if (updateError) {
                    throw updateError;
                  }
                } else {
                  throw insertError;
                }
              }

              // Log activity
              await supabase.from('activity_logs').insert({
                organization_id: profile.organization_id,
                user_id: user.id,
                action: 'create',
                resource_type: 'profile',
                resource_id: justFoundUser.id,
                details: {
                  email,
                  full_name,
                  action: 'created_profile_for_existing_auth_user',
                },
              });

              return NextResponse.json({
                success: true,
                message: 'Employee added to organization',
                employeeId: justFoundUser.id,
              });
            }
          }
        }
      }
      
      // Return a more user-friendly error message
      const errorMessage = createUserError?.message || 'Failed to create user account';
      return NextResponse.json(
        {
          error: `Unable to create account: ${errorMessage}. Employee must sign up first at /signup.`,
          details: process.env.NODE_ENV === 'development' ? createUserError?.message : undefined,
        },
        { status: 400 }
      );
    }

    // Wait a moment for the trigger to create the profile (if it exists)
    // The trigger on_auth_user_created automatically creates a profile
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check if profile was auto-created by trigger
    const { data: autoCreatedProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', newUser.user.id)
        .maybeSingle();

    if (autoCreatedProfile) {
      // Profile exists (created by trigger), update it with employee details
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          email,
          organization_id: profile.organization_id,
          full_name: full_name || null,
          job_title: job_title || null,
          department: department || null,
          team: team || null,
          phone: phone || null,
          avatar_url: avatar_url || null,
          location: location || null,
          bio: bio || null,
          skills: skills || null,
          role: role || 'member',
        })
        .eq('id', newUser.user.id);

      if (updateError) {
        // Clean up: delete the auth user if profile update fails
        await adminSupabase.auth.admin.deleteUser(newUser.user.id);
        throw updateError;
      }
    } else {
      // Profile doesn't exist, create it (trigger might not have fired)
      const { error: insertError } = await supabase.from('profiles').insert({
        id: newUser.user.id,
        email,
        organization_id: profile.organization_id,
        full_name: full_name || null,
        job_title: job_title || null,
        department: department || null,
        team: team || null,
        phone: phone || null,
        avatar_url: avatar_url || null,
        location: location || null,
        bio: bio || null,
        skills: skills || null,
        role: role || 'member',
      });

      if (insertError) {
        // If it's a duplicate key error, the profile was created by trigger after our check
        if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
          // Profile was created by trigger, update it instead
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              email,
              organization_id: profile.organization_id,
              full_name: full_name || null,
              job_title: job_title || null,
              department: department || null,
              team: team || null,
              phone: phone || null,
              avatar_url: avatar_url || null,
              location: location || null,
              bio: bio || null,
              skills: skills || null,
              role: role || 'member',
            })
            .eq('id', newUser.user.id);

          if (updateError) {
            // Clean up: delete the auth user if profile update fails
            await adminSupabase.auth.admin.deleteUser(newUser.user.id);
            throw updateError;
          }
        } else {
          // Other error, clean up and throw
          await adminSupabase.auth.admin.deleteUser(newUser.user.id);
          throw insertError;
        }
      }
    }

    // Generate password recovery link so user can set their password
    // Note: Supabase will send the recovery email automatically if email templates are configured
    let recoveryLink: string | null = null;
    try {
      const { data: linkData } = await adminSupabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
      });
      recoveryLink = linkData?.properties?.action_link || null;
    } catch (linkError) {
      // If link generation fails, log but don't fail the whole operation
      console.warn('Failed to generate recovery link:', linkError);
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action: 'create',
      resource_type: 'profile',
      resource_id: newUser.user.id,
      details: {
        email,
        full_name,
        action: 'created_new_user_and_profile',
      },
    });

    return NextResponse.json({
      success: true,
      message: recoveryLink
        ? 'Employee account created successfully. Send them the password setup link.'
        : 'Employee account created successfully. They can use "Forgot Password" to set their password.',
      employeeId: newUser.user.id,
      recoveryLink, // Include in response for manual sending if needed
    });
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create employee' },
      { status: 500 }
    );
  }
}

