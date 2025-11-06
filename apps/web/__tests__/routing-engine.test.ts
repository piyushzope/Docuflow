import { describe, it, expect } from 'vitest';
import { matchRoutingRule, generateStoragePath } from '@/lib/routing/rules-engine';
import type { RoutingRule } from '@docuflow/shared';
import type { ParsedEmail } from '@docuflow/email-integrations';

describe('matchRoutingRule', () => {
  const mockEmail: ParsedEmail = {
    id: 'email-1',
    threadId: 'thread-1',
    from: { email: 'sender@example.com', name: 'John Doe' },
    to: ['recipient@example.com'],
    subject: 'Document Request: W-2 Form',
    body: { text: 'Please find attached' },
    attachments: [
      {
        id: 'att-1',
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      },
    ],
    date: new Date(),
  };

  it('should return null when no rules provided', () => {
    const result = matchRoutingRule(mockEmail, []);
    expect(result).toBeNull();
  });

  it('should return null when no active rules', () => {
    const rules: RoutingRule[] = [
      {
        id: 'rule-1',
        organization_id: 'org-1',
        name: 'Test Rule',
        priority: 10,
        conditions: { sender_pattern: '.*@example.com' },
        actions: { storage_id: 'storage-1', folder_path: 'test' },
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const result = matchRoutingRule(mockEmail, rules);
    expect(result).toBeNull();
  });

  it('should match rule by sender pattern', () => {
    const rules: RoutingRule[] = [
      {
        id: 'rule-1',
        organization_id: 'org-1',
        name: 'Sender Rule',
        priority: 10,
        conditions: { sender_pattern: '.*@example.com' },
        actions: { storage_id: 'storage-1', folder_path: 'test' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const result = matchRoutingRule(mockEmail, rules);
    expect(result).not.toBeNull();
    expect(result?.rule.id).toBe('rule-1');
    expect(result?.score).toBe(10);
  });

  it('should match rule by subject pattern', () => {
    const rules: RoutingRule[] = [
      {
        id: 'rule-1',
        organization_id: 'org-1',
        name: 'Subject Rule',
        priority: 10,
        conditions: { subject_pattern: 'Document Request.*' },
        actions: { storage_id: 'storage-1', folder_path: 'test' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const result = matchRoutingRule(mockEmail, rules);
    expect(result).not.toBeNull();
    expect(result?.rule.id).toBe('rule-1');
    expect(result?.score).toBe(10);
  });

  it('should match normalized subject (Re: prefix)', () => {
    const emailWithRe: ParsedEmail = {
      ...mockEmail,
      subject: 'Re: Document Request: W-2 Form',
    };

    const rules: RoutingRule[] = [
      {
        id: 'rule-1',
        organization_id: 'org-1',
        name: 'Subject Rule',
        priority: 10,
        conditions: { subject_pattern: 'Document Request.*' },
        actions: { storage_id: 'storage-1', folder_path: 'test' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const result = matchRoutingRule(emailWithRe, rules);
    expect(result).not.toBeNull();
    expect(result?.score).toBe(10);
  });

  it('should match rule by file type', () => {
    const rules: RoutingRule[] = [
      {
        id: 'rule-1',
        organization_id: 'org-1',
        name: 'File Type Rule',
        priority: 10,
        conditions: { file_types: ['pdf'] },
        actions: { storage_id: 'storage-1', folder_path: 'test' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const result = matchRoutingRule(mockEmail, rules);
    expect(result).not.toBeNull();
    expect(result?.score).toBe(5);
  });

  it('should match rule with multiple conditions', () => {
    const rules: RoutingRule[] = [
      {
        id: 'rule-1',
        organization_id: 'org-1',
        name: 'Multi Condition Rule',
        priority: 10,
        conditions: {
          sender_pattern: '.*@example.com',
          subject_pattern: 'Document.*',
          file_types: ['pdf'],
        },
        actions: { storage_id: 'storage-1', folder_path: 'test' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const result = matchRoutingRule(mockEmail, rules);
    expect(result).not.toBeNull();
    expect(result?.score).toBe(25); // 10 + 10 + 5
  });

  it('should return highest priority rule when scores are equal', () => {
    const rules: RoutingRule[] = [
      {
        id: 'rule-1',
        organization_id: 'org-1',
        name: 'Low Priority',
        priority: 5,
        conditions: { sender_pattern: '.*@example.com' },
        actions: { storage_id: 'storage-1', folder_path: 'test' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'rule-2',
        organization_id: 'org-1',
        name: 'High Priority',
        priority: 10,
        conditions: { sender_pattern: '.*@example.com' },
        actions: { storage_id: 'storage-1', folder_path: 'test' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const result = matchRoutingRule(mockEmail, rules);
    expect(result).not.toBeNull();
    expect(result?.rule.id).toBe('rule-2');
  });

  it('should return highest scoring rule when priorities are equal', () => {
    const rules: RoutingRule[] = [
      {
        id: 'rule-1',
        organization_id: 'org-1',
        name: 'Low Score',
        priority: 10,
        conditions: { sender_pattern: '.*@example.com' },
        actions: { storage_id: 'storage-1', folder_path: 'test' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'rule-2',
        organization_id: 'org-1',
        name: 'High Score',
        priority: 10,
        conditions: {
          sender_pattern: '.*@example.com',
          subject_pattern: 'Document.*',
        },
        actions: { storage_id: 'storage-1', folder_path: 'test' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const result = matchRoutingRule(mockEmail, rules);
    expect(result).not.toBeNull();
    expect(result?.rule.id).toBe('rule-2');
    expect(result?.score).toBe(20);
  });

  it('should not match when sender pattern does not match', () => {
    const rules: RoutingRule[] = [
      {
        id: 'rule-1',
        organization_id: 'org-1',
        name: 'Wrong Sender',
        priority: 10,
        conditions: { sender_pattern: '.*@other.com' },
        actions: { storage_id: 'storage-1', folder_path: 'test' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const result = matchRoutingRule(mockEmail, rules);
    expect(result).toBeNull();
  });

  it('should match catch-all rule with empty conditions', () => {
    const rules: RoutingRule[] = [
      {
        id: 'rule-1',
        organization_id: 'org-1',
        name: 'Catch-All Rule',
        priority: 10,
        conditions: {},
        actions: { storage_id: 'storage-1', folder_path: 'documents/{date}' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const result = matchRoutingRule(mockEmail, rules);
    expect(result).not.toBeNull();
    expect(result?.rule.id).toBe('rule-1');
    expect(result?.score).toBe(0); // Catch-all rules have score 0
  });

  it('should prioritize employee documents rule over file type rule when employee context provided', () => {
    const employee = {
      email: 'sender@example.com',
      full_name: 'John Doe',
    };

    const rules: RoutingRule[] = [
      {
        id: 'rule-1',
        organization_id: 'org-1',
        name: 'PDF Documents',
        priority: 100,
        conditions: { file_types: ['pdf'] },
        actions: { storage_id: 'storage-1', folder_path: 'documents/pdf/{date}' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'rule-2',
        organization_id: 'org-1',
        name: 'Employee Documents',
        priority: 110,
        conditions: {},
        actions: { storage_id: 'storage-1', folder_path: 'documents/employees/{employee_name}/{date}' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const result = matchRoutingRule(mockEmail, rules, employee);
    expect(result).not.toBeNull();
    expect(result?.rule.id).toBe('rule-2'); // Employee Documents should win
    expect(result?.score).toBe(15); // Bonus score for employee rule
  });
});

describe('generateStoragePath', () => {
  const mockRule: RoutingRule = {
    id: 'rule-1',
    organization_id: 'org-1',
    name: 'Test Rule',
    priority: 10,
    conditions: {},
    actions: {
      storage_id: 'storage-1',
      folder_path: 'documents/{sender_email}/{date}',
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockEmail: ParsedEmail = {
    id: 'email-1',
    threadId: 'thread-1',
    from: { email: 'sender@example.com', name: 'John Doe' },
    to: ['recipient@example.com'],
    subject: 'Test',
    body: { text: 'Test' },
    attachments: [],
    date: new Date(),
  };

  it('should replace sender_email placeholder', () => {
    const path = generateStoragePath(mockRule, mockEmail);
    expect(path).toContain('sender@example.com');
    expect(path).not.toContain('{sender_email}');
  });

  it('should replace sender_name placeholder', () => {
    const rule: RoutingRule = {
      ...mockRule,
      actions: {
        storage_id: 'storage-1',
        folder_path: 'documents/{sender_name}',
      },
    };

    const path = generateStoragePath(rule, mockEmail);
    expect(path).toContain('John Doe');
    expect(path).not.toContain('{sender_name}');
  });

  it('should replace date placeholder', () => {
    const path = generateStoragePath(mockRule, mockEmail);
    const today = new Date().toISOString().split('T')[0];
    expect(path).toContain(today);
    expect(path).not.toContain('{date}');
  });

  it('should replace year and month placeholders', () => {
    const rule: RoutingRule = {
      ...mockRule,
      actions: {
        storage_id: 'storage-1',
        folder_path: '{year}/{month}',
      },
    };

    const path = generateStoragePath(rule, mockEmail);
    const year = new Date().getFullYear().toString();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    expect(path).toContain(year);
    expect(path).toContain(month);
  });

  it('should use employee data when available', () => {
    const rule: RoutingRule = {
      ...mockRule,
      actions: {
        storage_id: 'storage-1',
        folder_path: 'employees/{employee_name}',
      },
    };

    const employee = {
      email: 'employee@example.com',
      full_name: 'Jane Employee',
    };

    const path = generateStoragePath(rule, mockEmail, '', employee);
    expect(path).toContain('Jane Employee');
    expect(path).not.toContain('{employee_name}');
  });

  it('should fallback to sender when employee not available', () => {
    const rule: RoutingRule = {
      ...mockRule,
      actions: {
        storage_id: 'storage-1',
        folder_path: 'employees/{employee_email}',
      },
    };

    const path = generateStoragePath(rule, mockEmail);
    expect(path).toContain('sender@example.com');
  });

  it('should sanitize invalid filesystem characters', () => {
    const emailWithBadChars: ParsedEmail = {
      ...mockEmail,
      from: { email: 'sender@example.com', name: 'John<>Doe|Test?' },
    };

    const rule: RoutingRule = {
      ...mockRule,
      actions: {
        storage_id: 'storage-1',
        folder_path: 'documents/{sender_name}',
      },
    };

    const path = generateStoragePath(rule, emailWithBadChars);
    expect(path).not.toContain('<');
    expect(path).not.toContain('>');
    expect(path).not.toContain('|');
    expect(path).not.toContain('?');
  });

  it('should normalize path separators', () => {
    const rule: RoutingRule = {
      ...mockRule,
      actions: {
        storage_id: 'storage-1',
        folder_path: 'documents///test//folder',
      },
    };

    const path = generateStoragePath(rule, mockEmail);
    expect(path).not.toContain('///');
    expect(path).not.toContain('//');
  });
});

