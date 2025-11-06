'use client';

import Link from 'next/link';
import { Database } from '@/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface EmployeeCardProps {
  employee: Profile;
  selected?: boolean;
  onSelect?: (employeeId: string, selected: boolean) => void;
  selectable?: boolean;
}

function getInitials(name: string | null, email: string): string {
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
  // Fallback to email initials
  return email.substring(0, 2).toUpperCase();
}

function getAvatarColor(name: string | null, email: string): string {
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
}

function parseSkills(skills: any): string[] {
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
}

export default function EmployeeCard({
  employee,
  selected = false,
  onSelect,
  selectable = false,
}: EmployeeCardProps) {
  if (!employee?.id || !employee?.email) {
    return null;
  }

  const initials = getInitials(employee.full_name, employee.email);
  const avatarColor = getAvatarColor(employee.full_name, employee.email);
  const skills = parseSkills(employee.skills);
  const displayName = employee.full_name || (employee.email ? employee.email.split('@')[0] : 'Employee');

  const handleSelect = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSelect) {
      onSelect(employee.id, !selected);
    }
  };

  return (
    <div
      className={`group relative rounded-lg border ${
        selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
      } p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md`}
    >
      {selectable && (
        <div className="absolute top-4 left-4 z-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={handleSelect}
            onClick={handleSelect}
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
            aria-label={`Select ${displayName}`}
          />
        </div>
      )}
      <Link
        href={`/dashboard/employees/${employee.id}`}
        className={`block ${selectable ? 'ml-8' : ''}`}
        onClick={(e) => {
          if (selectable && (e.target as HTMLElement).tagName !== 'A') {
            // Allow checkbox clicks to work
            const target = e.target as HTMLElement;
            if (target.closest('input[type="checkbox"]')) {
              return;
            }
          }
        }}
      >
        <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {employee.avatar_url ? (
            <>
              <img
                src={employee.avatar_url}
                alt={`${displayName}'s profile picture`}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-blue-200"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }}
              />
              <div
                className={`${avatarColor} hidden h-16 w-16 items-center justify-center rounded-full text-lg font-semibold text-white ring-2 ring-gray-100 group-hover:ring-blue-200`}
                aria-hidden="true"
              >
                {initials}
              </div>
            </>
          ) : (
            <div
              className={`${avatarColor} flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold text-white ring-2 ring-gray-100 group-hover:ring-blue-200`}
              aria-hidden="true"
            >
              {initials}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                {displayName}
              </h3>
              {employee.job_title && (
                <p className="mt-1 text-sm font-medium text-gray-700">{employee.job_title}</p>
              )}
            </div>
            <span
              className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                employee.role === 'owner'
                  ? 'bg-purple-100 text-purple-800'
                  : employee.role === 'admin'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {employee.role 
                ? employee.role.charAt(0).toUpperCase() + employee.role.slice(1)
                : 'Member'}
            </span>
          </div>

          <div className="mt-3 space-y-1.5 text-sm text-gray-600">
            {employee.department && (
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <span className="truncate">{employee.department}</span>
                {employee.team && <span className="text-gray-400">•</span>}
                {employee.team && <span className="truncate">{employee.team}</span>}
              </div>
            )}

            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 flex-shrink-0 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `mailto:${employee.email}`;
                }}
                className="truncate cursor-pointer hover:text-blue-600 hover:underline"
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = `mailto:${employee.email}`;
                  }
                }}
              >
                {employee.email}
              </span>
            </div>

            {employee.phone && (
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `tel:${employee.phone}`;
                  }}
                  className="cursor-pointer hover:text-blue-600 hover:underline"
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      window.location.href = `tel:${employee.phone}`;
                    }
                  }}
                >
                  {employee.phone}
                </span>
              </div>
            )}

            {employee.location && (
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{employee.location}</span>
              </div>
            )}
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.slice(0, 5).map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                >
                  {skill}
                </span>
              ))}
              {skills.length > 5 && (
                <span className="inline-flex items-center rounded-md bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                  +{skills.length - 5} more
                </span>
              )}
            </div>
          )}

          {/* Bio preview */}
          {employee.bio && (
            <p className="mt-3 line-clamp-2 text-sm text-gray-500">{employee.bio}</p>
          )}
        </div>
      </div>
      </Link>
    </div>
  );
}
