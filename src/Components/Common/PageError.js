import React from 'react';

const variantClasses = {
  fullscreen: 'flex flex-col items-center justify-center min-h-[50vh] gap-4 py-16 px-4 text-center',
  inline: 'flex items-start gap-3 rounded-md bg-red-50/60 px-4 py-3 text-left text-sm',
  card: 'flex flex-col items-center justify-center gap-3 rounded-lg border border-red-100 bg-red-50 py-10 px-6 text-center shadow-sm',
};

const iconSizes = {
  fullscreen: 'h-10 w-10',
  inline: 'h-5 w-5 mt-0.5',
  card: 'h-8 w-8',
};

function PageError({
  title = 'Something went wrong',
  message = 'We couldn\'t load this content. Please try again.',
  error,
  variant = 'fullscreen',
  className = '',
  onRetry,
  retryLabel = 'Retry',
  children,
}) {
  const containerClass = `${variantClasses[variant] || variantClasses.fullscreen} ${className}`.trim();
  const iconClass = `${iconSizes[variant] || iconSizes.fullscreen} text-red-500`.trim();
  const isInline = variant === 'inline';

  const errorMessage = typeof error === 'string' ? error : (error ? String(error) : null);

  return (
    <div className={containerClass} role="alert">
      <div className={isInline ? 'flex items-start gap-3' : 'flex flex-col items-center gap-3'}>
        <svg
          className={iconClass}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008z" />
          <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
        </svg>
        <div className={isInline ? 'flex-1' : 'max-w-xl text-center'}>
          <p className="text-base font-semibold text-red-600">{title}</p>
          {message && <p className={`mt-1 text-sm ${isInline ? 'text-red-600/90' : 'text-red-500/80'}`}>{message}</p>}
        </div>
      </div>

      {errorMessage && (
        <pre
          className={`mt-4 w-full whitespace-pre-wrap break-words text-xs text-red-500/80 ${isInline ? '' : 'text-center'}`}
        >
          {errorMessage}
        </pre>
      )}

      {children}

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export default PageError;
