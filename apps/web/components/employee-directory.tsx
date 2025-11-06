"use client";

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Database } from '@/types/database.types';
import EmployeeCard from './employee-card';
import EmployeeBulkActions from './employee-bulk-actions';
import EmployeeExportDialog from './employee-export-dialog';
import EmployeeAnalytics from './employee-analytics';
import EmployeeListView from './employee-list-view';
import { useDebounce } from '@/lib/hooks/use-debounce';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface EmployeeDirectoryProps {
  employees: Profile[];
  canManage?: boolean; // Admin/owner can use bulk operations
}

export default function EmployeeDirectory({ employees, canManage = false }: EmployeeDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sortBy, setSortBy] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'full_name',
    direction: 'asc',
  });
  const [listDensity, setListDensity] = useState<'comfortable' | 'compact' | 'spacious'>('comfortable');
  const [listColumns, setListColumns] = useState<string[]>(['name', 'email', 'role', 'department', 'team', 'location']);

  // Extract unique departments, teams, and roles for filters
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach((emp) => {
      if (emp.department) depts.add(emp.department);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const teams = useMemo(() => {
    const teamSet = new Set<string>();
    employees.forEach((emp) => {
      if (emp.team) teamSet.add(emp.team);
    });
    return Array.from(teamSet).sort();
  }, [employees]);

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter((employee) => {
      // Skip invalid employees
      if (!employee?.id || !employee?.email) {
        return false;
      }

      // Search filter (using debounced query)
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const searchableText = [
          employee.full_name,
          employee.email,
          employee.job_title,
          employee.department,
          employee.team,
          employee.location,
          employee.bio,
          employee.skills 
            ? (() => {
                try {
                  if (Array.isArray(employee.skills)) {
                    return employee.skills.join(' ');
                  }
                  return JSON.stringify(employee.skills);
                } catch {
                  return String(employee.skills || '');
                }
              })()
            : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      // Department filter
      if (selectedDepartment !== 'all' && employee.department !== selectedDepartment) {
        return false;
      }

      // Team filter
      if (selectedTeam !== 'all' && employee.team !== selectedTeam) {
        return false;
      }

      // Role filter
      if (selectedRole !== 'all' && employee.role !== selectedRole) {
        return false;
      }

      return true;
    });

    // Sort employees
    filtered.sort((a, b) => {
      let aValue: any = (a as any)[sortBy.field];
      let bValue: any = (b as any)[sortBy.field];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Handle dates
      if (sortBy.field === 'created_at' || sortBy.field === 'updated_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Handle arrays (skills)
      if (Array.isArray(aValue)) {
        aValue = aValue.join(', ');
      }
      if (Array.isArray(bValue)) {
        bValue = bValue.join(', ');
      }

      // Convert to strings for comparison
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();

      if (aValue < bValue) {
        return sortBy.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortBy.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [employees, debouncedSearchQuery, selectedDepartment, selectedTeam, selectedRole, sortBy]);

  const hasActiveFilters =
    selectedDepartment !== 'all' || selectedTeam !== 'all' || selectedRole !== 'all';

  const clearFilters = () => {
    setSelectedDepartment('all');
    setSelectedTeam('all');
    setSelectedRole('all');
    setSearchQuery('');
  };

  const handleSelect = useCallback((employeeId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(employeeId);
      } else {
        next.delete(employeeId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map((e) => e.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics Section */}
      {showAnalytics && (
        <div className="bg-white rounded-lg shadow p-6">
          <EmployeeAnalytics />
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, job title, department, skills..."
            className="block w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm placeholder-gray-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search employees"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="department-filter" className="text-sm font-medium text-gray-700">
              Department:
            </label>
            <select
              id="department-filter"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by department"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="team-filter" className="text-sm font-medium text-gray-700">
              Team:
            </label>
            <select
              id="team-filter"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by team"
            >
              <option value="all">All Teams</option>
              {teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="role-filter" className="text-sm font-medium text-gray-700">
              Role:
            </label>
            <select
              id="role-filter"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by role"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          )}

          {/* Sort */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort-by" className="text-sm font-medium text-gray-700">
              Sort by:
            </label>
            <select
              id="sort-by"
              value={sortBy.field}
              onChange={(e) => setSortBy({ ...sortBy, field: e.target.value })}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="full_name">Name</option>
              <option value="email">Email</option>
              <option value="department">Department</option>
              <option value="team">Team</option>
              <option value="role">Role</option>
              <option value="created_at">Created Date</option>
              <option value="updated_at">Updated Date</option>
            </select>
            <button
              onClick={() => setSortBy({ ...sortBy, direction: sortBy.direction === 'asc' ? 'desc' : 'asc' })}
              className="px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              aria-label="Toggle sort direction"
            >
              {sortBy.direction === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* View Mode Toggle and List Options */}
          <div className="ml-auto flex items-center gap-2">
            {viewMode === 'list' && (
              <div className="flex items-center gap-2 mr-2">
                <label htmlFor="density" className="text-sm text-gray-700">
                  Density:
                </label>
                <select
                  id="density"
                  value={listDensity}
                  onChange={(e) => setListDensity(e.target.value as any)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </select>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white p-1 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Results count and actions */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <p>
              Showing <span className="font-semibold text-gray-900">{filteredEmployees.length}</span>{' '}
              of <span className="font-semibold text-gray-900">{employees.length}</span> employees
              {hasActiveFilters && ' (filtered)'}
            </p>
            {selectionMode && (
              <p className="text-blue-600">
                {selectedIds.size} selected
              </p>
            )}
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectionMode}
                className={`px-3 py-1.5 text-sm font-medium rounded-md border ${
                  selectionMode
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {selectionMode ? 'Cancel Selection' : 'Select'}
              </button>
              {!selectionMode && (
                <>
                  <button
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md border ${
                      showAnalytics
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {showAnalytics ? 'Hide' : 'Show'} Analytics
                  </button>
                  <Link
                    href="/dashboard/employees/import"
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Import
                  </Link>
                  <button
                    onClick={() => setShowExportDialog(true)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Export
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Employee Grid/List */}
      {filteredEmployees.length > 0 ? (
        <>
          {selectionMode && viewMode === 'grid' && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700 cursor-pointer" onClick={handleSelectAll}>
                Select all {filteredEmployees.length} employees
              </label>
            </div>
          )}
          {viewMode === 'grid' ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredEmployees.map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  selected={selectedIds.has(employee.id)}
                  onSelect={selectionMode ? handleSelect : undefined}
                  selectable={selectionMode}
                />
              ))}
            </div>
          ) : (
            <EmployeeListView
              employees={filteredEmployees}
              selectedIds={selectedIds}
              onSelect={selectionMode ? handleSelect : undefined}
              selectable={selectionMode}
              density={listDensity}
              visibleColumns={listColumns}
            />
          )}
        </>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No employees found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {hasActiveFilters || searchQuery
              ? 'Try adjusting your search or filters'
              : 'No employees in your organization yet'}
          </p>
          {(hasActiveFilters || searchQuery) && (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Bulk Actions */}
      {canManage && selectionMode && selectedIds.size > 0 && (
        <EmployeeBulkActions
          selectedIds={Array.from(selectedIds)}
          onClearSelection={handleClearSelection}
        />
      )}

      {/* Export Dialog */}
      {canManage && showExportDialog && (
        <EmployeeExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          employeeCount={filteredEmployees.length}
          selectedEmployeeIds={selectionMode ? Array.from(selectedIds) : []}
          filters={{
            department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
            team: selectedTeam !== 'all' ? selectedTeam : undefined,
            role: selectedRole !== 'all' ? selectedRole : undefined,
          }}
        />
      )}
    </div>
  );
}

