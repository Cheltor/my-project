'use client';

import React, { useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

const CODE_CACHE = new Map();

/**
 * Renders inline trigger text for a code that opens a right-side drawer with code details.
 * Provides a CTA to jump to the full code detail page.
 */
export default function CodeDrawerLink({
  codeId,
  children,
  className = "font-semibold text-blue-700 hover:underline",
  ...buttonProps
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!codeId) {
      setCode(null);
      setError(null);
      return;
    }
    if (CODE_CACHE.has(codeId)) {
      setCode(CODE_CACHE.get(codeId));
      setError(null);
    } else {
      setCode(null);
      setError(null);
    }
  }, [codeId]);

  useEffect(() => {
    let cancelled = false;
    if (!open || !codeId) return;
    const cached = CODE_CACHE.get(codeId);
    if (cached) {
      setCode(cached);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${process.env.REACT_APP_API_URL}/codes/${codeId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load code details");
        }
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        CODE_CACHE.set(codeId, data);
        setCode(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Unable to load code details");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, codeId]);

  const handleOpen = () => {
    if (!codeId) return;
    setOpen(true);
  };

  const heading = code
    ? `${code.chapter}${code.section ? `.${code.section}` : ""}`
    : "Code Details";

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={className}
        {...buttonProps}
      >
        {children}
      </button>

      <Dialog open={open} onClose={setOpen} className="relative z-[1300]">
        <div className="fixed inset-0 z-10 bg-gray-900/30 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 z-20 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
              <DialogPanel className="pointer-events-auto w-screen max-w-md transform bg-white transition duration-500 ease-in-out data-[closed]:translate-x-full sm:duration-700">
                <div className="flex h-full flex-col overflow-y-auto bg-white shadow-xl">
                  <header className="px-4 pb-4 pt-6 sm:px-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <DialogTitle className="text-base font-semibold text-gray-900">
                          {heading}
                        </DialogTitle>
                        {code?.name && (
                          <p className="mt-1 text-sm text-gray-600">{code.name}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="rounded-md text-gray-400 hover:text-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      >
                        <span className="sr-only">Close panel</span>
                        <XMarkIcon aria-hidden="true" className="h-6 w-6" />
                      </button>
                    </div>
                  </header>

                  <div className="flex-1 space-y-6 px-4 pb-6 sm:px-6">
                    {loading && (
                      <p className="text-sm text-gray-500">Loading code details…</p>
                    )}
                    {error && (
                      <p className="text-sm text-red-600">{error}</p>
                    )}
                    {!loading && !error && code && (
                      <>
                        <section>
                          <h2 className="text-sm font-semibold text-gray-900">
                            Description
                          </h2>
                          <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                            {code.description || "No description provided."}
                          </p>
                        </section>

                        <section className="grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-2">
                          <div>
                            <span className="font-medium text-gray-900">Chapter</span>
                            <p>{code.chapter || "—"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">Section</span>
                            <p>{code.section || "—"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">Created</span>
                            <p>
                              {code.created_at
                                ? new Date(code.created_at).toLocaleDateString()
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">Updated</span>
                            <p>
                              {code.updated_at
                                ? new Date(code.updated_at).toLocaleDateString()
                                : "—"}
                            </p>
                          </div>
                        </section>
                      </>
                    )}
                  </div>

                  <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Close
                      </button>
                      <Link
                        to={`/code/${codeId}`}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                        onClick={() => setOpen(false)}
                      >
                        View full code
                      </Link>
                    </div>
                  </div>
                </div>
              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
