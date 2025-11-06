'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DocumentValidation {
  id: string;
  document_id: string;
  document_type: string | null;
  document_type_confidence: number | null;
  issuing_country: string | null;
  document_number: string | null;
  matched_employee_id: string | null;
  name_match_score: number | null;
  dob_match: boolean | null;
  owner_match_confidence: number | null;
  expiry_date: string | null;
  issue_date: string | null;
  expiry_status: 'expired' | 'expiring_soon' | 'expiring_later' | 'no_expiry' | null;
  days_until_expiry: number | null;
  authenticity_score: number | null;
  image_quality_score: number | null;
  is_duplicate: boolean | null;
  matches_request_type: boolean | null;
  request_compliance_score: number | null;
  overall_status: 'verified' | 'needs_review' | 'rejected' | null;
  can_auto_approve: boolean | null;
  requires_admin_review: boolean | null;
  review_priority: 'low' | 'medium' | 'high' | 'critical' | null;
  validation_metadata: any;
  validated_at: string | null;
  profiles?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

interface DocumentValidationSummaryProps {
  documentId: string;
}

export function DocumentValidationSummary({ documentId }: DocumentValidationSummaryProps) {
  const [validation, setValidation] = useState<DocumentValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const loadValidation = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/documents/${documentId}/validation`);
      if (!response.ok) {
        if (response.status === 404) {
          // No validation yet - that's ok
          setValidation(null);
          return;
        }
        throw new Error('Failed to load validation');
      }

      const data = await response.json();
      setValidation(data.data || data);
    } catch (err: any) {
      setError(err.message || 'Failed to load validation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValidation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const handleTriggerValidation = async () => {
    try {
      setValidating(true);
      setError(null);

      const response = await fetch(`/api/documents/${documentId}/validate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to trigger validation');
      }

      // Wait a moment for validation to start, then reload
      setTimeout(() => {
        loadValidation();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger validation');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Validation Status</h2>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Validation Status</h2>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!validation) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Validation Status</h2>
          {!validating && (
            <button
              onClick={handleTriggerValidation}
              disabled={validating}
              className="text-xs text-blue-600 hover:text-blue-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Validate Now
            </button>
          )}
        </div>
        {validating ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Validating document...</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Validation pending. Click "Validate Now" to start.</p>
        )}
        {error && (
          <div className="mt-2 text-xs text-red-600">{error}</div>
        )}
      </div>
    );
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const badges = {
      verified: (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          ✓ Verified
        </span>
      ),
      needs_review: (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
          ⚠ Needs Review
        </span>
      ),
      rejected: (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
          ✗ Rejected
        </span>
      ),
    };

    return badges[status as keyof typeof badges] || null;
  };

  const getConfidenceColor = (score: number | null) => {
    if (!score) return 'text-gray-500';
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getExpiryStatusBadge = (status: string | null, days: number | null) => {
    if (!status || status === 'no_expiry') return null;

    const badges = {
      expired: (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
          Expired
        </span>
      ),
      expiring_soon: (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
          Expiring in {days} days
        </span>
      ),
      expiring_later: (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          Valid for {days} days
        </span>
      ),
    };

    return badges[status as keyof typeof badges] || null;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return `${Math.round(value * 100)}%`;
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Validation Summary</h2>
        <div className="flex items-center gap-2">
          {getStatusBadge(validation.overall_status)}
          {!validating && (
            <button
              onClick={handleTriggerValidation}
              disabled={validating}
              className="text-xs text-blue-600 hover:text-blue-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Re-validate document"
            >
              Re-validate
            </button>
          )}
        </div>
      </div>
      {validating && (
        <div className="mb-3 flex items-center gap-2 text-sm text-blue-600">
          <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Re-validating document...</span>
        </div>
      )}

      <dl className="space-y-3">
        {/* Document Type */}
        {validation.document_type && (
          <div>
            <dt className="text-xs font-medium text-gray-500">Document Type</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <span className="capitalize">{validation.document_type.replace('_', ' ')}</span>
              {validation.document_type_confidence && (
                <span className={`ml-2 ${getConfidenceColor(validation.document_type_confidence)}`}>
                  ({formatPercentage(validation.document_type_confidence)})
                </span>
              )}
            </dd>
          </div>
        )}

        {/* Owner Match */}
        {validation.matched_employee_id && (
          <div>
            <dt className="text-xs font-medium text-gray-500">Owner Match</dt>
            <dd className="mt-1">
              {validation.profiles ? (
                <Link
                  href={`/dashboard/employees/${validation.matched_employee_id}`}
                  className="text-sm text-blue-600 hover:text-blue-900"
                >
                  {validation.profiles.full_name || validation.profiles.email}
                </Link>
              ) : (
                <span className="text-sm text-gray-900">Matched</span>
              )}
              {validation.owner_match_confidence !== null && (
                <span className={`ml-2 ${getConfidenceColor(validation.owner_match_confidence)}`}>
                  ({formatPercentage(validation.owner_match_confidence)})
                </span>
              )}
            </dd>
          </div>
        )}

        {/* Expiry Date */}
        {validation.expiry_date && (
          <div>
            <dt className="text-xs font-medium text-gray-500">Expiry Date</dt>
            <dd className="mt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900">{formatDate(validation.expiry_date)}</span>
                {getExpiryStatusBadge(validation.expiry_status, validation.days_until_expiry)}
              </div>
            </dd>
          </div>
        )}

        {/* Authenticity Score */}
        {validation.authenticity_score !== null && (
          <div>
            <dt className="text-xs font-medium text-gray-500">Authenticity</dt>
            <dd className="mt-1">
              <span className={`text-sm font-medium ${getConfidenceColor(validation.authenticity_score)}`}>
                {formatPercentage(validation.authenticity_score)}
              </span>
            </dd>
          </div>
        )}

        {/* Request Compliance */}
        {validation.matches_request_type !== null && (
          <div>
            <dt className="text-xs font-medium text-gray-500">Request Match</dt>
            <dd className="mt-1">
              {validation.matches_request_type ? (
                <span className="inline-flex items-center text-sm text-green-600">
                  ✓ Matches request
                </span>
              ) : (
                <span className="inline-flex items-center text-sm text-red-600">
                  ✗ Type mismatch
                </span>
              )}
            </dd>
          </div>
        )}

        {/* Review Priority */}
        {validation.requires_admin_review && validation.review_priority && (
          <div>
            <dt className="text-xs font-medium text-gray-500">Review Priority</dt>
            <dd className="mt-1">
              <span className={`text-sm font-medium ${
                validation.review_priority === 'critical' ? 'text-red-600' :
                validation.review_priority === 'high' ? 'text-orange-600' :
                validation.review_priority === 'medium' ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {validation.review_priority.charAt(0).toUpperCase() + validation.review_priority.slice(1)}
              </span>
            </dd>
          </div>
        )}

        {/* Validated At */}
        {validation.validated_at && (
          <div>
            <dt className="text-xs font-medium text-gray-500">Validated</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(validation.validated_at).toLocaleString()}
            </dd>
          </div>
        )}
      </dl>

      {/* Critical Issues / Warnings */}
      {validation.validation_metadata?.summary && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {(validation.validation_metadata.summary.critical_issues?.length > 0 ||
            validation.validation_metadata.summary.warnings?.length > 0) && (
            <div className="space-y-2">
              {validation.validation_metadata.summary.critical_issues?.length > 0 && (
                <div>
                  <dt className="text-xs font-medium text-red-600 mb-1">Critical Issues</dt>
                  <ul className="list-disc list-inside text-xs text-red-600 space-y-1">
                    {validation.validation_metadata.summary.critical_issues.map((issue: string, idx: number) => (
                      <li key={idx}>{issue.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validation.validation_metadata.summary.warnings?.length > 0 && (
                <div>
                  <dt className="text-xs font-medium text-yellow-600 mb-1">Warnings</dt>
                  <ul className="list-disc list-inside text-xs text-yellow-600 space-y-1">
                    {validation.validation_metadata.summary.warnings.map((warning: string, idx: number) => (
                      <li key={idx}>{warning.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

