'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';
import Papa from 'papaparse';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface Recipient {
  email: string;
  name?: string;
  source: 'employee' | 'manual';
}

interface MultiRecipientPickerProps {
  recipients: Recipient[];
  onChange: (recipients: Recipient[]) => void;
  className?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MultiRecipientPicker({
  recipients,
  onChange,
  className = '',
}: MultiRecipientPickerProps) {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [activeTab, setActiveTab] = useState<'employee' | 'manual' | 'bulk' | 'csv'>('employee');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!profile?.organization_id) return;

        const { data: members } = await supabase
          .from('profiles')
          .select('id, full_name, email, job_title, department')
          .eq('organization_id', profile.organization_id)
          .order('full_name', { ascending: true });

        if (members) {
          setEmployees(members.filter((m) => m.id && m.email));
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEmployees();
  }, [supabase]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees.slice(0, 20);

    const query = searchQuery.toLowerCase();
    return employees
      .filter((emp) => {
        const searchableText = [
          emp.full_name,
          emp.email,
          emp.job_title,
          emp.department,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(query);
      })
      .slice(0, 20);
  }, [employees, searchQuery]);

  const isSelected = (email: string) => {
    return recipients.some((r) => r.email.toLowerCase() === email.toLowerCase());
  };

  const handleEmployeeSelect = (employee: Profile) => {
    if (!employee.email) return;

    if (isSelected(employee.email)) {
      // Remove if already selected
      onChange(recipients.filter((r) => r.email.toLowerCase() !== employee.email.toLowerCase()));
    } else {
      // Add if not selected
      onChange([
        ...recipients,
        {
          email: employee.email,
          name: employee.full_name || undefined,
          source: 'employee',
        },
      ]);
    }
  };

  const handleManualAdd = (email: string) => {
    if (!email.trim()) return;

    const trimmedEmail = email.trim().toLowerCase();
    
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    if (isSelected(trimmedEmail)) {
      alert('This email is already in the list');
      return;
    }

    onChange([
      ...recipients,
      {
        email: trimmedEmail,
        source: 'manual',
      },
    ]);
  };

  const handleBulkAdd = () => {
    if (!bulkInput.trim()) return;

    // Support both comma-separated and line-separated
    const emails = bulkInput
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    const validEmails: Recipient[] = [];
    const invalidEmails: string[] = [];

    emails.forEach((email) => {
      if (EMAIL_REGEX.test(email)) {
        const lowerEmail = email.toLowerCase();
        if (!isSelected(lowerEmail)) {
          validEmails.push({
            email: lowerEmail,
            source: 'manual',
          });
        }
      } else {
        invalidEmails.push(email);
      }
    });

    if (invalidEmails.length > 0) {
      alert(`Invalid email addresses:\n${invalidEmails.join('\n')}`);
    }

    if (validEmails.length > 0) {
      onChange([...recipients, ...validEmails]);
      setBulkInput('');
      setShowBulkInput(false);
    }
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const emails: Recipient[] = [];
        const errors: string[] = [];

        results.data.forEach((row: any) => {
          // Try to find email column
          const emailValue =
            row.email || row.Email || row['Email Address'] || row['email address'] || Object.values(row)[0];

          if (emailValue && typeof emailValue === 'string') {
            const trimmedEmail = emailValue.trim().toLowerCase();
            if (EMAIL_REGEX.test(trimmedEmail)) {
              if (!isSelected(trimmedEmail)) {
                emails.push({
                  email: trimmedEmail,
                  name: row.name || row.Name || row['Full Name'] || undefined,
                  source: 'manual',
                });
              }
            } else {
              errors.push(trimmedEmail);
            }
          }
        });

        if (errors.length > 0) {
          alert(`Some emails were invalid:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
        }

        if (emails.length > 0) {
          onChange([...recipients, ...emails]);
          alert(`Successfully imported ${emails.length} recipient(s)`);
        } else {
          alert('No valid emails found in CSV');
        }

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`);
      },
    });
  };

  const removeRecipient = (email: string) => {
    onChange(recipients.filter((r) => r.email.toLowerCase() !== email.toLowerCase()));
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Recipients <span className="text-red-500">*</span>
        {recipients.length > 0 && (
          <span className="ml-2 text-xs text-gray-500 font-normal">
            ({recipients.length} {recipients.length === 1 ? 'recipient' : 'recipients'})
          </span>
        )}
      </label>

      {/* Recipient List */}
      {recipients.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {recipients.map((recipient) => (
            <span
              key={recipient.email}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
            >
              <span>
                {recipient.name ? `${recipient.name} ` : ''}
                <span className="text-blue-600">{recipient.email}</span>
              </span>
              <button
                type="button"
                onClick={() => removeRecipient(recipient.email)}
                className="ml-1 text-blue-600 hover:text-blue-800"
                aria-label={`Remove ${recipient.email}`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-2 border-b border-gray-200">
        <nav className="-mb-px flex space-x-4">
          <button
            type="button"
            onClick={() => setActiveTab('employee')}
            className={`py-2 px-1 border-b-2 text-sm font-medium ${
              activeTab === 'employee'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Employee Directory
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`py-2 px-1 border-b-2 text-sm font-medium ${
              activeTab === 'manual'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Manual Entry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`py-2 px-1 border-b-2 text-sm font-medium ${
              activeTab === 'bulk'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Bulk Input
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`py-2 px-1 border-b-2 text-sm font-medium ${
              activeTab === 'csv'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            CSV Import
          </button>
        </nav>
      </div>

      {/* Employee Directory Tab */}
      {activeTab === 'employee' && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white">
            {loading ? (
              <div className="px-4 py-3 text-sm text-gray-500">Loading employees...</div>
            ) : filteredEmployees.length > 0 ? (
              filteredEmployees.map((employee) => {
                const selected = isSelected(employee.email || '');
                return (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => handleEmployeeSelect(employee)}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      selected
                        ? 'bg-blue-50 hover:bg-blue-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {employee.full_name || employee.email}
                        </div>
                        <div className="text-xs text-gray-500">{employee.email}</div>
                        {(employee.job_title || employee.department) && (
                          <div className="mt-0.5 text-xs text-gray-400">
                            {[employee.job_title, employee.department].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>
                      {selected && (
                        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">
                {searchQuery ? 'No employees found' : 'No employees available'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Entry Tab */}
      {activeTab === 'manual' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="email@example.com"
              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleManualAdd(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const input = document.querySelector('input[type="email"]') as HTMLInputElement;
                if (input) {
                  handleManualAdd(input.value);
                  input.value = '';
                }
              }}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500">Press Enter or click Add to add recipient</p>
        </div>
      )}

      {/* Bulk Input Tab */}
      {activeTab === 'bulk' && (
        <div className="space-y-2">
          <textarea
            placeholder="Enter emails separated by commas or new lines:&#10;email1@example.com&#10;email2@example.com&#10;email3@example.com"
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            rows={6}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setBulkInput('');
                setShowBulkInput(false);
              }}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkAdd}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add All
            </button>
          </div>
        </div>
      )}

      {/* CSV Import Tab */}
      {activeTab === 'csv' && (
        <div className="space-y-2">
          <div className="rounded-md border-2 border-dashed border-gray-300 p-4 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer text-sm text-gray-600 hover:text-gray-900"
            >
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-2">Click to upload CSV file</p>
              <p className="text-xs text-gray-500 mt-1">
                CSV should have an 'email' column (or first column will be used)
              </p>
            </label>
          </div>
        </div>
      )}

      {recipients.length === 0 && (
        <p className="mt-2 text-xs text-red-600">At least one recipient is required</p>
      )}
    </div>
  );
}

