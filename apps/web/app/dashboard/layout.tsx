import { SidebarNav } from '@/components/sidebar-nav';
import { AlertsButton } from '@/components/alerts-sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Top Header with Alerts - matches sidebar height */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shadow-sm">
          {/* Left spacer to align with sidebar */}
          <div className="flex-1" />
          {/* Right side with alerts */}
          <div className="flex items-center gap-4">
            <AlertsButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}


