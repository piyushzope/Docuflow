'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Database } from '@/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface EmployeeListViewProps {
  employees: Profile[];
  selectedIds: Set<string>;
  onSelect?: (employeeId: string, selected: boolean) => void;
  selectable?: boolean;
  density?: 'comfortable' | 'compact' | 'spacious';
  visibleColumns?: string[];
}

const DEFAULT_COLUMNS = ['name', 'email', 'role', 'department', 'team', 'location', 'phone'];

export default function EmployeeListView({
  employees,
  selectedIds,
  onSelect,
  selectable = false,
  density = 'comfortable',
  visibleColumns = DEFAULT_COLUMNS,
}: EmployeeListViewProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const densityClasses = {
    comfortable: 'py-4',
    compact: 'py-2',
    spacious: 'py-6',
  };

  const getInitials = (name: string | null, email: string): string => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      if (parts[0].length >= 2) {
        return parts[0].substring(0, 2).toUpperCase();
      }
      return parts[0][0].toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string | null, email: string): string => {
    const str = name || email;
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const parseSkills = (skills: any): string[] => {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills.filter(Boolean);
    if (typeof skills === 'string') {
      try {
        const parsed = JSON.parse(skills);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return [skills];
      }
    }
    return [];
  };

  if (employees.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No employees to display
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {selectable && (
              <th scope="col" className={`px-6 ${densityClasses[density]} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === employees.length && employees.length > 0}
                  onChange={(e) => {
                    if (onSelect && e.target.checked) {
                      employees.forEach((emp) => {
                        if (!selectedIds.has(emp.id)) {
                          onSelect(emp.id, true);
                        }
                      });
                    } else if (onSelect) {
                      employees.forEach((emp) => {
                        if (selectedIds.has(emp.id)) {
                          onSelect(emp.id, false);
                        }
                      });
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
            )}
            {visibleColumns.includes('name') && (
              <th scope="col" className={`px-6 ${densityClasses[density]} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                Name
              </th>
            )}
            {visibleColumns.includes('email') && (
              <th scope="col" className={`px-6 ${densityClasses[density]} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                Email
              </th>
            )}
            {visibleColumns.includes('role') && (
              <th scope="col" className={`px-6 ${densityClasses[density]} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                Role
              </th>
            )}
            {visibleColumns.includes('job_title') && (
              <th scope="col" className={`px-6 ${densityClasses[density]} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                Job Title
              </th>
            )}
            {visibleColumns.includes('department') && (
              <th scope="col" className={`px-6 ${densityClasses[density]} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                Department
              </th>
            )}
            {visibleColumns.includes('team') && (
              <th scope="col" className={`px-6 ${densityClasses[density]} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                Team
              </th>
            )}
            {visibleColumns.includes('location') && (
              <th scope="col" className={`px-6 ${densityClasses[density]} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                Location
              </th>
            )}
            {visibleColumns.includes('phone') && (
              <th scope="col" className={`px-6 ${densityClasses[density]} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                Phone
              </th>
            )}
            {visibleColumns.includes('skills') && (
              <th scope="col" className={`px-6 ${densityClasses[density]} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                Skills
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {employees.map((employee) => {
            if (!employee?.id || !employee?.email) return null;

            const initials = getInitials(employee.full_name, employee.email);
            const avatarColor = getAvatarColor(employee.full_name, employee.email);
            const skills = parseSkills(employee.skills);
            const displayName = employee.full_name || employee.email.split('@')[0];
            const isSelected = selectedIds.has(employee.id);

            return (
              <tr
                key={employee.id}
                className={`${isSelected ? 'bg-blue-50' : ''} ${hoveredRow === employee.id ? 'bg-gray-50' : ''} transition-colors`}
                onMouseEnter={() => setHoveredRow(employee.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {selectable && (
                  <td className={`px-6 ${densityClasses[density]} whitespace-nowrap`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (onSelect) {
                          onSelect(employee.id, e.target.checked);
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                )}
                {visibleColumns.includes('name') && (
                  <td className={`px-6 ${densityClasses[density]} whitespace-nowrap`}>
                    <Link
                      href={`/dashboard/employees/${employee.id}`}
                      className="flex items-center gap-3 group"
                    >
                      <div className={`${avatarColor} flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white flex-shrink-0`}>
                        {initials}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                          {displayName}
                        </div>
                        {employee.job_title && visibleColumns.includes('job_title') && (
                          <div className="text-xs text-gray-500">{employee.job_title}</div>
                        )}
                      </div>
                    </Link>
                  </td>
                )}
                {visibleColumns.includes('email') && (
                  <td className={`px-6 ${densityClasses[density]} whitespace-nowrap`}>
                    <a
                      href={`mailto:${employee.email}`}
                      className="text-sm text-gray-900 hover:text-blue-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {employee.email}
                    </a>
                  </td>
                )}
                {visibleColumns.includes('role') && (
                  <td className={`px-6 ${densityClasses[density]} whitespace-nowrap`}>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        employee.role === 'owner'
                          ? 'bg-purple-100 text-purple-800'
                          : employee.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {employee.role ? employee.role.charAt(0).toUpperCase() + employee.role.slice(1) : 'Member'}
                    </span>
                  </td>
                )}
                {visibleColumns.includes('job_title') && !visibleColumns.includes('name') && (
                  <td className={`px-6 ${densityClasses[density]} whitespace-nowrap text-sm text-gray-900`}>
                    {employee.job_title || '—'}
                  </td>
                )}
                {visibleColumns.includes('department') && (
                  <td className={`px-6 ${densityClasses[density]} whitespace-nowrap text-sm text-gray-900`}>
                    {employee.department || '—'}
                  </td>
                )}
                {visibleColumns.includes('team') && (
                  <td className={`px-6 ${densityClasses[density]} whitespace-nowrap text-sm text-gray-900`}>
                    {employee.team || '—'}
                  </td>
                )}
                {visibleColumns.includes('location') && (
                  <td className={`px-6 ${densityClasses[density]} whitespace-nowrap text-sm text-gray-900`}>
                    {employee.location || '—'}
                  </td>
                )}
                {visibleColumns.includes('phone') && (
                  <td className={`px-6 ${densityClasses[density]} whitespace-nowrap text-sm text-gray-900`}>
                    {employee.phone ? (
                      <a
                        href={`tel:${employee.phone}`}
                        className="hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {employee.phone}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                )}
                {visibleColumns.includes('skills') && (
                  <td className={`px-6 ${densityClasses[density]}`}>
                    <div className="flex flex-wrap gap-1">
                      {skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                        >
                          {skill}
                        </span>
                      ))}
                      {skills.length > 3 && (
                        <span className="text-xs text-gray-500">+{skills.length - 3}</span>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

