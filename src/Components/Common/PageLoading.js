import React from 'react';

const variantClasses = {
  fullscreen: 'flex flex-col items-center justify-center min-h-[50vh] py-16 px-4 text-center',
  inline: 'flex items-center gap-3 py-4 text-sm',
  card: 'flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-10 px-6 text-center shadow-sm',
};

const spinnerSizes = {
  fullscreen: 'h-12 w-12 border-4',
  inline: 'h-5 w-5 border-2',
  card: 'h-8 w-8 border-4',
};

function PageLoading({ message = 'Loading…', variant = 'fullscreen', className = '', spinnerClassName = '', children }) {
  const containerClass = `${variantClasses[variant] || variantClasses.fullscreen} ${className}`.trim();
  const spinnerSizeClass = spinnerSizes[variant] || spinnerSizes.fullscreen;
  const spinnerClass = `${spinnerSizeClass} animate-spin rounded-full border-solid border-indigo-500 border-t-transparent ${spinnerClassName}`.trim();

  return (
    <div className={containerClass} role="status" aria-live="polite" aria-busy="true">
      <div className={spinnerClass} />
      {message && <p className="mt-4 text-sm font-medium text-gray-600">{message}</p>}
      {children}
    </div>
  );
}

export default PageLoading;
