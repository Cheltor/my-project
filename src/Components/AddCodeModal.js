import React, { useEffect, useMemo, useState } from "react";

const INITIAL_FORM = {
  chapter: "",
  section: "",
  name: "",
  description: "",
};

export default function AddCodeModal({
  open,
  onClose,
  onCreated,
  authToken,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setForm(INITIAL_FORM);
    setSubmitting(false);
    setError("");
  }, [open]);

  const canSubmit = useMemo(() => {
    const chapter = form.chapter.trim();
    const section = form.section.trim();
    const name = form.name.trim();
    const description = form.description.trim();
    return chapter !== "" && section !== "" && name !== "" && description !== "" && !submitting;
  }, [form.chapter, form.section, form.name, form.description, submitting]);

  if (!open) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/codes/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            chapter: form.chapter,
            section: form.section,
            name: form.name,
            description: form.description,
          }),
        }
      );

      if (!response.ok) {
        let message = "Unable to create code.";
        try {
          const payload = await response.json();
          if (payload?.detail) message = payload.detail;
        } catch {
          message = await response.text().catch(() => message);
        }
        throw new Error(message || "Unable to create code.");
      }

      const created = await response.json();
      onCreated?.(created);
      onClose?.();
    } catch (err) {
      setError(err.message || "Unable to create code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Code</h2>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            disabled={submitting}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Chapter (67, 10, 15, etc.)<span className="text-red-600 required-indicator">*</span>
              </label>
              <input
                name="chapter"
                type="text"
                value={form.chapter}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Section (1, 10, 302.2, etc.)<span className="text-red-600 required-indicator">*</span>
              </label>
              <input
                name="section"
                type="text"
                value={form.section}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name <span className="text-red-600 required-indicator">*</span>
            </label>
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description <span className="text-red-600 required-indicator">*</span>
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={5}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => onClose?.()}
              disabled={submitting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
