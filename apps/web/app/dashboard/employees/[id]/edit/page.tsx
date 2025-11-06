import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import EmployeeEditForm from '@/components/employee-edit-form';

export default async function EditEmployeePage({
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

  const resolved = await Promise.resolve(params);
  const employeeId = resolved.id;

  const { data: viewerProfile, error: viewerError } = await supabase
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single();

  if (viewerError || !viewerProfile) {
    redirect('/dashboard/organization');
  }

  const viewerOrgId = (viewerProfile as { organization_id: string | null })?.organization_id;
  if (!viewerOrgId) {
    redirect('/dashboard/organization');
  }

  const { data: employee, error: employeeError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, job_title, department, team, phone, avatar_url, skills, bio, location, organization_id')
    .eq('id', employeeId)
    .single();

  if (employeeError || !employee) {
    notFound();
  }

  const employeeOrgId = (employee as { organization_id: string | null })?.organization_id;
  if (!employeeOrgId || employeeOrgId !== viewerOrgId) {
    notFound();
  }

  const employeeIdValue = (employee as { id: string })?.id;
  if (!employeeIdValue) {
    notFound();
  }

  // Check permissions: users can edit themselves, admins can edit anyone
  const canEditSelf = user.id === employeeIdValue;
  const isAdmin = (viewerProfile as { role: string })?.role === 'owner' || (viewerProfile as { role: string })?.role === 'admin';
  
  if (!canEditSelf && !isAdmin) {
    redirect(`/dashboard/employees/${employeeIdValue}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
            <Link href={`/dashboard/employees/${employeeIdValue}`} className="text-sm font-medium text-blue-600 hover:text-blue-500">
              ← Back to profile
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-6 shadow">
          <EmployeeEditForm 
            employee={{
              ...(employee as any),
              canEditRole: isAdmin && (viewerProfile as { role: string })?.role === 'owner',
            }} 
          />
        </div>
      </div>
    </div>
  );
}
