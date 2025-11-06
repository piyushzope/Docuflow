import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: viewerProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!viewerProfile?.organization_id) {
    redirect('/dashboard/organization');
  }

  // Handle async params (Next.js 15+)
  const resolvedParams = await Promise.resolve(params);
  const employeeId = resolvedParams.id;

  const { data: employee } = await supabase
    .from('profiles')
    .select(
      'id, full_name, email, role, organization_id, job_title, department, team, phone, avatar_url, skills, bio, location, updated_at, created_at'
    )
    .eq('id', employeeId)
    .single();

  if (!employee) {
    notFound();
  }

  if (employee.organization_id !== viewerProfile.organization_id) {
    notFound();
  }

  // Fetch data with error handling
  let requests: any[] = [];
  let documents: any[] = [];
  let activities: any[] = [];

  // Ensure we have required fields before querying
  // Use employee.id (should match employeeId from params, but use employee.id for type safety)
  const employeeIdForQueries = employee.id;
  const employeeEmail = employee.email?.trim();

  if (employeeIdForQueries && viewerProfile.organization_id) {
    try {
      const queries: Promise<any>[] = [];

      // Query for document requests (only if employee.id exists)
      queries.push(
        supabase
          .from('document_requests')
          .select('id, subject, status, due_date, created_at')
          .eq('created_by', employeeIdForQueries)
          .eq('organization_id', viewerProfile.organization_id)
          .order('created_at', { ascending: false })
          .limit(10)
      );

      // Query for documents (only if employee.email exists)
      // Use case-insensitive matching by normalizing email to lowercase
      if (employeeEmail) {
        queries.push(
          supabase
            .from('documents')
            .select('id, original_filename, file_type, status, created_at')
            .eq('sender_email', employeeEmail.toLowerCase())
            .eq('organization_id', viewerProfile.organization_id)
            .order('created_at', { ascending: false })
            .limit(10)
        );
      } else {
        // Push a resolved promise with empty result if no email
        queries.push(Promise.resolve({ data: [], error: null }));
      }

      // Query for activity logs (only if employee.id exists)
      queries.push(
        supabase
          .from('activity_logs')
          .select('id, action, resource_type, created_at, details')
          .eq('user_id', employeeIdForQueries)
          .eq('organization_id', viewerProfile.organization_id)
          .order('created_at', { ascending: false })
          .limit(10)
      );

      const [requestsResult, documentsResult, activitiesResult] = await Promise.all(queries);

      // Handle requests query
      if (requestsResult.error) {
        console.error('Error fetching document requests:', requestsResult.error);
      } else {
        requests = Array.isArray(requestsResult.data) ? requestsResult.data : [];
      }

      // Handle documents query
      if (documentsResult.error) {
        console.error('Error fetching documents:', documentsResult.error);
      } else {
        documents = Array.isArray(documentsResult.data) ? documentsResult.data : [];
      }

      // Handle activities query
      if (activitiesResult.error) {
        console.error('Error fetching activity logs:', activitiesResult.error);
      } else {
        activities = Array.isArray(activitiesResult.data) ? activitiesResult.data : [];
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      // Fallback to empty arrays on any unexpected error
    }
  }

  // Parse skills - ensure it's always an array
  const skills: string[] = Array.isArray(employee.skills)
    ? (employee.skills as string[]).filter((s): s is string => typeof s === 'string' && s.length > 0)
    : typeof employee.skills === 'string' && employee.skills
    ? (() => {
        try {
          const parsed = JSON.parse(employee.skills);
          if (Array.isArray(parsed)) {
            return parsed.filter((s: any): s is string => typeof s === 'string' && s.length > 0);
          }
          return [];
        } catch {
          return [];
        }
      })()
    : [];

  // Get initials for avatar fallback
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

  const initials = getInitials(employee.full_name, employee.email);
  const displayName = employee.full_name || employee.email.split('@')[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {employee.avatar_url ? (
                <img
                  src={employee.avatar_url}
                  alt={`${displayName}'s profile picture`}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-100"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-500 text-2xl font-semibold text-white ring-2 ring-gray-100">
                  {initials}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
                {employee.job_title && (
                  <p className="mt-1 text-lg text-gray-700">{employee.job_title}</p>
                )}
                <p className="mt-1 text-sm text-gray-600">{employee.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {(user.id === employee.id || viewerProfile.role === 'owner' || viewerProfile.role === 'admin') && (
                <Link
                  href={`/dashboard/employees/${employeeId}/edit`}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {user.id === employee.id ? 'Edit Profile' : 'Edit Employee'}
                </Link>
              )}
              <Link
                href="/dashboard/employees"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                ← Back to directory
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Profile Information */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-xs font-medium uppercase text-gray-500">Role</div>
            <div className="mt-2 text-lg font-semibold text-gray-900">
              <span className="capitalize">{employee.role || 'member'}</span>
            </div>
          </div>
          {employee.department ? (
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-xs font-medium uppercase text-gray-500">Department</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">{employee.department}</div>
              {employee.team && (
                <div className="mt-1 text-sm text-gray-600">Team: {employee.team}</div>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-xs font-medium uppercase text-gray-500">Joined</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {employee.created_at ? new Date(employee.created_at).toLocaleDateString() : '—'}
              </div>
            </div>
          )}
          {employee.phone ? (
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-xs font-medium uppercase text-gray-500">Phone</div>
              <div className="mt-2">
                <a
                  href={`tel:${employee.phone}`}
                  className="text-lg font-semibold text-blue-600 hover:text-blue-500"
                >
                  {employee.phone}
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-xs font-medium uppercase text-gray-500">Joined</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {employee.created_at ? new Date(employee.created_at).toLocaleDateString() : '—'}
              </div>
            </div>
          )}
          {employee.location ? (
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-xs font-medium uppercase text-gray-500">Location</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">{employee.location}</div>
            </div>
          ) : (
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-xs font-medium uppercase text-gray-500">Joined</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {employee.created_at ? new Date(employee.created_at).toLocaleDateString() : '—'}
              </div>
            </div>
          )}
        </div>

        {/* Bio and Skills */}
        {(employee.bio || skills.length > 0) && (
          <div className="grid gap-6 lg:grid-cols-2">
            {employee.bio && (
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">About</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{employee.bio}</p>
              </div>
            )}
            {skills.length > 0 && (
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills & Expertise</h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Requests</h2>
              <Link href="/dashboard/requests" className="text-sm text-blue-600 hover:text-blue-500">
                View all
              </Link>
            </div>
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {(requests || []).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{r.subject}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-600">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {(!requests || requests.length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-500">No recent requests.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Related Documents</h2>
            </div>
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">File</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {(documents || []).map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">
                        <a
                          href={`/dashboard/documents/${d.id}`}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          {d.original_filename}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{d.file_type || '—'}</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-600">
                        {new Date(d.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {(!documents || documents.length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-500">No related documents.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Link href="/dashboard/activity" className="text-sm text-blue-600 hover:text-blue-500">
              View all
            </Link>
          </div>
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Resource</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {(activities || []).map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{a.action}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{a.resource_type}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {(!activities || activities.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-500">No recent activity.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


