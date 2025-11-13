import React, { useCallback, useMemo, useState } from 'react';

const defaultRenderDisplay = ({ currentPage, totalPages, startEditing }) => (
  <button type="button" onClick={startEditing} className="underline">
    Page {currentPage} of {totalPages}
  </button>
);

const defaultValidator = (value, context) => {
  if (!Number.isInteger(value)) {
    return 'Enter a whole number';
  }

  const min = Math.max(1, context?.minPage ?? 1);
  const hasTotal = Number.isFinite(context?.totalPages) && context.totalPages > 0;
  const max = hasTotal ? Math.max(context.totalPages, min) : null;

  if (value < min || (max !== null && value > max)) {
    if (max !== null) {
      return `Enter a number between ${min} and ${max}`;
    }
    return `Enter a number greater than or equal to ${min}`;
  }

  return null;
};

export default function PaginationInput({
  currentPage,
  totalPages,
  onPageChange,
  minPage = 1,
  validatePage = defaultValidator,
  renderDisplay = defaultRenderDisplay,
  renderEditing,
  inputClassName = 'w-20 px-2 py-1 border rounded',
  errorClassName = 'text-xs text-red-600 mt-1',
  containerClassName = '',
  autoFocus = true,
  inputProps = {},
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const startEditing = useCallback(() => {
    setValue(String(currentPage));
    setError('');
    setIsEditing(true);
  }, [currentPage]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setError('');
  }, []);

  const safeTotalPages = useMemo(() => {
    if (Number.isFinite(totalPages) && totalPages > 0) {
      return totalPages;
    }
    if (minPage > 0) return minPage;
    return 1;
  }, [totalPages, minPage]);

  const runValidation = useCallback(
    (numericValue) => {
      const context = { currentPage, totalPages: safeTotalPages, minPage };
      const result = validatePage(numericValue, context);
      if (typeof result === 'string' && result) {
        return result;
      }
      if (result === false) {
        return defaultValidator(numericValue, context) || 'Enter a valid page number';
      }
      if (result === true) {
        return null;
      }
      if (result == null) {
        if (!Number.isInteger(numericValue)) {
          return defaultValidator(numericValue, context);
        }
        return defaultValidator(numericValue, context);
      }
      return null;
    },
    [currentPage, safeTotalPages, minPage, validatePage],
  );

  const applyValue = useCallback(() => {
    const trimmed = value.trim();
    const contextValue = trimmed === '' ? Number.NaN : Number.parseInt(trimmed, 10);

    if (Number.isNaN(contextValue)) {
      const message = runValidation(Number.NaN) || 'Enter a whole number';
      setError(message);
      return;
    }

    const message = runValidation(contextValue);
    if (typeof message === 'string' && message) {
      setError(message);
      return;
    }

    if (contextValue !== currentPage) {
      onPageChange(contextValue);
    }

    setIsEditing(false);
    setError('');
  }, [value, currentPage, onPageChange, runValidation]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        applyValue();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelEditing();
      }
    },
    [applyValue, cancelEditing],
  );

  const handleChange = useCallback((event) => {
    setValue(event.target.value);
    setError('');
  }, []);

  const sharedInputProps = useMemo(
    () => ({
      type: 'number',
      inputMode: 'numeric',
      min: minPage,
      max: safeTotalPages,
      value,
      onChange: handleChange,
      onBlur: applyValue,
      onKeyDown: handleKeyDown,
      autoFocus,
      ...inputProps,
    }),
    [applyValue, handleChange, handleKeyDown, inputProps, minPage, safeTotalPages, value, autoFocus],
  );

  if (!isEditing) {
    return (
      <div className={containerClassName}>
        {renderDisplay({ currentPage, totalPages: safeTotalPages, startEditing })}
      </div>
    );
  }

  if (renderEditing) {
    return (
      <div className={containerClassName}>
        {renderEditing({
          currentPage,
          totalPages: safeTotalPages,
          minPage,
          value,
          setValue,
          error,
          setError,
          apply: applyValue,
          cancel: cancelEditing,
          inputProps: sharedInputProps,
          startEditing,
        })}
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <div>
        <input
          {...sharedInputProps}
          className={`${inputClassName}${error ? ' border-red-500' : ''}`.trim()}
        />
        {error ? <div className={errorClassName}>{error}</div> : null}
      </div>
    </div>
  );
}
