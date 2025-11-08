import type { Metadata } from 'next';
import { generateMetadata as genMeta } from '@/lib/seo';
import { getStatusComponents, getStatusIncidents } from '@/lib/cms';
import { format } from 'date-fns';

export const metadata: Metadata = genMeta({
  title: 'Status - Docuflow',
  description: 'Real-time status of Docuflow services and components.',
});

const statusColors = {
  operational: 'bg-green-500',
  degraded: 'bg-yellow-500',
  partial_outage: 'bg-orange-500',
  major_outage: 'bg-red-500',
  maintenance: 'bg-blue-500',
};

const statusLabels = {
  operational: 'Operational',
  degraded: 'Degraded Performance',
  partial_outage: 'Partial Outage',
  major_outage: 'Major Outage',
  maintenance: 'Maintenance',
};

const incidentStatusColors = {
  investigating: 'bg-yellow-500',
  identified: 'bg-orange-500',
  monitoring: 'bg-blue-500',
  resolved: 'bg-green-500',
};

const incidentStatusLabels = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
};

export default async function StatusPage() {
  const [components, incidents] = await Promise.all([
    getStatusComponents(),
    getStatusIncidents({ unresolved: true }),
  ]);

  const overallStatus = components.every(c => c.status === 'operational')
    ? 'operational'
    : components.some(c => c.status === 'major_outage')
    ? 'major_outage'
    : components.some(c => c.status === 'partial_outage')
    ? 'partial_outage'
    : 'degraded';

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            System Status
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Real-time status of all Docuflow services and components.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <div className="rounded-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Overall Status</h2>
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${statusColors[overallStatus]}`} />
                <span className="text-sm font-medium text-gray-900">
                  {statusLabels[overallStatus]}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-4 mb-12">
            <h2 className="text-lg font-semibold text-gray-900">Components</h2>
            {components.map((component) => (
              <div
                key={component.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{component.name}</h3>
                    {component.description && (
                      <p className="text-sm text-gray-600 mt-1">{component.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${statusColors[component.status]}`} />
                    <span className="text-sm font-medium text-gray-900">
                      {statusLabels[component.status]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {incidents.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Active Incidents</h2>
              {incidents.map((incident) => (
                <div key={incident.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`h-3 w-3 rounded-full ${incidentStatusColors[incident.status]}`}
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {incidentStatusLabels[incident.status]}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">{incident.title}</h3>
                      {incident.description && (
                        <p className="text-sm text-gray-600 mt-1">{incident.description}</p>
                      )}
                      {incident.component && (
                        <p className="text-sm text-gray-500 mt-2">
                          Component: {incident.component.name}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-2">
                        Started: {format(new Date(incident.started_at), 'MMMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

