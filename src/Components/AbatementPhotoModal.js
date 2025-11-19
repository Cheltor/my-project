import React, { useState } from 'react';
import FileUploadInput from './Common/FileUploadInput';
import LoadingSpinner from './Common/LoadingSpinner';

const AbatementPhotoModal = ({ isOpen, onClose, onSubmit, violationId }) => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (selectedFiles) => {
    setFiles(selectedFiles);
    setError('');
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError('Please upload at least one photo to mark the violation as abated.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(files);
      onClose();
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900">Abatement Confirmation</h3>
        <p className="mt-3 text-sm text-gray-600">
          To mark this violation as abated, please upload one or more photos demonstrating the resolution.
        </p>
        <div className="mt-4">
          <FileUploadInput
            id="abatement-photos"
            name="abatement-photos"
            files={files}
            onChange={handleFileChange}
            accept="image/*"
            multiple
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || files.length === 0}
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Submitting...
              </>
            ) : (
              'Submit and Abate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AbatementPhotoModal;
