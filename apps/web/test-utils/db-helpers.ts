/**
 * Database helpers for testing
 * These utilities help seed and clean up test data
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Missing Supabase credentials for testing');
}

export const testSupabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Create a test organization
 */
export async function createTestOrganization(name: string = 'Test Org') {
  if (!testSupabase) {
    throw new Error('Test Supabase client not initialized');
  }

  const { data, error } = await testSupabase
    .from('organizations')
    .insert({
      name,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test user profile
 */
export async function createTestProfile(
  organizationId: string,
  email: string = 'test@example.com'
) {
  if (!testSupabase) {
    throw new Error('Test Supabase client not initialized');
  }

  const { data, error } = await testSupabase
    .from('profiles')
    .insert({
      organization_id: organizationId,
      email,
      full_name: 'Test User',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Clean up test data
 */
export async function cleanupTestData(organizationId: string) {
  if (!testSupabase) return;

  // Delete in order of dependencies
  await testSupabase.from('activity_logs').delete().eq('organization_id', organizationId);
  await testSupabase.from('documents').delete().eq('organization_id', organizationId);
  await testSupabase.from('document_requests').delete().eq('organization_id', organizationId);
  await testSupabase.from('routing_rules').delete().eq('organization_id', organizationId);
  await testSupabase.from('storage_configs').delete().eq('organization_id', organizationId);
  await testSupabase.from('email_accounts').delete().eq('organization_id', organizationId);
  await testSupabase.from('profiles').delete().eq('organization_id', organizationId);
  await testSupabase.from('organizations').delete().eq('id', organizationId);
}

/**
 * Clean up all test organizations (use with caution)
 */
export async function cleanupAllTestData() {
  if (!testSupabase) return;

  const { data: orgs } = await testSupabase
    .from('organizations')
    .select('id')
    .ilike('name', 'Test%');

  if (orgs) {
    for (const org of orgs) {
      await cleanupTestData(org.id);
    }
  }
}

