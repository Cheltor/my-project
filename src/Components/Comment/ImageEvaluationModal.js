import React from 'react';
import CodeDrawerLink from '../Codes/CodeDrawerLink';

export default function ImageEvaluationModal({
  isOpen,
  onClose,
  evaluationResult,
  onDraftViolation
}) {
  if (!isOpen || !evaluationResult) return null;

  const { observation, potential_violations, recommendation } = evaluationResult;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 px-4 py-8">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-2xl rounded-lg bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Image Evaluation Result</h2>
            <p className="text-sm text-gray-500">AI analysis of the selected image.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Observation */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Observation</h3>
            <div className="mt-2 rounded-md bg-gray-50 p-4 text-sm text-gray-700 border border-gray-200">
              {observation || "No observation provided."}
            </div>
          </div>

          {/* Potential Violations */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
              Potential Violations
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                {potential_violations?.length || 0} found
              </span>
            </h3>

            {potential_violations && potential_violations.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {potential_violations.map((violation, idx) => (
                  <li key={idx} className="rounded-md border border-indigo-100 bg-indigo-50/50 p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {violation.code_citation ? (
                            violation.code_id ? (
                              <span className="flex items-center gap-2 mr-2">
                                <CodeDrawerLink
                                  codeId={violation.code_id}
                                  className="font-mono text-indigo-700 hover:underline cursor-pointer"
                                >
                                  {violation.code_citation}
                                </CodeDrawerLink>
                                {violation.confidence && (
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${violation.confidence >= 80 ? 'bg-green-100 text-green-800' :
                                    violation.confidence >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                    {violation.confidence}%
                                  </span>
                                )}
                                {violation.related_image_indices && violation.related_image_indices.length > 0 && (
                                  <span className="ml-2 inline-flex items-center gap-1">
                                    {violation.related_image_indices.map((idx) => (
                                      <span key={idx} className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                        Image {idx}
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="font-mono text-indigo-700 mr-2">{violation.code_citation}</span>
                            )
                          ) : null}
                          {violation.description}
                        </p>
                        {violation.code_id && (
                          <div className="mt-1">
                            <CodeDrawerLink
                              codeId={violation.code_id}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              View Code Details &rarr;
                            </CodeDrawerLink>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-500 italic">No specific violations identified.</p>
            )}
          </div>

          {/* Recommendation */}
          {recommendation && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Recommendation</h3>
              <p className="mt-2 text-sm text-gray-700">{recommendation}</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onDraftViolation(evaluationResult)}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Draft Violation
          </button>
        </div>
      </div>
    </div>
  );
}
