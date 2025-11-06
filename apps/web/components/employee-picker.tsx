'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface EmployeePickerProps {
  onSelect: (email: string, name: string) => void;
  selectedEmail?: string;
}

export default function EmployeePicker({ onSelect, selectedEmail }: EmployeePickerProps) {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

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
    if (!searchQuery) return employees.slice(0, 10); // Show first 10 when no search

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
      .slice(0, 10); // Limit to 10 results
  }, [employees, searchQuery]);

  const handleSelect = (employee: Profile) => {
    if (employee.email) {
      onSelect(employee.email, employee.full_name || employee.email);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const selectedEmployee = employees.find((emp) => emp.email === selectedEmail);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className={selectedEmployee ? 'text-gray-900' : 'text-gray-500'}>
          {selectedEmployee
            ? `${selectedEmployee.full_name || selectedEmployee.email}${selectedEmployee.email ? ` (${selectedEmployee.email})` : ''}`
            : 'Select from employee directory...'}
        </span>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
            <div className="p-2">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-3 text-sm text-gray-500">Loading employees...</div>
              ) : filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => handleSelect(employee)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {employee.full_name || employee.email}
                        </div>
                        <div className="text-xs text-gray-500">{employee.email}</div>
                        {(employee.job_title || employee.department) && (
                          <div className="mt-1 text-xs text-gray-400">
                            {[employee.job_title, employee.department].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>
                      {selectedEmail === employee.email && (
                        <svg
                          className="h-5 w-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  {searchQuery ? 'No employees found' : 'No employees available'}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

