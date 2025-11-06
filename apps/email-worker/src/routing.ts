import type { RoutingRule } from '@docuflow/shared';
import type { ParsedEmail } from '@docuflow/email-integrations';

export interface RoutingRuleMatch {
  rule: RoutingRule;
  score: number;
}

/**
 * Helper function to normalize email subjects (remove Re:, Fwd:, etc.)
 */
function normalizeSubject(subject: string): string {
  if (!subject) return '';
  // Remove common email prefixes (case-insensitive)
  return subject
    .replace(/^(re|fwd|fw|fwd:re|re:fwd|re:fw|fwd:fw):\s*/gi, '')
    .replace(/^\[.*?\]\s*/g, '') // Remove bracketed prefixes like [External]
    .trim();
}

/**
 * Match an email against routing rules
 * Returns the best matching rule or null
 * @param email - The parsed email to match against
 * @param rules - Array of routing rules to evaluate
 * @param employee - Optional employee context (if sender is an employee)
 * @param documentRequestId - Optional document request ID (if email is a response to a request)
 */
export function matchRoutingRule(
  email: ParsedEmail,
  rules: RoutingRule[],
  employee?: { email: string; full_name: string | null } | null,
  documentRequestId?: string | null
): RoutingRuleMatch | null {
  const activeRules = rules.filter((r) => r.is_active);
  
  if (activeRules.length === 0) {
    return null;
  }

  // Sort by priority (higher priority first)
  const sortedRules = [...activeRules].sort((a, b) => b.priority - a.priority);

  // Score each rule
  const matches: RoutingRuleMatch[] = [];

  // Normalize subject for matching (handles Re:, Fwd:, etc.)
  const normalizedSubject = normalizeSubject(email.subject);

  for (const rule of sortedRules) {
    const conditions = rule.conditions as {
      sender_pattern?: string;
      subject_pattern?: string;
      file_types?: string[];
      [key: string]: unknown;
    };

    let score = 0;
    let matchesAll = true;

    // Detect if this rule has no conditions (catch-all rule)
    const hasNoConditions = !conditions.sender_pattern && 
      !conditions.subject_pattern && 
      (!conditions.file_types || conditions.file_types.length === 0);

    // Check sender pattern
    if (conditions.sender_pattern) {
      const pattern = new RegExp(conditions.sender_pattern, 'i');
      if (pattern.test(email.from.email)) {
        score += 10;
      } else {
        matchesAll = false;
      }
    }

    // Check subject pattern - try matching both original and normalized subject
    if (conditions.subject_pattern) {
      const pattern = new RegExp(conditions.subject_pattern, 'i');
      const originalMatch = pattern.test(email.subject);
      const normalizedMatch = pattern.test(normalizedSubject);
      if (originalMatch || normalizedMatch) {
        score += 10;
      } else {
        matchesAll = false;
      }
    }

    // Check file types
    if (conditions.file_types && conditions.file_types.length > 0) {
      const emailFileTypes = email.attachments.map((att) => {
        const ext = att.filename.split('.').pop()?.toLowerCase() || '';
        return ext;
      });

      const hasMatchingFileType = emailFileTypes.some((type) =>
        conditions.file_types!.includes(type)
      );

      if (hasMatchingFileType && email.attachments.length > 0) {
        score += 5;
      } else if (conditions.file_types.length > 0) {
        // If file types are specified but don't match, this rule doesn't apply
        matchesAll = false;
      }
    }

    // Bonus scoring for employee-related documents
    // If this is an employee document or response to a document request, boost catch-all employee rules
    if (hasNoConditions && (employee || documentRequestId)) {
      // Check if this rule's folder path contains employee-related placeholders
      const actions = rule.actions as { folder_path?: string };
      if (actions.folder_path && (
        actions.folder_path.includes('{employee_name}') ||
        actions.folder_path.includes('{employee_email}') ||
        actions.folder_path.includes('employees')
      )) {
        score += 15; // Bonus for employee-related catch-all rules
      }
    }

    // Only consider rules where all conditions match
    // Allow catch-all rules (no conditions) to match even with score 0
    if (matchesAll && (score > 0 || hasNoConditions)) {
      matches.push({ rule, score });
    }
  }

  if (matches.length === 0) {
    return null;
  }

  // Return the highest scoring rule (or highest priority if scores are equal)
  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.rule.priority - a.rule.priority;
  });

  return matches[0];
}

/**
 * Generate folder path based on rule actions and email metadata
 */
export function generateStoragePath(
  rule: RoutingRule,
  email: ParsedEmail,
  basePath: string = '',
  employee?: { email: string; full_name: string | null } | null
): string {
  const actions = rule.actions as {
    storage_id: string;
    folder_path: string;
    metadata?: Record<string, unknown>;
  };

  let path = actions.folder_path || basePath;

  // Replace placeholders in path
  path = path.replace('{sender_email}', email.from.email);
  path = path.replace('{sender_name}', email.from.name || email.from.email);
  
  // Employee placeholders - use employee data if available, fallback to sender data
  if (employee) {
    path = path.replace('{employee_email}', employee.email);
    path = path.replace('{employee_name}', employee.full_name || employee.email);
  } else {
    // If no employee found, use sender data as fallback
    path = path.replace('{employee_email}', email.from.email);
    path = path.replace('{employee_name}', email.from.name || email.from.email);
  }
  
  path = path.replace('{date}', new Date().toISOString().split('T')[0]);
  path = path.replace('{year}', new Date().getFullYear().toString());
  path = path.replace('{month}', (new Date().getMonth() + 1).toString().padStart(2, '0'));

  // Clean up path - sanitize employee names for filesystem safety
  path = path.replace(/[<>:"|?*\x00-\x1f]/g, '_'); // Remove invalid filesystem characters
  path = path.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');

  return path;
}
