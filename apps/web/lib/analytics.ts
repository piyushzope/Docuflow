/**
 * Analytics utility functions for dashboard metrics and insights
 */

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface CompletionRateData {
  date: string;
  completed: number;
  total: number;
  rate: number;
}

export interface PerformanceMetrics {
  averageCompletionTime: number; // in days
  averageResponseTime: number; // in days
  completionRate: number; // percentage
  onTimeCompletionRate: number; // percentage
}

/**
 * Calculate trend between two periods
 */
export function calculateTrend(current: number, previous: number): TrendData {
  const change = current - previous;
  const changePercent = previous === 0 
    ? (current > 0 ? 100 : 0)
    : ((change / previous) * 100);
  
  return {
    current,
    previous,
    change,
    changePercent: Math.round(changePercent * 10) / 10,
    isPositive: change >= 0,
  };
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

/**
 * Calculate status distribution from request data
 */
export function calculateStatusDistribution(
  requests: Array<{ status: string }>
): StatusDistribution[] {
  const statusCounts: Record<string, number> = {};
  const total = requests.length;

  // Count by status
  requests.forEach((req) => {
    statusCounts[req.status] = (statusCounts[req.status] || 0) + 1;
  });

  // Convert to array with percentages
  return Object.entries(statusCounts)
    .map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Generate time series data for requests
 */
export function generateTimeSeriesData(
  requests: Array<{ created_at: string }>,
  days: number = 30,
  startDate?: Date
): TimeSeriesDataPoint[] {
  const now = startDate || new Date();
  const data: Record<string, number> = {};
  
  // Initialize all dates with 0
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    data[key] = 0;
  }

  // Count requests per day
  requests.forEach((req) => {
    const date = new Date(req.created_at).toISOString().slice(0, 10);
    if (data[date] !== undefined) {
      data[date] += 1;
    }
  });

  // Convert to array
  return Object.entries(data).map(([date, value]) => ({
    date,
    value,
    label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));
}

/**
 * Calculate completion rate over time
 */
export function calculateCompletionRateOverTime(
  requests: Array<{ created_at: string; completed_at: string | null; status: string }>,
  days: number = 30
): CompletionRateData[] {
  const now = new Date();
  const data: Record<string, { total: number; completed: number }> = {};

  // Initialize all dates
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    data[key] = { total: 0, completed: 0 };
  }

  // Count requests created on each day
  requests.forEach((req) => {
    const date = new Date(req.created_at).toISOString().slice(0, 10);
    if (data[date]) {
      data[date].total += 1;
      if (req.status === 'completed' || req.completed_at) {
        data[date].completed += 1;
      }
    }
  });

  // Convert to array with rates
  return Object.entries(data).map(([date, counts]) => ({
    date,
    completed: counts.completed,
    total: counts.total,
    rate: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100 * 10) / 10 : 0,
  }));
}

/**
 * Calculate average completion time in days
 */
