'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  is_active: boolean;
  conditions: {
    sender_pattern?: string;
    subject_pattern?: string;
    file_types?: string[];
  };
}

interface RoutingRulesSettingsProps {
  organizationId: string;
}

export function RoutingRulesSettings({ organizationId }: RoutingRulesSettingsProps) {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, [organizationId]);

  const loadRules = async () => {
    try {
      const response = await fetch('/api/routing-rules');
      if (!response.ok) throw new Error('Failed to load rules');
      const data = await response.json();
      setRules(data.data || data || []);
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Routing Rules Settings</h2>
            <p className="mt-1 text-sm text-gray-500">
              Configure matching confidence and priority for document routing rules
            </p>
          </div>
          <Link
            href="/dashboard/rules"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Manage Rules
          </Link>
        </div>
      </div>

      <div className="p-6">
        {rules.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 mb-4">No routing rules configured</p>
            <Link
              href="/dashboard/rules/new"
              className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Create First Rule
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Routing rules are evaluated in priority order (highest first). Rules with higher priority scores are matched first.
            </p>
            
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">{rule.name}</h3>
                      {!rule.is_active && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Inactive
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        Priority: {rule.priority}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-600">
                      {rule.conditions.sender_pattern && (
                        <div>
                          <span className="font-medium">Sender:</span>{' '}
                          <code className="bg-gray-100 px-1 rounded">{rule.conditions.sender_pattern}</code>
                        </div>
                      )}
                      {rule.conditions.subject_pattern && (
                        <div>
                          <span className="font-medium">Subject:</span>{' '}
                          <code className="bg-gray-100 px-1 rounded">{rule.conditions.subject_pattern}</code>
                        </div>
                      )}
                      {rule.conditions.file_types && rule.conditions.file_types.length > 0 && (
                        <div>
                          <span className="font-medium">File Types:</span>{' '}
                          <code className="bg-gray-100 px-1 rounded">
                            {rule.conditions.file_types.join(', ')}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Link
                    href={`/dashboard/rules/${rule.id}/edit`}
                    className="ml-4 text-sm text-blue-600 hover:text-blue-900"
                  >
                    Edit →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">How Routing Works</h3>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">1.</span>
              <p>Rules are evaluated in priority order (highest number first)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">2.</span>
              <p>Each rule matches based on sender pattern, subject pattern, and file types</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">3.</span>
              <p>First matching rule is applied - documents are routed to the specified storage folder</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">4.</span>
              <p>If no rules match, documents use the default storage configuration</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

