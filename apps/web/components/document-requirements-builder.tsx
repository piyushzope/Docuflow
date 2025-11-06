'use client';

import { useState } from 'react';

interface DocumentRequirement {
  type: string;
  required: boolean;
  fileTypes?: string[];
}

interface DocumentRequirementsBuilderProps {
  requirements: DocumentRequirement[];
  expectedCount: number | null;
  onRequirementsChange: (requirements: DocumentRequirement[]) => void;
  onExpectedCountChange: (count: number | null) => void;
  className?: string;
}

const COMMON_DOCUMENT_TYPES = [
  'Driver\'s License',
  'Passport',
  'Medical Examiner Card (MEC)',
  'Employment Authorization Document (EAD)',
  'Social Security Card',
  'Birth Certificate',
  'Insurance Card',
  'W-4 Form',
  'I-9 Form',
  'Background Check',
  'Drug Test Results',
  'Certificate of Insurance',
];

const FILE_TYPES = [
  'PDF',
  'JPG',
  'JPEG',
  'PNG',
  'DOC',
  'DOCX',
  'XLS',
  'XLSX',
];

export default function DocumentRequirementsBuilder({
  requirements,
  expectedCount,
  onRequirementsChange,
  onExpectedCountChange,
  className = '',
}: DocumentRequirementsBuilderProps) {
  const [newRequirementType, setNewRequirementType] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRequirementRequired, setNewRequirementRequired] = useState(true);
  const [newRequirementFileTypes, setNewRequirementFileTypes] = useState<string[]>([]);

  const addRequirement = () => {
    if (!newRequirementType.trim()) return;

    const newRequirement: DocumentRequirement = {
      type: newRequirementType.trim(),
      required: newRequirementRequired,
      fileTypes: newRequirementFileTypes.length > 0 ? newRequirementFileTypes : undefined,
    };

    onRequirementsChange([...requirements, newRequirement]);
    setNewRequirementType('');
    setNewRequirementRequired(true);
    setNewRequirementFileTypes([]);
    setShowAddForm(false);
  };

  const removeRequirement = (index: number) => {
    onRequirementsChange(requirements.filter((_, i) => i !== index));
  };

  const toggleRequirementRequired = (index: number) => {
    const updated = [...requirements];
    updated[index].required = !updated[index].required;
    onRequirementsChange(updated);
  };

  const toggleFileType = (fileType: string) => {
    if (newRequirementFileTypes.includes(fileType)) {
      setNewRequirementFileTypes(newRequirementFileTypes.filter((ft) => ft !== fileType));
    } else {
      setNewRequirementFileTypes([...newRequirementFileTypes, fileType]);
    }
  };

  return (
    <div className={`rounded-lg border border-gray-200 bg-gray-50 p-4 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Document Requirements</h3>
        <p className="text-xs text-gray-500">
          Specify what documents are expected for this request
        </p>
      </div>

      {/* Expected Count */}
      <div className="mb-4">
        <label
          htmlFor="expected_document_count"
          className="block text-xs font-medium text-gray-700 mb-1"
        >
          Expected Document Count
        </label>
        <input
          type="number"
          id="expected_document_count"
          min="1"
          value={expectedCount || ''}
          onChange={(e) =>
            onExpectedCountChange(e.target.value ? parseInt(e.target.value) || null : null)
          }
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., 2"
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional: Number of documents expected to be received
        </p>
      </div>

      {/* Requirements List */}
      {requirements.length > 0 && (
        <div className="mb-4 space-y-2">
          {requirements.map((req, index) => (
            <div
              key={index}
              className="flex items-start justify-between rounded-md border border-gray-200 bg-white p-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">{req.type}</span>
                  {req.required ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      Required
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                      Optional
                    </span>
                  )}
                </div>
                {req.fileTypes && req.fileTypes.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {req.fileTypes.map((ft) => (
                      <span
                        key={ft}
                        className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                      >
                        {ft}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-2">
                <button
                  type="button"
                  onClick={() => toggleRequirementRequired(index)}
                  className="text-xs text-gray-600 hover:text-gray-900"
                  title={req.required ? 'Mark as optional' : 'Mark as required'}
                >
                  {req.required ? 'Optional' : 'Required'}
                </button>
                <button
                  type="button"
                  onClick={() => removeRequirement(index)}
                  className="text-red-600 hover:text-red-800"
                  aria-label="Remove requirement"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Requirement Form */}
      {showAddForm ? (
        <div className="rounded-md border border-gray-200 bg-white p-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRequirementType}
                onChange={(e) => setNewRequirementType(e.target.value)}
                placeholder="Enter document type..."
                className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                list="document-types"
              />
              <datalist id="document-types">
                {COMMON_DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              File Type Restrictions (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {FILE_TYPES.map((fileType) => (
                <button
                  key={fileType}
                  type="button"
                  onClick={() => toggleFileType(fileType)}
                  className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                    newRequirementFileTypes.includes(fileType)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {fileType}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="new_requirement_required"
              checked={newRequirementRequired}
              onChange={(e) => setNewRequirementRequired(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="new_requirement_required"
              className="ml-2 block text-xs text-gray-700"
            >
              Required document
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewRequirementType('');
                setNewRequirementFileTypes([]);
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addRequirement}
              disabled={!newRequirementType.trim()}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Requirement
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full rounded-md border border-dashed border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          + Add Document Requirement
        </button>
      )}
    </div>
  );
}