export function calculateAverageCompletionTime(
  requests: Array<{ created_at: string; completed_at: string | null }>
): number {
  const completed = requests.filter(
    (req) => req.completed_at
  );

  if (completed.length === 0) {
    return 0;
  }

  const totalDays = completed.reduce((sum, req) => {
    const created = new Date(req.created_at).getTime();
    const completed = new Date(req.completed_at!).getTime();
    const days = (completed - created) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);

  return Math.round((totalDays / completed.length) * 10) / 10;
}

/**
 * Calculate average response time (time from sent to first document received)
 */
export function calculateAverageResponseTime(
  requests: Array<{ sent_at: string | null; created_at: string }>,
  documents: Array<{ created_at: string; document_request_id: string | null }>
): number {
  // Group documents by request
  const requestDocuments: Record<string, string[]> = {};
  documents.forEach((doc) => {
    if (doc.document_request_id) {
      if (!requestDocuments[doc.document_request_id]) {
        requestDocuments[doc.document_request_id] = [];
      }
      requestDocuments[doc.document_request_id].push(doc.created_at);
    }
  });

  // Calculate response times
  const responseTimes: number[] = [];
  requests.forEach((req) => {
    if (req.sent_at && requestDocuments[req.id]) {
      const sentTime = new Date(req.sent_at).getTime();
      const firstDocTime = Math.min(
        ...requestDocuments[req.id].map((d) => new Date(d).getTime())
      );
      const days = (firstDocTime - sentTime) / (1000 * 60 * 60 * 24);
      if (days >= 0) {
        responseTimes.push(days);
      }
    }
  });

  if (responseTimes.length === 0) {
    return 0;
  }

  const avg = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  return Math.round(avg * 10) / 10;
}

/**
 * Calculate overall completion rate
 */
export function calculateCompletionRate(
  requests: Array<{ status: string }>
): number {
  if (requests.length === 0) {
    return 0;
  }

  const completed = requests.filter(
    (req) => req.status === 'completed'
  ).length;

  return Math.round((completed / requests.length) * 100 * 10) / 10;
}

/**
 * Calculate on-time completion rate (completed before due date)
 */
export function calculateOnTimeCompletionRate(
  requests: Array<{ status: string; due_date: string | null; completed_at: string | null }>
): number {
  const withDueDates = requests.filter((req) => req.due_date);
  if (withDueDates.length === 0) {
    return 0;
  }

  const onTime = withDueDates.filter((req) => {
    if (req.status !== 'completed' || !req.completed_at || !req.due_date) {
      return false;
    }
    const completed = new Date(req.completed_at).getTime();
    const due = new Date(req.due_date).getTime();
    return completed <= due;
  }).length;

  return Math.round((onTime / withDueDates.length) * 100 * 10) / 10;
}

/**
 * Calculate comprehensive performance metrics
 */
export function calculatePerformanceMetrics(
  requests: Array<{
    id: string;
    created_at: string;
    completed_at: string | null;
    sent_at: string | null;
    status: string;
    due_date: string | null;
  }>,
  documents: Array<{
    created_at: string;
    document_request_id: string | null;
  }> = []
): PerformanceMetrics {
  return {
    averageCompletionTime: calculateAverageCompletionTime(requests),
    averageResponseTime: calculateAverageResponseTime(
      requests.map((r) => ({ ...r, id: r.id })),
      documents
    ),
    completionRate: calculateCompletionRate(requests),
    onTimeCompletionRate: calculateOnTimeCompletionRate(requests),
  };
}

/**
 * Detect anomalies in time series data
 */
export function detectAnomalies(
  data: TimeSeriesDataPoint[],
  threshold: number = 2
): Array<{ date: string; value: number; isAnomaly: boolean }> {
  if (data.length < 3) {
    return data.map((d) => ({ ...d, isAnomaly: false }));
  }

  // Calculate mean and standard deviation
  const values = data.map((d) => d.value);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Mark anomalies (values more than threshold standard deviations from mean)
  return data.map((point) => ({
    ...point,
    isAnomaly: Math.abs(point.value - mean) > threshold * stdDev,
  }));
}

/**
 * Group activity by day for heatmap
 */
export function groupActivityByDay(
  activities: Array<{ created_at: string }>,
  weeks: number = 52
): Record<string, number> {
  const now = new Date();
  const data: Record<string, number> = {};

  // Initialize all dates
  const days = weeks * 7;
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    data[key] = 0;
  }

  // Count activities per day
  activities.forEach((activity) => {
    const date = new Date(activity.created_at).toISOString().slice(0, 10);
    if (data[date] !== undefined) {
      data[date] += 1;
    }
  });

  return data;
}

/**
 * Calculate document type distribution
 */
export function calculateDocumentTypeDistribution(
  documents: Array<{ file_type: string | null; mime_type: string | null }>
): Array<{ type: string; count: number; percentage: number }> {
  const typeCounts: Record<string, number> = {};
  const total = documents.length;

  documents.forEach((doc) => {
    const type = doc.file_type || doc.mime_type?.split('/')[0] || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  return Object.entries(typeCounts)
    .map(([type, count]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate storage usage by provider
 */
export function calculateStorageUsageByProvider(
  documents: Array<{ storage_provider: string; file_size: number | null }>
): Array<{ provider: string; count: number; totalSize: number; percentage: number }> {
  const providerData: Record<string, { count: number; totalSize: number }> = {};
  let totalSize = 0;

  documents.forEach((doc) => {
    const provider = doc.storage_provider || 'unknown';
    const size = doc.file_size || 0;
    
    if (!providerData[provider]) {
      providerData[provider] = { count: 0, totalSize: 0 };
    }
    
    providerData[provider].count += 1;
    providerData[provider].totalSize += size;
    totalSize += size;
  });

  return Object.entries(providerData)
    .map(([provider, data]) => ({
      provider: provider.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      count: data.count,
      totalSize: data.totalSize,
      percentage: totalSize > 0 ? Math.round((data.totalSize / totalSize) * 100 * 10) / 10 : 0,
    }))
    .sort((a, b) => b.totalSize - a.totalSize);
}

