import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { RuleActionButtons } from '@/components/rule-action-buttons';
import { CreateDefaultRulesButton } from '@/components/create-default-rules-button';

export default async function RulesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    redirect('/dashboard/organization');
  }

  // Get routing rules for this organization
  const { data: rules } = await supabase
    .from('routing_rules')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  // Check if storage is configured (required for default rules)
  const { data: storageConfigs } = await supabase
    .from('storage_configs')
    .select('id')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .limit(1);

  const hasStorage = storageConfigs && storageConfigs.length > 0;

  return (
    <>
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Routing Rules</h1>
            <p className="mt-2 text-sm text-slate-600">
              Configure automatic document routing and organization
            </p>
          </div>
          <Link
            href="/dashboard/rules/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            New Rule
          </Link>
        </div>
        {rules && rules.length > 0 ? (
          <>
            {/* Summary Stats */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-5 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Rules</dt>
                      <dd className="text-lg font-semibold text-gray-900">{rules.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-5 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Rules</dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {rules.filter((r) => r.is_active).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-5 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Highest Priority</dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {rules.length > 0 ? Math.max(...rules.map((r) => r.priority || 0)) : 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Rules Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Rule Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Priority
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Conditions
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Folder Path
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {rules.map((rule) => {
                  const conditions = rule.conditions as any;
                  const actions = rule.actions as any;
                  
                  return (
                    <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4">
                        {rule.is_active ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            <svg className="mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                              <circle cx="4" cy="4" r="3" />
                            </svg>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                            <svg className="mr-1.5 h-2 w-2 text-gray-400" fill="currentColor" viewBox="0 0 8 8">
                              <circle cx="4" cy="4" r="3" />
                            </svg>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {rule.name}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {rule.priority}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {conditions?.sender_pattern && (
                            <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                              <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Sender
                            </span>
                          )}
                          {conditions?.subject_pattern && (
                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                              <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Subject
                            </span>
                          )}
                          {conditions?.file_types && conditions.file_types.length > 0 && (
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-700/10">
                              <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {conditions.file_types.length} type{conditions.file_types.length !== 1 ? 's' : ''}
                            </span>
                          )}
                          {!conditions?.sender_pattern && !conditions?.subject_pattern && (!conditions?.file_types || conditions.file_types.length === 0) && (
                            <span className="text-xs text-gray-500 italic">No conditions (matches all)</span>
                          )}
                        </div>
                        {(conditions?.sender_pattern || conditions?.subject_pattern || conditions?.file_types) && (
                          <details className="mt-1">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                              View details
                            </summary>
                            <div className="mt-1 space-y-0.5 text-xs text-gray-600 pl-2">
                              {conditions?.sender_pattern && (
                                <div><span className="font-medium">Sender:</span> <code className="bg-gray-100 px-1 rounded">{conditions.sender_pattern}</code></div>
                              )}
                              {conditions?.subject_pattern && (
                                <div><span className="font-medium">Subject:</span> <code className="bg-gray-100 px-1 rounded">{conditions.subject_pattern}</code></div>
                              )}
                              {conditions?.file_types && conditions.file_types.length > 0 && (
                                <div><span className="font-medium">Types:</span> {conditions.file_types.join(', ')}</div>
                              )}
                            </div>
                          </details>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <code className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200 break-all">
                            {actions?.folder_path || 'documents/{date}'}
                          </code>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <RuleActionButtons ruleId={rule.id} ruleName={rule.name} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="space-y-8">
            {/* Main empty state */}
            <div className="rounded-lg border border-gray-200 bg-white p-12">
              <div className="mx-auto max-w-2xl text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  No routing rules yet
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Routing rules automatically organize your documents based on sender, subject, or file type. 
                  Get started quickly with default rules or create your own custom rules.
                </p>
                
                <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  {hasStorage ? (
                    <>
                      <CreateDefaultRulesButton />
                      <span className="text-sm text-gray-500">or</span>
                      <Link
                        href="/dashboard/rules/new"
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Create Custom Rule
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/dashboard/storage/new"
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      Configure Storage First
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Guidance section */}
            <div className="rounded-lg border border-gray-200 bg-white p-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                How Routing Rules Work
              </h4>
              <div className="space-y-6">
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    📋 Rule Priority
                  </h5>
                  <p className="text-sm text-gray-600">
                    Rules are evaluated in order of priority (highest first). When a document matches multiple rules, 
                    the highest priority rule is applied. You can adjust priorities to control rule execution order.
                  </p>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    🔍 Matching Conditions
                  </h5>
                  <p className="text-sm text-gray-600 mb-3">
                    Rules match documents based on one or more conditions:
                  </p>
                  <ul className="ml-4 space-y-1 text-sm text-gray-600 list-disc">
                    <li><strong>Sender Pattern:</strong> Match emails from specific senders using regex (e.g., <code className="text-xs bg-gray-100 px-1 rounded">.*@example\.com</code>)</li>
                    <li><strong>Subject Pattern:</strong> Match emails with specific words in the subject (e.g., <code className="text-xs bg-gray-100 px-1 rounded">.*invoice.*</code>)</li>
                    <li><strong>File Types:</strong> Match specific file extensions (e.g., <code className="text-xs bg-gray-100 px-1 rounded">pdf, doc, docx</code>)</li>
                  </ul>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    📁 Folder Path Placeholders
                  </h5>
                  <p className="text-sm text-gray-600 mb-2">
                    Use dynamic placeholders in folder paths to organize documents automatically:
                  </p>
                  <div className="bg-gray-50 rounded-md p-3 text-sm font-mono text-gray-800">
                    <div className="space-y-1">
                      <div><code className="text-blue-600">{'{sender_email}'}</code> - Email address of the sender</div>
                      <div><code className="text-blue-600">{'{sender_name}'}</code> - Display name of the sender</div>
                      <div><code className="text-blue-600">{'{employee_email}'}</code> - Email of employee (if sender is in your organization)</div>
                      <div><code className="text-blue-600">{'{employee_name}'}</code> - Full name of employee (if sender is in your organization)</div>
                      <div><code className="text-blue-600">{'{date}'}</code> - Date in YYYY-MM-DD format</div>
                      <div><code className="text-blue-600">{'{year}'}</code> - Year (YYYY)</div>
                      <div><code className="text-blue-600">{'{month}'}</code> - Month (MM)</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Examples: <code className="text-xs bg-gray-100 px-1 rounded">{'documents/employees/{employee_name}/{year}/{month}'}</code> 
                    {' '}creates folders like <code className="text-xs bg-gray-100 px-1 rounded">documents/employees/John Doe/2024/12</code>, or 
                    {' '}<code className="text-xs bg-gray-100 px-1 rounded">{'documents/{sender_email}/{date}'}</code> 
                    {' '}for <code className="text-xs bg-gray-100 px-1 rounded">documents/user@example.com/2024-12-15</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Default rules preview */}
            {hasStorage && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-8">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-semibold text-blue-900">
                      Quick Start: Default Rules
                    </h4>
                    <p className="mt-2 text-sm text-blue-700">
                      Our default rules include pre-configured patterns for common document types:
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-blue-700">
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Employee Documents</strong> → <code className="text-xs bg-blue-100 px-1 rounded">{'documents/employees/{employee_name}/{date}'}</code></span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span><strong>PDF Documents</strong> → <code className="text-xs bg-blue-100 px-1 rounded">{'documents/pdf/{date}'}</code></span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Word Documents</strong> → <code className="text-xs bg-blue-100 px-1 rounded">{'documents/word/{date}'}</code></span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Excel Spreadsheets</strong> → <code className="text-xs bg-blue-100 px-1 rounded">{'documents/spreadsheets/{date}'}</code></span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Invoice Emails</strong> → <code className="text-xs bg-blue-100 px-1 rounded">{'documents/invoices/{year}/{month}'}</code></span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Contract Documents</strong> → <code className="text-xs bg-blue-100 px-1 rounded">{'documents/contracts/{year}'}</code></span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Catch-All</strong> → <code className="text-xs bg-blue-100 px-1 rounded">{'documents/{date}'}</code> (for unmatched documents)</span>
                      </li>
                    </ul>
                    <p className="mt-4 text-xs text-blue-600">
                      You can edit or delete any default rules after creation to fit your needs.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
