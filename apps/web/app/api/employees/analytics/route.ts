import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Fetch all employees
    const { data: employees, error } = await supabase
      .from('profiles')
      .select('id, role, department, team, job_title, skills, created_at')
      .eq('organization_id', profile.organization_id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      );
    }

    const totalEmployees = employees?.length || 0;

    // Calculate statistics
    const stats = {
      total: totalEmployees,
      byRole: {} as Record<string, number>,
      byDepartment: {} as Record<string, number>,
      byTeam: {} as Record<string, number>,
      recentAdditions: 0,
      skills: {} as Record<string, number>,
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    employees?.forEach((emp) => {
      // By role
      const role = emp.role || 'member';
      stats.byRole[role] = (stats.byRole[role] || 0) + 1;

      // By department
      if (emp.department) {
        stats.byDepartment[emp.department] = (stats.byDepartment[emp.department] || 0) + 1;
      }

      // By team
      if (emp.team) {
        stats.byTeam[emp.team] = (stats.byTeam[emp.team] || 0) + 1;
      }

      // Recent additions
      if (emp.created_at && new Date(emp.created_at) >= thirtyDaysAgo) {
        stats.recentAdditions++;
      }

      // Skills
      if (emp.skills) {
        let skillsArray: string[] = [];
        if (Array.isArray(emp.skills)) {
          skillsArray = emp.skills;
        } else if (typeof emp.skills === 'string') {
          try {
            skillsArray = JSON.parse(emp.skills);
          } catch {
            skillsArray = [];
          }
        }

        skillsArray.forEach((skill: string) => {
          if (skill && typeof skill === 'string') {
            stats.skills[skill] = (stats.skills[skill] || 0) + 1;
          }
        });
      }
    });

    // Calculate growth over time (last 12 months)
    const growthData: Array<{ month: string; count: number }> = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const count = employees?.filter((emp) => {
        if (!emp.created_at) return false;
        const created = new Date(emp.created_at);
        return created >= monthStart && created <= monthEnd;
      }).length || 0;

      growthData.push({ month: monthStr, count });
    }

    // Get top skills (sorted by count)
    const topSkills = Object.entries(stats.skills)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        topSkills,
      },
      growth: growthData,
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

