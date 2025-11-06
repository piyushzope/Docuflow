'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface ValidationSettings {
  enabled?: boolean;
  min_owner_match_confidence?: number;
  min_authenticity_score?: number;
  min_request_compliance_score?: number;
  require_expiry_check?: boolean;
  allow_expired_documents?: boolean;
}

interface ValidationSettingsFormProps {
  organizationId: string;
  initialSettings: ValidationSettings;
}

const DEFAULT_SETTINGS: ValidationSettings = {
  enabled: true,
  min_owner_match_confidence: 0.90,
  min_authenticity_score: 0.85,
  min_request_compliance_score: 0.95,
  require_expiry_check: true,
  allow_expired_documents: false,
};

export function ValidationSettingsForm({ 
  organizationId, 
  initialSettings 
}: ValidationSettingsFormProps) {
  const [settings, setSettings] = useState<ValidationSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Check if settings have changed from initial
    const changed = JSON.stringify(settings) !== JSON.stringify({
      ...DEFAULT_SETTINGS,
      ...initialSettings,
    });
    setHasChanges(changed);
  }, [settings, initialSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/organizations/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auto_approval: settings,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || 'Failed to save settings');
      }

      toast.success('Settings saved successfully');
      setHasChanges(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      ...DEFAULT_SETTINGS,
      ...initialSettings,
    });
    toast.info('Settings reset to current saved values');
  };

  const updateSetting = <K extends keyof ValidationSettings>(
    key: K,
    value: ValidationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Document Validation Settings</h2>
            <p className="mt-1 text-sm text-gray-500">
              Configure automatic document validation and approval thresholds
            </p>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <button
                onClick={handleReset}
                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Auto-approval Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-900">
              Enable Auto-Approval
            </label>
            <p className="mt-1 text-sm text-gray-500">
              Automatically approve documents that meet all validation thresholds
            </p>
            <p className="mt-1 text-xs text-gray-400">
              When enabled, documents with high confidence scores are automatically approved without manual review
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateSetting('enabled', !settings.enabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
              settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Confidence Thresholds</h3>
          
          {/* Owner Match Confidence */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-900">
                Owner Match Confidence
              </label>
              <span className="text-sm font-semibold text-blue-600">
                {formatPercentage(settings.min_owner_match_confidence || 0)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Minimum confidence required for matching document owner to employee. Higher values reduce false matches but may reject valid documents.
            </p>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.01"
              value={settings.min_owner_match_confidence || 0.90}
              onChange={(e) => updateSetting('min_owner_match_confidence', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>50%</span>
              <span>75%</span>
              <span>90% (Recommended)</span>
              <span>100%</span>
            </div>
          </div>

          {/* Authenticity Score */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-900">
                Authenticity Score
              </label>
              <span className="text-sm font-semibold text-blue-600">
                {formatPercentage(settings.min_authenticity_score || 0)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Minimum score for document authenticity checks. Checks for image quality, duplicates, and tampering indicators.
            </p>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.01"
              value={settings.min_authenticity_score || 0.85}
              onChange={(e) => updateSetting('min_authenticity_score', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>50%</span>
              <span>75%</span>
              <span>85% (Recommended)</span>
              <span>100%</span>
            </div>
          </div>

          {/* Request Compliance Score */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-900">
                Request Compliance Score
              </label>
              <span className="text-sm font-semibold text-blue-600">
                {formatPercentage(settings.min_request_compliance_score || 0)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Minimum score for matching document type to requested document type. Higher values ensure documents match requests exactly.
            </p>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.01"
              value={settings.min_request_compliance_score || 0.95}
              onChange={(e) => updateSetting('min_request_compliance_score', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>50%</span>
              <span>75%</span>
              <span>90%</span>
              <span>95% (Recommended)</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Expiry Settings</h3>

          {/* Require Expiry Check */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-900">
                  Require Expiry Check
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Always check document expiry dates during validation
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('require_expiry_check', !settings.require_expiry_check)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                  settings.require_expiry_check ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.require_expiry_check ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Allow Expired Documents */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-900">
                  Allow Expired Documents
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Permit auto-approval of documents that have expired
                </p>
                <p className="mt-1 text-xs text-red-600">
                  ⚠️ Not recommended for compliance-sensitive use cases
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('allow_expired_documents', !settings.allow_expired_documents)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                  settings.allow_expired_documents ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.allow_expired_documents ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Example Scenarios */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Example Scenarios</h3>
          <div className="space-y-3 text-xs">
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <p className="font-medium text-green-900">✓ Auto-Approved</p>
              <p className="text-green-700 mt-1">
                Document with 95% owner match, 90% authenticity, 98% compliance, and valid expiry date
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
              <p className="font-medium text-yellow-900">⚠ Needs Review</p>
              <p className="text-yellow-700 mt-1">
                Document with 85% owner match (below 90% threshold) or expiring within 30 days
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded border border-red-200">
              <p className="font-medium text-red-900">✗ Rejected</p>
              <p className="text-red-700 mt-1">
                Document with 60% authenticity score, expired document (if not allowed), or type mismatch
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

