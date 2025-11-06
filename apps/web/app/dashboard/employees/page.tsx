import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import EmployeeDirectory from '@/components/employee-directory';

export default async function EmployeesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    redirect('/dashboard/organization');
  }

  // Fetch all employees with all directory fields
  const { data: members, error: membersError } = await supabase
    .from('profiles')
    .select(
      'id, full_name, email, role, job_title, department, team, phone, avatar_url, skills, bio, location, updated_at, created_at'
    )
    .eq('organization_id', profile.organization_id)
    .order('full_name', { ascending: true, nullsFirst: false });

  if (membersError) {
    console.error('Error fetching employees:', membersError);
  }

  // Filter out any invalid entries
  const validMembers = (members || []).filter((m) => m.id && m.email);

  const canAddEmployees = profile.role === 'owner' || profile.role === 'admin';

  return (
    <>
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Employee Directory</h1>
            <p className="mt-2 text-sm text-slate-600">
              Find and connect with team members across your organization
            </p>
          </div>
          {canAddEmployees && (
            <Link
              href="/dashboard/employees/new"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              + Add Employee
            </Link>
          )}
        </div>
        <EmployeeDirectory employees={validMembers} canManage={canAddEmployees} />
      </div>
    </>
  );
}
