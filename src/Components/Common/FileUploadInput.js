import React, { useMemo, useRef, useEffect, useCallback } from "react";

/**
 * Reusable file picker that supports multi-selection, per-file removal,
 * and inline image previews. Pass the current array of `File` objects and
 * get updates through `onChange`.
 */
const FileUploadInput = React.memo(({
  id,
  label = "Attachments",
  description,
  files = [],
  onChange,
  accept,
  name,
  multiple = true,
  disabled = false,
  addFilesLabel,
  emptyStateLabel = "No files selected",
  badgeVariant = "indigo",
}) => {
  const inputRef = useRef(null);
  const controlId = useMemo(() => id || `${name || "file-upload"}-${Math.random().toString(36).slice(2)}`, [id, name]);

  const openPicker = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleFileSelection = useCallback((event) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;

    const merged = [...files];
    for (const file of selected) {
      const duplicate = merged.find(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.lastModified === file.lastModified &&
          existing.type === file.type
      );
      if (!duplicate) merged.push(file);
    }

    if (onChange) onChange(merged);

    // Reset so the same file can be re-selected immediately if removed.
    event.target.value = "";
  }, [files, onChange]);

  const removeAtIndex = useCallback((index) => {
    if (!onChange) return;
    onChange(files.filter((_, idx) => idx !== index));
  }, [files, onChange]);

  const clearAll = useCallback(() => {
    if (!onChange || files.length === 0) return;
    onChange([]);
  }, [files.length, onChange]);

  const previews = useMemo(
    () =>
      files.map((file) =>
        file.type?.startsWith("image/")
          ? { url: URL.createObjectURL(file), name: file.name }
          : null
      ),
    [files]
  );

  useEffect(
    () => () => {
      previews.forEach((preview) => {
        if (preview?.url) URL.revokeObjectURL(preview.url);
      });
    },
    [previews]
  );

  const badgeClasses = useMemo(() =>
    badgeVariant === "gray"
      ? "bg-gray-100 text-gray-700 border border-gray-200"
      : "bg-indigo-50 text-indigo-700 border border-indigo-200",
    [badgeVariant]
  );

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={controlId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      {description && <p className="text-xs text-gray-500">{description}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={openPicker}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border shadow-sm text-sm font-medium transition-colors ${
            disabled
              ? "cursor-not-allowed opacity-60 bg-gray-100 text-gray-400 border-gray-200"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          }`}
          disabled={disabled}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <path d="M21.44 11.05L12 20.5a6 6 0 1 1-8.49-8.49l9.9-9.9a4.5 4.5 0 1 1 6.36 6.36L9.88 19.36a3 3 0 1 1-4.24-4.24l8.49-8.49" />
          </svg>
          <span>{files.length > 0 ? addFilesLabel || "Add files" : addFilesLabel || "Choose files"}</span>
        </button>
        <input
          ref={inputRef}
          id={controlId}
          name={name}
          type="file"
          className="sr-only"
          multiple={multiple}
          accept={accept}
          disabled={disabled}
          onChange={handleFileSelection}
        />
        {files.length > 0 ? (
          <>
            <span className={`text-sm whitespace-nowrap px-3 py-1.5 rounded-md ${badgeClasses}`}>
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-gray-600 hover:text-gray-900 underline"
              disabled={disabled}
            >
              Clear
            </button>
          </>
        ) : (
          <span className="text-sm text-gray-500">{emptyStateLabel}</span>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <ul className="flex flex-wrap gap-2">
            {files.map((file, index) => {
              const preview = previews[index];
              return (
                <li
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="relative flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700"
                >
                  {preview ? (
                    <img
                      src={preview.url}
                      alt={file.name}
                      className="h-12 w-12 rounded object-cover border border-gray-200"
                    />
                  ) : (
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded bg-white border border-gray-200 text-gray-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <path d="M12 1v22" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </span>
                  )}
                  <div className="max-w-[12rem]">
                    <p className="truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {(file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ml-auto text-[11px] text-gray-500 hover:text-red-600 underline"
                    onClick={() => removeAtIndex(index)}
                    disabled={disabled}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
});

FileUploadInput.displayName = 'FileUploadInput';

export default FileUploadInput;
