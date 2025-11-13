import React from 'react';

const FieldLabel = ({ children }) => (
  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</label>
);

const ContactLinkModal = ({
  isOpen,
  onClose,
  title = 'Link a Contact',
  description = 'Search existing contacts or create a new record to link.',
  searchTerm,
  onSearchTermChange,
  searchPlaceholder = 'Search by name, email, or phone…',
  searchResults = [],
  isSearching = false,
  onSelectContact,
  newContact,
  onNewContactChange,
  onSubmitNewContact,
  submitLabel = 'Create & Add Contact',
  existingHeading = 'Add Existing Contact',
  newHeading = 'Or Create a New Contact',
  duplicateWarning,
  clearDuplicateWarning,
  errorMessage,
  isAddingExisting = false,
  isCreatingNew = false,
}) => {
  if (!isOpen) return null;

  const handleInputChange = (field) => (event) => {
    if (clearDuplicateWarning) {
      clearDuplicateWarning();
    }
    if (onSearchTermChange && field === 'search') {
      onSearchTermChange(event.target.value);
    }
    if (onNewContactChange && field !== 'search') {
      onNewContactChange({ ...newContact, [field]: event.target.value });
    }
  };

  return (
    <div className="rounded-3xl border border-indigo-100 bg-white/95 p-6 shadow-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
        >
          Close
        </button>
      </div>

      <div className="mt-6 space-y-6">
        <section className="space-y-3">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-800">{existingHeading}</h4>
            <p className="text-xs text-slate-500">Start typing to search across all contacts.</p>
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={handleInputChange('search')}
              placeholder={searchPlaceholder}
              className="w-full rounded-2xl border border-indigo-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {isSearching && (
              <span className="absolute inset-y-0 right-3 flex items-center text-xs text-indigo-500">Searching…</span>
            )}
          </div>
          {duplicateWarning && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
              {duplicateWarning}
            </div>
          )}
          {searchResults.length > 0 && (
            <ul className="max-h-48 overflow-auto rounded-2xl border border-slate-200 bg-white/95 text-sm shadow-inner">
              {searchResults.map((contact) => (
                <li
                  key={contact.id}
                  className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800">{contact.name || 'Unnamed contact'}</span>
                    <span className="text-xs text-slate-500">
                      {[contact.email, contact.phone].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectContact && onSelectContact(contact.id)}
                    className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                    disabled={isAddingExisting}
                  >
                    {isAddingExisting ? 'Linking…' : 'Add'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-inner">
          <h4 className="text-sm font-semibold text-slate-800">{newHeading}</h4>
          <form onSubmit={onSubmitNewContact} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <FieldLabel>Name</FieldLabel>
              <input
                type="text"
                required
                value={newContact?.name || ''}
                onChange={handleInputChange('name')}
                placeholder="Contact name"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Email</FieldLabel>
              <input
                type="email"
                value={newContact?.email || ''}
                onChange={handleInputChange('email')}
                placeholder="name@example.com"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Phone</FieldLabel>
              <input
                type="text"
                value={newContact?.phone || ''}
                onChange={handleInputChange('phone')}
                placeholder="(555) 555-5555"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-300"
                disabled={isCreatingNew}
              >
                {isCreatingNew ? 'Saving…' : submitLabel}
              </button>
            </div>
          </form>
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600">
              {errorMessage}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ContactLinkModal;
