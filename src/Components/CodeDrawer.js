import React from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useCodeDrawer } from '../CodeDrawerContext';

export default function CodeDrawer() {
  const { isOpen, code, loading, error, activeCodeId, closeDrawer } = useCodeDrawer();

  return (
    <Dialog open={isOpen} onClose={closeDrawer} className="relative z-50">
      <div className="fixed inset-0" aria-hidden="true" />
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
            <DialogPanel
              transition
              className="pointer-events-auto w-screen max-w-md transform transition duration-500 ease-in-out data-[closed]:translate-x-full sm:duration-700"
            >
              <div className="relative flex h-full flex-col overflow-y-auto bg-white py-6 shadow-xl">
                <div className="px-4 sm:px-6">
                  <div className="flex items-start justify-between">
                    <DialogTitle className="text-base font-semibold text-gray-900">
                      {code ? code.name || 'Code details' : 'Code details'}
                    </DialogTitle>
                    <div className="ml-3 flex h-7 items-center">
                      <button
                        type="button"
                        onClick={closeDrawer}
                        className="relative rounded-md text-gray-400 hover:text-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      >
                        <span className="absolute -inset-2.5" />
                        <span className="sr-only">Close panel</span>
                        <XMarkIcon aria-hidden="true" className="size-6" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="relative mt-6 flex-1 px-4 sm:px-6">
                  {loading && (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                      Loading code details...
                    </div>
                  )}
                  {!loading && error && (
                    <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                  {!loading && !error && code && (
                    <div className="space-y-4 text-sm text-gray-700">
                      {code.chapter && (
                        <p>
                          <span className="font-medium text-gray-900">Chapter:</span> {code.chapter}
                        </p>
                      )}
                      {code.section && (
                        <p>
                          <span className="font-medium text-gray-900">Section:</span> {code.section}
                        </p>
                      )}
                      {code.name && (
                        <p>
                          <span className="font-medium text-gray-900">Name:</span> {code.name}
                        </p>
                      )}
                      {code.description && (
                        <p>
                          <span className="font-medium text-gray-900">Description:</span> {code.description}
                        </p>
                      )}
                      {code.created_at && (
                        <p>
                          <span className="font-medium text-gray-900">Created:</span>{' '}
                          {new Date(code.created_at).toLocaleString()}
                        </p>
                      )}
                      {code.updated_at && (
                        <p>
                          <span className="font-medium text-gray-900">Updated:</span>{' '}
                          {new Date(code.updated_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeDrawer}
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <Link
                      to={activeCodeId ? `/code/${activeCodeId}` : '#'}
                      className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      onClick={closeDrawer}
                    >
                      View full code page
                    </Link>
                  </div>
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
