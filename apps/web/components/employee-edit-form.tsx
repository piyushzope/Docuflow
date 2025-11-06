"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingButton } from './loading-button';

type Employee = {
  id: string;
  full_name: string | null;
  job_title: string | null;
  department: string | null;
  team: string | null;
  phone: string | null;
  avatar_url: string | null;
  skills: unknown;
  bio: string | null;
  location: string | null;
  email: string;
  role?: 'owner' | 'admin' | 'member';
  canEditRole?: boolean; // Whether current user can edit role
};

export default function EmployeeEditForm({ employee }: { employee: Employee }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: employee.full_name || '',
    job_title: employee.job_title || '',
    department: employee.department || '',
    team: employee.team || '',
    phone: employee.phone || '',
    avatar_url: employee.avatar_url || '',
    skills: Array.isArray(employee.skills) ? (employee.skills as string[]) : [],
    bio: employee.bio || '',
    location: employee.location || '',
    role: employee.role || 'member',
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/employees/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: employee.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }
      router.push(`/dashboard/employees/${employee.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      setLoading(false);
    }
  };

  const inputBaseClasses = "mt-1 block w-full rounded-md border-0 bg-white px-3 py-2.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600";
  const disabledInputClasses = "mt-1 block w-full rounded-md border-0 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 ring-1 ring-inset ring-gray-300 cursor-not-allowed";
  const selectBaseClasses = "mt-1 block w-full rounded-md border-0 bg-white px-3 py-2.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600";
  const textareaBaseClasses = "mt-1 block w-full rounded-md border-0 bg-white px-3 py-2.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600";

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Basic Information Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={employee.email}
                disabled
                className={disabledInputClasses}
                aria-describedby="email-help"
              />
              <p id="email-help" className="mt-2 text-xs text-gray-500">
                Email cannot be changed
              </p>
            </div>
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Full name
              </label>
              <input
                id="full_name"
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className={inputBaseClasses}
                placeholder={employee.email ? employee.email.split('@')[0] : 'Enter name'}
                autoComplete="name"
              />
            </div>
            {employee.canEditRole && (
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as 'owner' | 'admin' | 'member' })}
                  className={selectBaseClasses}
                  aria-describedby="role-help"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
                <p id="role-help" className="mt-2 text-xs text-gray-500">
                  Only organization owners can change roles
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Professional Information Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="job_title" className="block text-sm font-medium text-gray-700">
                Job title
              </label>
              <input
                id="job_title"
                type="text"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                className={inputBaseClasses}
                placeholder="e.g., Software Engineer"
                autoComplete="organization-title"
              />
            </div>
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <input
                id="department"
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className={inputBaseClasses}
                placeholder="e.g., Engineering"
                autoComplete="organization"
              />
            </div>
            <div>
              <label htmlFor="team" className="block text-sm font-medium text-gray-700">
                Team
              </label>
              <input
                id="team"
                type="text"
                value={form.team}
                onChange={(e) => setForm({ ...form, team: e.target.value })}
                className={inputBaseClasses}
                placeholder="e.g., Backend Team"
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                id="location"
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className={inputBaseClasses}
                placeholder="City, Country"
                autoComplete="country-name"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputBaseClasses}
                placeholder="+1 555 000 1234"
                autoComplete="tel"
              />
            </div>
            <div>
              <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700">
                Avatar URL
              </label>
              <input
                id="avatar_url"
                type="url"
                value={form.avatar_url}
                onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                className={inputBaseClasses}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-gray-700">
                Skills (comma-separated)
              </label>
              <input
                id="skills"
                type="text"
                value={form.skills.join(', ')}
                onChange={(e) => setForm({ ...form, skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                className={inputBaseClasses}
                placeholder="OCR, Compliance, Excel"
                aria-describedby="skills-help"
              />
              <p id="skills-help" className="mt-2 text-xs text-gray-500">
                Separate multiple skills with commas
              </p>
            </div>
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                About
              </label>
              <textarea
                id="bio"
                rows={4}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className={textareaBaseClasses}
                placeholder="Short bio..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 bg-white ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600"
        >
          Cancel
        </button>
        <LoadingButton
          type="submit"
          loading={loading}
        >
          Save changes
        </LoadingButton>
      </div>
    </form>
  );
}


