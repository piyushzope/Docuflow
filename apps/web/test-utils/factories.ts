/**
 * Factory functions for creating test data
 */

export function createMockOrganization(overrides?: Partial<any>) {
  return {
    id: 'test-org-id',
    name: 'Test Organization',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockProfile(overrides?: Partial<any>) {
  return {
    id: 'test-profile-id',
    organization_id: 'test-org-id',
    email: 'test@example.com',
    full_name: 'Test User',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockDocumentRequest(overrides?: Partial<any>) {
  return {
    id: 'test-request-id',
    organization_id: 'test-org-id',
    recipient_email: 'recipient@example.com',
    subject: 'Document Request: W-2',
    message: 'Please submit your W-2 form',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockRoutingRule(overrides?: Partial<any>) {
  return {
    id: 'test-rule-id',
    organization_id: 'test-org-id',
    name: 'Test Rule',
    conditions: {
      sender_pattern: '.*@example.com',
      subject_pattern: 'Document.*',
    },
    actions: {
      storage_id: 'test-storage-id',
      folder_path: 'documents/{sender_email}',
    },
    priority: 10,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockStorageConfig(overrides?: Partial<any>) {
  return {
    id: 'test-storage-id',
    organization_id: 'test-org-id',
    provider: 'supabase',
    name: 'Test Storage',
    is_default: true,
    is_active: true,
    config: {
      bucket: 'documents',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

