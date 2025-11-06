import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createUnauthorizedResponse, createInternalErrorResponse, createSuccessResponse } from '@/lib/api-helpers';
import { ErrorMessages } from '@/lib/errors';

// Validation helper functions
function validateAutoApprovalSettings(settings: any): { valid: boolean; error?: string } {
  if (!settings || typeof settings !== 'object') {
    return { valid: true }; // Optional
  }

  if ('enabled' in settings && typeof settings.enabled !== 'boolean') {
    return { valid: false, error: 'enabled must be a boolean' };
  }

  if ('min_owner_match_confidence' in settings) {
    const val = settings.min_owner_match_confidence;
    if (typeof val !== 'number' || val < 0.5 || val > 1.0) {
      return { valid: false, error: 'min_owner_match_confidence must be between 0.5 and 1.0' };
    }
  }

  if ('min_authenticity_score' in settings) {
    const val = settings.min_authenticity_score;
    if (typeof val !== 'number' || val < 0.5 || val > 1.0) {
      return { valid: false, error: 'min_authenticity_score must be between 0.5 and 1.0' };
    }
  }

  if ('min_request_compliance_score' in settings) {
    const val = settings.min_request_compliance_score;
    if (typeof val !== 'number' || val < 0.5 || val > 1.0) {
      return { valid: false, error: 'min_request_compliance_score must be between 0.5 and 1.0' };
    }
  }

  if ('require_expiry_check' in settings && typeof settings.require_expiry_check !== 'boolean') {
    return { valid: false, error: 'require_expiry_check must be a boolean' };
  }

  if ('allow_expired_documents' in settings && typeof settings.allow_expired_documents !== 'boolean') {
    return { valid: false, error: 'allow_expired_documents must be a boolean' };
  }

  return { valid: true };
}

function validateSettings(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  if ('auto_approval' in body) {
    const result = validateAutoApprovalSettings(body.auto_approval);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

/**
 * GET /api/organizations/settings
 * Fetch organization settings
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createUnauthorizedResponse(ErrorMessages.UNAUTHORIZED);
    }

    // Get user's profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return createInternalErrorResponse(ErrorMessages.NO_ORGANIZATION);
    }

    // Check if user is admin or owner
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return createUnauthorizedResponse('Only administrators can access settings');
    }

    // Fetch organization settings
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', profile.organization_id)
      .single();

    if (error) {
      console.error('Error fetching organization settings:', error);
      return createInternalErrorResponse('Failed to fetch settings');
    }

    return createSuccessResponse({
      settings: organization?.settings || {},
    });
  } catch (error: any) {
    console.error('Error in GET /api/organizations/settings:', error);
    return createInternalErrorResponse(
      error?.message || 'Failed to fetch settings'
    );
  }
}

/**
 * PUT /api/organizations/settings
 * Update organization settings
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createUnauthorizedResponse(ErrorMessages.UNAUTHORIZED);
    }

    // Get user's profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return createInternalErrorResponse(ErrorMessages.NO_ORGANIZATION);
    }

    // Check if user is admin or owner
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return createUnauthorizedResponse('Only administrators can update settings');
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validation = validateSettings(body);
    
    if (!validation.valid) {
      return createInternalErrorResponse(validation.error || 'Invalid settings');
    }

    // Get current settings
    const { data: organization } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', profile.organization_id)
      .single();

    const currentSettings = organization?.settings || {};

    // Merge settings (preserve other settings, only update provided ones)
    const updatedSettings = {
      ...currentSettings,
      ...body,
    };

    // Update organization settings
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.organization_id);

    if (updateError) {
      console.error('Error updating organization settings:', updateError);
      return createInternalErrorResponse('Failed to update settings');
    }

    // Log activity (non-blocking)
    (async () => {
      try {
        const { error: logError } = await supabase
          .from('activity_logs')
          .insert({
            organization_id: profile.organization_id,
            user_id: user.id,
            action: 'update',
            resource_type: 'organization_settings',
            resource_id: profile.organization_id,
            details: {
              settings: body,
            },
          });
        if (logError) {
          console.warn('Failed to log settings update activity:', logError);
        }
      } catch (logError) {
        console.warn('Failed to log settings update activity:', logError);
      }
    })();

    return createSuccessResponse({
      settings: updatedSettings,
      message: 'Settings updated successfully',
    });
  } catch (error: any) {
    console.error('Error in PUT /api/organizations/settings:', error);
    return createInternalErrorResponse(
      error?.message || 'Failed to update settings'
    );
  }
}

